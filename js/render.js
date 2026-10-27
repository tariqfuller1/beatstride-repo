"use strict";

function drawBackground(){
    const L = layout()

    const g = cx.createLinearGradient(0,0,0,VH);
    g.addColorStop(0,"#05040f")
    g.addColorStop(0.52,"#120a29")
    g.addColorStop(1,"#07061a")

    cx.fillStyle = g;
    cx.fillRect(0,0,VW,VH);

    cx.strokeStyle="rgba(255,176,46,0.42)";
    cx.lineWidth=2;
    cx.beginPath()
    cx.moveTo(0,L.roadY + L.r);
    cx.lineTo(VW, L.roadY + L.r);
    cx.stroke();
    

    cx.setLineDash([3,11]);
    cx.strokeStyle = "rgba(65,230,255,0.26)";
    cx.lineWidth=1.5;
    cx.beginPath();
    cx.moveTo(0,L.skyY);
    cx.lineTo(VW,L.skyY);
    cx.stroke();
    cx.setLineDash([]);

};

function drawHitZone(){
    const L = layout();
    for (const lane of [LANE_SKY,LANE_ROAD]){
        const y = lane === LANE_SKY ? L.skyY : L.roadY
        const col = lane === LANE_SKY ? "65,230,255" : "255,176,46";
        const held = G.laneHeld[lane] > 0;

        cx.strokeStyle = "rgba("+col+","+(held ? 0.85:0.32) + ")";
        cx.lineWidth = held?3:2;
        cx.beginPath();
        cx.arc(L.hitX, y,L.r*1.32,0,Math.PI *2);
        cx.stroke();
    }
}

function trail(path, amt, rgb) {
  if (amt <= 0.03) return;
  cx.save();
  cx.fillStyle = "rgb(" + rgb + ")";
  for (let i = 1; i <= 4; i++) {
    const f = i / 5;
    const [tx, ty] = path(amt * f);      // where the hand was a moment ago
    cx.globalAlpha = 0.5 * amt * f;
    cx.beginPath();
    cx.arc(tx, ty, 6 * (0.5 + f * 0.5), 0, Math.PI * 2);
    cx.fill();
  }
  cx.restore();
}

/* Where each hand sits for a given amount of its swing, 0 = resting.
 * The trail reuses these, so the streak follows the hand's real path. */
function roadHand(p) {
  return [lerp(15, 26, p), lerp(-16, -10, p)];
}
function skyHand(u) {
  // bows out to the left before rising, so the arc clears the head
  return [lerp(-15, -13, u) - Math.sin(u * Math.PI) * 8, lerp(-16, -54, u)];
}

function hand(x, y) {
  cx.beginPath();
  cx.arc(x, y, 6, 0, Math.PI * 2);
  cx.fill();
  cx.stroke();
}

function drawRobot() {
const L=layout();
  const lift   = clamp(G.jump, 0, 1.25) * (L.roadY - L.skyY) * 0.86;
  const y      = L.roadY + L.r - lift;
  const s      = L.r / 22;
  // impact widens and flattens; rising stretches it tall
  const squash = 1 + G.stomp * 0.15 - clamp(G.jump, 0, 1.25) * 0.05;

  // shadow stays on the road and shrinks as the robot rises
  cx.save();
  cx.globalAlpha = clamp(0.34 - G.jump * 0.24, 0.04, 0.34);
  cx.fillStyle = "#000";
  cx.beginPath();
  cx.ellipse(L.hitX, L.roadY + L.r + 3, 19 * s * (1 - clamp(G.jump, 0, 1.25) * 0.3), 4.5 * s, 0, 0, Math.PI * 2);
  cx.fill();
  cx.restore();

  cx.save();
  cx.translate(L.hitX, y);
  cx.scale(s * squash, s / squash);
  cx.translate(0, Math.sin(G.t * 3.1) * 0.7 - clamp(G.jump, 0, 1.25) * 1.2);

  // where the hands are this frame: right jabs the road, left swings up
  const pr = Math.sin(clamp(G.punch, 0, 1) * Math.PI / 2);
  const up = Math.sin(clamp(G.upper, 0, 1) * Math.PI / 2);
  const [rx, ry] = roadHand(pr);
  const [lx, ly] = skyHand(up);

  // trails first, so they come out from behind the robot
  trail(skyHand,  up, "65,230,255");    // sky  — cyan
  trail(roadHand, pr, "255,176,46");    // road — amber

  cx.strokeStyle = SKIN.ink; cx.lineWidth = 2.4; cx.lineJoin = "round";

  // feet — tucked up under the body so the outlines merge
  cx.fillStyle = SKIN.body;
  roundRect(cx, -8.5, -8, 7, 7, 3); cx.fill(); cx.stroke();
  roundRect(cx,  1.5, -8, 7, 7, 3); cx.fill(); cx.stroke();

  // body, then a slightly darker chest panel
  cx.fillStyle = SKIN.body;
  roundRect(cx, -11, -28, 22, 22, 6); cx.fill(); cx.stroke();
  cx.fillStyle = "rgba(0,0,0,0.10)";
  roundRect(cx, -6, -23, 12, 9.5, 3.2); cx.fill();

  // antenna, set off-centre so the robot doesn't read as a symmetrical blob
  cx.strokeStyle = SKIN.ink; cx.lineWidth = 1.9; cx.lineCap = "round";
  cx.beginPath(); cx.moveTo(-5, -49); cx.lineTo(-7.5, -56); cx.stroke();
  cx.fillStyle = SKIN.accent;
  cx.beginPath(); cx.arc(-8, -58, 2.7, 0, Math.PI * 2); cx.fill();
  cx.lineWidth = 1.6; cx.stroke();

  // head — overlaps the body by one unit, so there is no neck seam
  cx.fillStyle = SKIN.body; cx.lineWidth = 2.4;
  roundRect(cx, -13, -50, 26, 23, 9); cx.fill(); cx.stroke();

  // side bolts
  cx.fillStyle = SKIN.body;
  for (const d of [-1, 1]) {
    cx.beginPath(); cx.arc(d * 13.6, -38, 2.2, 0, Math.PI * 2); cx.fill(); cx.stroke();
  }

  // face plate, then whichever expression is current
  cx.fillStyle = "rgba(0,0,0,0.10)";
  roundRect(cx, -10, -46.5, 20, 17, 7); cx.fill();
  cx.save();
  cx.translate(0, -38);
  (FACES[G.expr] || FACES.neutral)(cx);
  cx.restore();

  // hands last, on top of everything
  cx.fillStyle = SKIN.body; cx.strokeStyle = SKIN.ink; cx.lineWidth = 2.3;
  hand(lx, ly);
  hand(rx, ry);

  cx.restore();
}

function drawNote(nt, x, y, r){
    cx.save()
    cx.translate(x,y);

    if (nt.type === "hold") {                                  // <-- NEW
    const w = Math.max(4, nt.dur * G.pps);                   // <-- NEW
    cx.fillStyle = nt.lane === LANE_SKY                      // <-- NEW
      ? "rgba(65,230,255,0.6)" : "rgba(255,176,46,0.6)";     // <-- NEW
    cx.fillRect(0, -r * 0.43, w, r * 0.86);                  // <-- NEW
  }

    if(nt.lane == LANE_SKY){
        cx.rotate(Math.PI / 4)
        cx.fillStyle = "#41e6ff";
        const s = r *0.82
        cx.fillRect(-s,-s,s*2,s*2)
    }else{
        cx.fillStyle = "#ffb02e"
        cx.beginPath()
        cx.arc(0,0,r,0,Math.PI*2);
        cx.fill()
    }

    cx.strokeStyle = "rgba(255,255,255,0.75)";
    cx.lineWidth=1.6;
    cx.stroke();
    cx.restore();

}

function drawNotes(){
    const L = layout();
    const now = gameNow();

    G.pps = (VW + 70 - L.hitX) / G.approach;

    for (let i =0;i<G.notes.length;i++){
        const nt=G.notes[i];
        if (nt.judged) continue;
        const x = L.hitX + (nt.t-now) * G.pps;

        if(x>VW+140) break;

        if(x<-160) continue;
 
        drawNote(nt,x,nt.lane === LANE_SKY? L.skyY : L.roadY, L.r);
    }
}

function drawHUD(){
    const acc = G.weightJudged > 0 ? (G.weightEarned / G.weightJudged) * 100 : 100;

    cx.fillStyle = "#f4f1ff";
    cx.font = "700 " + Math.round(clamp(VH * 0.042, 18, 34 )) + "px system-ui";
    cx.textAlign = "left";
    cx.fillText(Math.round(G.score).toLocaleString(),16,40);

    cx.font = "500 13px system-ui";
    cx.fillStyle = "#a79fd4";
    cx.fillText(acc.toFixed(2) + "%",16,40);

    if (G.combo >= 3){
        const L = layout();
        cx.textAlign = "center"
        cx.fillStyle = "#ffe24d";
        cx.font = "700 " + Math.round(clamp(VH * 0.07,26,60)) + "px system-ui";
        cx.fillText(String(G.combo), L.hitX, L.skyY - L.r * 2.4);
    }
    cx.textAlign = "left";
}

function draw(){
    drawBackground();
    drawHitZone();
    drawNotes();
    drawRobot();
    drawHUD();
}