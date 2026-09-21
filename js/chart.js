"use strict";

let CHART = {notes:[]};

function makeTestChart(){
    const notes = [];

    for(let i = 0; i<60; i++){
        notes.push({
            t: 2+i *0.5,
            lane: i%2===0 ? LANE_ROAD : LANE_SKY,
            type:"tap"
        });
    }

    return {notes};
}