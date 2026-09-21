"use strict";

const cv = $("game")
const cx = cv.getContext("2d")

let VW = 0, VH =0,DPR =1;

function resize(){
    DPR = Math.min(2,window.devicePixelRatio || 1);
    VW = cv.clientWidth || window.innerWidth;
    VH = cv.clientHeight || window.innerHeight;

    cv.width = Math.round(VW*DPR);
    cv.height = Math.round(VH*DPR);

    cx.setTransform(DPR,0,0,DPR,0,0);
}

window.addEventListener("resize",resize);

function layout(){
    const hitX = Math.max(64, VW * 0.19);
    const skyY = VH * 0.37;
    const roadY = VH * 0.70;
    const r = clamp(Math.min(VW,VH) * 0.048,15,33);

    return {hitX, skyY, roadY,r};

}


