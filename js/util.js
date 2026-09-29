"use strict";

const $ = (id) => document.getElementById(id);

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const lerp = (a,b,t) => a + (b-a) * t;
function makeFFT(n) {
  const levels = Math.round(Math.log2(n));
  if (1 << levels !== n) throw new Error("FFT size must be a power of two");

  // twiddle factors: n/2 points around the unit circle
  const cosT = new Float64Array(n / 2);
  const sinT = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cosT[i] = Math.cos((2 * Math.PI * i) / n);
    sinT[i] = Math.sin((2 * Math.PI * i) / n);
  }

  // where each input index has to move to
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let x = i, r = 0;
    for (let j = 0; j < levels; j++) {
      r = (r << 1) | (x & 1);     // shift r left, pull the low bit off x
      x >>>= 1;
    }
    rev[i] = r;
  }

  return function (re, im) {
    // 1. reorder into bit-reversed positions (swap once, not twice)
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }

    // 2. combine: pairs, then fours, then eights... up to n
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + half; j++, k += step) {
          const l = j + half;
          // multiply the upper half by the twiddle factor...
          const tre = re[l] * cosT[k] + im[l] * sinT[k];
          const tim = -re[l] * sinT[k] + im[l] * cosT[k];
          // ...then form the difference and the sum
          re[l] = re[j] - tre; im[l] = im[j] - tim;
          re[j] += tre;        im[j] += tim;
        }
      }
    }
  };
}