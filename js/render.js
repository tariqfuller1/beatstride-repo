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


function drawRunner(){
    const L = layout();
    const y = L.roadY + L.r;

    cx.save();
    cx.translate(L.hitX,y);

    cx.fillStyle="#fff4e6";
    cx.strokeStyle="#180a2e";
    cx.lineWidth=2.4;
    cx.beginPath()
    cx.arc(0,-34,9,0,Math.PI*2);
    cx.fill()
    cx.stroke();
    cx.beginPath();
    cx.rect(-8,-24,16,17);
    cx.fill();
    cx.stroke();

    cx.restore();


}

function drawNote(nt, x, y, r){
    cx.save()
    cx.translate(x,y);

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

function draw(){
    drawBackground();
    drawHitZone();
    drawNotes();
    drawRunner();
}