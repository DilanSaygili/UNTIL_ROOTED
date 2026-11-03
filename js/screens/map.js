// screens/map.js — the level map: 12 levels plus the bonus, grouped by tier.
// Each tier names its real security focus; each level shows locked / open / completed,
// the best score and the title earned. State is always written in words, not only colour.
(function (UR) {
  "use strict";

  const ENV = { home: "Home", office: "Office", newyork: "New York office", underground: "Underground" };
  const LIGHT = { day: "Day", twilight: "Twilight", night: "Night", warm: "Yellow light", dusk: "Purple light", dark: "No lights" };

  // Work out how a level should look on the map from the save.
  function levelState(entry) {
    const save = UR.save.data;
    const best = save.best[entry.id];
    const pass = UR.data.tiers.passPercent;
    if (entry.level > UR.save.reachable(UR.data.index.levels)) return { kind: "locked", best };
    if (best != null && best >= pass) return { kind: "done", best };
    if (!entry.ready) return { kind: "dev", best };
    return { kind: best != null ? "retry" : "open", best };
  }

  // The words under each level card.
  function stateText(entry, st) {
    const pass = UR.data.tiers.passPercent;
    if (st.kind === "locked") return entry.tier === "bonus" ? "Locked · finish Level 12 to unlock" : "Locked · pass Level " + previousBuilt(entry.level) + " with " + pass + "%";
    if (st.kind === "dev") return "Unlocked · this level is still being built";
    if (st.kind === "done") return "Completed · best " + st.best + "% · title: " + UR.data.tiers.titles[entry.level - 1];
    if (st.kind === "retry") return "Best " + st.best + "% · needs " + pass + "% to pass";
    return "Open · ready to play";
  }

  // The last built level before this one: the one that has to be passed to open it.
  function previousBuilt(n) {
    const built = UR.data.index.levels.filter(l => l.ready && l.level < n).map(l => l.level);
    return built.length ? Math.max(...built) : n - 1;
  }

  // One level card. Only playable levels are buttons; the rest are plain, readable cards.
  function card(entry) {
    const h = UR.h;
    const st = levelState(entry);
    const playable = entry.ready && st.kind !== "locked";
    const inner = [
      h("span", { class: "lv-num" }, entry.tier === "bonus" ? "Bonus" : "Level " + entry.level),
      h("span", { class: "lv-title" }, entry.title),
      h("span", { class: "lv-meta" }, [entry.lighting ? LIGHT[entry.lighting] : null, entry.real ? "Inspired by real events" : "Fictional"].filter(Boolean).join(" · ")),
      h("span", { class: "lv-topic" }, entry.topic),
      h("span", { class: "lv-state" }, h("span", { class: "lv-badge" }, badge(st.kind)), " ", stateText(entry, st))
    ];
    const cls = "lv-card " + st.kind;
    return playable
      ? h("button", { class: cls, id: "play-" + entry.id, onclick: () => UR.go.level(entry.id) }, ...inner)
      : h("div", { class: cls, "aria-disabled": "true" }, ...inner);
  }

  function badge(kind) {
    return { locked: "LOCKED", dev: "SOON", done: "DONE", retry: "RETRY", open: "PLAY" }[kind];
  }

  // Build the whole map screen.
  function show(root) {
    const h = UR.h;
    const save = UR.save.data;
    const chars = UR.data.characters;
    const me = chars[save.character];
    const tiers = UR.data.tiers.tiers;
    const index = UR.data.index;

    const face = h("canvas", { class: "map-face", "aria-hidden": "true" });
    UR.scene.portrait(face, me.look, currentHat());

    const doneCount = index.levels.filter(l => (save.best[l.id] || 0) >= UR.data.tiers.passPercent).length;

    root.replaceChildren(h("section", { class: "map" },
      h("h1", { class: "sr-only" }, "Level map"),
      h("header", { class: "map-head" },
        face,
        h("div", { class: "map-who" },
          h("p", { class: "eyebrow" }, "Operator " + me.id),
          h("p", { class: "map-name" }, me.first + " · " + save.title),
          h("p", { class: "map-stats" }, doneCount + "/12 incidents closed · Tip tokens " + save.tipTokens)),
        h("div", { class: "map-tools" },
          UR.muteButton(),
          h("button", { class: "btn ghost small", id: "to-title-map", onclick: () => UR.go.title() }, "Title screen"))),
      ...Object.keys(tiers).map(key => {
        const t = tiers[key];
        return h("section", { class: "tier tier-" + key, "aria-label": t.name + " tier" },
          h("div", { class: "tier-head" },
            h("span", { class: "hat-chip", style: "background:" + UR.scene.HATS[t.hat] }),
            h("h2", { class: "tier-name" }, t.name),
            h("p", { class: "tier-where" }, cap(t.hat) + " hat · " + ENV[t.environment] + (t.tips ? " · tip tokens allowed" : " · no tip tokens"))),
          h("p", { class: "tier-sub" }, t.subtitle),
          h("div", { class: "tier-levels" }, ...index.levels.filter(l => l.tier === key).map(card)));
      }),
      index.bonus ? h("section", { class: "tier tier-bonus", "aria-label": "Bonus level" },
        h("div", { class: "tier-head" }, h("h2", { class: "tier-name" }, "Bonus")),
        h("div", { class: "tier-levels one" }, card(index.bonus))) : null
    ));

    // Put focus on the next thing to play, so keyboard players start in the right place.
    const next = root.querySelector(".lv-card.open, .lv-card.retry") || root.querySelector("button.lv-card");
    (next || root.querySelector("#to-title-map")).focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // The player's hat colour follows the tier of their furthest unlocked level.
  function currentHat() {
    const lvl = Math.min(12, UR.save.data.unlocked);
    const tiers = UR.data.tiers.tiers;
    const key = Object.keys(tiers).find(k => tiers[k].levels.includes(lvl)) || "beginner";
    return tiers[key].hat;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  UR.screens = UR.screens || {};
  UR.screens.map = { show, currentHat };
})(window.UR = window.UR || {});
