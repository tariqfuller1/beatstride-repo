"use strict";

const AN_TARGET_SR = 22050;
const FRAME = 1024;
const HOP = 256;

/* Mono downmix + decimation, with an anti-aliasing filter.*/


function toMonoLowRate(buffer){
    const sr = buffer.sampleRate;
    const nch = buffer.numberOfChannels;
    const decim = Math.max(1, Math.round(sr / AN_TARGET_SR));
    const  anSr = sr / decim;
    const outLen = Math.floor(buffer.length / decim);
    const out = new Float32Array(outLen);

    const chans = [];
    for (let c = 0; c < nch; c++) chans.push(buffer.getChannelData(c));

    const half = decim;
    const kernel = new Float32Array(2* half -1);

    let kernelSum = 0;
    for (let k = -half+1; k<= half -1;k++){
        const w = half - Math.abs(k);
        kernel[k+half -1] =w;
        kernelSum += w;
    }

    const inv = 1 / (kernelSum * nch);

    for (let i = 0; i < outLen; i++){
        const centre = i * decim;
        let s = 0;
        for (let k = -half + 1; k <= half - 1; k++){
            const idx = centre + k;
            if ( idx < 0 || idx >= buffer.length) continue;
            const w = kernel[k + half -1];
            for (let c = 0; c < nch; c++) s += chans[c][idx] * w;
        }
        out[i] = s * inv;
    }

    return { mono: out, anSr};
}
async function analyseBuffer(buffer, onProgress) {
  const { mono, anSr } = toMonoLowRate(buffer);

  const nBins = FRAME >> 1;                  // upper half mirrors the lower
  const nFrames = Math.max(1, Math.floor((mono.length - FRAME) / HOP) + 1);
  const frameTime = HOP / anSr;
  const fft = makeFFT(FRAME);

  const win = new Float32Array(FRAME);
  for (let i = 0; i < FRAME; i++) {
    win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1));
  }

  // which bin a frequency lands in
  const binHz = anSr / FRAME;
  const bin = (hz) => clamp(Math.round(hz / binHz), 1, nBins - 1);
  const LO0 = bin(25),   LO1 = bin(230);
  const MI0 = LO1,       MI1 = bin(1900);
  const HI0 = MI1,       HI1 = bin(8600);
  const nLo = Math.max(1, LO1 - LO0);
  const nMi = Math.max(1, MI1 - MI0);
  const nHi = Math.max(1, HI1 - HI0);

  const flux = new Float32Array(nFrames);
  const fLo = new Float32Array(nFrames);
  const fMi = new Float32Array(nFrames);
  const fHi = new Float32Array(nFrames);
  const rms = new Float32Array(nFrames);

  const re = new Float64Array(FRAME);
  const im = new Float64Array(FRAME);
  const prev = new Float32Array(nBins);      // last frame's magnitudes

  let f = 0;
  const CHUNK = 350;
  while (f < nFrames) {
    const stop = Math.min(nFrames, f + CHUNK);
    for (; f < stop; f++) {
      const start = f * HOP;

      let energy = 0;
      for (let i = 0; i < FRAME; i++) {
        const s = mono[start + i] || 0;
        energy += s * s;
        re[i] = s * win[i];                  // windowed, into the real part
        im[i] = 0;
      }
      rms[f] = Math.sqrt(energy / FRAME);

      fft(re, im);

      let lo = 0, mi = 0, hi = 0;
      for (let k = 1; k < nBins; k++) {
        const mag = Math.log(1 + 900 * Math.sqrt(re[k] * re[k] + im[k] * im[k]));
        const d = mag - prev[k];
        prev[k] = mag;
        if (d > 0) {                         // increases only: that's the "new" energy
          if (k >= LO0 && k < LO1) lo += d;
          else if (k >= MI0 && k < MI1) mi += d;
          else if (k >= HI0 && k < HI1) hi += d;
        }
      }
      lo /= nLo; mi /= nMi; hi /= nHi;       // per-bin averages, so bands compare fairly
      fLo[f] = lo; fMi[f] = mi; fHi[f] = hi;
      flux[f] = 1.25 * lo + 0.65 * mi + 0.95 * hi;
    }

    if (onProgress) onProgress(f / nFrames);
    // Hand control back to the browser so the page doesn't freeze. Without
    // this, a four-minute song locks the tab for seconds.
    await new Promise((r) => setTimeout(r, 0));
  }

  // Normalise each band to its own peak, so a quiet mix and a loud one get
  // treated the same. Returns the old peak, which we need to recover
  // absolute levels for the silence gates.
  const normInPlace = (arr) => {
    let m = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
    if (m > 0) { const k = 1 / m; for (let i = 0; i < arr.length; i++) arr[i] *= k; }
    return m;
  };
  normInPlace(fLo); normInPlace(fMi); normInPlace(fHi);
  const fluxPeak = normInPlace(flux);
  const rmsPeak = normInPlace(rms);

  const onsets = pickOnsets({ flux, fLo, fMi, fHi, rms, frameTime, anSr, fluxPeak, rmsPeak });

  const tempo = estimateTempo(flux, frameTime);      // <-- NEW
  snapToGrid(onsets, tempo);                         // <-- NEW

  return {
    duration: buffer.duration,
    frameTime, anSr, nFrames,
    flux, fLo, fMi, fHi, rms,
    onsets,                                          // <-- comma added
    bpm: tempo.bpm,                                  // <-- NEW
    gridOffset: tempo.offset,                        // <-- NEW
    tempoConfidence: tempo.confidence                // <-- NEW
  };
}
/* Peak picking against a rolling local average. */
function pickOnsets(A) {
  const { flux, fLo, fMi, fHi, rms, frameTime, anSr, fluxPeak, rmsPeak } = A;
  const n = flux.length;

  // Everything above was normalised to the track's own peak, which would
  // otherwise turn tape hiss into a full chart. These are absolute floors:
  // a frame has to be genuinely audible before it can make a note.
  const ABS_RMS = 0.0018;     // about -55 dBFS
  const REL_RMS = 0.020;      // 2% of the track's loudest moment
  const ABS_FLUX = 0.0035;
  const SENS = 1.28;          // how far above local average a peak must stand
  const MIN_SEP = 0.055;      // seconds between onsets

  const W = Math.max(4, Math.round(0.26 / frameTime));   // ±260ms window

  // prefix sums: ps[i] is the total of flux[0..i-1], so any range sum is
  // one subtraction no matter how wide the window
  const ps = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) ps[i + 1] = ps[i] + flux[i];

  const out = [];
  // The FFT reports on a whole 1024-sample window; the attack is best
  // located at its centre, so shift by half a frame.
  const centreLag = (FRAME / 2) / anSr;
  let lastT = -99;

  for (let i = 2; i < n - 2; i++) {
    if (rms[i] * rmsPeak < ABS_RMS || rms[i] < REL_RMS) continue;
    if (flux[i] * fluxPeak < ABS_FLUX) continue;

    const a = Math.max(0, i - W), b = Math.min(n, i + W + 1);
    const local = (ps[b] - ps[a]) / (b - a);
    const thr = local * SENS + 0.010;

    const v = flux[i];
    if (v < thr) continue;
    if (v <= flux[i - 1] || v < flux[i + 1]) continue;     // must be a local max
    if (v < flux[i - 2] || v < flux[i + 2]) continue;      // and not just noise

    const t = i * frameTime + centreLag;
    if (t - lastT < MIN_SEP) continue;
    lastT = t;

    out.push({
      t,
      s: v,                                  // strength
      rel: local > 0 ? v / local : v,        // how much it stood out
      lo: fLo[i], mi: fMi[i], hi: fHi[i]     // band mix, for lane assignment
    });
  }
  return out;
}



function estimateTempo(flux, frameTime){
  const n = flux.length;
  if (n<200) return { bpm: 0, offset:0, confidence:0};

  let mean = 0;
  for (let i = 0; i<n; i++) mean += flux[i];
  mean /= n;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = Math.max(0,flux[i] - mean);

  const lagFor = (bpm) => 60 / (bpm * frameTime);
  const minLag = Math.max(4, Math.floor(lagFor(205)));
  const maxLag = Math.min(n-2, Math.ceil(lagFor(58)));

  const ac = new Float64Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++){
    let s = 0;
    const lim = n - lag;
    for (let i = 0; i<lim;i++) s += x[i] * x[i+lag];
    ac[lag] = s/lim;
  }


  let best = -1, bestLag = minLag, acMean = 0;
  for (let lag = minLag; lag <= maxLag; lag++){
    acMean += ac[lag];
    const bpm = 60 / (lag * frameTime);
    const w = 1 - 0.22 * Math.abs(Math.log2(bpm/128));
    const v = ac[lag] * w;
    if (v>best){best = v; bestLag = lag};
  }

  let refined = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const a = ac[bestLag - 1], b = ac[bestLag], c = ac[bestLag + 1];
    const den = a - 2 * b + c;
    if (den !== 0) refined = bestLag + clamp((0.5 * (a - c)) / den, -0.5, 0.5);
  }

  const bpm = 60 / (refined * frameTime);
  const confidence = acMean > 0 ? clamp(ac[bestLag] / (acMean * 3), 0, 1) : 0;

  // Where does beat one sit? Try every offset inside one beat and see which
  // grid collects the most onset energy.
  let bestPhase = 0, bestScore = -1;
  const P = refined;
  for (let p = 0; p < Math.round(P); p++) {
    let s = 0, c = 0;
    for (let t = p; t < n; t += P) {
      const i = Math.round(t);
      if (i < n) { s += x[i]; c++; }
    }
    if (c > 0 && s / c > bestScore) { bestScore = s / c; bestPhase = p; }
  }

  return {
    bpm: Math.round(bpm * 10) / 10,
    offset: bestPhase * frameTime,
    confidence
  };
}


function snapToGrid(onsets, tempo) {
  if (!tempo.bpm || tempo.confidence < 0.16) return;    // don't trust it

  const step = 60 / tempo.bpm / 4;                      // a sixteenth note
  const tol = Math.min(0.052, step * 0.36);

  for (const o of onsets) {
    const k = Math.round((o.t - tempo.offset) / step);
    const gt = tempo.offset + k * step;
    if (Math.abs(gt - o.t) < tol && gt > 0) o.t = gt;
  }

  onsets.sort((p, q) => p.t - q.t);

  // snapping can stack two onsets on the same grid point; keep the stronger
  for (let i = onsets.length - 1; i > 0; i--) {
    if (onsets[i].t - onsets[i - 1].t < 0.012) {
      if (onsets[i].s > onsets[i - 1].s) onsets[i - 1] = onsets[i];
      onsets.splice(i, 1);
    }
  }
}