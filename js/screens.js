"use strict";

let SONG = null;

async function loadFromFile(file){
    audio();
    console.log("picked", file.name, file.type || "(no type)", file.size + " bytes");

    let buffer;
    try {
        const bytes = await file.arrayBuffer();
        buffer = await audio().decodeAudioData(bytes);
    } catch (e) {
        console.error("could not decode " + file.name + " — try converting it to mp3, m4a or wav. DRM-protected files can't be decoded at all.");
        return;
    }

    SONG = {name:file.name, duration:buffer.duration, buffer};
    Player.attach(buffer);
    console.log("decoded", SONG.name,
        buffer.duration.toFixed(1) + "s",
        buffer.sampleRate + "Hz",
        buffer.numberOfChannels + "ch"
    );

    
  const A = analyseByLoudness(buffer);                   
  CHART = { notes: A.onsets.map((o, i) => ({              
    t: o.t, lane: i % 2 === 0 ? LANE_ROAD : LANE_SKY, type: "tap" 
  })) };                                                  
}