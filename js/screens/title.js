// screens/title.js — the title screen: logo, the team in silhouette, Continue / New game.
(function (UR) {
  "use strict";

  let scene = null;

  // Show the title. "New game" wipes progress, so it asks first when a save exists.
  function show(root) {
    const h = UR.h;
    const saved = UR.save.data.started;
    const canvas = h("canvas", { class: "title-art", width: "168", height: "44", "aria-hidden": "true" });

    // v2.0: a small click on every title-screen button (and only here).
    const clicky = fn => () => { UR.audio.click(); fn(); };

    const buttons = h("div", { class: "title-actions" },
      saved ? h("button", { class: "btn primary", id: "continue-game", onclick: clicky(() => UR.go.map()) },
        "Continue as " + UR.data.characters[UR.save.data.character].first) : null,
      h("button", { class: "btn" + (saved ? "" : " primary"), id: "new-game", onclick: clicky(() => saved ? confirmNew() : startNew()) }, "New game"));

    const confirmBox = h("div", { class: "confirm", hidden: "" },
      h("p", {}, "Start over? Your titles, unlocked levels and tip tokens will be erased."),
      h("div", { class: "title-actions" },
        h("button", { class: "btn primary", id: "confirm-new", onclick: clicky(startNew) }, "Erase and start over"),
        h("button", { class: "btn", id: "cancel-new", onclick: clicky(() => { confirmBox.hidden = true; buttons.hidden = false; root.querySelector("#new-game").focus(); }) }, "Keep my progress")));

    function confirmNew() {
      buttons.hidden = true;
      confirmBox.hidden = false;
      root.querySelector("#cancel-new").focus();
    }

    // v2.0: the title arrives with a glitch (CSS .glitch-in; skipped with reduced motion).
    root.replaceChildren(h("section", { class: "title-screen glitch-in" },
      h("p", { class: "eyebrow" }, "An incident-response game"),
      h("h1", { class: "logo", "aria-label": "Until Rooted" },
        h("span", { class: "logo-until" }, "UNTIL"), h("span", { class: "logo-rooted", "data-text": "ROOTED" }, "ROOTED")),
      h("p", { class: "countdown", "aria-hidden": "true" }, "T-minus ", h("span", { id: "t-minus" }, "00:20:00"), " until the attacker has root"),
      canvas,
      h("p", { class: "title-blurb" }, "Twelve incidents. Some invented, some inspired by real attacks. Every decision follows real security practice, and some choices only bite you three steps later."),
      buttons, confirmBox,
      h("p", { class: "license" }, "Until Rooted v" + UR.VERSION + " © 2026 Dilan · Code MIT · Content CC BY-NC-SA 4.0")
    ));
    drawTeam(canvas);
    runCountdown(root.querySelector("#t-minus"));
    root.querySelector(saved ? "#continue-game" : "#new-game").focus();
  }

  // The four defenders side by side in their green Beginner caps.
  function drawTeam(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0f14"; ctx.fillRect(0, 0, 168, 44);
    UR.data.characters.order.forEach((id, i) => UR.scene.drawBust(ctx, UR.data.characters[id].look, 4 + i * 41, 6, { hat: "green" }));
    ctx.fillStyle = "rgba(10,15,20,0.35)"; ctx.fillRect(0, 0, 168, 44);
  }

  // A ticking countdown under the logo: "until" is the countdown in the name.
  function runCountdown(el) {
    if (scene) clearInterval(scene);
    let s = 20 * 60;
    if (UR.reducedMotion()) return;
    scene = setInterval(() => {
      if (!document.body.contains(el)) { clearInterval(scene); scene = null; return; }
      s = s > 0 ? s - 1 : 20 * 60;
      el.textContent = "00:" + String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    }, 1000);
  }

  // New run: wipe the save and go to character select.
  function startNew() {
    UR.save.newGame();
    UR.go.characters();
  }

  UR.screens = UR.screens || {};
  UR.screens.title = { show };
})(window.UR = window.UR || {});
