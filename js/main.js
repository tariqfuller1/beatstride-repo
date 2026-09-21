"use strict";


let lastTs = 0;

function update(dt){
    G.t += dt;
}

function gameNow(){
    return G.t;
}

// function draw(){
//     cx.clearRect(0,0,VW,VH);

//     const L = layout();
//     cx.fillStyle = "#ff3f93"
//     cx.fillRect(testX, L.skyY - 20,40,40);
// }

function startRun(){
    CHART = makeTestChart();
    G.notes = CHART.notes.map((n) => ({...n,judged:false,res:null}));
    G.jIdx = 0
    G.t = 0
    G.running = true
}


function frame(ts){
    const dt = clamp(lastTs ? (ts - lastTs)/1000:0.016,0,0.05);
    lastTs=ts;

    update(dt);
    draw();
    requestAnimationFrame(frame);

}

resize();
startRun();
requestAnimationFrame(frame)