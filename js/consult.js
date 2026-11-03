// consult.js — tip tokens, the Consult panel, and the teammates' speech bubbles after a right
// "None of these" (spec §7–8). Rules: a token is earned with a 100% level; at most one Consult per level;
// none in Beginner levels; the player picks one of the other three characters and that choice shapes the hint;
// in Master levels a hint can be misleading.
(function (UR) {
  "use strict";

  // How many tokens the player can spend here. The training drill lends one free token.
  function tokens(level, state) {
    if (level.demo) return state.tipUsed ? 0 : 1;
    return UR.save.data.tipTokens;
  }

  // Whether Consult can be used right now, and the words that explain why not.
  function status(level, state, node) {
    const tier = UR.data.tiers.tiers[level.tier];
    if (!tier || !tier.tips) return { usable: false, label: "Consult · not in Beginner levels" };
    if (state.tipUsed) return { usable: false, label: "Consult · tip used" };
    if (tokens(level, state) < 1) return { usable: false, label: "Consult · no tip tokens" };
    if (!node || !node.consult) return { usable: false, label: "Consult · " + tokens(level, state) + " tip" + (tokens(level, state) === 1 ? "" : "s") };
    return { usable: true, label: "Consult · " + tokens(level, state) + " tip" + (tokens(level, state) === 1 ? "" : "s") };
  }

  // v2.0 (update doc): a phone symbol in front of "Consult", so the button stands out. Inline SVG,
  // so it looks the same everywhere (an emoji would change with the device).
  function phoneIcon() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("class", "phone-icon"); svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z");
    p.setAttribute("fill", "currentColor");
    svg.append(p);
    return svg;
  }

  // A small portrait canvas for panels and bubbles.
  function face(id, hat) {
    const canvas = UR.h("canvas", { class: "face", "aria-hidden": "true" });
    UR.scene.portrait(canvas, UR.data.characters[id].look, hat);
    return canvas;
  }

  // The Consult panel: pick one of the other three teammates. Cancelling costs nothing.
  // onAsk(id) is called after the token is spent; onCancel closes the panel.
  function panel(level, state, node, hat, onAsk, onCancel) {
    const h = UR.h;
    const chars = UR.data.characters;
    const others = chars.order.filter(id => id !== state.character);
    return h("div", { class: "consult-panel", role: "group", "aria-label": "Consult a teammate" },
      h("p", { class: "phase" }, "Consult · spend 1 tip token"),
      h("p", { class: "consult-note" }, "Who do you ask? Each teammate sees the problem through their own specialty." +
        (level.tier === "master" ? " In Master levels, advice can be wrong." : "")),
      h("div", { class: "consult-team" }, ...others.map(id =>
        h("button", { class: "consult-pick", id: "ask-" + id, onclick: () => { spend(level, state, node, id); onAsk(id); } },
          face(id, hat), h("span", { class: "cp-name" }, chars[id].first), h("span", { class: "cp-role" }, chars[id].role)))),
      h("button", { class: "btn ghost small", id: "consult-cancel", onclick: onCancel }, "Never mind"));
  }

  // Spend the token and remember who was asked, for the report.
  function spend(level, state, node, id) {
    state.tipUsed = true;
    state.consult = { by: id, nodeTitle: node.title, at: UR.engine.formatClock(state.clock), misleading: !!node.consult[id].misleading };
    if (!level.demo) { UR.save.data.tipTokens -= 1; UR.save.persist(); }
  }

  // One speech bubble from a teammate, with their face and name.
  function bubble(id, text, hat, extra) {
    const h = UR.h;
    return h("div", { class: "bubble-row" },
      face(id, hat),
      h("div", { class: "bubble" }, h("p", { class: "bubble-name" }, UR.data.characters[id].first), h("p", {}, text), extra || null));
  }

  // After a right "None of these": two teammates (never the player) suggest what to do instead.
  function suggestions(list, hat, onPick) {
    const h = UR.h;
    return h("div", { class: "suggestions" },
      h("p", { class: "phase" }, "Two teammates step in"),
      ...list.map((s, i) => bubble(s.by, s.text, hat,
        h("button", { class: "btn small", id: "go-" + s.by, onclick: () => onPick(i) }, "Go with " + UR.data.characters[s.by].first))));
  }

  UR.consult = { status, panel, bubble, suggestions, tokens, phoneIcon };
})(window.UR = window.UR || {});
