// screens/level.js — one level: routine intro → alarm → zoom → console with decision nodes.
// The intro, alarm and zoom are drawn on canvas by scene.js; the console is HTML.
(function (UR) {
  "use strict";
  const E = () => UR.engine;

  const METER_NAMES = { C: "Confidentiality", I: "Integrity", A: "Availability", R: "Reputation" };
  const SEV_LABEL = { low: "LOW", mid: "MID", hi: "HIGH" };
  const LOG_LABEL = { info: "INFO", warn: "WARN", hi: "HIGH", butterfly: "IMPACT", ok: "OK" };
  const ENV_NAME = { home: "home", office: "the office", newyork: "the New York office", underground: "the underground centre" };

  let level, state, root, feedEl, mainEl, meterEl, clockEl, consultBtn;
  let roomCtl = null; // the running canvas scene
  let keyHandler = null; // A–E keyboard shortcuts while the console is open
  let run = null;     // the running intro sequence: { skip, cancelled }
  let spreadTimer = null; // the real-time spread counter: { id, seconds }
  let lightsNow = 0;      // Level 12: how many console screens have gone dark
  let shownKeys = {};     // display letter → the choice's key in the level file (choices are shuffled)

  // v2.0 (update doc): the best answer was too often "A", so players could guess. Choices are shown in a
  // random order on every visit and lettered A, B, C… by position. "None of these" always stays last.
  // The level files keep their own keys; only the letters on screen change.
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function shuffledChoices(list) {
    return shuffle(list.filter(c => !c.none)).concat(list.filter(c => c.none));
  }

  // Entry point from the router: show the routine intro first.
  function show(container, lvl) {
    stop();
    level = lvl;
    root = container;
    state = E().createState(level, UR.save.data.character);
    renderIntro();
  }

  // Stop the canvas and any timed sequence, e.g. when the player leaves for the map.
  function stop() {
    if (run) run.cancelled = true;
    run = null;
    stopSpread();
    if (roomCtl) { roomCtl.stop(); roomCtl = null; }
    if (keyHandler) { document.removeEventListener("keydown", keyHandler); keyHandler = null; }
    UR.audio.stopMusic();
    UR.voice.stop();
  }

  // Routine intro: the character arrives at work in the tier's environment, in the level's light.
  // Real-event levels show their "Inspired by" line. A level may hide a choice here (introChoice).
  function renderIntro() {
    const h = UR.h;
    const tier = UR.data.tiers.tiers[level.tier];
    const ch = UR.data.characters[state.character];
    const canvas = h("canvas", { class: "room", role: "img",
      "aria-label": ch.first + " starts work at " + ENV_NAME[tier.environment] + ". Light: " + level.lighting + "." });
    const alertBox = h("p", { class: "room-alert", role: "alert", hidden: "" },
      h("span", { class: "room-alert-main" }, "! Security alert !"),
      h("span", { class: "room-alert-sub" }, (level.alarmAt || E().formatClock(state.clock)) + " · incoming"));

    const choice = level.introChoice;
    const main = choice
      ? h("div", { class: "intro-choice" },
          h("p", { class: "phase" }, "Before the shift"),
          h("p", { class: "intro-text" }, choice.prompt),
          h("div", { class: "choices" }, ...shuffledChoices(choice.choices).map((c, i) =>
            h("button", { class: "choice", onclick: () => pickIntro(c) },
              h("span", { class: "key" }, String.fromCharCode(65 + i)), h("span", { class: "choice-label" }, c.label)))))
      : h("button", { class: "btn primary", id: "start-shift", onclick: beginShift }, "Start shift");

    root.replaceChildren(h("section", { class: "intro" },
      h("p", { class: "eyebrow" }, (level.demo ? "Training drill" : levelName()) + " · " + tier.name + " · " + cap(level.lighting)),
      h("h1", { class: "intro-title" }, level.title),
      level.real ? h("p", { class: "inspired" }, "Inspired by events of " + level.real.dates + (level.real.place ? ", " + level.real.place : "") + ".") : null,
      h("div", { class: "room-wrap" }, canvas, alertBox),
      h("p", { class: "intro-text" }, level.briefing || ""),
      h("div", { class: "actions intro-actions" },
        main,
        h("button", { class: "btn ghost", id: "skip-intro", onclick: skipIntro }, "Skip intro"),
        h("button", { class: "btn ghost", id: "back-map", onclick: () => { stop(); UR.go.map(); } }, "Back to map"))
    ));
    roomCtl = UR.scene.room(canvas, { look: ch.look, hat: UR.scene.HATS[tier.hat], lighting: level.lighting, environment: tier.environment });
    (root.querySelector("#start-shift") || root.querySelector(".intro-choice .choice")).focus({ preventScroll: true });
  }

  // A hidden routine choice (e.g. Level 6 backups): it only sets flags that matter later.
  async function pickIntro(c) {
    E().applyEffects(c.effects, state);
    // "at" lets the intro happen at another time than the alarm (Level 6: Friday 17:30, before a night alarm).
    state.intro = { at: level.introChoice.at || E().formatClock(state.clock), short: c.short || c.label };
    // Why: without this the pick left no visible trace until much later, so it felt like the button did
    // nothing. The choices are replaced by what the player did ("note", or the short label); the alarm
    // sequence then starts as before. The consequence itself stays hidden until it matters.
    const box = root.querySelector(".intro-choice .choices");
    if (box) box.replaceWith(UR.h("p", { class: "intro-picked", role: "status" }, "\u2713 " + (c.note || state.intro.short)));
    // Give the note a moment, then bring the room (where the alarm plays) back into view: on smaller
    // screens it has scrolled above the choices, which made the alarm easy to miss.
    const ctl = { skip: false, cancelled: false };
    const myRun = run = ctl; // leaving for the map cancels the visit
    await UR.wait(1500, ctl);
    const room = root.querySelector(".room-wrap");
    if (!room || !room.isConnected || ctl.cancelled) return; // the player left for the map meanwhile
    room.scrollIntoView({ block: "center", behavior: UR.reducedMotion() ? "auto" : "smooth" });
    if (c.wise != null) await visit(c.wise, room, ctl);
    if (ctl.cancelled || run !== myRun) return;
    run = null;
    beginShift();
  }

  // v2.0 (update doc): after the choice before the shift, another member of the team glitches into the
  // room, says whether the choice was wise, and glitches out; then the shift starts. The line uses the
  // player's current title ("Well done, Breach Breaker…"). The visitor is one of the other three, at random.
  async function visit(wise, room, ctl) {
    const h = UR.h;
    const others = UR.data.characters.order.filter(id => id !== state.character);
    const who = others[Math.floor(Math.random() * others.length)];
    const ch = UR.data.characters[who];
    const line = wise
      ? "Well done, " + UR.save.data.title + ". I guess you are learning."
      : "Decisions have consequences. I thought you would have learned that by now.";
    UR.audio.glitch();
    roomCtl.visitor(ch.look, hat());
    const text = h("p", { class: "vb-text" });
    const bubble = h("div", { class: "visitor-bubble " + (wise ? "good" : "bad"), role: "status" },
      h("p", { class: "bubble-name" }, ch.first), text);
    room.append(bubble);
    await UR.wait(500, ctl);
    UR.voice.say(who, line);
    await UR.typewrite(text, line, ctl, 28);
    await UR.wait(2600, ctl);
    if (ctl.cancelled) { bubble.remove(); return; }
    UR.audio.glitch();
    bubble.classList.add("leaving");
    await roomCtl.visitorLeave();
    bubble.remove();
  }

  // Start work → warning (alarm sound, red flash) → zoom into the monitor → console.
  async function beginShift() {
    if (run) return;
    const ctl = run = { skip: false, cancelled: false };
    root.querySelectorAll(".intro-actions .btn.primary, .intro-choice .choice").forEach(b => { b.disabled = true; });
    roomCtl.sit();
    roomCtl.work();
    await UR.wait(1000, ctl);
    if (ctl.cancelled) return;

    roomCtl.alarm();
    UR.audio.alarm();
    root.querySelector(".room-alert").hidden = false;
    await UR.wait(1800, ctl);
    if (ctl.cancelled) return;

    root.querySelector(".room-alert").hidden = true;
    if (!ctl.skip) await roomCtl.zoom();
    if (ctl.cancelled) return;
    stop();
    renderConsole();
  }

  // Skip straight to the console (an intro choice still has to be made first).
  function skipIntro() {
    if (level.introChoice && !state.intro) {
      root.querySelector(".intro-choice .choice").focus();
      return;
    }
    if (run) { run.skip = true; return; }
    stop();
    renderConsole();
  }

  // Build the console frame once; nodes and feedback then swap inside the main panel.
  function renderConsole() {
    const h = UR.h;
    const ch = UR.data.characters[state.character] || { first: state.character };
    clockEl = h("span", { class: "clock" });
    meterEl = h("div", { class: "meters", "aria-label": "Status meters" });
    // The feed scrolls, so it can take keyboard focus (arrow keys scroll it).
    feedEl = h("ol", { class: "feed", "aria-label": "Event feed", tabindex: "0" });
    mainEl = h("div", { class: "main-panel", "aria-live": "polite" });

    lightsNow = 0;
    root.replaceChildren(h("section", { class: "console", "data-lights": "0" },
      h("header", { class: "topbar" },
        h("h1", { class: "lvl" }, (level.demo ? "" : (isBonus() ? "Bonus" : "L" + level.level) + " · ") + level.title),
        clockEl,
        h("span", { class: "who" }, ch.first + " · " + UR.save.data.title),
        consultBtn = h("button", { class: "consult-btn", id: "consult", onclick: openConsult }, "Consult"),
        UR.muteButton()
      ),
      meterEl,
      h("div", { class: "console-body" },
        h("div", { class: "feed-wrap", role: "region", "aria-label": "Event feed panel" }, h("p", { class: "panel-label" }, "Event feed"), feedEl),
        mainEl)
    ));
    updateHud();
    // v2.0: the level music starts with the console and follows the choices (audio.setTension).
    UR.audio.startMusic(0.45);
    // The routine choice made before the shift (Level 6) is the first line of the feed, so it stays visible.
    if (state.intro) log(state.intro.at + " before the shift: " + state.intro.short, "ok");
    renderNode();
    // Keyboard: pressing A–E picks that choice, the same as clicking its button.
    keyHandler = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || !mainEl) return;
      const key = e.key.toUpperCase();
      if (!/^[A-E]$/.test(key)) return;
      const btn = [...mainEl.querySelectorAll(".choices .choice")].find(b => b.dataset.shown === key);
      if (btn) { e.preventDefault(); btn.click(); }
    };
    document.addEventListener("keydown", keyHandler);
  }

  // Refresh clock and meters. Numbers are always shown so colour is never the only signal.
  function updateHud(delta) {
    const h = UR.h;
    clockEl.textContent = E().formatClock(state.clock);
    meterEl.replaceChildren(...E().METERS.map(k => {
      const v = state.meters[k];
      const d = delta && delta.meters[k];
      const level = v >= 70 ? "ok" : v >= 40 ? "warn" : "bad";
      return h("div", { class: "meter " + level },
        h("span", { class: "m-name" }, METER_NAMES[k]),
        h("span", { class: "m-bar" }, h("span", { class: "m-fill", style: "width:" + v + "%" })),
        h("span", { class: "m-val" }, String(v), d ? h("small", { class: d < 0 ? "neg" : "pos" }, (d > 0 ? " +" : " ") + d) : null));
    }),
    h("div", { class: "meter extra", title: "Evidence fades with time while the attacker is active" }, h("span", { class: "m-name" }, "Evidence"), h("span", { class: "m-val" }, state.evidence + "/100")),
    h("div", { class: "meter extra" + (state.money ? " bad" : "") }, h("span", { class: "m-name" }, "Losses"), h("span", { class: "m-val" }, "$" + state.money.toLocaleString("en-US"))),
    ...clientMeters(delta));
  }

  // Why: docx Level 6 asks for the clients' dashboards on one screen. A level with "clients" gets one
  // small service meter per client (how much of that client's business is running), next to the others.
  function clientMeters(delta) {
    const h = UR.h;
    return (level.clients || []).map(c => {
      const v = state.clients[c.id];
      const d = delta && delta.clients && delta.clients[c.id];
      const tone = v >= 70 ? "ok" : v >= 40 ? "warn" : "bad";
      return h("div", { class: "meter client " + tone },
        h("span", { class: "m-name" }, c.name),
        h("span", { class: "m-bar" }, h("span", { class: "m-fill", style: "width:" + v + "%" })),
        h("span", { class: "m-val" }, v + "%", d ? h("small", { class: d < 0 ? "neg" : "pos" }, (d > 0 ? " +" : " ") + d) : null));
    });
  }

  // Add one SIEM-style line to the feed; type is written as a label, not only a colour.
  function log(text, type) {
    const h = UR.h;
    feedEl.append(h("li", { class: "log " + (type || "info") },
      h("span", { class: "tag" }, LOG_LABEL[type] || "INFO"), " ", text));
    feedEl.scrollTop = feedEl.scrollHeight;
  }

  // Show the current decision node: act (two-act levels), phase, title, situation,
  // the player character's own instinct (their ability) and the choice buttons.
  function renderNode() {
    const h = UR.h;
    const node = level.nodes[state.node];
    (node.logs || []).filter(l => E().test(l.if, state)).forEach(l => log(E().text(l.text, state), l.type));
    dimLights(node);
    const choices = shuffledChoices(E().visibleChoices(node, state));
    shownKeys = {};
    const hint = state.consultHint && state.consultHint.node === state.node ? state.consultHint : null;
    const instinct = node.notes && node.notes[state.character];
    mainEl.replaceChildren(h("article", { class: "node" },
      node.act ? h("p", { class: "act" }, node.act) : null,
      h("p", { class: "phase" }, node.phase),
      h("h2", { class: "node-title" }, node.title),
      h("p", { class: "node-body" }, E().text(node.body, state)),
      instinct ? h("div", { class: "instinct" }, h("p", { class: "panel-label" }, "Your instinct"),
        UR.consult.bubble(state.character, E().text(instinct, state), hat())) : null,
      h("div", { class: "consult-slot" }, hint ? UR.consult.bubble(hint.by, hint.text, hat()) : null),
      node.puzzle || node.queue || node.order ? null : automateToggle(),
      node.spread ? spreadPanel(E().spreadFor(node.spread, state)) : null,
      node.puzzle ? puzzlePanel(node.puzzle) : null,
      node.queue ? queuePanel(node.queue) : null,
      node.order ? orderPanel(node.order) : null,
      h("div", { class: "choices" }, ...choices.map((c, i) => {
        const shown = String.fromCharCode(65 + i);
        shownKeys[shown] = c.key;
        return h("button", { class: "choice" + (c.none ? " none" : ""), "data-key": c.key, "data-shown": shown, "aria-keyshortcuts": shown, onclick: () => pick(c.key, shown) },
          h("span", { class: "key" }, shown), h("span", { class: "choice-label" }, E().text(c.label, state)));
      }))
    ));
    updateConsult(true);
    mainEl.querySelector(".choice, .log-line, .alert-item, .order-item").focus();
  }

  // Level 12: the console's screens go dark one by one as the night goes on. A node sets "lights"
  // (0–4 screens out) as a number or as variants [{ if, value }]. Each new dark screen is also written
  // in the feed, so the change is not only visual. Text stays readable at every step.
  function dimLights(node) {
    if (node.lights == null) return;
    const v = Array.isArray(node.lights) ? (node.lights.find(x => E().test(x.if, state)) || { value: lightsNow }).value : node.lights;
    const next = Math.max(0, Math.min(4, v));
    if (next > lightsNow) log((next - lightsNow > 1 ? (next - lightsNow) + " more screens go" : "Another screen goes") + " dark in the control room.", "warn");
    lightsNow = next;
    root.querySelector(".console").dataset.lights = String(next);
  }

  // Real-time spread (Level 11): a counter of wiped machines that ticks every real second while the
  // player decides. It only counts while the page is visible, and the text says plainly what is at stake.
  // The counter is not announced by screen readers every second; the warning line says it once.
  function spreadPanel(sp) {
    const h = UR.h;
    stopSpread();
    const count = h("strong", { class: "spread-count" }, String(sp.start));
    const bar = h("span", { class: "spread-fill", style: "width:" + Math.round(100 * sp.start / sp.total) + "%" });
    const timer = spreadTimer = { seconds: 0, id: null };
    timer.id = setInterval(() => {
      if (document.hidden) return;
      timer.seconds += 1;
      const n = E().spreadCount(sp, timer.seconds);
      count.textContent = n.toLocaleString("en-US");
      bar.style.width = Math.round(100 * n / sp.total) + "%";
    }, 1000);
    return h("div", { class: "spread" },
      h("p", { class: "spread-line" }, E().text(sp.label, state), " ", count, " of " + sp.total.toLocaleString("en-US")),
      h("span", { class: "spread-bar", "aria-hidden": "true" }, bar),
      h("p", { class: "spread-warn" }, "Real time: this counter runs while you decide. Take longer than about " + sp.slowAfter + " seconds and it costs you."),
      // Moritz's ability, said out loud so the player sees why his counter is slower.
      sp.slowed ? h("p", { class: "spread-warn good" }, "Moritz's segmentation slows the spread: the counter runs slower and you have more time.") : null);
  }

  // Stop the spread counter and return how many seconds it ran (0 if none was running).
  function stopSpread() {
    if (!spreadTimer) return 0;
    clearInterval(spreadTimer.id);
    const secs = spreadTimer.seconds;
    spreadTimer = null;
    return secs;
  }

  // Recovery-order puzzle (Level 11): every system is a button; clicking adds it to "Your order".
  // Each item says what it needs, so the order can be worked out. Undo removes the last one;
  // Confirm is enabled once every item is placed.
  function orderPanel(od) {
    const h = UR.h;
    const picked = [];
    const label = id => E().text(od.items.find(it => it.id === id).label, state);
    const listEl = h("ol", { class: "order-list", "aria-label": "Your order" });
    const status = h("p", { class: "puzzle-status", "aria-live": "polite" });
    const undo = h("button", { class: "btn ghost", id: "order-undo", onclick: () => { picked.pop(); refresh(); } }, "Undo last");
    const confirm = h("button", { class: "btn primary", id: "order-confirm", onclick: () => submitOrder(picked.slice()) }, "Confirm order");
    // v2.0: items come in a random order every time, and a level can hide the "Needs:" lines
    // ("hideNeeds"), because in the bonus timeline they gave the answer away.
    const items = shuffle(od.items).map(it => h("button", { class: "order-item", "data-id": it.id,
      onclick: () => { if (!picked.includes(it.id)) { picked.push(it.id); refresh(); } } },
      h("span", { class: "order-name" }, E().text(it.label, state)),
      od.hideNeeds ? null : h("span", { class: "order-needs" }, it.needs && it.needs.length ? "Needs: " + it.needs.map(label).join(", ") : "Needs: nothing else"),
      it.hint ? h("span", { class: "order-hint" }, E().text(it.hint, state)) : null));
    function refresh() {
      listEl.replaceChildren(...picked.map(id => h("li", {}, label(id))));
      items.forEach(b => {
        const pos = picked.indexOf(b.dataset.id);
        b.disabled = pos >= 0;
        b.setAttribute("aria-label", b.textContent + (pos >= 0 ? ". Placed " + (pos + 1) : ""));
      });
      undo.disabled = !picked.length;
      confirm.disabled = picked.length !== od.items.length;
      status.textContent = picked.length + " of " + od.items.length + " placed.";
      const next = mainEl && mainEl.querySelector(".order-item:not([disabled])");
      if (next && document.activeElement && document.activeElement.disabled) next.focus();
      if (!next && document.activeElement && document.activeElement.disabled) confirm.focus();
    }
    refresh();
    return h("div", { class: "puzzle order" },
      od.prompt ? h("p", { class: "puzzle-prompt" }, E().text(od.prompt, state)) : null,
      h("div", { class: "order-items" }, ...items),
      h("p", { class: "panel-label" }, "Your order"), listEl, status,
      h("div", { class: "actions" }, undo, confirm));
  }

  // Score the order through the engine; the feedback says how many were in place and how many false starts.
  function submitOrder(ids) {
    const node = level.nodes[state.node];
    const od = node.order;
    const before = state.clock;
    const r = E().solveOrder(level, state, ids);
    updateHud(r.delta);
    log(E().formatClock(before) + " " + r.choice.short, "ok");
    r.fired.forEach(f => { if (f.log) log(f.log, "hi"); log(f.text, "butterfly"); });
    if (r.fired.length) UR.audio.chime();
    updateConsult(false);
    // v2.0 (update doc): showing "The order that works" during the level was a cheat sheet for the
    // next try. The level only says how many were in place and how many false starts there were;
    // the full order is kept for the report, which shows it once the level is passed.
    const label = id => E().text(od.items.find(it => it.id === id).label, state);
    state.orders = state.orders || [];
    state.orders.push({ title: od.shortLabel || "Recovery order", correct: od.correct.map(id => ({ label: label(id), why: E().text(od.items.find(it => it.id === id).why, state), placed: ids[od.correct.indexOf(id)] === id ? null : label(ids[od.correct.indexOf(id)]) })) });
    const extra = UR.h("div", { class: "order-result" },
      UR.h("p", { class: "order-clash" }, r.right + " of " + od.correct.length + " in the right place." +
        (r.clashes.length ? " " + r.clashes.length + " false start" + (r.clashes.length > 1 ? "s" : "") + ", " + (od.clashMinutes || 0) + " minutes each." : " No false starts.")),
      UR.h("p", { class: "puzzle-status" }, "The full order is in the report once you pass the level."));
    renderFeedback(Object.assign({}, r, { after: extra }));
  }

  // Log puzzle: the raw log lines as buttons. The player picks the line that shows the problem.
  // A wrong pick is marked in words (not only colour), explains why it is normal, and costs time.
  function puzzlePanel(pz) {
    const h = UR.h;
    const status = h("p", { class: "puzzle-status", "aria-live": "polite" }, missText(pz));
    const notes = h("div", { class: "puzzle-notes" });
    const list = h("ol", { class: "log-puzzle", "aria-label": "Raw log lines" }, ...pz.lines.map((line, i) =>
      h("li", {}, h("button", { class: "log-line", "data-index": String(i), onclick: e => guess(i, e.currentTarget, status, notes, pz) },
        E().text(line.text, state)))));
    return h("div", { class: "puzzle" },
      pz.prompt ? h("p", { class: "puzzle-prompt" }, E().text(pz.prompt, state)) : null,
      list, status, notes);
  }

  function missText(pz) {
    const n = state.misses[state.node] || 0;
    return "Wrong picks: " + n + " of " + pz.maxMisses + ". Each wrong pick costs " + (pz.missMinutes || 0) + " minutes.";
  }

  // Check one picked line through the engine. Solving (or running out of picks) opens the feedback panel.
  function guess(i, btn, status, notes, pz) {
    const before = state.clock;
    const r = E().guessLine(level, state, i);
    const fired = (r.missFired || []).concat(r.fired || []);
    updateHud(r.missDelta || r.delta);
    fired.forEach(f => { if (f.log) log(f.log, "hi"); log(f.text, "butterfly"); });
    if (fired.length) UR.audio.chime();
    if (r.correct || r.revealed) {
      log(E().formatClock(before) + " log puzzle: " + r.choice.short, "ok");
      updateConsult(false);
      return renderFeedback(Object.assign({}, r, { fired }));
    }
    btn.disabled = true;
    btn.classList.add("wrong");
    btn.prepend(UR.h("span", { class: "tag" }, "NOT IT "));
    status.textContent = missText(pz);
    notes.append(UR.h("p", { class: "puzzle-why" }, E().text(r.line.why, state)), ...fired.map(butterflyBox));
    const next = mainEl.querySelector(".log-line:not([disabled])");
    if (next) next.focus();
  }

  // Alert queue: every alert is a button with its severity written out. The analyst can open only a few;
  // each opened alert says in words whether it was real or noise, explains why, and costs time.
  function queuePanel(q) {
    const h = UR.h;
    const status = h("p", { class: "puzzle-status", "aria-live": "polite" }, queueText(q));
    const notes = h("div", { class: "puzzle-notes" });
    const list = h("ol", { class: "alert-queue", "aria-label": "Alert queue" }, ...q.alerts.map((a, i) =>
      h("li", {}, h("button", { class: "alert-item sev-" + a.sev, "data-index": String(i),
        onclick: e => openAlertUI(i, e.currentTarget, status, notes, q) },
        h("span", { class: "sev" }, SEV_LABEL[a.sev] || a.sev), " ", h("span", { class: "alert-num" }, "#" + (i + 1)), " ", E().text(a.text, state)))));
    return h("div", { class: "puzzle" },
      q.prompt ? h("p", { class: "puzzle-prompt" }, E().text(q.prompt, state)) : null,
      status, list, notes);
  }

  function queueText(q) {
    const used = (state.picked[state.node] || []).length;
    return "Alerts you can still open: " + (q.budget - used) + " of " + q.budget + ". Each takes " + (q.minutesPerAlert || 0) + " minutes.";
  }

  // Open one alert through the engine. When the queue is finished, the feedback panel scores the triage.
  function openAlertUI(i, btn, status, notes, q) {
    const before = state.clock;
    const r = E().openAlert(level, state, i);
    const fired = (r.openFired || []).concat(r.fired || []);
    updateHud(r.openDelta || r.delta);
    log(E().formatClock(before) + " opened alert #" + (i + 1) + ": " + (r.alert.real ? "real" : "noise"), r.alert.real ? "hi" : "info");
    fired.forEach(f => { if (f.log) log(f.log, "hi"); log(f.text, "butterfly"); });
    if (fired.length) UR.audio.chime();
    if (r.finished) {
      log(E().formatClock(state.clock) + " " + r.choice.short, "ok");
      updateConsult(false);
      return renderFeedback(Object.assign({}, r, { fired }));
    }
    btn.disabled = true;
    btn.classList.add(r.alert.real ? "real" : "noise");
    btn.prepend(UR.h("span", { class: "alert-verdict" }, r.alert.real ? "REAL " : "NOISE "));
    status.textContent = queueText(q);
    notes.append(UR.h("p", { class: "puzzle-why" }, h2("Alert #" + (i + 1) + ": "), E().text(r.alert.why, state)), ...fired.map(butterflyBox));
    const next = mainEl.querySelector(".alert-item:not([disabled])");
    if (next) next.focus();
  }

  function h2(text) { return UR.h("strong", {}, text); }

  // Jayson's ability (spec §5): automate one step per level, halving its time. A toggle button arms it
  // for the next choice; the label says in words whether it is armed or already used.
  function automateToggle() {
    const h = UR.h;
    if (state.character !== "jayson" || state.automate === "used") return null;
    const armed = state.automate === "armed";
    const btn = h("button", { class: "automate" + (armed ? " armed" : ""), id: "automate", "aria-pressed": String(armed),
      onclick: () => {
        state.automate = state.automate === "armed" ? null : "armed";
        const on = state.automate === "armed";
        btn.setAttribute("aria-pressed", String(on));
        btn.classList.toggle("armed", on);
        btn.textContent = automateLabel(on);
      } }, automateLabel(armed));
    return btn;
  }

  function automateLabel(armed) {
    return armed ? "Automation armed · your next choice takes half the time" : "Automate this step · halves its time (once per level)";
  }

  // The Consult button in the top bar says in words whether it can be used, and why not.
  // v2.0: a phone icon in front of the label makes the button easier to spot.
  function updateConsult(onNode) {
    const st = UR.consult.status(level, state, onNode ? level.nodes[state.node] : null);
    consultBtn.replaceChildren(UR.consult.phoneIcon(), " " + st.label);
    consultBtn.disabled = !(st.usable && onNode);
  }

  // Open the Consult panel above the choices. Picking a teammate spends the token and shows their hint.
  function openConsult() {
    const node = level.nodes[state.node];
    const slot = mainEl.querySelector(".consult-slot");
    if (!slot || !UR.consult.status(level, state, node).usable) return;
    const close = () => { slot.replaceChildren(); consultBtn.focus(); };
    slot.replaceChildren(UR.consult.panel(level, state, node, hat(), id => {
      state.consultHint = { node: state.node, by: id, text: node.consult[id].hint };
      slot.replaceChildren(UR.consult.bubble(id, node.consult[id].hint, hat()));
      log(E().formatClock(state.clock) + " consulted " + UR.data.characters[id].first, "info");
      updateConsult(true);
      // Puzzle and alert-queue nodes have no choice buttons, so focus their first open line instead.
      mainEl.querySelector(".choice, .log-line:not([disabled]), .alert-item:not([disabled]), .order-item:not([disabled]), #order-confirm").focus();
    }, close));
    slot.querySelector(".consult-pick").focus();
  }

  // The bonus level is numbered 13 internally but is called "Bonus" on screen.
  function isBonus() { return !!(UR.data.index.bonus && UR.data.index.bonus.id === level.id); }
  function levelName() { return isBonus() ? "Bonus level" : "Level " + level.level; }

  // The tier's hat colour, used for teammates' faces too.
  function hat() { return UR.scene.HATS[UR.data.tiers.tiers[level.tier].hat]; }

  // Apply a choice through the engine, then show the feedback panel.
  function pick(key, shown) {
    const before = state.clock;
    // On a real-time spread node, a slow decision fires its event before the choice is applied.
    const slow = E().spreadDelay(level, state, stopSpread());
    const result = E().choose(level, state, key);
    if (slow.length) result.fired = slow.concat(result.fired);
    // The letter the player saw, for the feed and the feedback (the level file's key can differ).
    result.shown = shown || key;
    state.path[state.path.length - 1].shown = result.shown;
    updateHud(result.delta);
    log(E().formatClock(before) + " decision " + result.shown + ": " + result.choice.short, "ok");
    result.fired.forEach(f => { if (f.log) log(f.log, "hi"); log(f.text, "butterfly"); });
    if (result.fired.length) UR.audio.chime();
    updateConsult(false);
    if (result.suggestions) renderSuggestions(result);
    else renderFeedback(result);
  }

  // A right "None of these": explain it, then let two teammates suggest the real move.
  function renderSuggestions(result) {
    const h = UR.h;
    const c = result.choice;
    moodAfter(c.effects.points, result.fired);
    mainEl.replaceChildren(h("article", { class: "feedback" },
      h("p", { class: "phase" }, "Decision " + (result.shown || c.key) + " · " + c.short),
      h("p", { class: "node-body" }, E().text(c.note, state)),
      h("p", { class: "quality good" }, "Right call · " + c.effects.points + "/10"),
      h("details", { class: "why", open: "" }, h("summary", {}, "Why?"), h("p", {}, E().text(c.why, state))),
      UR.consult.suggestions(result.suggestions, hat(), i => {
        const r = E().pickSuggestion(level, state, i);
        updateHud(r.delta);
        log(E().formatClock(state.clock) + " followed " + UR.data.characters[r.suggestion.by].first + "'s suggestion", "ok");
        r.fired.forEach(f => { if (f.log) log(f.log, "hi"); log(f.text, "butterfly"); });
        renderSuggestionFeedback(r, result.fired);
      })
    ));
    mainEl.querySelector(".suggestions button").focus();
  }

  // What following a teammate's suggestion earned: bonus points for the right one.
  function renderSuggestionFeedback(r, earlier) {
    const h = UR.h;
    const s = r.suggestion;
    const fired = earlier.concat(r.fired);
    mainEl.replaceChildren(h("article", { class: "feedback" },
      h("p", { class: "phase" }, "You went with " + UR.data.characters[s.by].first),
      UR.consult.bubble(s.by, s.text, hat()),
      h("p", { class: "quality " + (s.correct ? "good" : "mixed") },
        s.correct ? "Good suggestion · +" + r.delta.noneBonus + " bonus points" : "A weaker idea · no bonus points"),
      ...fired.map(butterflyBox),
      h("button", { class: "btn primary", id: "continue", onclick: r.done ? finish : renderNode },
        r.done ? "See the report" : "Continue")
    ));
    mainEl.querySelector("#continue").focus();
  }

  function butterflyBox(f) {
    const h = UR.h;
    return h("div", { class: "butterfly", role: "status" },
      h("p", { class: "b-head" }, "Butterfly effect · " + f.at),
      h("p", {}, f.text, f.penalty ? h("strong", { class: "bad" }, " \u2212" + f.penalty + " points") : null),
      h("p", { class: "b-cause" }, "This happened because of: " + f.causes.join(" → ")));
  }

  // Feedback: what happened, meter changes, framework tags, "Why?", and butterfly alerts.
  // v2.0: the level music follows the result. A strong call eases the tension, a weak or harmful one
  // and every butterfly effect raise it.
  function moodAfter(pts, fired) {
    const t = UR.audio.tension;
    if (t == null) return;
    const step = pts >= 8 ? -0.15 : pts >= 4 ? 0.05 : pts >= 0 ? 0.15 : 0.25;
    UR.audio.setTension(t + step + 0.1 * ((fired && fired.length) || 0));
  }

  function renderFeedback(result) {
    const h = UR.h;
    const c = result.choice;
    const pts = (c.effects && c.effects.points) || 0;
    moodAfter(pts, result.fired);
    const changes = [];
    if (result.delta.minutes) changes.push("+" + result.delta.minutes + " min");
    if (result.delta.automated) changes.push("Jayson's automation saved " + result.delta.automated + " min");
    const nextNode = level.nodes[state.node];
    if (result.delta.waited) changes.push(nextNode && nextNode.newScene
      ? "Next: " + nextNode.act + ", " + E().formatClock(state.clock)
      : "time passes to " + E().formatClock(state.clock));
    for (const k in result.delta.meters) if (result.delta.meters[k]) changes.push(METER_NAMES[k] + " " + signed(result.delta.meters[k]));
    if (result.delta.evidence) changes.push("Evidence " + signed(result.delta.evidence));
    // Evidence that faded with time since the last feedback (engine.fadeEvidence); Echo halves it.
    if (state.lastFade) {
      changes.push("Evidence \u2212" + state.lastFade + " faded with time" + (state.character === "echo" ? " (Echo: half speed)" : ""));
      state.lastFade = 0;
    }
    if (result.delta.money) changes.push("Loss $" + result.delta.money.toLocaleString("en-US"));
    for (const c of level.clients || []) {
      const d = result.delta.clients && result.delta.clients[c.id];
      if (d) changes.push(c.name + " " + signed(d));
    }
    if (result.delta.nonePenalty) changes.push("\u201CNone of these\u201D penalty −" + result.delta.nonePenalty + " points");

    mainEl.replaceChildren(h("article", { class: "feedback" },
      h("p", { class: "phase" }, (c.key ? "Decision " + (result.shown || c.key) + " · " : "") + c.short),
      h("p", { class: "node-body" }, E().text(c.note, state)),
      changes.length ? h("p", { class: "changes" }, changes.join(" · ")) : null,
      h("p", { class: "quality " + (pts >= 8 ? "good" : pts >= 4 ? "mixed" : "bad") },
        pts >= 8 ? "Strong call" : pts >= 4 ? "Partly right" : pts >= 0 ? "Risky call" : "Serious mistake",
        // Illegal or deceptive choices cost points instead of just earning none.
        pts >= 0 ? " · " + pts + "/10" : " · \u2212" + -pts + " points"),
      c.tags && c.tags.length ? h("ul", { class: "tags" }, ...c.tags.map(t => h("li", {}, t))) : null,
      result.extra && result.extra.note ? h("p", { class: "trait" }, result.extra.note) : null,
      h("details", { class: "why", open: "" }, h("summary", {}, "Why?"), h("p", {}, E().text(c.why, state)),
        // Moritz's ability: deeper, standards-based explanations.
        c.whyDeep && state.character === "moritz" ? h("p", { class: "why-deep" }, h("strong", {}, "Moritz goes deeper: "), E().text(c.whyDeep, state)) : null),
      result.after || null,
      ...result.fired.map(butterflyBox),
      h("button", { class: "btn primary", id: "continue", onclick: result.done ? finish : renderNode },
        result.done ? "See the report" : "Continue")
    ));
    mainEl.querySelector("#continue").focus();
  }

  // Hand the finished state to the report screen.
  function finish() { UR.audio.stopMusic(); UR.screens.report.show(root, level, state); }

  function signed(n) { return (n > 0 ? "+" : "") + n; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  UR.screens = UR.screens || {};
  UR.screens.level = { show, stop };
})(window.UR = window.UR || {});
