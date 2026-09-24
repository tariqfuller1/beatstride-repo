"use strict";

function tryHit(lane){
    if (!G.running) return;
    const now = gameNow();

    let best = -1, bestDist = 1e9;
    for (let i = G.jIdx; i < G.notes.length; i++){
        const nt = G.notes[i];

        if(nt.t - now > W_GOOD) break;
        if(nt.judged || nt.lane !== lane) continue;

        const d = Math.abs(nt.t - now);
        if (d<= W_GOOD && d<bestDist){
            bestDist=d;
            best = i;
        }
        
    }

    if (best < 0) return;
    judgeHit(G.notes[best],bestDist);
}




function judgeHit(nt,d){
    let res;
    if (d<=W_PERF) res = "perfect";
    else if (d<=W_GREAT) res = "great";
    else res = "good";

    nt.judged = true;
    nt.res = res;
    G.counts[res]++;
    G.combo++;
    if (G.combo > G.maxCombo) G.maxCombo = G.combo;


    if (nt.lane === LANE_SKY) g.jumpV = 5.3;
    else G.stomp = 1;
}

function judgeMiss(nt){
    nt.judged = true;
    nt.res = "miss";
    G.counts.miss++;
    G.combo = 0;
    G.hp -=5;
}

function sweepMisses(){
    const now = gameNow();
    while (G.jIdx < G.notes.length && G.notes[G.jIdx].t + W_GOOD < now){
        const nt = G.notes[G.jIdx];
        if (!nt.judged) judgeMiss(nt);
        G.jIdx++;
    }

}