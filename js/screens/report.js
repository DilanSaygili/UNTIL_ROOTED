// screens/report.js — the end-of-level evaluation report.
// It only describes what the player actually did: no hints about branches they did not take.
(function (UR) {
  "use strict";
  const E = () => UR.engine;

  // Build the report, record the result in the save, and offer Retry / next step.
  function show(root, level, state) {
    const h = UR.h;
    const pct = E().percent(state, level);
    const end = E().ending(level, state);
    // The training drill never touches the save.
    const result = level.demo ? { demo: true } : UR.save.recordResult(level.level, level.id, pct, UR.data.tiers);
    UR.audio.sting(end.tone);

    const rewards = [];
    if (result.demo) rewards.push(h("li", {}, "Training drill: nothing was saved. Consult and \u201CNone of these\u201D work like this from Level 4 and Level 10."));
    else if (!result.passed) rewards.push(h("li", { class: "bad" }, "Below " + UR.data.tiers.passPercent + "%: no title this time, and the next level stays locked."));
    if (result.passed && !result.demo) rewards.push(h("li", { class: "good" }, "Passed. Title: " + UR.save.data.title + (result.newTitle ? " (earned now)" : "")));
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
        wah ? h("button", { class: "btn primary", id: "wah", onclick: () => story(root, level, report) }, "What actually happened\u2026") : null,
        h("button", { class: "btn" + ((result.passed || result.demo) && !wah ? " primary" : ""), id: "to-map", onclick: () => UR.go.map() }, "Level map"),
        h("button", { class: "btn" + (result.passed || result.demo ? "" : " primary"), id: "retry", onclick: () => UR.go.level(level.id) }, result.passed || result.demo ? "Play again" : "Retry")),
      h("p", { class: "license" }, "Until Rooted © 2026 Dilan · Code MIT · Content CC BY-NC-SA 4.0")
    );
    root.replaceChildren(report);
    root.scrollTop = 0;
    window.scrollTo(0, 0);
    root.querySelector(wah ? "#wah" : result.passed || result.demo ? "#to-map" : "#retry").focus({ preventScroll: true });
  }

  // "What actually happened…" (real-event levels only): the real story with real names, the only
  // place they appear. Paragraphs appear one at a time, like opening a case file; "Show all" skips ahead.
  // "Back to report" puts the same report back, so the result is not recorded twice.
  function story(root, level, report) {
    const h = UR.h;
    const w = level.whatActuallyHappened;
    let shown = 0;
    const text = h("div", { class: "story-text", "aria-live": "polite" });
    const nextBtn = h("button", { class: "btn primary", id: "story-next", onclick: reveal }, "Next");
    const allBtn = h("button", { class: "btn ghost", id: "story-all", onclick: () => { while (shown < w.paragraphs.length) reveal(); } }, "Show all");
    const leave = to => { UR.audio.stopMystery(); to(); };
    const end = h("div", { class: "story-end", hidden: "" },
      h("h2", {}, "Sources"),
      h("ul", { class: "sources" }, ...(w.sources || []).map(src =>
        h("li", {}, h("a", { href: src.url, target: "_blank", rel: "noopener noreferrer" }, src.label)))),
      h("div", { class: "actions" },
        h("button", { class: "btn primary", id: "story-back", onclick: () => leave(() => {
          root.replaceChildren(report);
          window.scrollTo(0, 0);
          report.querySelector("#to-map").focus({ preventScroll: true });
        }) }, "Back to report"),
        h("button", { class: "btn", id: "story-map", onclick: () => leave(() => UR.go.map()) }, "Level map")));

    // Show the next paragraph; after the last one, show the sources and the way back.
    function reveal() {
      text.append(h("p", { class: "story-p" }, w.paragraphs[shown++]));
      if (shown < w.paragraphs.length) return;
      nextBtn.hidden = allBtn.hidden = true;
      end.hidden = false;
      end.querySelector("#story-back").focus({ preventScroll: true });
    }

    root.replaceChildren(h("section", { class: "story" },
      h("p", { class: "eyebrow" }, levelName(level) + " · " + level.title + " · Inspired by events of " + level.real.dates),
      h("h1", {}, w.title || "What actually happened\u2026"),
      text,
      h("div", { class: "actions story-actions" }, nextBtn, allBtn),
      end));
    window.scrollTo(0, 0);
    UR.audio.startMystery();
    reveal();
    nextBtn.focus({ preventScroll: true });
  }

  function section(title, body) {
    const h = UR.h;
    return h("section", { class: "r-section" }, h("h2", {}, title), body);
  }

  // The bonus level is numbered 13 internally but is called "Bonus level" on screen.
  function levelName(level) {
    const bonus = UR.data.index.bonus;
    return bonus && bonus.id === level.id ? "Bonus level" : "Level " + level.level;
  }

  UR.screens = UR.screens || {};
  UR.screens.report = { show };
})(window.UR = window.UR || {});
