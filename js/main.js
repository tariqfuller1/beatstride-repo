"use strict";


let lastTs = 0;

function update(dt){
    G.t += dt;
    sweepMisses();

    G.jumpV -= 14*dt;
    G.jump += G.jumpV*dt;

    if (G.jump < 0) {G.jump = 0;G.jumpV = 0;}

    G.stomp = Math.max(0,G.stomp - dt * 5)
}

function gameNow(){
    return Player.time + SET.offset / 1000;
}

// function draw(){
//     cx.clearRect(0,0,VW,VH);

//     const L = layout();
//     cx.fillStyle = "#ff3f93"
//     cx.fillRect(testX, L.skyY - 20,40,40);
// }

function startRun(){
    G.notes = CHART.notes.map((n) => ({...n,judged:false,res:null}));
    G.jIdx = 0
    G.approach = 1.5;
    const leadIn = G.approach + 0.8;
    Player.play(0,leadIn);
    G.running = true

    G.combo = 0; G.maxCombo = 0; G.hp = 100;
    G.counts = {perfect:0,great:0,good:0,miss:0};
    G.jump= 0; G.jumpV = 0; G.stomp = 0;
    setupScoring();
}


function frame(ts){
    const dt = clamp(lastTs ? (ts - lastTs)/1000:0.016,0,0.05);
    lastTs=ts;

    update(dt);
    draw();
    requestAnimationFrame(frame);

}

$("file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) loadFromFile(f);
})

$("startBtn").addEventListener("click", () => {
    if (!SONG) {console.log("pick a file first"); return;}
    startRun();
})

resize();
requestAnimationFrame(frame);
