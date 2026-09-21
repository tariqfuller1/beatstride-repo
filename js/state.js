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
    approach: 1.5
};