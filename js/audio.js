// audio.js — tiny synthesized sounds (no files). Sound only starts after a click,
// because browsers block audio before the player interacts. One global mute.
// v2.0: title-button clicks, a fanfare for a new title, phone sounds for the ending, and the
// level music: a tension loop that only plays inside a level and follows how the player is doing.
(function (UR) {
  "use strict";
  let ctx = null;
  let mystery = null;
  let music = null;
  let muted = false;
  try { muted = localStorage.getItem("untilRooted.muted") === "1"; } catch (e) { /* ignore */ }

  // Create the audio context lazily, on the first sound after a click.
  function ac() {
    if (muted) return null;
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  // Play one short tone: frequency in Hz, start offset and length in seconds.
  // dest lets the level music route its notes through its own volume.
  function tone(freq, at, len, type, vol, dest) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "square"; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.05, c.currentTime + at);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + len);
    o.connect(g).connect(dest || c.destination);
    o.start(c.currentTime + at); o.stop(c.currentTime + at + len + 0.02);
  }

  // A short burst of filtered noise (hi-hat ticks, glitch crackle).
  function noise(at, len, vol, freq, dest) {
    const c = ac(); if (!c) return;
    const n = Math.max(1, Math.floor(c.sampleRate * len));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = freq || 6000;
    const g = c.createGain(); g.gain.value = vol || 0.03;
    src.connect(f).connect(g).connect(dest || c.destination);
    src.start(c.currentTime + at);
  }

  // A soft kick: a sine that drops in pitch (the music's heartbeat).
  function thump(at, vol, dest) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    const t = c.currentTime + at;
    o.type = "sine"; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(dest || c.destination);
    o.start(t); o.stop(t + 0.32);
  }

  // Phone keypad tones (DTMF): two frequencies per key.
  const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477],
                 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], 0: [941, 1336] };

  // ---- Level music. Why (update doc, v2.0): background sound only while a level is played, to build
  // tension and curiosity, and it changes with the result of each choice. tension runs 0..1:
  // higher means a faster heartbeat, a brighter, more dissonant pad and ticking hi-hats. ----
  const SCALE = [0, 3, 5, 7, 10, 12, 15];   // minor pentatonic-ish, over A (110 Hz)
  function startMusic(tension) {
    stopMusic();
    const c = ac(); if (!c) { music = { tension: tension == null ? 0.45 : tension, silent: true }; return; }
    const out = c.createGain(); out.gain.value = 0; out.connect(c.destination);
    out.gain.linearRampToValueAtTime(1, c.currentTime + 2.5);
    // The pad: two detuned saws through a low-pass filter. Tension opens the filter.
    const filter = c.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 400; filter.Q.value = 6;
    const padGain = c.createGain(); padGain.gain.value = 0.018;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator();
    o1.type = o2.type = "sawtooth"; o3.type = "sine";
    o1.frequency.value = 55; o2.frequency.value = 55.4; o3.frequency.value = 55 * Math.pow(2, 6 / 12); // tritone: unease
    const o3g = c.createGain(); o3g.gain.value = 0;
    o1.connect(filter); o2.connect(filter); o3.connect(o3g).connect(filter);
    filter.connect(padGain).connect(out);
    [o1, o2, o3].forEach(o => o.start());
    music = { out, filter, o3g, oscs: [o1, o2, o3], tension: tension == null ? 0.45 : tension, step: 0, timer: null };
    applyTension(true);
    const tick = () => {
      if (!music || !music.out) return;
      const T = music.tension;
      const s = music.step++;
      if (s % 4 === 0) thump(0, 0.05 + T * 0.05, out);
      if (s % 4 === 1 && T > 0.55) thump(0, 0.03 + T * 0.03, out);              // double beat when tense
      if (T > 0.35 && s % 2 === 1) noise(0, 0.03, 0.006 + T * 0.01, 7000, out);   // ticking clock
      if (s % (T > 0.6 ? 3 : 6) === 0) {
        const n = SCALE[(s * 5 + Math.floor(s / 7)) % SCALE.length];
        tone(220 * Math.pow(2, n / 12), 0, 0.5 + (1 - T) * 0.8, "triangle", 0.012 + T * 0.008, out);
      }
      // Beat length: about 82 bpm when calm, up to about 138 bpm at full tension (in 8th notes).
      const ms = 60000 / (82 + T * 56) / 2;
      music.timer = setTimeout(tick, ms);
    };
    tick();
  }

  // Move the pad and filter to the current tension.
  function applyTension(now) {
    if (!music || !music.out || !ctx) return;
    const T = music.tension, t = ctx.currentTime + (now ? 0 : 1.5);
    music.filter.frequency.linearRampToValueAtTime(300 + T * 1500, t);
    music.o3g.gain.linearRampToValueAtTime(T > 0.5 ? (T - 0.5) * 1.2 : 0, t);
  }

  // Nudge the tension: a good call relaxes it, a bad call or a butterfly effect raises it.
  function setTension(v) {
    if (!music) return;
    music.tension = Math.max(0.1, Math.min(1, v));
    applyTension(false);
  }

  function stopMusic() {
    if (!music) return;
    const m = music; music = null;
    clearTimeout(m.timer);
    if (!m.out || !ctx) return;
    try {
      m.out.gain.cancelScheduledValues(ctx.currentTime);
      m.out.gain.setValueAtTime(m.out.gain.value, ctx.currentTime);
      m.out.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      m.oscs.forEach(o => o.stop(ctx.currentTime + 0.7));
      setTimeout(() => { try { m.out.disconnect(); } catch (e) { /* gone */ } }, 900);
    } catch (e) { /* already stopped */ }
  }

  const audio = {
    typeTick() { tone(1800 + Math.random() * 400, 0, 0.02, "square", 0.012); },
    // A small click for the title-screen buttons (update doc, v2.0).
    click() { tone(1250, 0, 0.05, "square", 0.035); tone(1850, 0.035, 0.06, "triangle", 0.03); },
    // Digital crackle for glitch effects.
    glitch() { noise(0, 0.12, 0.05, 2500); tone(180, 0, 0.08, "sawtooth", 0.03); tone(90, 0.09, 0.1, "square", 0.025); noise(0.16, 0.08, 0.04, 4000); },
    alarm() { for (let i = 0; i < 4; i++) { tone(880, i * 0.36, 0.16); tone(660, i * 0.36 + 0.18, 0.16); } },
    chime() { tone(1318, 0, 0.25, "triangle", 0.06); tone(988, 0.12, 0.35, "triangle", 0.05); },
    // A short fanfare for "New title earned".
    fanfare() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.11, i === 6 ? 0.7 : 0.18, "triangle", 0.06)); },
    sting(tone_) {
      if (tone_ === "good") [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.3, "triangle", 0.06));
      else if (tone_ === "bad") [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.18, 0.4, "sawtooth", 0.04));
      else [523, 494, 523].forEach((f, i) => tone(f, i * 0.14, 0.3, "triangle", 0.05));
    },
    // The ending: the computer powers down, keys are dialled, the line rings.
    powerDown() { const c = ac(); if (!c) return; const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(900, c.currentTime); o.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.5);
      g.gain.setValueAtTime(0.04, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.55);
      o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.6); },
    dial(digit) { const f = DTMF[digit] || DTMF[0]; tone(f[0], 0, 0.14, "sine", 0.03); tone(f[1], 0, 0.14, "sine", 0.03); },
    ring() { [0, 0.45].forEach(at => { tone(440, at, 0.38, "sine", 0.025); tone(480, at, 0.38, "sine", 0.025); }); },
    footstep() { thump(0, 0.025); },
    door() { thump(0, 0.06); noise(0.02, 0.1, 0.02, 1500); },
    ding() { tone(1568, 0, 0.6, "sine", 0.05); tone(1318, 0.25, 0.8, "sine", 0.045); },
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
    startMusic, stopMusic, setTension,
    get tension() { return music ? music.tension : null; },
    get musicOn() { return !!music; },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      if (muted) {
        audio.stopMystery();
        // Keep the level's tension so the music comes back at the same mood when sound is turned on again.
        if (music) { const t = music.tension; stopMusic(); music = { tension: t, silent: true }; }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } else if (music && music.silent) startMusic(music.tension);
      try { localStorage.setItem("untilRooted.muted", muted ? "1" : "0"); } catch (e) { /* ignore */ }
      return muted;
    }
  };

  UR.audio = audio;
})(window.UR = window.UR || {});
