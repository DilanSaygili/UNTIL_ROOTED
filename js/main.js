// main.js — boot, shared helpers and the screen router.
// Flow: title → character select / ID card / background check → map → level → report → map.
(function (UR) {
  "use strict";

  // Create a DOM element with attributes and children. Strings become text nodes,
  // so level text is never parsed as HTML.
  UR.h = function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : String(kid));
    return el;
  };

  // Respect the player's reduced-motion setting (skip flashes and zooms).
  UR.reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The global mute button, reused in every top bar.
  UR.muteButton = function () {
    const btn = UR.h("button", { class: "mute", "aria-pressed": String(UR.audio.muted) }, UR.audio.muted ? "Sound off" : "Sound on");
    btn.addEventListener("click", () => {
      const m = UR.audio.toggle();
      btn.textContent = m ? "Sound off" : "Sound on";
      btn.setAttribute("aria-pressed", String(m));
    });
    return btn;
  };

  // Wait ms milliseconds, but finish at once if the player skipped (ctl.skip) or the view closed.
  UR.wait = function (ms, ctl) {
    return new Promise(resolve => {
      if (!ctl || ctl.skip || ctl.cancelled || UR.reducedMotion()) return resolve();
      const start = performance.now();
      const tick = () => (ctl.skip || ctl.cancelled || performance.now() - start >= ms) ? resolve() : setTimeout(tick, 40);
      tick();
    });
  };

  // Type text into an element one character at a time (typewriter / terminal effect).
  // Skipping or reduced motion writes the rest instantly.
  UR.typewrite = async function (el, text, ctl, speed) {
    for (let i = 0; i < text.length; i++) {
      if (ctl.cancelled) return;
      if (ctl.skip || UR.reducedMotion()) { el.append(text.slice(i)); return; }
      el.append(text[i]);
      if (text[i] !== " " && i % 2 === 0) UR.audio.typeTick();
      await new Promise(r => setTimeout(r, speed || 20));
    }
  };

  // Load a JSON file. A single-file build pre-fills window.UR_DATA so it also works without a server.
  UR.loadJSON = async function (path) {
    if (window.UR_DATA && window.UR_DATA[path]) return window.UR_DATA[path];
    const res = await fetch(path);
    if (!res.ok) throw new Error("Could not load " + path + " (" + res.status + ")");
    return res.json();
  };

  // Screen router: every screen is reached through UR.go so stray animations can be stopped first.
  UR.go = {
    title() { stopAll(); UR.screens.title.show(app()); },
    characters() { stopAll(); UR.screens.characters.show(app()); },
    map() {
      stopAll();
      if (!UR.save.data.character) return UR.go.characters();
      UR.screens.map.show(app());
    },
    // Open a level by id, but only if it is built and unlocked; otherwise fall back to the map.
    async level(id) {
      stopAll();
      const entry = UR.data.index.levels.concat(UR.data.index.bonus || [], UR.data.index.demo || []).find(l => l.id === id);
      const isDemo = entry && UR.data.index.demo && entry.id === UR.data.index.demo.id;
      if (!entry || !entry.ready || (!isDemo && entry.level > UR.save.reachable(UR.data.index.levels))) return UR.go.map();
      const level = await UR.loadJSON("data/levels/" + id + ".json");
      UR.screens.level.show(app(), level);
      window.scrollTo(0, 0);
    }
  };

  function app() { return document.getElementById("app"); }
  function stopAll() { UR.screens.characters.stop(); UR.screens.level.stop(); }

  // "#demo" in the link opens the training drill (Consult and "None of these"). It saves nothing;
  // without a chosen character it plays as Iris, kept in memory only.
  function openDemoFromLink() {
    if (location.hash !== "#demo" || !UR.data.index.demo) return false;
    if (!UR.save.data.character) UR.save.data.character = "iris";
    UR.go.level(UR.data.index.demo.id);
    return true;
  }

  // Boot: load the shared data, then open the title screen.
  async function boot() {
    try {
      UR.save.load();
      const [tiers, characters, index] = await Promise.all([
        UR.loadJSON("data/tiers.json"), UR.loadJSON("data/characters.json"), UR.loadJSON("data/levels/index.json")]);
      UR.data = { tiers, characters, index };
      window.addEventListener("hashchange", openDemoFromLink);
      if (!openDemoFromLink()) UR.go.title();
    } catch (err) {
      const app = document.getElementById("app");
      app.replaceChildren(UR.h("p", { class: "error" },
        "The game could not load its data. If you opened index.html directly, run `python3 -m http.server 8000` in the folder and open http://localhost:8000. Details: " + err.message));
    }
  }

  boot();
})(window.UR = window.UR || {});
