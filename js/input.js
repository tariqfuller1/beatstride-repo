"use strict";


const KEY_LANE = {
  KeyD: LANE_SKY,  KeyK: LANE_SKY,  ArrowUp: LANE_SKY,
  KeyF: LANE_ROAD, KeyJ: LANE_ROAD, ArrowDown: LANE_ROAD
};

const downKeys = new Set();

window.addEventListener("keydown",(e) => {
    const lane = KEY_LANE[e.code];
    if(lane === undefined) return;

    e.preventDefault();

    if(downKeys.has(e.code)) return;

    downKeys.add(e.code);

    G.laneHeld[lane]++;
    tryHit(lane);
});

window.addEventListener("keyup",(e) => {
    const lane = KEY_LANE[e.code];
    if (lane === undefined) return;
    if(!downKeys.delete(e.code)) return;

    G.laneHeld[lane] = Math.max(0,G.laneHeld[lane] -1);
});

window.addEventListener("blur",() => {
    downKeys.clear()
    G.laneHeld = [0,0];
});