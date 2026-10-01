"use strict";

const LANE_ROAD = 0

const LANE_SKY = 1

const W_PERF = 0.058;
const W_GREAT = 0.110;
const W_GOOD = 0.170;

const G={
    running:false,
    notes:[],
    jIdx:0,
    laneHeld:[0,0], 
    t:0,
    pps:600,
    approach: 1.5,
    combo: 0,
    maxCombo:0,
    hp: 100,
    counts : {perfect:0,great:0,good:0,miss:0},
    jumpV:0,
    jump:0,
    stomp:0,
    punch: 0,
    upper: 0,
    expr:"neutral",
    exprT: 0,
    holds : []
};