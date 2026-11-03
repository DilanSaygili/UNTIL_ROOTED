// save.js — progress in localStorage. Every access is wrapped in try/catch because
// storage can be blocked (private windows, previews); the game then simply forgets on reload.
(function (UR) {
  "use strict";

  const KEY = "untilRooted.save.v1";

  // The shape of a brand-new save, so missing fields always have a value.
  function blank() {
    return { started: false, character: null, title: "Script Rookie", unlocked: 1, tipTokens: 0, best: {}, tipEarned: {} };
  }

  // Start a new run: progress is wiped, the character is picked again (spec §4.1).
  function newGame() {
    memory = blank();
    persist();
  }

  // Lock in the chosen character for the whole run.
  function setCharacter(id) {
    memory.character = id;
    memory.started = true;
    persist();
  }

  let memory = blank();

  // Load the save once at boot; fall back to the in-memory default.
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) memory = Object.assign(blank(), JSON.parse(raw));
    } catch (e) { /* storage unavailable: keep defaults */ }
    return memory;
  }

  // Write the current save; failure is harmless.
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) { /* ignore */ }
  }

  // Record a finished level and apply the title, unlock and tip-token rules (spec §4.5, §6, §8).
  // Returns what changed so the report can announce it.
  function recordResult(levelNumber, levelId, pct, tiers) {
    const out = { passed: pct >= tiers.passPercent, newTitle: null, unlocked: null, tipToken: false };
    const prev = memory.best[levelId] || 0;
    if (pct > prev) memory.best[levelId] = pct;
    if (out.passed) {
      // The bonus level (13) has no title of its own, so passing it keeps the current one.
      const title = tiers.titles[levelNumber - 1];
      const currentRank = tiers.titles.indexOf(memory.title);
      if (title && levelNumber - 1 >= currentRank) { out.newTitle = title; memory.title = title; }
      if (memory.unlocked < levelNumber + 1) { memory.unlocked = levelNumber + 1; out.unlocked = levelNumber + 1; }
    }
    // Max one token per level, earned only once.
    if (pct === 100 && !memory.tipEarned[levelId]) {
      memory.tipEarned[levelId] = true;
      memory.tipTokens += 1;
      out.tipToken = true;
    }
    persist();
    return out;
  }

  // The furthest level the player can open. A level that is not built yet is skipped over when a built
  // level comes after it, so one missing level never blocks the rest of the game.
  function reachable(levels) {
    let n = memory.unlocked;
    const built = k => levels.some(l => l.level === k && l.ready);
    while (!built(n) && levels.some(l => l.level > n && l.ready)) n++;
    return n;
  }

  UR.save = { load, persist, newGame, setCharacter, recordResult, reachable, get data() { return memory; } };
})(window.UR = window.UR || {});
