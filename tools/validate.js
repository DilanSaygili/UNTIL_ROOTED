// tools/validate.js — checks every level JSON and plays every possible path.
// Run: node tools/validate.js
// Checks (spec §7, §8, §9.8, §15): routing targets exist, option counts match the level rule,
// Master nodes have one "None of these" with teammate suggestions, Consult hints exist for every
// character, a fallback ending exists, and every ending is reachable. Prints one path per ending for docs/.
const fs = require("fs");
const path = require("path");
const engine = require("../js/engine.js").engine;

const root = path.join(__dirname, "..");
const index = JSON.parse(fs.readFileSync(path.join(root, "data/levels/index.json"), "utf8"));
const CHARACTERS = ["iris", "echo", "moritz", "jayson"];
const PASS = JSON.parse(fs.readFileSync(path.join(root, "data/tiers.json"), "utf8")).passPercent;

// A log puzzle needs one right line, enough wrong lines with explanations, and its feedback texts.
function checkPuzzle(key, pz) {
  if (pz.lines.filter(l => l.correct).length !== 1) fail(key + ": a log puzzle needs exactly one correct line");
  if (pz.lines.filter(l => !l.correct).length < pz.maxMisses) fail(key + ": a log puzzle needs at least maxMisses wrong lines");
  for (const l of pz.lines) if (!l.correct && !l.why) fail(key + ": every wrong log line needs a 'why'");
  for (const f of ["short", "revealedShort", "note", "revealedNote", "why"]) if (!pz[f]) fail(key + ": puzzle needs '" + f + "'");
  if (!(pz.points > 0) || !(pz.maxMisses > 0)) fail(key + ": puzzle needs points and maxMisses above 0");
}

// An alert queue needs real alerts and noise, a reason for every alert, a budget and its feedback texts.
function checkQueue(key, q) {
  const real = q.alerts.filter(a => a.real).length;
  if (!real || real === q.alerts.length) fail(key + ": an alert queue needs both real alerts and noise");
  if (!(q.budget >= real) || q.budget > q.alerts.length) fail(key + ": queue budget must be at least the number of real alerts");
  for (const [i, a] of q.alerts.entries()) {
    if (!a.why) fail(key + ": alert #" + (i + 1) + " needs a 'why'");
    if (a.real && !a.short) fail(key + ": real alert #" + (i + 1) + " needs a 'short'");
    if (!["low", "mid", "hi"].includes(a.sev)) fail(key + ": alert #" + (i + 1) + " needs sev low, mid or hi");
  }
  for (const f of ["note", "why"]) if (!q[f]) fail(key + ": queue needs '" + f + "'");
  if (!(q.points > 0)) fail(key + ": queue needs points above 0");
}

// A recovery-order puzzle needs items with reasons, one right order that uses every item once,
// "needs" that point at real items and that the right order respects, and its feedback texts.
function checkOrder(key, od) {
  const ids = od.items.map(i => i.id);
  if (od.items.length < 3) fail(key + ": an order puzzle needs at least 3 items");
  if (od.correct.length !== ids.length || !ids.every(id => od.correct.includes(id))) fail(key + ": 'correct' must list every item once");
  for (const it of od.items) {
    if (!it.label || !it.why) fail(key + ": item '" + it.id + "' needs a label and a why");
    for (const n of it.needs || []) if (!ids.includes(n)) fail(key + ": item '" + it.id + "' needs unknown item '" + n + "'");
  }
  if (engine.orderClashes(od, od.correct).length) fail(key + ": the right order brings an item back before something it needs");
  for (const f of ["note", "why"]) if (!od[f]) fail(key + ": order puzzle needs '" + f + "'");
  if (!(od.points > 0)) fail(key + ": order puzzle needs points above 0");
}

// A real-time spread counter needs its numbers and a one-off event for players who hesitate.
function checkSpread(key, sp) {
  for (const f of ["start", "total", "perSecond", "slowAfter"]) if (typeof sp[f] !== "number") fail(key + ": spread needs a number '" + f + "'");
  if (!sp.slowEvent || !sp.slowEvent.flag || !sp.slowEvent.text) fail(key + ": spread needs a slowEvent with a flag and text");
  if (!sp.label) fail(key + ": spread needs a label");
}

// Every ordering of a list (for order puzzles; 5 items = 120 orders).
function permutations(list) {
  if (list.length < 2) return [list];
  return list.flatMap((x, i) => permutations(list.slice(0, i).concat(list.slice(i + 1))).map(p => [x].concat(p)));
}

// Option count rule from spec §7 (the training drill, level 0, follows the Master rule).
function expectedOptions(n) { return n === 1 ? 2 : n === 2 ? 3 : 4; }

let problems = 0;
function fail(msg) { problems++; console.log("  ✗ " + msg); }

// Only levels marked ready have a JSON file; the rest are map placeholders.
const entries = index.levels.concat(index.bonus || [], index.demo || []).filter(l => l.ready);
for (const entry of entries) {
  const level = JSON.parse(fs.readFileSync(path.join(root, "data/levels", entry.id + ".json"), "utf8"));
  console.log("Level " + level.level + " · " + level.title);
  if (level.level !== entry.level || level.title !== entry.title) fail("index.json entry for " + entry.id + " does not match the level file");

  if (!level.license) fail("missing license field");
  if (!level.nodes[level.start.node]) fail("start node '" + level.start.node + "' missing");
  const fallback = level.endings[level.endings.length - 1];
  if (!fallback || fallback.if) fail("last ending must be a fallback with no 'if'");

  // Client service meters (Level 6): every "clients" effect must name a client the level lists.
  const clientIds = new Set((level.clients || []).map(c => c.id));
  for (const c of level.clients || []) if (!c.name || typeof c.start !== "number") fail("client '" + c.id + "' needs a name and a number 'start'");
  const effectsWithClients = [].concat(
    ...Object.values(level.nodes).map(n => (n.choices || []).map(c => c.effects || {})),
    ((level.attacker && level.attacker.events) || []));
  for (const fx of effectsWithClients) for (const k in fx.clients || {}) if (!clientIds.has(k)) fail("unknown client '" + k + "' in a clients effect");

  const master = level.tier === "master";
  let rightNone = 0;
  for (const [key, node] of Object.entries(level.nodes)) {
    for (const n of node.next || []) if (n.to !== "end" && !level.nodes[n.to]) fail(key + ": next.to '" + n.to + "' does not exist");
    if (node.puzzle) { checkPuzzle(key, node.puzzle); continue; }
    if (node.queue) { checkQueue(key, node.queue); continue; }
    if (node.order) { checkOrder(key, node.order); continue; }
    if (node.spread) checkSpread(key, node.spread);
    const shown = node.choices.filter(c => !c.if).length;
    if (shown !== expectedOptions(level.level)) fail(key + ": " + shown + " options, expected " + expectedOptions(level.level));
    for (const c of node.choices) if (!c.short || !c.why) fail(key + "/" + c.key + ": needs short and why");

    // "None of these": Master only, exactly one per Master node, with suggestions for every player.
    const nones = node.choices.filter(c => c.none);
    if (!master && nones.length) fail(key + ": 'None of these' is only for Master levels");
    if (master && nones.length !== 1) fail(key + ": Master nodes need exactly one 'None of these' choice");
    if (nones.length) {
      const sugs = node.noneSuggestions || [];
      if (new Set(sugs.map(s => s.by)).size < 3) fail(key + ": noneSuggestions need at least 3 different teammates, so any player sees two others");
      if ((nones[0].effects.points || 0) >= engine.noneRules(level).rightAt) {
        rightNone++;
        for (const ch of CHARACTERS) {
          const two = engine.suggestionsFor(node, { character: ch });
          if (two.length < 2) fail(key + ": playing " + ch + " shows fewer than two suggestions");
          if (!two.some(s => s.correct)) fail(key + ": playing " + ch + " shows no correct suggestion");
        }
      }
    }

    // Character-specific content must name a real character.
    for (const ch of Object.keys(node.notes || {})) if (!CHARACTERS.includes(ch)) fail(key + ": notes for unknown character " + ch);
    for (const c of node.choices) for (const ch of Object.keys(c.characterEffects || {}))
      if (!CHARACTERS.includes(ch)) fail(key + "/" + c.key + ": characterEffects for unknown character " + ch);

    // Consult hints: every character needs one, because the player sees the other three.
    if (node.consult) for (const ch of CHARACTERS) if (!node.consult[ch] || !node.consult[ch].hint) fail(key + ": consult hint missing for " + ch);
    if (node.consult && !master && Object.values(node.consult).some(h => h.misleading)) fail(key + ": misleading hints are only for Master levels");
  }
  if (master && !rightNone) fail("Master levels need at least one node where 'None of these' is right");

  // Play every path for every character (suggestions, hidden choices and weaknesses depend on who you play).
  const reached = {};
  function walk(state, trail) {
    if (state.node === "end") {
      const e = engine.ending(level, state);
      (reached[e.grade] = reached[e.grade] || []).push({ trail: state.character + " " + trail.join(""), pct: engine.percent(state, level) });
      return;
    }
    const node = level.nodes[state.node];
    // A log puzzle branches on how many wrong picks were made before solving (the last branch = answer shown).
    if (node.puzzle) {
      const wrong = node.puzzle.lines.map((l, i) => l.correct ? -1 : i).filter(i => i >= 0);
      const right = node.puzzle.lines.findIndex(l => l.correct);
      for (let k = 0; k <= node.puzzle.maxMisses; k++) {
        const copy = JSON.parse(JSON.stringify(state));
        for (let j = 0; j < k; j++) engine.guessLine(level, copy, wrong[j]);
        if (k < node.puzzle.maxMisses) engine.guessLine(level, copy, right);
        walk(copy, trail.concat("P" + k + " "));
      }
      return;
    }
    // An alert queue branches on which real alerts were found and how much time noise took.
    // Opening order inside a set doesn't change the outcome, so each set is walked once (noise first).
    if (node.queue) {
      const q = node.queue;
      const real = q.alerts.map((a, i) => a.real ? i : -1).filter(i => i >= 0);
      const noise = q.alerts.map((a, i) => a.real ? -1 : i).filter(i => i >= 0);
      for (let mask = 0; mask < (1 << real.length); mask++) {
        const set = real.filter((_, j) => mask & (1 << j));
        const all = set.length === real.length;
        const noiseCounts = all ? [...Array(q.budget - set.length + 1).keys()] : [q.budget - set.length];
        for (const k of noiseCounts) {
          const copy = JSON.parse(JSON.stringify(state));
          for (const i of noise.slice(0, k).concat(set)) engine.openAlert(level, copy, i);
          walk(copy, trail.concat("Q" + set.map(i => i + 1).join("+") + (k ? "n" + k : "") + " "));
        }
      }
      return;
    }
    // An order puzzle: 120 orders give only a handful of different outcomes (points, flags, meters),
    // so each different outcome is walked once. Extra minutes from false starts are left out of the
    // comparison: they only move the clock. (True for Level 11, where every timed event has fired by then;
    // add copy.clock to the signature if a later level has timed events after an order puzzle.)
    if (node.order) {
      const seen = new Set();
      for (const ids of permutations(node.order.correct)) {
        const copy = JSON.parse(JSON.stringify(state));
        const r = engine.solveOrder(level, copy, ids);
        const sig = JSON.stringify([copy.score, copy.flags, copy.meters, copy.bonus, copy.evidence, copy.fadeCarry]);
        if (seen.has(sig)) continue;
        seen.add(sig);
        walk(copy, trail.concat("O" + r.right + (r.clashes.length ? "x" + r.clashes.length : "") + " "));
      }
      return;
    }
    // A real-time spread node: every choice is walked twice, decided in time and too slowly ("~").
    const speeds = node.spread ? [0, engine.spreadFor(node.spread, state).slowAfter + 1] : [0];
    for (const c of engine.visibleChoices(node, state)) for (const secs of speeds) {
      const copy = JSON.parse(JSON.stringify(state));
      engine.spreadDelay(level, copy, secs);
      const r = engine.choose(level, copy, c.key);
      if (r.suggestions) {
        r.suggestions.forEach((s, i) => {
          const copy2 = JSON.parse(JSON.stringify(copy));
          engine.pickSuggestion(level, copy2, i);
          walk(copy2, trail.concat((secs ? "~" : "") + c.key + "/" + s.by[0]));
        });
      } else walk(copy, trail.concat((secs ? "~" : "") + c.key));
    }
  }
  // A hidden routine choice before the shift (introChoice) starts its own branch of paths.
  for (const ch of CHARACTERS) {
    const intro = level.introChoice ? level.introChoice.choices : [null];
    intro.forEach((c, i) => {
      const start = engine.createState(level, ch);
      if (c) { engine.applyEffects(c.effects, start); start.intro = { short: c.short || c.label }; }
      walk(start, c ? ["I" + String.fromCharCode(65 + i) + " "] : []);
    });
  }

  // Balance rule: a bad ending must never reach the pass mark, even with the evidence bonus.
  for (const e of level.endings) {
    const runs = reached[e.grade];
    if (!runs) fail("ending '" + e.grade + "' is unreachable");
    else if (e.tone === "bad" && runs.some(r => r.pct >= PASS)) {
      const top = runs.reduce((a, b) => (b.pct > a.pct ? b : a));
      fail("bad ending '" + e.grade + "' can pass: " + top.trail + " (" + top.pct + "%)");
    }
    else console.log("  ✓ " + e.grade.padEnd(22) + " e.g. " + runs[0].trail + " (" + runs[0].pct + "%), " + runs.length + " path(s)");
  }
  const all = Object.values(reached).flat();
  console.log("  paths: " + all.length + ", passing (≥70%): " + all.filter(r => r.pct >= 70).length +
              ", perfect: " + all.filter(r => r.pct === 100).length);
}

console.log(problems ? "\n" + problems + " problem(s) found." : "\nAll levels valid.");
process.exit(problems ? 1 : 0);
