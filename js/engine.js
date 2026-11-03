// engine.js — game rules: state, conditions, effects, routing, attacker timer, scoring.
// No DOM code lives here, so the same rules can be tested from Node (tools/validate.js).
(function (UR) {
  "use strict";

  const METERS = ["C", "I", "A", "R"];

  // Turn "09:12" into minutes since midnight, because the clock is stored as a number.
  function parseClock(hhmm) {
    const [h, m] = String(hhmm).split(":").map(Number);
    return h * 60 + m;
  }

  // Turn minutes since midnight back into "09:12" for display.
  function formatClock(minutes) {
    const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }

  // Build a fresh state for one play of a level, so retries always start clean.
  function createState(level, character) {
    return {
      clock: parseClock(level.start.clock),
      meters: { C: 100, I: 100, A: 100, R: 100 },
      evidence: 0, money: 0,
      // Per-client service meters (docx Level 6: three clients' dashboards on one screen), 0–100.
      clients: Object.fromEntries((level.clients || []).map(c => [c.id, c.start])),
      evidenceFaded: 0,       // evidence lost to time this level (logs rolling over, memory lost)
      fadeCarry: 0,           // part of a point not yet faded, so short steps still add up
      lastFade: 0,            // faded since the screen last showed it; the UI resets it
      attackerMinutes: 0,
      flags: {}, vars: {},
      score: 0, maxScore: 0,
      bonus: 0,               // "None of these" bonuses and penalties, in points
      pending: null,          // set while teammates' suggestions wait for a pick
      consult: null,          // the one Consult used this level, if any
      path: [], chain: [], causes: [], tags: {},
      fired: {},
      misses: {},             // wrong picks per log-puzzle node
      picked: {},             // alerts opened per alert-queue node, in order
      automate: null,         // Jayson's ability: null → "armed" → "used" (once per level)
      character: character || "iris", tipUsed: false,
      node: level.start.node
    };
  }

  // Read a named number from state ("evidence", "money", "attackerMinutes", "C", a var...).
  function readValue(state, name) {
    if (typeof name === "number") return name;
    if (name in state.meters) return state.meters[name];
    if (name in state.vars) return state.vars[name];
    if (typeof state[name] === "number") return state[name];
    return 0;
  }

  // Check a JSON condition. Conditions are plain data, never eval(), so level files stay safe.
  function test(cond, state) {
    if (cond == null) return true;
    if ("flag" in cond) return !!state.flags[cond.flag];
    if ("not" in cond) return !test(cond.not, state);
    if ("all" in cond) return cond.all.every(c => test(c, state));
    if ("any" in cond) return cond.any.some(c => test(c, state));
    if ("gte" in cond) return readValue(state, cond.gte[0]) >= readValue(state, cond.gte[1]);
    if ("lt" in cond) return readValue(state, cond.lt[0]) < readValue(state, cond.lt[1]);
    if ("character" in cond) return state.character === cond.character;
    console.warn("Unknown condition", cond);
    return false;
  }

  // Resolve a text that may be a plain string or a list of {if, text} variants,
  // then fill {placeholders} from vars, so one node can read differently per path.
  function text(value, state) {
    let out = value;
    if (Array.isArray(value)) {
      const hit = value.find(v => test(v.if, state));
      out = hit ? hit.text : "";
    }
    if (typeof out !== "string") return "";
    return out.replace(/\{(\w+)\}/g, (_, key) => {
      if (key in state.vars) return state.vars[key];
      if (key === "clock") return formatClock(state.clock);
      if (key === "money") return state.money.toLocaleString("en-US");
      return "{" + key + "}";
    });
  }

  // Apply an effects object to state and report what changed, so the UI can show deltas.
  function applyEffects(fx, state) {
    const delta = { minutes: 0, meters: {}, evidence: 0, money: 0, clients: {} };
    if (!fx) return delta;
    if (fx.minutes) { state.clock += fx.minutes; delta.minutes = fx.minutes; }
    if (fx.meters) {
      for (const k of METERS) {
        if (fx.meters[k] == null) continue;
        const before = state.meters[k];
        state.meters[k] = Math.max(0, Math.min(100, before + fx.meters[k]));
        delta.meters[k] = state.meters[k] - before;
      }
    }
    if (fx.evidence) { state.evidence = Math.max(0, Math.min(100, state.evidence + fx.evidence)); delta.evidence = fx.evidence; }
    if (fx.money) { state.money += fx.money; delta.money = fx.money; }
    // "clients": { "dental": 30 } moves one client's service meter (only levels that list "clients").
    if (fx.clients && state.clients) {
      for (const k in fx.clients) {
        if (!(k in state.clients)) continue;
        const before = state.clients[k];
        state.clients[k] = Math.max(0, Math.min(100, before + fx.clients[k]));
        delta.clients[k] = state.clients[k] - before;
      }
    }
    if (fx.set) for (const k in fx.set) state.flags[k] = fx.set[k];
    if (fx.unset) for (const k of fx.unset) delete state.flags[k];
    // "clock" as a value means "remember the current time", e.g. when a rule was created.
    if (fx.setVar) for (const k in fx.setVar) state.vars[k] = fx.setVar[k] === "clock" ? formatClock(state.clock) : fx.setVar[k];
    return delta;
  }

  // The choices shown at a node: hidden ones (with an "if") only appear when their condition holds.
  // A log-puzzle node has no choices; the player picks a log line instead.
  function visibleChoices(node, state) {
    return (node.choices || []).filter(c => test(c.if, state));
  }

  // Pick the next node from the node's routing list; first match wins.
  function route(node, state) {
    const hit = (node.next || []).find(n => test(n.if, state));
    return hit ? hit.to : "end";
  }

  // Fire events tied to entering a node ("onEnter"), e.g. a skimmer found three days later.
  // They fire whether or not the attacker is still active, because they reveal what already happened.
  function enterEvents(level, state) {
    const fired = [];
    ((level.attacker && level.attacker.events) || []).forEach((ev, i) => {
      if (ev.onEnter !== state.node || state.fired[i] || !test(ev.if, state)) return;
      state.fired[i] = true;
      fired.push(fire(level, state, ev));
    });
    return fired;
  }

  // Apply one attacker event and record it for the butterfly chain.
  function fire(level, state, ev) {
    if (ev.flag) state.flags[ev.flag] = true;
    if (ev.setVar) applyEffects({ setVar: ev.setVar }, state);
    const delta = applyEffects({ meters: ev.meters, money: ev.money, clients: ev.clients }, state);
    // A severe outcome can cost points too ("penalty"), so a level can't be passed after, say, mass card theft.
    if (ev.penalty) state.bonus -= ev.penalty;
    // "because" names a cause outside attacker time, e.g. an Act 1 lesson that pays off in Act 2.
    const causes = ev.because ? ev.because.map(b => text(b, state)) : state.causes.slice();
    const entry = { text: text(ev.text, state), log: ev.log ? text(ev.log, state) : null,
                    causes, delta, penalty: ev.penalty || 0, at: formatClock(state.clock) };
    state.chain.push(entry);
    return entry;
  }

  // Evidence decay (docx: Echo's "evidence decays slower"). Why: real evidence does not wait. Logs roll
  // over and memory is lost on reboot, so while the attacker is active, collected evidence fades by one
  // point every "perMinutes" minutes of working time; Echo preserves it, so for her it fades at half speed.
  // Only working minutes count (not "clockAt" jumps between days or weeks), so a time skip never wipes it.
  // A level can tune this with "evidenceDecay": { "perMinutes": 5, "echoPerMinutes": 10 } (0 turns it off).
  function evidenceDecay(level) {
    return Object.assign({ perMinutes: 5, echoPerMinutes: 10, bonusPer: 25 }, level.evidenceDecay);
  }

  // Why: kept evidence should matter (author's choice, 2026-11-02). Every "bonusPer" points of evidence
  // still held count as one bonus point in the score (0–4 with the default 25). Evidence never rescues
  // a bad outcome: at the end of a level with a "bad" ending the bonus is 0, so a bad ending can't reach
  // the pass mark (tools/validate.js checks that rule).
  function evidenceBonus(level, state) {
    const per = evidenceDecay(level).bonusPer;
    if (!per) return 0;
    if (state.node === "end" && ending(level, state).tone === "bad") return 0;
    return Math.floor(state.evidence / per);
  }
  function fadeEvidence(level, state, minutes) {
    const rule = evidenceDecay(level);
    const per = state.character === "echo" ? rule.echoPerMinutes : rule.perMinutes;
    if (!per || minutes <= 0) return 0;
    state.fadeCarry += minutes / per;
    const drop = Math.min(state.evidence, Math.floor(state.fadeCarry));
    state.fadeCarry -= Math.floor(state.fadeCarry);
    state.evidence -= drop;
    state.evidenceFaded += drop;
    state.lastFade += drop;
    return drop;
  }

  // Run the attacker clock after a choice. If the attacker was active before the choice,
  // the minutes that choice took are attacker minutes, and the choice is recorded as a cause.
  // Due events fire and keep a copy of their causes for the report's butterfly chain.
  // choice is null when time simply passes (a node with "clockAt"), so no new cause is recorded.
  function runAttacker(level, state, choice, minutes, wasActive) {
    const fired = [];
    const att = level.attacker;
    if (!att || !wasActive) return fired;
    state.attackerMinutes += minutes;
    if (choice) fadeEvidence(level, state, minutes);
    if (choice) state.causes.push(formatClock(state.clock - minutes) + " " + choice.short);
    (att.events || []).forEach((ev, i) => {
      if (ev.onEnter || state.fired[i] || state.attackerMinutes < ev.at) return;
      if (ev.if && !test(ev.if, state)) return;
      state.fired[i] = true;
      fired.push(fire(level, state, ev));
    });
    return fired;
  }

  // Make one decision: apply effects, score it, run the attacker, move to the next node.
  // Returns everything the feedback panel needs to explain what just happened.
  function choose(level, state, choiceKey) {
    const node = level.nodes[state.node];
    const choice = visibleChoices(node, state).find(c => c.key === choiceKey);
    if (!choice) throw new Error("No choice " + choiceKey + " at " + state.node);

    const wasActive = level.attacker ? test(level.attacker.activeWhile, state) : false;
    const startClock = state.clock;
    // Jayson's ability: once per level he can automate a step, which halves the time it takes.
    let fx = choice.effects;
    let automated = 0;
    if (state.automate === "armed" && state.character === "jayson") {
      const mins = (fx && fx.minutes) || 0;
      automated = mins - Math.ceil(mins / 2);
      fx = Object.assign({}, fx, { minutes: mins - automated });
      state.automate = "used";
    }
    const delta = applyEffects(fx, state);
    if (automated) delta.automated = automated;
    // Character weaknesses and strengths can add effects to a choice (e.g. Moritz loses more Reputation with the press).
    const extra = choice.characterEffects && choice.characterEffects[state.character];
    if (extra) mergeDelta(delta, applyEffects(Object.assign({}, extra, { points: 0 }), state));

    // Max points counts the best option at every node actually visited.
    const pts = (choice.effects && choice.effects.points) || 0;
    const best = Math.max(...visibleChoices(node, state).map(c => (c.effects && c.effects.points) || 0), 0);
    state.maxScore += best || 10;
    state.score += pts;

    (choice.tags || []).forEach(t => { state.tags[t] = (state.tags[t] || 0) + 1; });
    const step = { node: state.node, at: formatClock(startClock), key: choice.key, short: choice.short, points: pts, best };
    if (automated) step.automated = automated;
    state.path.push(step);

    // "None of these": a wrong one costs extra; a right one brings two teammates' suggestions.
    let suggestions = null;
    if (choice.none) {
      const rules = noneRules(level);
      if (pts >= rules.rightAt) suggestions = suggestionsFor(node, state);
      else { state.bonus -= rules.penalty; delta.nonePenalty = rules.penalty; step.extra = -rules.penalty; }
    }

    const fired = runAttacker(level, state, choice, delta.minutes, wasActive);
    if (suggestions && suggestions.length) {
      state.pending = { node: state.node };
      return { choice, delta, fired, suggestions, extra, done: false };
    }
    advance(level, state, delta, fired);
    return { choice, delta, fired, extra, done: state.node === "end" };
  }

  // Add a second set of changes into the first, so the feedback panel shows one total.
  function mergeDelta(into, more) {
    into.minutes += more.minutes; into.evidence += more.evidence; into.money += more.money;
    for (const k in more.meters) into.meters[k] = (into.meters[k] || 0) + more.meters[k];
    into.clients = into.clients || {};
    for (const k in more.clients || {}) into.clients[k] = (into.clients[k] || 0) + more.clients[k];
  }

  // Default "None of these" rules (spec §7). A None choice is right when it is worth at least rightAt points.
  // A level can override them with "noneRules".
  function noneRules(level) {
    return Object.assign({ penalty: 5, bonus: 5, rightAt: 8 }, level.noneRules);
  }

  // The two teammates who speak up after a right "None of these": never the player's own character.
  function suggestionsFor(node, state) {
    return (node.noneSuggestions || []).filter(s => s.by !== state.character).slice(0, 2);
  }

  // The player picks one teammate's suggestion. The right one earns bonus points; then the level moves on.
  function pickSuggestion(level, state, index) {
    const node = level.nodes[state.pending.node];
    const sug = suggestionsFor(node, state)[index];
    if (!sug) throw new Error("No suggestion " + index + " at " + state.pending.node);
    const delta = applyEffects(sug.effects, state);
    const rules = noneRules(level);
    if (sug.correct) { state.bonus += rules.bonus; delta.noneBonus = rules.bonus; }
    state.path.push({ node: state.pending.node, at: formatClock(state.clock), by: sug.by,
                      short: sug.short || "Teammate's suggestion", suggestion: true, extra: sug.correct ? rules.bonus : 0 });
    state.pending = null;
    const fired = [];
    advance(level, state, delta, fired);
    return { suggestion: sug, delta, fired, done: state.node === "end" };
  }

  // Move to the next node. A node may start at a later time ("clockAt": "13:40", optionally
  // "days": 3 later); the skipped time counts for the attacker too, if they still have access —
  // unless the node is a new scene ("newScene": true, e.g. Act 2 weeks later).
  function advance(level, state, delta, fired) {
    state.node = route(level.nodes[state.node], state);
    const next = level.nodes[state.node];
    if (next && next.clockAt) {
      const target = (Math.floor(state.clock / 1440) + (next.days || 0)) * 1440 + parseClock(next.clockAt);
      if (target > state.clock) {
        const jump = target - state.clock;
        const stillActive = !next.newScene && level.attacker ? test(level.attacker.activeWhile, state) : false;
        state.clock += jump;
        delta.waited = jump;
        fired.push(...runAttacker(level, state, null, jump, stillActive));
      }
    }
    if (next) fired.push(...enterEvents(level, state));
  }

  // Log puzzle (spec: Level 4 "find the SQL injection in raw logs"). The player picks the line that shows
  // the attack. A wrong pick costs time (attacker minutes) and points; after "maxMisses" wrong picks the
  // answer is shown. Solving scores and moves on like a choice, so the report and validator treat it the same.
  function guessLine(level, state, index) {
    const node = level.nodes[state.node];
    const pz = node.puzzle;
    const line = pz.lines[index];
    if (!line) throw new Error("No log line " + index + " at " + state.node);
    if (line.correct) return { correct: true, line, ...solvePuzzle(level, state, false) };

    const wasActive = level.attacker ? test(level.attacker.activeWhile, state) : false;
    state.misses[state.node] = (state.misses[state.node] || 0) + 1;
    const delta = applyEffects({ minutes: pz.missMinutes || 0 }, state);
    const fired = runAttacker(level, state, { short: pz.missShort || "Misread the logs" }, delta.minutes, wasActive);
    if (state.misses[state.node] < pz.maxMisses) return { correct: false, line, delta, fired, done: false };
    const solved = solvePuzzle(level, state, true);
    return { correct: false, revealed: true, line, missDelta: delta, missFired: fired, ...solved };
  }

  // Score the puzzle (full points minus a penalty per wrong pick; nothing if the answer had to be shown),
  // apply its effects and move on. Returns a choice-shaped result so the feedback panel can be reused.
  function solvePuzzle(level, state, revealed) {
    const node = level.nodes[state.node];
    const pz = node.puzzle;
    const misses = state.misses[state.node] || 0;
    const pts = revealed ? 0 : Math.max(0, pz.points - misses * (pz.missPenalty || 0));
    const wasActive = level.attacker ? test(level.attacker.activeWhile, state) : false;
    const startClock = state.clock;
    const delta = applyEffects(pz.effects, state);
    state.maxScore += pz.points;
    state.score += pts;
    (pz.tags || []).forEach(t => { state.tags[t] = (state.tags[t] || 0) + 1; });
    const short = revealed ? pz.revealedShort : pz.short + (misses ? " after " + misses + " wrong pick" + (misses > 1 ? "s" : "") : "");
    state.path.push({ node: state.node, at: formatClock(startClock), key: "", short, points: pts, best: pz.points });
    const choice = { key: "", short, note: revealed ? pz.revealedNote : pz.note, why: pz.why, whyDeep: pz.whyDeep,
                     tags: pz.tags, effects: { points: pts } };
    const fired = runAttacker(level, state, choice, delta.minutes, wasActive);
    advance(level, state, delta, fired);
    return { choice, delta, fired, done: state.node === "end" };
  }

  // Alert queue (spec: Level 5 "20 alerts, most false positives"). The analyst has time to open only
  // "budget" alerts. Each one costs minutes (attacker minutes too); real alerts set flags that matter later.
  // When every real alert is found or the budget is spent, the queue is scored like one decision and the level moves on.
  function openAlert(level, state, index) {
    const node = level.nodes[state.node];
    const q = node.queue;
    const alert = q.alerts[index];
    const picked = state.picked[state.node] = state.picked[state.node] || [];
    if (!alert || picked.includes(index)) throw new Error("Alert " + index + " cannot be opened at " + state.node);
    picked.push(index);
    const wasActive = level.attacker ? test(level.attacker.activeWhile, state) : false;
    const delta = applyEffects({ minutes: q.minutesPerAlert || 0, set: alert.set }, state);
    const cause = { short: alert.real ? alert.short : (q.noiseShort || "Chased a false alarm") };
    const fired = runAttacker(level, state, cause, delta.minutes, wasActive);
    if (picked.length < q.budget && queueFound(q, picked) < queueReal(q)) return { alert, delta, fired, finished: false, left: q.budget - picked.length };
    const done = finishQueue(level, state);
    return { alert, openDelta: delta, openFired: fired, finished: true, ...done };
  }

  // How many alerts in the queue are real, and how many of them the player has opened.
  function queueReal(q) { return q.alerts.filter(a => a.real).length; }
  function queueFound(q, picked) { return picked.filter(i => q.alerts[i].real).length; }

  // Score the queue (points in proportion to real alerts found), apply its effects and move on.
  // Returns a choice-shaped result so the feedback panel, report and validator treat it like a decision.
  function finishQueue(level, state) {
    const node = level.nodes[state.node];
    const q = node.queue;
    const picked = state.picked[state.node] || [];
    const found = queueFound(q, picked);
    const pts = Math.round(q.points * found / queueReal(q));
    const wasActive = level.attacker ? test(level.attacker.activeWhile, state) : false;
    const startClock = state.clock - picked.length * (q.minutesPerAlert || 0); // when triage began
    const delta = applyEffects(q.effects, state);
    state.maxScore += q.points;
    state.score += pts;
    (q.tags || []).forEach(t => { state.tags[t] = (state.tags[t] || 0) + 1; });
    const short = "Triage: " + found + " of " + queueReal(q) + " real alerts found";
    state.path.push({ node: state.node, at: formatClock(startClock), key: "", short, points: pts, best: q.points });
    const choice = { key: "", short, note: q.note, why: q.why, whyDeep: q.whyDeep, tags: q.tags, effects: { points: pts } };
    const fired = runAttacker(level, state, null, delta.minutes, wasActive);
    advance(level, state, delta, fired);
    return { choice, delta, fired, found, done: state.node === "end" };
  }

  // Real-time spread (spec: Level 11). While a node with "spread" is open, a counter of wiped machines
  // ticks in real seconds. How many machines the counter shows after "seconds" (for the screen only).
  // Why: Moritz's ability (docx: "segmentation slows the attacker's spread"). With him the counter runs
  // "moritzSlow" times slower (default 1.5) and the player gets that much longer before the slow event.
  // Returns the spread numbers for this player; other characters get the node's numbers unchanged.
  function spreadFor(spread, state) {
    if (!state || state.character !== "moritz") return spread;
    const f = spread.moritzSlow || 1.5;
    return Object.assign({}, spread, { perSecond: spread.perSecond / f, slowAfter: Math.round(spread.slowAfter * f), slowed: true });
  }

  function spreadCount(spread, seconds, state) {
    const sp = spreadFor(spread, state);
    return Math.min(sp.total, sp.start + Math.floor(seconds * sp.perSecond));
  }

  // Called just before the player's choice on a spread node. If they took longer than "slowAfter" real
  // seconds, the node's "slowEvent" fires once, like an attacker event, with the hesitation as its cause.
  function spreadDelay(level, state, seconds) {
    const node = level.nodes[state.node];
    const sp = node && node.spread && spreadFor(node.spread, state);
    if (!sp || seconds <= sp.slowAfter || state.flags[sp.slowEvent.flag]) return [];
    const ev = Object.assign({ because: ["Took " + Math.round(seconds) + " seconds to decide while the worm spread"] }, sp.slowEvent);
    return [fire(level, state, ev)];
  }

  // Recovery-order puzzle (spec: Level 11 "which system comes back first?"). The player puts every item
  // in order; points are shared out per item in the right position. Optional flags record whether the
  // first item was right ("firstFlag") and whether the whole order was right ("perfectFlag").
  // Returns a choice-shaped result so the feedback panel, report and validator treat it like a decision.
  function solveOrder(level, state, ids) {
    const node = level.nodes[state.node];
    const od = node.order;
    if (ids.length !== od.correct.length || new Set(ids).size !== ids.length || !ids.every(id => od.correct.includes(id)))
      throw new Error("Order at " + state.node + " must use every item once");
    const right = ids.filter((id, i) => id === od.correct[i]).length;
    const pts = Math.round(od.points * right / od.correct.length);
    const wasActive = level.attacker ? test(level.attacker.activeWhile, state) : false;
    const startClock = state.clock;
    const delta = applyEffects(od.effects, state);
    if (od.firstFlag && ids[0] === od.correct[0]) state.flags[od.firstFlag] = true;
    if (od.perfectFlag && right === od.correct.length) state.flags[od.perfectFlag] = true;
    // Extra time for each item brought back before something it needs (systems that can't start yet).
    const late = orderClashes(od, ids).length * (od.clashMinutes || 0);
    if (late) mergeDelta(delta, applyEffects({ minutes: late }, state));
    state.maxScore += od.points;
    state.score += pts;
    (od.tags || []).forEach(t => { state.tags[t] = (state.tags[t] || 0) + 1; });
    const short = (od.shortLabel || "Recovery order") + ": " + right + " of " + od.correct.length + " in the right place";
    state.path.push({ node: state.node, at: formatClock(startClock), key: "", short, points: pts, best: od.points });
    const choice = { key: "", short, note: od.note, why: od.why, whyDeep: od.whyDeep, tags: od.tags, effects: { points: pts } };
    const fired = runAttacker(level, state, choice, delta.minutes, wasActive);
    advance(level, state, delta, fired);
    return { choice, delta, fired, right, clashes: orderClashes(od, ids), done: state.node === "end" };
  }

  // Items placed before something they need, e.g. "Booking system before Core network". Used for the
  // feedback text and for the extra minutes those false starts cost.
  function orderClashes(od, ids) {
    const out = [];
    ids.forEach((id, i) => {
      const item = od.items.find(it => it.id === id);
      (item.needs || []).forEach(n => { if (ids.indexOf(n) > i) out.push({ item: id, needs: n }); });
    });
    return out;
  }

  // Score as a whole percentage: earned points (plus "None of these" bonuses and penalties)
  // divided by the best possible points, clamped 0–100.
  // level is optional so older callers still work; with it, kept evidence adds its small bonus.
  function percent(state, level) {
    if (!state.maxScore) return 0;
    const extra = level ? evidenceBonus(level, state) : 0;
    return Math.max(0, Math.min(100, Math.round(((state.score + state.bonus + extra) / state.maxScore) * 100)));
  }

  // Find the ending whose condition matches; the last ending with no "if" is the fallback.
  function ending(level, state) {
    return level.endings.find(e => test(e.if, state)) || level.endings[level.endings.length - 1];
  }

  UR.engine = { parseClock, formatClock, createState, test, text, applyEffects,
                visibleChoices, route, choose, guessLine, openAlert, queueReal, spreadFor, spreadCount, spreadDelay, solveOrder, orderClashes, pickSuggestion, suggestionsFor, noneRules, evidenceDecay, evidenceBonus, percent, ending, METERS };
})(typeof window !== "undefined" ? (window.UR = window.UR || {}) : (module.exports = {}));
