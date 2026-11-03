// screens/report.js — the end-of-level evaluation report.
// It only describes what the player actually did: no hints about branches they did not take.
(function (UR) {
  "use strict";
  const E = () => UR.engine;

  // Record the result in the save. v2.0 (update doc): a newly earned title first gets its own
  // "New title earned" screen with a small celebration; then the report follows.
  function show(root, level, state) {
    UR.audio.stopMusic();
    const pct = E().percent(state, level);
    const before = UR.save.data.title;
    // Only the first pass of a level earns its title; replays go straight to the report.
    const firstPass = !level.demo && (UR.save.data.best[level.id] || 0) < UR.data.tiers.passPercent;
    // The training drill never touches the save.
    const result = level.demo ? { demo: true } : UR.save.recordResult(level.level, level.id, pct, UR.data.tiers);
    result.firstPass = firstPass;
    if (result.newTitle && firstPass) return celebrate(root, level, before, result.newTitle, () => render(root, level, state, pct, result));
    render(root, level, state, pct, result);
  }

  // The "New title earned" screen: the old title crossed out, the new one large, confetti and a fanfare.
  function celebrate(root, level, oldTitle, title, next) {
    const h = UR.h;
    const titles = UR.data.tiers.titles;
    const burst = h("div", { class: "confetti", "aria-hidden": "true" });
    const colors = ["#f0b23e", "#63d49c", "#b99cff", "#ff5c4d", "#6fb3ff", "#ffffff"];
    if (!UR.reducedMotion()) for (let i = 0; i < 42; i++) {
      const a = (i / 42) * Math.PI * 2, d = 120 + Math.random() * 180;
      burst.append(h("span", { style: "--dx:" + Math.round(Math.cos(a) * d) + "px;--dy:" + Math.round(Math.sin(a) * d - 60) + "px;--r:" +
        Math.round(Math.random() * 720 - 360) + "deg;--d:" + (Math.random() * 0.25).toFixed(2) + "s;background:" + colors[i % colors.length] }));
    }
    root.replaceChildren(h("section", { class: "title-earned" },
      burst,
      h("p", { class: "eyebrow" }, levelName(level) + " · " + level.title + " · passed"),
      h("p", { class: "te-new" }, "New title earned"),
      h("h1", { class: "te-title" }, title),
      oldTitle !== title ? h("p", { class: "te-from" }, h("s", {}, oldTitle), " \u2192 ", h("strong", {}, title)) : null,
      h("p", { class: "te-rank" }, "Rank " + (titles.indexOf(title) + 1) + " of " + titles.length),
      h("button", { class: "btn primary", id: "see-report", onclick: next }, "See the report")));
    window.scrollTo(0, 0);
    UR.audio.fanfare();
    root.querySelector("#see-report").focus({ preventScroll: true });
  }

  // Build the report and offer Retry / next step.
  function render(root, level, state, pct, result) {
    const h = UR.h;
    const end = E().ending(level, state);
    UR.audio.sting(end.tone);

    const rewards = [];
    if (result.demo) rewards.push(h("li", {}, "Training drill: nothing was saved. Consult and \u201CNone of these\u201D work like this from Level 4 and Level 10."));
    else if (!result.passed) rewards.push(h("li", { class: "bad" }, "Below " + UR.data.tiers.passPercent + "%: no title this time, and the next level stays locked."));
    // v2.0: the title stands out as a badge instead of looking like any other line.
    if (result.passed && !result.demo) rewards.push(h("li", { class: "good title-line" }, "Passed. Title: ",
      h("span", { class: "title-badge" + (result.newTitle && result.firstPass ? " new" : "") }, UR.save.data.title), result.newTitle && result.firstPass ? " earned now" : ""));
    // Passing Level 12 opens the bonus level; passing the bonus opens nothing more.
    const bonus = UR.data.index.bonus;
    if (result.unlocked && bonus && result.unlocked === bonus.level) {
      rewards.push(h("li", { class: "good" }, "Bonus level unlocked: " + bonus.title + "."));
    } else if (result.unlocked && UR.data.index.levels.some(l => l.level === result.unlocked)) {
      const next = UR.save.reachable(UR.data.index.levels);
      rewards.push(h("li", { class: "good" }, next > result.unlocked
        ? "Level " + result.unlocked + " unlocked. It is still being built, so Level " + next + " is open too."
        : "Level " + result.unlocked + " unlocked."));
    }
    if (result.tipToken) rewards.push(h("li", { class: "good" }, "Perfect score: +1 tip token (you now have " + UR.save.data.tipTokens + ")."));

    const tags = Object.keys(state.tags);

    // Why: evidence fades while the attacker is active (engine.fadeEvidence), and Echo slows that.
    // The report says how much was kept and lost, so the player sees the cost of time and Echo's ability.
    function evidenceSection() {
      if (!state.evidence && !state.evidenceFaded) return null;
      const echo = state.character === "echo";
      return section("Evidence",
        h("p", {}, "Kept: " + state.evidence + "/100. ",
          state.evidenceFaded
            ? "Lost to time: " + state.evidenceFaded + " (logs rolled over and traces disappeared while the attacker was active). "
            : "Nothing was lost to time. ",
          echo ? h("strong", { class: "good" }, "Echo preserves evidence, so it faded at half speed. ") : null,
          bonusLine()));
    }
    // The kept-evidence bonus (engine.evidenceBonus) and why it is zero with a bad ending.
    function bonusLine() {
      const pts = E().evidenceBonus(level, state);
      if (pts) return h("strong", { class: "good" }, "Evidence bonus: +" + pts + " point" + (pts > 1 ? "s" : "") + ".");
      if (end.tone === "bad" && state.evidence >= E().evidenceDecay(level).bonusPer) return "No evidence bonus: evidence doesn't rescue a bad outcome.";
      return "Keep at least " + E().evidenceDecay(level).bonusPer + " evidence for a bonus point.";
    }
    const wah = level.whatActuallyHappened;
    // v2.0 (update doc): after the bonus level is passed, the way on is the report, then "What actually
    // happened", then "End" (the closing scene) instead of the level map.
    const finale = !!(result.passed && isBonus(level) && wah);

    // Order puzzles (Level 11, bonus): the order that works is shown here, and only once the level is
    // passed, so a player who has to try again does not get the answer (update doc, v2.0).
    function orderSection() {
      if (!state.orders || !state.orders.length) return null;
      return state.orders.map(o => section("The order that works · " + o.title,
        result.passed || result.demo
          ? h("ol", { class: "order-list" }, ...o.correct.map(it => h("li", {},
              h("strong", {}, it.label + (it.placed ? " \u2717 (you placed " + it.placed + ")" : " \u2713") + " "), it.why)))
          : h("p", {}, "Pass the level to see the order that works.")));
    }

    const report = h("section", { class: "report" },
      h("p", { class: "eyebrow" }, "Incident report · " + levelName(level) + " · " + level.title),
      h("div", { class: "verdict " + end.tone },
        h("p", { class: "score" }, pct + "%"),
        h("div", {}, h("h1", { class: "grade" }, end.grade), h("p", {}, end.text))),
      h("ul", { class: "rewards" }, ...rewards),

      section("Decision path",
        h("ol", { class: "path" },
          state.intro ? h("li", {}, h("span", { class: "t" }, state.intro.at), " Before the shift: ", state.intro.short) : null,
          ...state.path.map(p => h("li", {}, h("span", { class: "t" }, p.at), " ",
            p.suggestion ? UR.data.characters[p.by].first + "'s idea: " + p.short : p.short,
            p.automated ? " (automated, " + p.automated + " min saved)" : "",
            h("span", { class: "pts" },
              p.suggestion ? (p.extra ? "+" + p.extra + " bonus" : "no bonus")
                : (p.points < 0 ? "\u2212" + -p.points + " points" : p.points + "/" + p.best) + (p.extra ? " · " + p.extra + " penalty" : "")))))),

      state.consult ? section("Consult",
        h("p", {}, "You asked " + UR.data.characters[state.consult.by].first + " at " + state.consult.at + " during \u201C" + state.consult.nodeTitle + "\u201D. ",
          state.consult.misleading
            ? h("strong", { class: "bad" }, "That advice was misleading. In Master levels, teammates can be wrong.")
            : h("strong", { class: "good" }, "That advice was sound."))) : null,

      evidenceSection(),
      orderSection(),

      // Level 6: how much of each client's business was running when the night ended.
      level.clients ? section("Clients",
        h("ul", {}, ...level.clients.map(c => h("li", {}, c.name + ": " + state.clients[c.id] + "% running")))) : null,

      section("Butterfly chain",
        state.chain.length
          ? h("ul", { class: "chain" }, ...state.chain.map(c =>
              h("li", {}, h("p", {}, h("strong", {}, c.at + " "), c.text, c.penalty ? h("strong", { class: "bad" }, " \u2212" + c.penalty + " points") : null),
                h("p", { class: "b-cause" }, "This happened because of: " + c.causes.join(" → ")))))
          : h("p", {}, "No delayed consequences fired. You gave the attacker no time to act.")),

      section("Frameworks touched", h("ul", { class: "tags" }, ...tags.map(t => h("li", {}, t)))),
      section("Lessons learned", h("ul", {}, ...(level.lessons || []).map(l => h("li", {}, l)))),
      section("Relevant standards", h("ul", {}, ...(level.standards || []).map(s => h("li", {}, s)))),

      h("div", { class: "actions" },
        wah ? h("button", { class: "btn primary", id: "wah", onclick: () => story(root, level, report, finale) }, "What actually happened\u2026") : null,
        finale ? null : h("button", { class: "btn" + ((result.passed || result.demo) && !wah ? " primary" : ""), id: "to-map", onclick: () => UR.go.map() }, "Level map"),
        h("button", { class: "btn" + (result.passed || result.demo ? "" : " primary"), id: "retry", onclick: () => UR.go.level(level.id) }, result.passed || result.demo ? "Play again" : "Retry")),
      h("p", { class: "license" }, "Until Rooted v" + UR.VERSION + " © 2026 Dilan · Code MIT · Content CC BY-NC-SA 4.0")
    );
    root.replaceChildren(report);
    root.scrollTop = 0;
    window.scrollTo(0, 0);
    root.querySelector(wah ? "#wah" : result.passed || result.demo ? "#to-map" : "#retry").focus({ preventScroll: true });
  }

  // "What actually happened…" (real-event levels only): the real story with real names, the only
  // place they appear. v2.0 (update doc): it arrives like a flashback (white flash, sepia, the page
  // spinning in) as a newspaper front page, with a hooded figure in the corner whose colour suits the
  // event (black, grey or red, "hacker" in the level file). "Back to report" puts the same report back,
  // so the result is not recorded twice. After the bonus level is passed, "End" replaces "Level map".
  function story(root, level, report, finale) {
    const h = UR.h;
    const w = level.whatActuallyHappened;
    const leave = to => { UR.audio.stopMystery(); to(); };
    const hacker = h("canvas", { class: "np-hacker hacker-" + (w.hacker || "black"), "aria-hidden": "true" });
    UR.scene.hacker(hacker, w.hacker || "black");
    const backBtn = h("button", { class: "btn", id: "story-back", onclick: () => leave(() => {
      root.replaceChildren(report);
      window.scrollTo(0, 0);
      (report.querySelector("#to-map") || report.querySelector("#wah")).focus({ preventScroll: true });
    }) }, "Back to report");
    const onward = finale
      ? h("button", { class: "btn primary", id: "story-end", onclick: () => leave(() => UR.screens.ending.show(root)) }, "End")
      : h("button", { class: "btn primary", id: "story-map", onclick: () => leave(() => UR.go.map()) }, "Level map");

    const page = h("article", { class: "story newspaper" },
      h("header", { class: "np-head" },
        hacker,
        h("p", { class: "np-mast" }, "The Daily Ledger"),
        h("p", { class: "np-strap" }, h("span", {}, "Special edition"), h("span", {}, level.real.dates), h("span", {}, "Price: one lesson"))),
      h("p", { class: "eyebrow" }, "What actually happened\u2026 · " + levelName(level) + " · " + level.title),
      h("h1", { class: "np-headline", tabindex: "-1" }, w.headline || w.title || "What actually happened\u2026"),
      h("div", { class: "story-text np-columns" }, ...w.paragraphs.map((p, i) => h("p", { class: "story-p", style: "--i:" + i }, p))),
      h("div", { class: "story-end" },
        h("h2", {}, "Sources"),
        h("ul", { class: "sources" }, ...(w.sources || []).map(src =>
          h("li", {}, h("a", { href: src.url, target: "_blank", rel: "noopener noreferrer" }, src.label)))),
        h("div", { class: "actions" }, onward, backBtn)));

    root.replaceChildren(h("section", { class: "flashback" }, h("div", { class: "fb-flash", "aria-hidden": "true" }), page));
    window.scrollTo(0, 0);
    UR.audio.startMystery();
    root.querySelector(".np-headline").focus({ preventScroll: true });
  }

  function section(title, body) {
    const h = UR.h;
    return h("section", { class: "r-section" }, h("h2", {}, title), body);
  }

  function isBonus(level) { const b = UR.data.index.bonus; return !!(b && b.id === level.id); }

  // The bonus level is numbered 13 internally but is called "Bonus level" on screen.
  function levelName(level) {
    const bonus = UR.data.index.bonus;
    return bonus && bonus.id === level.id ? "Bonus level" : "Level " + level.level;
  }

  UR.screens = UR.screens || {};
  UR.screens.report = { show };
})(window.UR = window.UR || {});
