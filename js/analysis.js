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



function analyseByLoudness(buffer){
    const {mono,anSr} = toMonoLowRate(buffer);
    const nFrames = Math.max(1 , Math.floor((mono.length - FRAME)/HOP) + 1);

    const frameTime = HOP / anSr;
    const rms = new Float32Array(nFrames);

    for (let f = 0; f<nFrames; f++){
        const start = f * HOP;
        let energy = 0;
        for (let i = 0; i < FRAME; i++){
            const s = mono[start + i] || 0;
            energy += s * s;
        }

        rms[f] = Math.sqrt(energy / FRAME);
    }

    const onsets = [];

    let last = -99;
    for ( let f =1 ; f < nFrames; f++){
        const rise = rms[f] - rms[f-1];
        const t = f * frameTime;
        if (rise > 0.02 && t - last > 0.12){
            onsets.push({t,s:rise});
            last = t;
        }
    }

     console.log("loudness onsets:", onsets.length,
              "over", (nFrames * frameTime).toFixed(1) + "s");
  return { onsets, frameTime, nFrames, rms, duration: buffer.duration };

}