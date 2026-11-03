// audio.js — tiny synthesized sounds (no files yet). Sound only starts after a click,
// because browsers block audio before the player interacts. One global mute.
(function (UR) {
  "use strict";
  let ctx = null;
  let mystery = null;
  let muted = false;
  try { muted = localStorage.getItem("untilRooted.muted") === "1"; } catch (e) { /* ignore */ }

  // Create the audio context lazily, on the first sound after a click.
  function ac() {
    if (muted) return null;
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    return ctx;
  }

  // Play one short tone: frequency in Hz, start offset and length in seconds.
  function tone(freq, at, len, type, vol) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "square"; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.05, c.currentTime + at);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + len);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + at); o.stop(c.currentTime + at + len + 0.02);
  }

  const audio = {
    typeTick() { tone(1800 + Math.random() * 400, 0, 0.02, "square", 0.012); },
    alarm() { for (let i = 0; i < 4; i++) { tone(880, i * 0.36, 0.16); tone(660, i * 0.36 + 0.18, 0.16); } },
    chime() { tone(1318, 0, 0.25, "triangle", 0.06); tone(988, 0.12, 0.35, "triangle", 0.05); },
    sting(tone_) {
      if (tone_ === "good") [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.3, "triangle", 0.06));
      else if (tone_ === "bad") [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.18, 0.4, "sawtooth", 0.04));
      else [523, 494, 523].forEach((f, i) => tone(f, i * 0.14, 0.3, "triangle", 0.05));
    },
    // Mysterious background loop for background checks: a low drone and a slow minor arpeggio.
    startMystery() {
      audio.stopMystery();
      const c = ac(); if (!c) return;
      const g = c.createGain(); g.gain.value = 0.035; g.connect(c.destination);
      const drone = c.createOscillator(); drone.type = "sine"; drone.frequency.value = 55; drone.connect(g); drone.start();
      const notes = [220, 261.6, 329.6, 311.1, 261.6, 196];
      let i = 0;
      const step = () => tone(notes[i++ % notes.length], 0, 0.9, "triangle", 0.025);
      step();
      mystery = { g, drone, timer: setInterval(step, 900) };
    },
    stopMystery() {
      if (!mystery) return;
      clearInterval(mystery.timer);
      try { mystery.drone.stop(); mystery.g.disconnect(); } catch (e) { /* already stopped */ }
      mystery = null;
    },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      if (muted) audio.stopMystery();
      try { localStorage.setItem("untilRooted.muted", muted ? "1" : "0"); } catch (e) { /* ignore */ }
      return muted;
    }
  };

  UR.audio = audio;
})(window.UR = window.UR || {});
