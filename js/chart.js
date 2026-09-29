"use strict";

const DIFFS = [
  { key: "easy",   name: "Easy",   minGap: 0.300, keep: 0.62, holds: true },
  { key: "normal", name: "Normal", minGap: 0.172, keep: 0.40, holds: true },
  { key: "hard",   name: "Hard",   minGap: 0.108, keep: 0.17, holds: true },
  { key: "expert", name: "Expert", minGap: 0.072, keep: 0.02, holds: false }
];

let CHART = { notes: [] };

/* average loudness between two times — used to spot sustained passages */
function rmsBetween(A, t0, t1) {
  const i0 = clamp(Math.floor(t0 / A.frameTime), 0, A.nFrames - 1);
  const i1 = clamp(Math.ceil(t1 / A.frameTime), 0, A.nFrames - 1);
  if (i1 <= i0) return A.rms[i0] || 0;
  let s = 0;
  for (let i = i0; i <= i1; i++) s += A.rms[i];
  return s / (i1 - i0 + 1);
}

function buildChart(A, diffKey, leadIn) {
  const D = DIFFS.find((d) => d.key === diffKey) || DIFFS[1];
  const src = A.onsets;
  if (!src.length) return { notes: [], diff: D, bpm: A.bpm };

  /* D.keep is a percentile, not a fraction to keep, despite the name.
     sorted is ascending, so a HIGH keep (Easy: 0.62) walks far up the list
     and leaves only the loudest ~38%; a LOW keep (Expert: 0.02) sits near
     the bottom and lets almost everything through. */
  const sorted = src.map((o) => o.s).sort((a, b) => a - b);
  const cut = sorted[Math.floor(D.keep * (sorted.length - 1))] || 0;

  // pass 1 — thin to playable spacing
  const cand = [];
  let lastT = -99;
  for (const o of src) {
    if (o.s < cut) continue;
    if (o.t < leadIn) continue;               // no notes before the player can see them
    if (o.t - lastT < D.minGap) continue;
    lastT = o.t;
    cand.push(o);
  }
  if (!cand.length) return { notes: [], diff: D, bpm: A.bpm };

  // pass 2 — lanes, by rank of bass-ness
  const ratios = cand.map((o) => {
    const bright = o.hi * 0.8 + o.mi * 0.6;
    return o.lo / (o.lo + bright + 1e-9);     // +tiny to never divide by zero
  });
  const order = ratios.map((r, i) => i).sort((a, b) => ratios[a] - ratios[b]);
  const rank = new Int32Array(ratios.length);
  for (let i = 0; i < order.length; i++) rank[order[i]] = i;
  const split = ratios.length / 2;

  const kept = [];
  let lane = LANE_ROAD, run = 0;
  for (let i = 0; i < cand.length; i++) {
    const o = cand[i];
    let want = rank[i] >= split ? LANE_ROAD : LANE_SKY;
    // break up long runs in one lane — nine in a row is tedious to play
    if (want === lane) { run++; if (run >= 9) { want = 1 - lane; run = 0; } }
    else run = 0;
    lane = want;
    kept.push({ t: o.t, lane, s: o.s, rel: o.rel, type: "tap", dur: 0 });
  }

  // pass 3 — sustained gaps become holds
  if (D.holds) {
    for (let i = 0; i < kept.length; i++) {
      const k = kept[i];
      const nextT = i + 1 < kept.length ? kept[i + 1].t : k.t + 3;
      const gap = nextT - k.t;
      if (gap < 0.66) continue;

      const hold = Math.min(gap - 0.18, 2.2);
      if (hold < 0.42) continue;

      // is the audio actually still going during that gap?
      const during = rmsBetween(A, k.t + 0.08, k.t + hold);
      const around = rmsBetween(A, Math.max(0, k.t - 1.2),
                                   Math.min(A.duration, k.t + 1.2));
      if (around > 0 && during > around * 0.52) {
        k.type = "hold";
        k.dur = hold;
      }
    }
  }

  return { notes: kept, diff: D, bpm: A.bpm };
}