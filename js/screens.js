"use strict";

let SONG = null;
let ANALYSIS = null;                     // <-- NEW

async function loadFromFile(file) {
  audio();
  const bytes = await file.arrayBuffer();
  const buffer = await audio().decodeAudioData(bytes);

  SONG = { name: file.name, duration: buffer.duration, buffer };
  Player.attach(buffer);
  console.log("decoded", SONG.name,
              buffer.duration.toFixed(1) + "s",
              buffer.sampleRate + "Hz",
              buffer.numberOfChannels + "ch");

  const A = await analyseBuffer(buffer, (p) =>          // <-- changed
    console.log("analysing", Math.round(p * 100) + "%"));
  ANALYSIS = A;                                         // <-- NEW
  console.log("onsets:", A.onsets.length,
              "| bpm", A.bpm,
              "| confidence", A.tempoConfidence.toFixed(2));           // <-- NEW

   CHART = buildChart(A, "normal", 0.35);                         // <-- changed
  console.log(CHART.notes.length, "notes at", A.bpm, "BPM");     // <-- NEW
  for (const d of DIFFS) {                                       // <-- NEW
    console.log("  " + d.name, buildChart(A, d.key, 0.35).notes.length, "notes");
  }
}

