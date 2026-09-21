"use strict";

const $ = (id) => document.getElementById(id);

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const lerp = (a,b,t) => a + (b-a) * t;

