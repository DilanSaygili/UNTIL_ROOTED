// screens/characters.js — character select, ID card and the "Background check" dossier intro.
// Select shows first names only; the ID card reveals attributes; the background check
// plays a short FBI-style file with typewriter text, redactions and pixel cut-in scenes.
(function (UR) {
  "use strict";

  let root = null;
  let run = null;   // controls the running animation: { skip, cancelled }
  let cutin = null; // the running canvas scene, if any

  // Stop whatever the previous view was animating, so views never overlap.
  function reset() {
    if (run) run.cancelled = true;
    run = { skip: false, cancelled: false };
    if (cutin) { cutin.stop(); cutin = null; }
    UR.audio.stopMystery();
    return run;
  }

  // Current clearance tier (1–4) follows how far the player has progressed.
  function tierNumber() { return Math.min(4, Math.ceil(UR.save.data.unlocked / 3)); }

  // ---- 1. Character select: four portraits, first names only. ----
  function show(container) {
    root = container;
    reset();
    const h = UR.h;
    const chars = UR.data.characters;
    root.replaceChildren(h("section", { class: "select" },
      h("p", { class: "eyebrow" }, "Choose your defender"),
      h("h1", { class: "screen-title" }, "The team"),
      h("p", { class: "select-hint" }, "All four defend the same team. Open a file to see who they are."),
      h("div", { class: "roster" }, ...chars.order.map(id => {
        const c = chars[id];
        const canvas = h("canvas", { class: "portrait", "aria-hidden": "true" });
        UR.scene.portrait(canvas, c.look, "green");
        return h("button", { class: "roster-card", id: "pick-" + id, onclick: () => idCard(id) },
          canvas, h("span", { class: "roster-name" }, c.first));
      })),
      h("button", { class: "btn ghost", id: "back-title", onclick: () => UR.go.title() }, "Back to title")
    ));
    root.querySelector(".roster-card").focus();
  }

  // ---- 2. ID card: a decrypting terminal header, then the attributes. ----
  async function idCard(id) {
    const ctl = reset();
    const h = UR.h;
    const c = UR.data.characters[id];
    const tier = tierNumber();
    const term = h("pre", { class: "id-term", "aria-hidden": "true" });
    const canvas = h("canvas", { class: "portrait big", "aria-hidden": "true" });
    UR.scene.portrait(canvas, c.look, "green");

    const details = h("div", { class: "id-details", hidden: "" },
      h("dl", { class: "attrs" },
        ...attr("Full name", c.short),
        ...attr("Role", c.role),
        ...attr("Hometown", c.hometown),
        ...attr("Age", String(c.age)),
        ...attr("Birthday", c.birthday + " (" + c.sign + ")"),
        ...attr("Highlight levels", c.highlights.join(", "))),
      h("p", { class: "aura" }, c.aura),
      h("div", { class: "trait-grid" },
        h("div", { class: "trait good" }, h("p", { class: "trait-label" }, "Ability"), h("p", {}, c.ability)),
        h("div", { class: "trait bad" }, h("p", { class: "trait-label" }, "Weakness"), h("p", {}, c.weakness))),
      h("blockquote", { class: "quote" }, "“" + c.quote + "”"),
      h("div", { class: "actions" },
        h("button", { class: "btn primary", id: "bg-check", onclick: () => backgroundCheck(id) }, "Background check"),
        h("button", { class: "btn", id: "choose", onclick: () => choose(id) }, "Choose " + c.first),
        h("button", { class: "btn ghost", id: "back-team", onclick: () => show(root) }, "Back to the team")));

    root.replaceChildren(h("section", { class: "idcard" },
      h("h1", { class: "sr-only" }, "ID card for " + c.first + ". " + c.role + "."), // the page heading for screen readers
      h("div", { class: "id-head" }, canvas, term),
      details));

    const lines = [
      "> DECRYPTING PROFILE...",
      "ID: " + c.id + " | CODENAME: " + c.first.toUpperCase(),
      "ROLE: " + c.role.toUpperCase(),
      "CLEARANCE: TIER " + tier + " " + "█".repeat(Math.round(tier * 2.5)) + "░".repeat(10 - Math.round(tier * 2.5)),
      "FULL NAME: " + c.short.toUpperCase()
    ];
    details.hidden = false; // the attributes are readable at once; the terminal types alongside
    for (const line of lines) {
      if (ctl.cancelled) return;
      await UR.typewrite(term, line + "\n", ctl, 14);
    }
    if (!ctl.cancelled) root.querySelector("#bg-check").focus({ preventScroll: true });
  }

  function attr(label, value) { const h = UR.h; return [h("dt", {}, label), h("dd", {}, value)]; }

  // ---- 3. Background check: the dossier intro with cut-ins and mysterious music. Skippable. ----
  async function backgroundCheck(id) {
    const ctl = reset();
    const h = UR.h;
    const c = UR.data.characters[id];
    UR.audio.startMystery();

    const body = h("div", { class: "dossier-body", "aria-live": "polite" });
    const skip = h("button", { class: "btn ghost skip", id: "skip", onclick: () => { ctl.skip = true; skip.disabled = true; } }, "Skip");
    const after = h("div", { class: "actions", hidden: "" },
      h("button", { class: "btn primary", id: "choose-after", onclick: () => choose(id) }, "Choose " + c.first),
      h("button", { class: "btn", id: "back-id", onclick: () => idCard(id) }, "Back to ID card"));

    root.replaceChildren(h("section", { class: "dossier" },
      h("h1", { class: "sr-only" }, "Background check: " + c.first),
      h("div", { class: "dossier-top" },
        h("p", { class: "stamp" }, "Classified"),
        h("p", { class: "file-no" }, "File " + c.id + " · Background check"),
        skip),
      body, after));
    skip.focus();

    // One typed line in the file: a label and its value.
    const line = async (label, value) => {
      const row = h("p", { class: "d-line" }, h("span", { class: "d-label" }, label + ": "));
      const val = h("span", {});
      row.append(val);
      body.append(row);
      await UR.typewrite(val, value, ctl, 22);
    };

    // A pixel cut-in scene with a caption, shown for a moment.
    const cut = async scene => {
      if (ctl.cancelled) return;
      const canvas = h("canvas", { class: "cutin", "aria-hidden": "true" });
      body.append(h("figure", { class: "cutin-wrap" }, canvas, h("figcaption", {}, scene.caption)));
      if (cutin) cutin.stop();
      cutin = UR.scene.playScene(canvas, c.look, scene.type);
      await UR.wait(3200, ctl);
    };

    // A paragraph that starts with redacted words and decrypts them in a glitchy reveal.
    const redacted = async (label, text) => {
      if (ctl.cancelled) return;
      const words = text.split(" ");
      const hidden = words.map((w, i) => i % 3 === 1 && w.length > 3);
      const spans = words.map((w, i) => h("span", { class: hidden[i] ? "redact" : "" }, hidden[i] ? "█".repeat(w.length) : w));
      const p = h("p", { class: "d-para" }, h("span", { class: "d-label" }, label + ": "));
      spans.forEach((s, i) => { p.append(s); if (i < spans.length - 1) p.append(" "); });
      body.append(p);
      for (let i = 0; i < words.length; i++) {
        if (!hidden[i]) continue;
        await UR.wait(140, ctl);
        if (ctl.cancelled) return;
        spans[i].textContent = words[i];
        spans[i].className = ctl.skip ? "" : "revealed";
      }
    };

    await line("Subject", c.full.toUpperCase());
    await line("Date of birth", c.birthday + " · " + c.sign);
    await line("Origin", c.hometown);
    await line("Real-world role", c.realWorld);
    await cut(c.scenes[0]);
    await redacted("Assessment", c.personality);
    await cut(c.scenes[1]);
    await redacted("Known weakness", c.weakness);
    await line("Last recorded words", "“" + c.quote + "”");
    if (ctl.cancelled) return;
    body.append(h("p", { class: "stamp cleared" }, "Cleared for duty"));
    skip.hidden = true;
    after.hidden = false;
    root.querySelector("#choose-after").focus({ preventScroll: true });
  }

  // Lock in the character for this run and open the level map.
  function choose(id) {
    reset();
    UR.save.setCharacter(id);
    UR.go.map();
  }

  UR.screens = UR.screens || {};
  UR.screens.characters = { show, stop: reset };
})(window.UR = window.UR || {});
