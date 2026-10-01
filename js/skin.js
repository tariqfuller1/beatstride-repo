"use strict";

const SKIN = {
    body: "#ffffff",
    ink: "1b1033",
    accent: "41e6ff",
}


const FACES = {
    neutral(cx){
         cx.fillStyle = SKIN.ink;
    for (const d of [-1, 1]) { cx.beginPath(); cx.arc(d * 5, -1.5, 2.2, 0, Math.PI * 2); cx.fill(); }
    cx.strokeStyle = SKIN.ink; cx.lineWidth = 1.5; cx.lineCap = "round";
    cx.beginPath(); cx.moveTo(-2.6, 4.6); cx.lineTo(2.6, 4.6); cx.stroke();
    },


    perfect(cx){
        cx.strokeStyle = SKIN.ink; cx.lineWidth = 2.0; cx.lineCap = "round";
        for (const d of [-1,1]){
            cx.beginPath(); cx.arc(d*5, -0.2,2.8,Math.PI * 1.12, Math.PI * 1.88); cx.stroke();
        }
        cx.beginPath(); cx.arc(0,1.4,3.3,Math.PI * 0.16, Math.PI * 0.84); cx.stroke();
        cx.fillStyle = SKIN.accent;
        for (const [sx, sy, sr] of [[-8.6,-5.6,1.60],[8.6,-4.8,1.2]]){
            cx.beginPath(); cx.arc(sx,sy,sr,0,Math.PI * 2); cx.fill();
        }
    },

    good(cx) {
    cx.fillStyle = SKIN.ink;
    for (const d of [-1, 1]) { cx.beginPath(); cx.arc(d * 5, -1.5, 2.2, 0, Math.PI * 2); cx.fill(); }
    cx.strokeStyle = SKIN.ink; cx.lineWidth = 1.6; cx.lineCap = "round";
    cx.beginPath(); cx.arc(0, 2.0, 2.7, Math.PI * 0.2, Math.PI * 0.8); cx.stroke();
  },

  miss(cx){
    cx.strokeStyle = SKIN.ink; cx.lineWidth = 1.9; cx.lineCap = "round";
    for (const d of [-1,1]){
        const ex = d*5;
        cx.beginPath(); cx.moveTo(ex - 2.3, -3.8); cx.lineTo(ex + 2.3, 0.4); cx.stroke();
        cx.beginPath(); cx.moveTo(ex + 2.3, -3.8); cx.lineTo(ex - 2.3, 0.4); cx.stroke();
    }
    cx.lineWidth = 1.6;
    cx.beginPath(); cx.arc(0,6.6,2.9,Math.PI * 1.18,Math.PI * 1.82); cx.stroke();
  },

};


function setExpr(name,secs){
    G.expr = name;
    G.exprT = secs;
}