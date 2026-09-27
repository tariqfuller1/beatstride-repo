"use strict";

let actx = null;

function audio(){
    if (!actx){
        const C = window.AudioContext || window.webkitAudioContext;
        actx = new C();
    }

    if (actx.state === "suspended") actx.resume();
    return actx
}

const Player = {
    buffer: null,
    source: null,
    startedAt: 0,

    attach(buffer){
        this.buffer = buffer;
    },

    play(fromSec, delaySec){
        const c = audio()
        this.stop();
        const src = c.createBufferSource();
        src.buffer = this.buffer;
        src.connect(c.destination);

        const when = c.currentTime + Math.max(0.03, delaySec || 0.03);
        src.start(when, Math.max(0, fromSec));

        this.source = src;

        this.startedAt = when - Math.max(0,fromSec);
    },

    stop(){
        if (this.source){
            try {this.source.stop();} catch (e) {}
            try {this.source.disconnect();} catch (e) {}
            this.source = null;
        } 
    },

    get time(){
        return audio().currentTime - this.startedAt;
    }

};

const SET = {offset:0};

