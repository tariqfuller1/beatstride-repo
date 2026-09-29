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




function judgeHit(nt, d) {
  let res;
  if (d <= W_PERF) res = "perfect";
  else if (d <= W_GREAT) res = "great";
  else res = "good";

  nt.judged = true;
  nt.res = res;

  if (nt.type === "hold") {       // <-- NEW
    nt.hitAt = gameNow();         // <-- NEW
    nt.held = 0;                  // <-- NEW
    nt.broke = false;             // <-- NEW
    G.holds.push(nt);             // <-- NEW
  }                               // <-- NEW

  G.counts[res]++;
  G.combo++;
  if (G.combo > G.maxCombo) G.maxCombo = G.combo;

  const factor = res === "perfect" ? 1 : res === "great" ? 0.7 : 0.35;
  G.weightEarned += factor;
  G.weightJudged += 1;
  G.score += G.unit * factor * (1 + Math.min(G.combo, 100) / 400);

  if (nt.lane === LANE_SKY) G.jumpV = 5.3;
  else G.stomp = 1;
}

function judgeMiss(nt){
    nt.judged = true;
    nt.res = "miss";
    G.counts.miss++;
    G.combo = 0;
    G.hp -=5;
    G.weightJudged += 1;
}

function sweepMisses(){
    const now = gameNow();
    while (G.jIdx < G.notes.length && G.notes[G.jIdx].t + W_GOOD < now){
        const nt = G.notes[G.jIdx];
        if (!nt.judged) judgeMiss(nt);
        G.jIdx++;
    }

}


function setupScoring(){
    G.weightTotal = 0;
      for (const n of G.notes) G.weightTotal += n.type === "hold" ? 1.5 : 1;
    G.weightTotal = Math.max(1,G.weightTotal);
    G.unit = 1000000 / G.weightTotal;
    G.weightEarned = 0;
    G.weightJudged = 0;
    G.score = 0;
}

function rankFor(acc){

    if (acc >= 98) return "SSS";
    if (acc >= 95) return "SS";
    if (acc >= 90) return "S";
    if (acc >= 80) return "A";
    if (acc >= 70) return "B";
    if (acc >= 60) return "C";
    return "D";
}

const HOLD_GRACE = 0.09;   


function updateHolds(dt) {
  const now = gameNow();

  for (let i = G.holds.length - 1; i >= 0; i--) {
    const nt = G.holds[i];
    const end = nt.t + nt.dur;
    const on = G.laneHeld[nt.lane] > 0;

    if (!nt.broke) {
      if (on) {
        nt.held += dt;
        G.score += G.unit * 0.5 * (dt / Math.max(0.1, nt.dur));
      } else if (now > nt.hitAt + HOLD_GRACE && now < end - 0.05) {
        nt.broke = true;          // let go too early
        G.combo = 0;
      }
    }

    if (now > end) {
      const frac = clamp(nt.held / Math.max(0.001, nt.dur), 0, 1);
      G.weightEarned += 0.5 * frac;
      G.weightJudged += 0.5;
      if (frac > 0.9) {
        G.combo++;
        if (G.combo > G.maxCombo) G.maxCombo = G.combo;
      }
      G.holds.splice(i, 1);
    }
  }
}