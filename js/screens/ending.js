// screens/ending.js — the closing scene (v2.0, update doc). Reached with "End" after the bonus level is
// passed (report → What actually happened… → End). In the underground centre the character shuts the
// computer down, hangs the purple cap on the rack, puts on the black hoodie and pulls the hood up, then
// calls a teammate. The call is heard, not read (voice.js); the bubble only says who is being called.
// Then the character leaves in the lift, the screen goes dark, and the level map comes back.
(function (UR) {
  "use strict";

  // Who calls whom: Iris → Moritz, Moritz → Jayson, Jayson → Echo, Echo → Iris.
  const CALLS = { iris: "moritz", moritz: "jayson", jayson: "echo", echo: "iris" };

  // The conversation, word for word from the update document. "x" is the teammate on the phone.
  const LINES = [
    ["x", "Took you long enough."],
    ["me", "Good things take time, don't they?"],
    ["x", "Whatever. Time to blend in. Ready to learn their playbook from the inside?"],
    ["me", "I have my hoodie, don't I? Still... I don't understand why we're doing this."],
    ["x", "The best way to defend is to learn the attack, rookie."],
    ["me", "What rookie? I am a puppet master now."],
    ["x", "We are waiting for you."],
    ["me", "On my way, partner."]
  ];

  let run = null;
  let scene = null;

  function stop() {
    if (run) run.cancelled = true;
    run = null;
    if (scene) { scene.stop(); scene = null; }
    UR.voice.stop();
  }

  async function show(root) {
    stop();
    UR.audio.stopMusic();
    UR.audio.stopMystery();
    const ctl = run = { skip: false, cancelled: false };
    const h = UR.h;
    const meId = UR.save.data.character || "iris";
    const me = UR.data.characters[meId];
    const xId = CALLS[meId];
    const x = UR.data.characters[xId];
    const purple = UR.scene.HATS.purple;
    UR.voice.reset();

    const canvas = h("canvas", { class: "room", role: "img", "aria-label": me.first + " ends the night in the underground centre." });
    const bubble = h("div", { class: "call-bubble", hidden: "" });
    const captions = h("div", { class: "sr-only", "aria-live": "polite" }); // for screen readers only
    const wrap = h("div", { class: "room-wrap ending-wrap" }, canvas, bubble);
    const skip = h("button", { class: "btn ghost", id: "skip-ending", onclick: () => { ctl.skip = true; finish(); } }, "Skip");
    root.replaceChildren(h("section", { class: "ending" },
      h("h1", { class: "sr-only" }, "The end of the night"),
      wrap, captions,
      h("div", { class: "actions" }, skip, UR.muteButton())));
    window.scrollTo(0, 0);
    skip.focus({ preventScroll: true });

    scene = UR.scene.room(canvas, { look: me.look, hat: purple, lighting: "warm", environment: "underground", finale: true });
    const S = scene, F = S.state;
    const wait = ms => UR.wait(ms, ctl);
    const gone = () => ctl.cancelled || ctl.skip;
    // Footsteps while walking.
    const walk = async (toX, ms) => {
      const steps = setInterval(() => UR.audio.footstep(), 320);
      await S.walk(toX, ms);
      clearInterval(steps);
    };
    // Put the bubble above the character (canvas x → percent of the scene's width).
    const place = () => { bubble.style.left = Math.max(4, Math.min(70, (F.x / 320) * 100 - 6)) + "%"; };

    // 1. The computer goes off.
    await wait(1400); if (gone()) return;
    UR.audio.powerDown();
    S.set({ screen: "off", crt: 1 });
    await S.tween(F, "crt", 0, 350); if (gone()) return;
    await wait(700); if (gone()) return;

    // 2. Stand up and walk to the coat rack.
    S.set({ pose: "stand", x: 150, flip: true });
    await wait(400); if (gone()) return;
    await walk(S.rackX + 15, 1800); if (gone()) return;
    await wait(300); if (gone()) return;

    // 3. The purple cap goes onto the rack.
    S.set({ hat: false, capFly: { x: F.x + 2, y: 104 } });
    await Promise.all([S.tween(F.capFly, "x", S.rackX, 550), S.tween(F.capFly, "y", 89, 550)]); if (gone()) return;
    S.set({ capFly: null, rack: { hoodie: true, hat: purple } });
    await wait(500); if (gone()) return;

    // 4. The black hoodie comes off the rack and goes on; the hood goes up.
    S.set({ rack: { hoodie: false, hat: purple }, hoodie: true });
    await wait(700); if (gone()) return;
    await S.tween(F, "hood", 1, 500); if (gone()) return;
    await wait(700); if (gone()) return;

    // 5. The phone call. Dialling, then "Calling …" in a bubble, then the ringing.
    S.set({ flip: false, phone: true });
    place();
    bubble.replaceChildren(h("p", { class: "cb-calling" }, UR.consult.phoneIcon(), " Calling " + x.first + "…"));
    bubble.hidden = false;
    captions.textContent = "Calling " + x.first + ".";
    for (const d of "4087713") { UR.audio.dial(+d); await wait(170); if (gone()) return; }
    for (let i = 0; i < 2; i++) { UR.audio.ring(); await wait(1500); if (gone()) return; }

    // The call is connected: the bubble shows who is talking (a face and moving sound bars), never the words.
    const face = h("canvas", { class: "face", "aria-hidden": "true" });
    UR.scene.portrait(face, x.look, purple);
    const xRow = h("div", { class: "cb-row" }, face, h("span", { class: "cb-name" }, x.first), bars());
    const meRow = h("div", { class: "cb-row me" }, h("span", { class: "cb-name" }, "You"), bars());
    const said = h("p", { class: "cb-text", hidden: "" }); // used only when the device cannot speak
    bubble.replaceChildren(h("p", { class: "cb-calling live" }, UR.consult.phoneIcon(), " " + x.first + " · on the line"), xRow, meRow, said);
    await wait(500); if (gone()) return;

    for (const [who, line] of LINES) {
      const speaker = who === "x" ? xId : meId;
      xRow.classList.toggle("talking", who === "x");
      meRow.classList.toggle("talking", who === "me");
      captions.textContent = (who === "x" ? x.first : me.first) + ": " + line;
      const r = await UR.voice.say(speaker, line, who === "x" ? { volume: 0.85 } : null);
      if (gone()) return;
      if (!r.spoken) {
        // No speech on this device, or sound is off: the line has to be readable instead.
        said.hidden = false;
        said.textContent = (who === "x" ? x.first : "You") + ": " + line;
        await wait(1200 + line.length * 45); if (gone()) return;
      }
      await wait(350); if (gone()) return;
    }
    xRow.classList.remove("talking"); meRow.classList.remove("talking");
    await wait(500); if (gone()) return;

    // 6. Hang up, step into the lift, the doors close, the screen goes dark.
    bubble.hidden = true;
    S.set({ phone: false });
    await wait(500); if (gone()) return;
    UR.audio.ding();
    await S.tween(F, "liftOpen", 1, 600); if (gone()) return;
    await walk(31, 2300); if (gone()) return;
    S.set({ flip: false });
    await wait(300); if (gone()) return;
    UR.audio.door();
    await S.tween(F, "liftOpen", 0, 700); if (gone()) return;
    await wait(500); if (gone()) return;
    await S.tween(F, "fade", 1, 1400); if (gone()) return;
    await wait(900);
    finish();

    function finish() {
      if (ctl.cancelled) return;
      stop();
      UR.go.map();
    }
  }

  // Five little sound bars that move while that person talks.
  function bars() {
    const h = UR.h;
    return h("span", { class: "cb-bars", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i"), h("i"));
  }

  UR.screens = UR.screens || {};
  UR.screens.ending = { show, stop };
})(window.UR = window.UR || {});
