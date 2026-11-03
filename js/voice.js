// voice.js — spoken lines with the browser's own speech synthesis (Web Speech API), no audio files.
// v2.0 (update doc): the ending's phone call is heard, not read. Each character gets a voice that
// suits them (characters.json "voice": gender, language, pitch, rate). Which voices exist depends on the
// device and browser, so the choice is a best match. When speech is unavailable or sound is off,
// say() reports spoken: false and the caller can show the line as text instead.
(function (UR) {
  "use strict";

  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const FEMALE = /female|samantha|karen|moira|tessa|victoria|fiona|serena|kate|susan|zira|hazel|aria|jenny|libby|sonia|emma|amy|ava|allison|joanna|salli|kimberly|nora|martha|catherine|google us english$/i;
  const MALE = /\bmale|daniel|alex\b|fred|arthur|oliver|\btom\b|rishi|aaron|david|mark|george|guy|ryan|thomas|brian|matthew|justin|joey|eddy|reed|rocko|ralph|bruce|lee\b/i;
  const chosen = {}; // character id → voice, so a character keeps one voice for the whole scene

  function voices() { return synth ? synth.getVoices() : []; }

  // Voices load late in some browsers; wait for them at most a second.
  function ready() {
    return new Promise(resolve => {
      if (!synth) return resolve([]);
      if (voices().length) return resolve(voices());
      const done = () => { synth.removeEventListener && synth.removeEventListener("voiceschanged", done); resolve(voices()); };
      if (synth.addEventListener) synth.addEventListener("voiceschanged", done);
      setTimeout(done, 1000);
    });
  }

  // Score each English voice for this character: same language and gender first, never the voice
  // another character in the scene already uses.
  function pick(id) {
    if (chosen[id]) return chosen[id];
    const want = (UR.data && UR.data.characters[id] && UR.data.characters[id].voice) || {};
    const taken = Object.values(chosen);
    const list = voices().filter(v => /^en/i.test(v.lang));
    let best = null, bestScore = -1;
    list.forEach(v => {
      let s = 0;
      if (want.lang && v.lang.replace("_", "-").toLowerCase() === want.lang.toLowerCase()) s += 3;
      if (want.gender === "female" && FEMALE.test(v.name) && !/\bmale/i.test(v.name.replace(/female/i, ""))) s += 4;
      if (want.gender === "male" && MALE.test(v.name) && !FEMALE.test(v.name)) s += 4;
      if (taken.includes(v)) s -= 6;
      if (v.localService) s += 1;
      if (s > bestScore) { best = v; bestScore = s; }
    });
    chosen[id] = best;
    return best;
  }

  // Speak one line as a character. Resolves when the line ends: { spoken: true|false }.
  // A safety timer resolves too, because some browsers never fire "end".
  async function say(id, text, opts) {
    opts = opts || {};
    if (!synth || UR.audio.muted || typeof SpeechSynthesisUtterance === "undefined") return { spoken: false };
    await ready();
    return new Promise(resolve => {
      const want = (UR.data.characters[id] && UR.data.characters[id].voice) || {};
      const u = new SpeechSynthesisUtterance(text);
      const v = pick(id);
      if (v) { u.voice = v; u.lang = v.lang; } else if (want.lang) u.lang = want.lang;
      u.pitch = want.pitch || 1;
      u.rate = (want.rate || 1) * (opts.rate || 1);
      u.volume = opts.volume == null ? 1 : opts.volume;
      let finished = false;
      const end = spoken => { if (finished) return; finished = true; clearTimeout(guard); resolve({ spoken }); };
      const guard = setTimeout(() => end(true), 1500 + text.split(/\s+/).length * 520);
      u.onend = () => end(true);
      u.onerror = () => end(false);
      synth.speak(u);
    });
  }

  function stop() { if (synth) synth.cancel(); }
  function reset() { for (const k in chosen) delete chosen[k]; }
  function available() { return !!synth && !UR.audio.muted && typeof SpeechSynthesisUtterance !== "undefined"; }

  UR.voice = { say, stop, reset, available };
})(window.UR = window.UR || {});
