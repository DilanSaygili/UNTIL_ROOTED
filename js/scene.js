// scene.js — pixel-art drawing on <canvas>. Placeholder art for M2:
// each character is drawn once from a small colour "look" and only the hat colour changes per tier.
// Everything is drawn at low resolution and scaled up with image-rendering: pixelated.
(function (UR) {
  "use strict";

  const HATS = { green: "#3f9d52", blue: "#3b6fd1", white: "#e9edf0", purple: "#8550c9" };

  // Fill one rectangle in pixel units.
  function px(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

  // Draw a 32×36 bust at (ox, oy). opts: { hat: "green", hood: 0..1 (how far the hood is up) }.
  function drawBust(ctx, look, ox, oy, opts) {
    opts = opts || {};
    const P = (x, y, w, h, c) => px(ctx, ox + x, oy + y, w, h, c);

    // Hair that sits behind the head.
    if (look.hairStyle === "bun") P(13, 1, 6, 6, look.hair);
    if (look.hairStyle === "bob") P(8, 7, 16, 14, look.hair);

    // Body and shoulders.
    P(4, 27, 24, 9, look.top);
    P(4, 27, 3, 9, look.topShade); P(25, 27, 3, 9, look.topShade);
    P(6, 26, 20, 2, look.top);

    // Neck and head.
    P(13, 22, 6, 5, look.skinShade);
    P(10, 8, 12, 15, look.skin);
    P(11, 22, 10, 1, look.skinShade);
    P(9, 13, 1, 4, look.skinShade); P(22, 13, 1, 4, look.skinShade); // ears

    // Face.
    P(13, 15, 2, 1, "#120c0c"); P(18, 15, 2, 1, "#120c0c");
    P(12, 13, 3, 1, look.hair); P(17, 13, 3, 1, look.hair);           // brows
    P(15, 17, 2, 1, look.skinShade);                                     // nose
    P(14, 19, 4, 1, look.skinShade);                                     // mouth

    // Hair on top.
    if (look.hairStyle === "bun") { P(10, 6, 12, 3, look.hair); P(10, 8, 1, 6, look.hair); P(21, 8, 1, 6, look.hair); }
    if (look.hairStyle === "bob") { P(9, 5, 14, 4, look.hair); P(10, 9, 5, 2, look.hair); P(17, 9, 4, 1, look.hair); }
    if (look.hairStyle === "short") { P(10, 6, 12, 3, look.hair); P(10, 8, 1, 5, look.hair); P(21, 8, 1, 4, look.hair); }
    if (look.hairStyle === "fade") { P(10, 7, 12, 2, look.hair); P(10, 9, 1, 3, look.skinShade); P(21, 9, 1, 3, look.skinShade); }
    if (look.beard) { P(11, 18, 10, 4, look.hair); P(12, 22, 8, 1, look.hair); P(14, 19, 4, 1, look.skinShade); }

    // Clothing details that say who they are.
    if (look.hairStyle === "bun") { // Iris: blazer lapels, white shirt, gold earrings and necklace
      P(13, 27, 6, 6, "#f3eee6"); P(11, 27, 3, 7, look.topShade); P(18, 27, 3, 7, look.topShade);
      P(15, 28, 2, 1, look.accent); P(9, 17, 1, 2, look.accent); P(22, 17, 1, 2, look.accent);
    }
    if (look.hairStyle === "bob") { // Echo: oversized hoodie with a neon stripe
      P(7, 24, 18, 4, look.topShade); P(14, 29, 1, 5, look.accent); P(17, 29, 1, 5, look.accent);
    }
    if (look.hairStyle === "short") { // Moritz: coat over a grey turtleneck
      P(12, 23, 8, 5, look.accent); P(12, 28, 8, 8, look.accent); P(10, 28, 2, 8, look.topShade); P(20, 28, 2, 8, look.topShade);
    }
    if (look.hairStyle === "fade") { // Jayson: track jacket stripes
      P(4, 29, 24, 1, look.accent); P(15, 28, 2, 8, look.topShade);
    }
    if (look.headphones) { P(9, 4, 14, 2, "#2b2f36"); P(8, 5, 2, 2, "#2b2f36"); P(22, 5, 2, 2, "#2b2f36"); P(7, 12, 3, 6, "#2b2f36"); P(22, 12, 3, 6, "#2b2f36"); }

    // Hood comes down over the head (Echo's cut-in).
    if (opts.hood) {
      const drop = Math.round((1 - opts.hood) * 14);
      P(7, 3 - drop, 18, 6, look.top); P(7, 3 - drop, 3, 20, look.top); P(22, 3 - drop, 3, 20, look.top);
      P(10, 8 - drop, 12, 1, look.topShade);
    }

    // Tier cap: same character, only the colour changes.
    if (opts.hat && !opts.hood) {
      const c = HATS[opts.hat] || opts.hat;
      P(9, 3, 14, 5, c); P(9, 7, 17, 2, c); P(10, 4, 12, 1, "rgba(255,255,255,0.25)");
    }
  }

  // Draw a character portrait into its own small canvas (used on the select screen and ID card).
  function portrait(canvas, look, hat) {
    const ctx = canvas.getContext("2d");
    canvas.width = 40; canvas.height = 40;
    px(ctx, 0, 0, 40, 40, "#16222b");
    for (let y = 0; y < 40; y += 2) px(ctx, 0, y, 40, 1, "rgba(255,255,255,0.025)");
    drawBust(ctx, look, 4, 4, { hat });
  }

  // ---- Background-check cut-in scenes (160×90). Each draws one frame at time t (seconds). ----

  const SCENES = {
    // Iris on a ransom call: dark office, phone at her ear, sound rings pulse.
    phone(ctx, look, t) {
      px(ctx, 0, 0, 160, 90, "#120e14");
      for (let i = 0; i < 8; i++) px(ctx, 100 + (i % 4) * 14, 10 + Math.floor(i / 4) * 22, 10, 18, "#1f2433");
      drawBust(ctx, look, 50, 54 - 0, {});
      px(ctx, 74, 64, 4, 9, "#0b0b0d"); px(ctx, 72, 70, 4, 10, look.skin);
      const r = (t * 14) % 18;
      ctx.strokeStyle = "rgba(227,179,65," + (1 - r / 18).toFixed(2) + ")";
      ctx.strokeRect(78 - r / 2 + 2, 66 - r / 2, r, r);
    },
    // A London-ish skyline at night with a target box hopping between windows.
    skyline(ctx, look, t) {
      px(ctx, 0, 0, 160, 90, "#0d1424");
      [[0, 50, 20], [22, 40, 14], [38, 30, 10], [50, 46, 22], [74, 22, 8], [84, 44, 26], [112, 34, 16], [130, 48, 30]]
        .forEach(([x, top, w]) => px(ctx, x, top, w, 90 - top, "#060a12"));
      for (let i = 0; i < 40; i++) {
        const x = (i * 37) % 160, y = 40 + (i * 13) % 45;
        if ((i + Math.floor(t * 2)) % 5) px(ctx, x, y, 1, 1, "#e6c56a");
      }
      const k = Math.floor(t * 1.2) % 4;
      const tx = [30, 90, 120, 60][k], ty = [55, 50, 60, 52][k];
      ctx.strokeStyle = "#ff5c4d"; ctx.strokeRect(tx - 4.5, ty - 4.5, 9, 9);
      drawBust(ctx, look, 6, 54, {});
    },
    // Echo pulls her hood up in the glow of a screen.
    hood(ctx, look, t) {
      const glow = 0.5 + 0.5 * Math.sin(t * 3);
      px(ctx, 0, 0, 160, 90, "#0b0c14");
      px(ctx, 40, 20, 80, 70, "rgba(255,79,163," + (0.05 + glow * 0.05).toFixed(3) + ")");
      drawBust(ctx, look, 64, 46, { hood: Math.min(1, t / 1.6) });
      px(ctx, 50, 84, 60, 6, "#1a1c26");
    },
    // Code scrolls on a monitor; she watches it like a whisper in the traffic.
    typing(ctx, look, t) {
      px(ctx, 0, 0, 160, 90, "#08090f");
      drawBust(ctx, look, 64, 30, {});
      px(ctx, 40, 60, 80, 30, "#1a1c26"); px(ctx, 43, 62, 74, 26, "#04130d");
      const off = Math.floor(t * 12);
      for (let i = 0; i < 6; i++) {
        const w = 10 + ((i + off) * 23) % 50;
        px(ctx, 46, 64 + i * 4, w, 2, (i + off) % 7 === 0 ? "#ff4fa3" : "#3ddc84");
      }
    },
    // Moritz reads by a desk lamp; pages turn.
    book(ctx, look, t) {
      px(ctx, 0, 0, 160, 90, "#14110d");
      ctx.fillStyle = "rgba(255,214,140,0.10)"; ctx.beginPath(); ctx.moveTo(120, 10); ctx.lineTo(90, 90); ctx.lineTo(160, 90); ctx.fill();
      px(ctx, 118, 4, 8, 6, "#3a3a3a");
      drawBust(ctx, look, 60, 40, {});
      px(ctx, 62, 66, 28, 18, "#6b3f22"); px(ctx, 64, 67, 11, 16, "#efe6cf"); px(ctx, 77, 67, 11, 16, "#efe6cf");
      const flip = (t * 0.8) % 1;
      px(ctx, 77 - Math.round(flip * 12), 67, Math.max(1, Math.round((1 - Math.abs(flip * 2 - 1)) * 11)), 16, "#fff8e6");
      px(ctx, 40, 84, 80, 6, "#2a2018");
    },
    // A network-segmentation diagram draws itself on a whiteboard.
    diagram(ctx, look, t) {
      px(ctx, 0, 0, 160, 90, "#1a1f26");
      px(ctx, 50, 8, 104, 64, "#e8ecef");
      const nodes = [[64, 20], [96, 20], [128, 20], [64, 52], [96, 52], [128, 52]];
      const links = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 5], [3, 4], [4, 5]];
      const shown = Math.min(links.length, Math.floor(t * 3));
      ctx.strokeStyle = "#25324a";
      links.slice(0, shown).forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(nodes[a][0] + 0.5, nodes[a][1] + 0.5); ctx.lineTo(nodes[b][0] + 0.5, nodes[b][1] + 0.5); ctx.stroke(); });
      nodes.forEach(([x, y], i) => px(ctx, x - 3, y - 3, 7, 7, i < 3 ? "#3b6fd1" : "#c23b2e"));
      if (t > 2.4) { ctx.strokeStyle = "#e3b341"; ctx.setLineDash([2, 2]); ctx.strokeRect(56.5, 12.5, 88, 18); ctx.setLineDash([]); }
      drawBust(ctx, look, 6, 54, {});
    },
    // Jayson's free throws: the ball arcs into the hoop.
    basketball(ctx, look, t) {
      px(ctx, 0, 0, 160, 90, "#2a1d16");
      px(ctx, 0, 70, 160, 20, "#8a5a32"); px(ctx, 0, 70, 160, 1, "#b07a46");
      px(ctx, 136, 18, 3, 52, "#9aa0a6"); px(ctx, 126, 14, 20, 12, "#f2f2f2"); px(ctx, 118, 28, 14, 2, "#ff5c4d");
      drawBust(ctx, look, 10, 46, {});
      const k = (t * 0.7) % 1;
      const bx = 40 + k * 84, by = 50 - Math.sin(k * Math.PI) * 44 + k * -22;
      ctx.fillStyle = "#e07b2a"; ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#5a2e10"; ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.lineTo(bx + 4, by); ctx.stroke();
    },
    // Three monitors flicker in front of him.
    screens(ctx, look, t) {
      px(ctx, 0, 0, 160, 90, "#0a0c12");
      drawBust(ctx, look, 64, 34, {});
      [20, 62, 104].forEach((x, i) => {
        px(ctx, x, 58, 36, 26, "#1b1e27");
        const on = (Math.floor(t * 6) + i) % 9 !== 0;
        px(ctx, x + 2, 60, 32, 22, on ? ["#0c2a4a", "#04130d", "#2a0c12"][i] : "#000");
        for (let r = 0; r < 4; r++) px(ctx, x + 4, 62 + r * 5, 6 + ((r * 7 + Math.floor(t * 8) + i * 3) % 22), 2, ["#6fb3ff", "#3ddc84", "#ff5c4d"][i]);
      });
    }
  };

  // Play a cut-in scene on a canvas until stop() is called. Reduced motion draws one still frame.
  function playScene(canvas, look, type) {
    const ctx = canvas.getContext("2d");
    canvas.width = 160; canvas.height = 90;
    const draw = SCENES[type] || SCENES.typing;
    const start = performance.now();
    let raf = 0, alive = true;
    const frame = now => {
      if (!alive) return;
      ctx.setLineDash([]); ctx.lineWidth = 1;
      draw(ctx, look, (now - start) / 1000);
      for (let y = 0; y < 90; y += 2) px(ctx, 0, y, 160, 1, "rgba(0,0,0,0.18)"); // scanlines
      if (!UR.reducedMotion()) raf = requestAnimationFrame(frame);
    };
    frame(UR.reducedMotion() ? start + 2600 : start);
    return { stop() { alive = false; cancelAnimationFrame(raf); } };
  }

  // ---- Level environments (320×180): routine intro → alarm → zoom into the monitor. ----

  // Lighting is a colour overlay on top of one drawing of each environment (spec §6, art efficiency).
  // "glow" decides how strongly lamps and the monitor light up the room.
  const LIGHTING = {
    day:      { sky: ["#9fd0ee", "#cfe8f5"], overlay: null,                     glow: 0.0, stars: false, sun: "#fff3b0" },
    twilight: { sky: ["#f4a261", "#7a4f96"], overlay: "rgba(255,120,70,0.16)",  glow: 0.35, stars: false, sun: "#ff8a4c" },
    night:    { sky: ["#0a1430", "#1c2a52"], overlay: "rgba(6,12,38,0.58)",     glow: 0.8, stars: true,  moon: "#e9eef5" },
    warm:     { sky: null, overlay: "rgba(255,220,140,0.14)", glow: 0.3 },
    dusk:     { sky: null, overlay: "rgba(150,60,170,0.24)",  glow: 0.5 },
    dark:     { sky: null, overlay: "rgba(0,0,0,0.74)",       glow: 0.9 }
  };

  // Where the monitor sits in the room; the zoom ends on this rectangle (16:9).
  const MONITOR = { x: 166, y: 70, w: 40, h: 26 };

  // Draw the sky behind a window: gradient, sun or moon, stars, a cloud. Shared by every room with a window.
  function drawSky(ctx, L, t, wx, wy, ww, wh) {
    const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
    g.addColorStop(0, L.sky[0]); g.addColorStop(1, L.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
    if (L.stars) for (let i = 0; i < 14; i++) if ((i + Math.floor(t * 1.5)) % 6) px(ctx, wx + (i * 29) % ww, wy + (i * 17) % (wh - 20), 1, 1, "#ffffff");
    if (L.moon) { px(ctx, wx + 50, wy + 8, 8, 8, L.moon); px(ctx, wx + 53, wy + 8, 5, 5, L.sky[0]); }
    if (L.sun) { ctx.fillStyle = L.sun; ctx.beginPath(); ctx.arc(wx + 18, wy + (L.overlay ? 50 : 16), 7, 0, Math.PI * 2); ctx.fill(); }
    if (!L.stars) { px(ctx, wx + 34, wy + 14, 18, 4, "rgba(255,255,255,0.8)"); px(ctx, wx + 40, wy + 11, 10, 3, "rgba(255,255,255,0.8)"); }
  }

  // Draw the home office: wall, window, door, desk, shelf, lamp, plant (Beginner tier).
  function drawHome(ctx, L, t) {
    px(ctx, 0, 0, 320, 180, "#cdb99a");                // wall
    px(ctx, 0, 0, 320, 6, "#b9a383");                  // ceiling edge
    px(ctx, 0, 126, 320, 54, "#7d5636");               // floor
    for (let x = 0; x < 320; x += 24) px(ctx, x, 126, 1, 54, "#6c4a2e");
    px(ctx, 0, 124, 320, 3, "#e6dccb");                // skirting board

    // Window with the sky behind it.
    const wx = 222, wy = 26, ww = 72, wh = 62;
    if (L.sky) {
      drawSky(ctx, L, t, wx, wy, ww, wh);
      px(ctx, wx, wy + wh - 12, ww, 12, "rgba(30,40,40,0.35)"); // rooftops
    }
    px(ctx, wx - 3, wy - 3, ww + 6, 3, "#f1ebe0"); px(ctx, wx - 3, wy + wh, ww + 6, 4, "#f1ebe0");
    px(ctx, wx - 3, wy, 3, wh, "#f1ebe0"); px(ctx, wx + ww, wy, 3, wh, "#f1ebe0"); px(ctx, wx + ww / 2 - 1, wy, 2, wh, "#f1ebe0");

    // Door the character walks in through.
    px(ctx, 18, 52, 40, 74, "#8a5d3b"); px(ctx, 22, 56, 32, 30, "#7a5032"); px(ctx, 22, 90, 32, 32, "#7a5032");
    px(ctx, 50, 90, 3, 3, "#e3b341");

    // Poster and shelf with books.
    px(ctx, 80, 30, 26, 34, "#2d3a4a"); px(ctx, 84, 34, 18, 14, "#3f9d52"); px(ctx, 84, 52, 18, 2, "#e6dccb"); px(ctx, 84, 56, 12, 2, "#e6dccb");
    px(ctx, 128, 44, 74, 4, "#6c4a2e");
    [["#7a1f33", 6], ["#25324a", 5], ["#3f9d52", 7], ["#e3b341", 4], ["#5b3a22", 6], ["#8550c9", 5]].reduce((x, [c, w]) => { px(ctx, x, 30, w, 14, c); return x + w + 1; }, 132);

    // Desk, monitor, keyboard, lamp and mug.
    px(ctx, 124, 104, 100, 5, "#5a3d27"); px(ctx, 128, 109, 4, 22, "#4a3220"); px(ctx, 216, 109, 4, 22, "#4a3220");
    px(ctx, MONITOR.x - 2, MONITOR.y - 2, MONITOR.w + 4, MONITOR.h + 4, "#1b1e24");
    px(ctx, MONITOR.x + 17, MONITOR.y + MONITOR.h + 2, 6, 6, "#1b1e24"); px(ctx, MONITOR.x + 12, MONITOR.y + MONITOR.h + 7, 16, 2, "#1b1e24");
    px(ctx, 172, 101, 26, 3, "#2a2e36");
    px(ctx, 132, 92, 2, 12, "#2b2f36"); px(ctx, 128, 88, 10, 5, "#e3b341"); // lamp
    px(ctx, 210, 97, 6, 7, "#f1ebe0"); px(ctx, 216, 99, 2, 3, "#f1ebe0");   // mug
    if (Math.floor(t * 2) % 2 === 0) px(ctx, 212, 92, 1, 3, "rgba(255,255,255,0.6)"); // steam

    // v2.0 (update doc): an armchair on the right so it is clearly a home, and a dog lying in front of it,
    // wagging its tail.
    px(ctx, 244, 94, 52, 18, "#3d6b78"); px(ctx, 246, 96, 48, 2, "#4f8494");          // back
    px(ctx, 238, 104, 10, 22, "#335a66"); px(ctx, 292, 104, 10, 22, "#335a66");      // arms
    px(ctx, 238, 103, 10, 3, "#4f8494"); px(ctx, 292, 103, 10, 3, "#4f8494");
    px(ctx, 248, 110, 44, 10, "#46798a"); px(ctx, 248, 110, 44, 2, "#5a90a1");      // seat cushion
    px(ctx, 248, 120, 44, 6, "#2c4e59");
    px(ctx, 241, 126, 3, 5, "#3a2a1c"); px(ctx, 296, 126, 3, 5, "#3a2a1c");         // legs
    px(ctx, 258, 98, 14, 9, "#e3b341"); px(ctx, 260, 100, 10, 5, "#c9962a");       // cushion
    // The dog (facing left, towards the desk): body, head, ear, paws and a wagging tail.
    const wag = UR.reducedMotion() ? 0 : Math.floor(t * 6) % 3;
    px(ctx, 252, 142, 30, 10, "#c8893a"); px(ctx, 252, 149, 30, 3, "#a86f2b");    // body
    px(ctx, 244, 136, 12, 10, "#c8893a"); px(ctx, 240, 141, 6, 5, "#d9a35a");     // head and muzzle
    px(ctx, 239, 142, 2, 2, "#1a1210"); px(ctx, 247, 139, 1, 1, "#1a1210");       // nose, eye
    px(ctx, 251, 136, 4, 7, "#8a5a24");                                             // ear
    px(ctx, 238, 151, 10, 2, "#d9a35a"); px(ctx, 268, 151, 10, 2, "#d9a35a");     // paws
    if (wag === 0) px(ctx, 282, 140, 3, 3, "#a86f2b"), px(ctx, 285, 137, 3, 3, "#a86f2b");
    else if (wag === 1) px(ctx, 282, 143, 4, 2, "#a86f2b"), px(ctx, 286, 142, 4, 2, "#a86f2b");
    else px(ctx, 282, 146, 3, 3, "#a86f2b"), px(ctx, 285, 148, 3, 3, "#a86f2b");

    // Plant, now in the far corner.
    px(ctx, 306, 116, 10, 10, "#9c5b3a");
    [[304, 102], [310, 98], [312, 106]].forEach(([x, y]) => px(ctx, x, y, 6, 12, "#3f7d46"));
  }

  // Draw the Brightline Security office (Intermediate tier): glass door, whiteboard, company sign,
  // a wide window over the city, the player's desk and a colleague's empty desk.
  // The player's desk and monitor sit where the home desk does, so the seated pose and zoom still fit.
  function drawOffice(ctx, L, t) {
    px(ctx, 0, 0, 320, 180, "#b7c3cb");                // wall
    px(ctx, 0, 0, 320, 7, "#98a6b0");                  // ceiling
    [40, 140, 240].forEach(x => px(ctx, x, 2, 40, 3, L.glow ? "#fff6d8" : "#e8eef2")); // ceiling lights
    px(ctx, 0, 126, 320, 54, "#4a5563");               // carpet tiles
    for (let x = 0; x < 320; x += 20) px(ctx, x, 126, 1, 54, "#414b58");
    for (let y = 136; y < 180; y += 14) px(ctx, 0, y, 320, 1, "#414b58");
    px(ctx, 0, 123, 320, 3, "#2f3640");                // skirting

    // Wide window with low-rise office blocks; their windows light up after dark.
    const wx = 200, wy = 18, ww = 112, wh = 72;
    if (L.sky) {
      drawSky(ctx, L, t, wx, wy, ww, wh);
      [[0, 30, 18], [20, 18, 16], [38, 38, 20], [60, 24, 14], [76, 34, 22], [98, 20, 14]].forEach(([dx, top, w]) => {
        px(ctx, wx + dx, wy + top, w, wh - top, "#5d6b78");
        for (let yy = wy + top + 4; yy < wy + wh - 3; yy += 6) for (let xx = wx + dx + 3; xx < wx + dx + w - 2; xx += 5)
          px(ctx, xx, yy, 2, 3, L.stars || L.overlay ? ((xx * 7 + yy * 3) % 5 ? "#ffd479" : "#3c4650") : "#8fa3b3");
      });
    }
    px(ctx, wx - 3, wy - 3, ww + 6, 3, "#dfe5e9"); px(ctx, wx - 3, wy + wh, ww + 6, 4, "#dfe5e9");
    [0, 37, 74, ww].forEach(dx => px(ctx, wx + dx - (dx === ww ? 0 : 1), wy, 3, wh, "#dfe5e9"));

    // Glass door the character walks in through.
    px(ctx, 14, 48, 44, 78, "#59636e"); px(ctx, 18, 52, 36, 74, "rgba(170,205,225,0.55)");
    px(ctx, 18, 84, 36, 3, "#59636e"); px(ctx, 48, 70, 2, 26, "#d0d6db");

    // Company sign: a bright line over the name bars.
    px(ctx, 70, 16, 50, 18, "#1f2a36"); px(ctx, 74, 20, 8, 10, "#3b6fd1"); px(ctx, 76, 24, 4, 2, "#ffffff");
    px(ctx, 86, 21, 30, 3, "#e8eef2"); px(ctx, 86, 26, 20, 2, "#9fb3c8");

    // Whiteboard with an attack path: three boxes, arrows, one circled in red.
    px(ctx, 64, 42, 56, 40, "#f4f6f7"); px(ctx, 64, 82, 56, 3, "#9aa3ab");
    [[69, 50], [86, 62], [103, 50]].forEach(([x, y]) => { px(ctx, x, y, 12, 8, "#3b6fd1"); px(ctx, x + 1, y + 1, 10, 6, "#f4f6f7"); });
    px(ctx, 81, 54, 5, 1, "#3b6fd1"); px(ctx, 98, 58, 5, 1, "#3b6fd1"); px(ctx, 98, 54, 5, 1, "#3b6fd1");
    px(ctx, 84, 60, 16, 1, "#c0281f"); px(ctx, 84, 71, 16, 1, "#c0281f"); px(ctx, 84, 60, 1, 12, "#c0281f"); px(ctx, 99, 60, 1, 12, "#c0281f");
    px(ctx, 70, 74, 20, 1, "#2b2f36"); px(ctx, 70, 77, 14, 1, "#2b2f36");

    // The player's desk: white top, metal legs, monitor, keyboard, slim lamp, Brightline mug.
    px(ctx, 124, 104, 100, 5, "#d6d9dc"); px(ctx, 124, 109, 100, 2, "#aab1b8");
    px(ctx, 128, 111, 3, 20, "#8a939c"); px(ctx, 217, 111, 3, 20, "#8a939c");
    px(ctx, MONITOR.x - 2, MONITOR.y - 2, MONITOR.w + 4, MONITOR.h + 4, "#1b1e24");
    px(ctx, MONITOR.x + 17, MONITOR.y + MONITOR.h + 2, 6, 6, "#1b1e24"); px(ctx, MONITOR.x + 12, MONITOR.y + MONITOR.h + 7, 16, 2, "#1b1e24");
    px(ctx, 172, 101, 26, 3, "#2a2e36");
    px(ctx, 132, 90, 2, 14, "#2b2f36"); px(ctx, 128, 88, 9, 3, "#2b2f36"); px(ctx, 129, 91, 7, 1, "#fff2c0"); // lamp
    px(ctx, 210, 97, 6, 7, "#3b6fd1"); px(ctx, 216, 99, 2, 3, "#3b6fd1");   // mug
    if (Math.floor(t * 2) % 2 === 0) px(ctx, 212, 92, 1, 3, "rgba(255,255,255,0.6)");

    // A colleague's desk by the window, monitor showing code.
    px(ctx, 236, 106, 64, 4, "#d6d9dc"); px(ctx, 240, 110, 3, 16, "#8a939c"); px(ctx, 293, 110, 3, 16, "#8a939c");
    px(ctx, 256, 86, 26, 17, "#1b1e24"); px(ctx, 258, 88, 22, 13, "#10202c");
    for (let i = 0; i < 4; i++) px(ctx, 260, 90 + i * 3, 6 + ((i * 7) % 12), 1, i % 2 ? "#63d49c" : "#9fb3c8");
    px(ctx, 267, 103, 4, 3, "#1b1e24");

    // v2.0 (update doc): a busier, shared office. A colleague works at the desk by the window...
    drawSeated(ctx, NPCS[0], null, 232, 82);
    // At night (Level 6, a holiday weekend) the others have gone home; only this colleague stays.
    if (L.stars) { px(ctx, 304, 112, 12, 14, "#d0d6db"); [[300, 98], [308, 92], [312, 100]].forEach(([x, y]) => px(ctx, x, y, 7, 14, "#3f7d46")); return; }
    // ...another stands at the whiteboard with a coffee...
    const b2 = NPCS[1];
    drawWalker(ctx, b2, null, 108, 128, t, { still: true, flip: true });
    px(ctx, 107, 112, 3, 4, "#f1ebe0");
    // ...and two more share the long bench desk in front.
    px(ctx, 214, 158, 106, 4, "#d6d9dc"); px(ctx, 214, 162, 106, 18, "#c3c8cd");
    drawHeadOverMonitor(ctx, NPCS[2], 236, 136, t, 0);
    drawHeadOverMonitor(ctx, NPCS[3], 284, 138, t, 2);
    [[233, 146], [281, 148]].forEach(([x, y]) => { px(ctx, x, y, 20, 12, "#1b1e24"); px(ctx, x + 8, y + 12, 4, 2, "#1b1e24"); });
    px(ctx, 262, 153, 6, 5, "#e8c35a");                                       // a shared mug
    // Plant in the corner.
    px(ctx, 306, 112, 10, 12, "#d0d6db");
    [[302, 98], [308, 92], [312, 100]].forEach(([x, y]) => px(ctx, x, y, 6, 14, "#3f7d46"));
  }

  // Draw the corporate office high above New York (Advanced tier): a floor-to-ceiling window over a
  // skyline of towers, dark panelled walls, a glass meeting room and a sleek desk. The desk and monitor
  // sit where the other rooms have them, so the seated pose and the zoom still fit.
  function drawNewYork(ctx, L, t) {
    px(ctx, 0, 0, 320, 180, "#2b2f38");                // dark wall panels
    for (let x = 0; x < 320; x += 32) px(ctx, x, 0, 1, 124, "#353a45");
    px(ctx, 0, 0, 320, 6, "#1d2027");                  // ceiling
    [30, 130, 230].forEach(x => px(ctx, x, 3, 60, 2, L.glow ? "#fff1cc" : "#e9edf2")); // light strips
    px(ctx, 0, 126, 320, 54, "#1f2229");               // polished floor
    for (let x = 0; x < 320; x += 40) px(ctx, x, 126, 1, 54, "#292d35");
    px(ctx, 0, 123, 320, 3, "#14161b");

    // Floor-to-ceiling window over the skyline. Tower windows light up after dark; one tower has a spire.
    const wx = 96, wy = 10, ww = 216, wh = 113;
    if (L.sky) {
      drawSky(ctx, L, t, wx, wy, ww, wh);
      const towers = [[0, 60, 20], [18, 40, 16], [36, 72, 22], [56, 22, 14], [70, 52, 18], [90, 34, 24],
                      [116, 64, 16], [134, 14, 18], [154, 46, 20], [176, 30, 16], [194, 58, 22]];
      towers.forEach(([dx, top, w], i) => {
        const shade = i % 2 ? "#3a4656" : "#4a5668";
        px(ctx, wx + dx, wy + top, w, wh - top, shade);
        if (i === 7) { px(ctx, wx + dx + 7, wy + top - 10, 4, 10, shade); px(ctx, wx + dx + 8, wy + top - 18, 2, 8, shade); }
        for (let yy = wy + top + 3; yy < wy + wh - 2; yy += 5) for (let xx = wx + dx + 2; xx < wx + dx + w - 2; xx += 4)
          px(ctx, xx, yy, 2, 2, L.stars || L.overlay ? ((xx * 5 + yy * 7 + i) % 4 ? "#ffd479" : "#253040") : "#9fb6cc");
      });
      if (L.stars && Math.floor(t * 2) % 2 === 0) px(ctx, wx + 142, wy - 4 + 14 - 18, 2, 2, "#ff4d4d"); // aircraft light on the spire
    }
    px(ctx, wx - 3, wy - 3, ww + 6, 3, "#11131a"); px(ctx, wx - 3, wy + wh, ww + 6, 3, "#11131a");
    [0, 54, 108, 162, ww].forEach(dx => px(ctx, wx + dx - (dx === ww ? 0 : 1), wy, 2, wh, "#11131a"));

    // Glass meeting-room wall on the left, with the door the character walks in through.
    px(ctx, 10, 30, 74, 96, "rgba(150,190,215,0.18)"); px(ctx, 10, 30, 74, 2, "#8c96a3");
    px(ctx, 10, 30, 2, 96, "#8c96a3"); px(ctx, 46, 30, 2, 96, "#8c96a3"); px(ctx, 82, 30, 2, 96, "#8c96a3");
    px(ctx, 50, 70, 30, 1, "rgba(220,235,245,0.4)"); px(ctx, 14, 64, 28, 1, "rgba(220,235,245,0.4)");
    px(ctx, 40, 74, 2, 18, "#c9cfd6");                 // door handle
    px(ctx, 54, 40, 24, 14, "#11131a"); px(ctx, 56, 42, 20, 10, "#173a52"); // wall screen inside
    px(ctx, 58, 46, 12, 1, "#63d49c"); px(ctx, 58, 49, 8, 1, "#e8c35a");

    // The player's desk: black top, chrome legs, monitor, keyboard, lamp and a paper coffee cup.
    px(ctx, 124, 104, 100, 5, "#0f1116"); px(ctx, 124, 109, 100, 1, "#3a3f4a");
    px(ctx, 128, 110, 2, 21, "#b9c0c8"); px(ctx, 218, 110, 2, 21, "#b9c0c8");
    px(ctx, MONITOR.x - 2, MONITOR.y - 2, MONITOR.w + 4, MONITOR.h + 4, "#0b0c10");
    px(ctx, MONITOR.x + 17, MONITOR.y + MONITOR.h + 2, 6, 6, "#0b0c10"); px(ctx, MONITOR.x + 12, MONITOR.y + MONITOR.h + 7, 16, 2, "#b9c0c8");
    px(ctx, 172, 101, 26, 3, "#2a2e36");
    px(ctx, 132, 90, 2, 14, "#b9c0c8"); px(ctx, 128, 88, 9, 3, "#b9c0c8"); px(ctx, 129, 91, 7, 1, "#fff2c0"); // lamp
    px(ctx, 210, 96, 6, 8, "#f1ebe0"); px(ctx, 210, 99, 6, 2, "#9a6a3e"); px(ctx, 209, 95, 8, 1, "#ffffff"); // coffee cup
    if (Math.floor(t * 2) % 2 === 0) px(ctx, 212, 91, 1, 3, "rgba(255,255,255,0.6)");

    // A tall plant and a low sideboard by the window.
    px(ctx, 244, 112, 60, 14, "#14161b"); px(ctx, 244, 112, 60, 1, "#3a3f4a");
    px(ctx, 296, 104, 12, 22, "#d0d6db");
    [[292, 84], [300, 76], [304, 88], [296, 94]].forEach(([x, y]) => px(ctx, x, y, 7, 16, "#3f7d46"));
  }

  // Draw the underground operations centre (Master tier): bare concrete, no windows, a wall of big
  // screens, cable trays, a blast door and server racks with blinking lights. With no sky, the tier's
  // three lights (warm / dusk / dark) are only overlays and the screens carry the glow.
  // The desk and monitor sit where the other rooms have them, so the seated pose and the zoom still fit.
  function drawUnderground(ctx, L, t) {
    px(ctx, 0, 0, 320, 180, "#55585c");                // concrete wall
    for (let y = 20; y < 124; y += 26) px(ctx, 0, y, 320, 1, "#4a4d51");     // formwork seams
    for (let x = 0; x < 320; x += 52) px(ctx, x, 0, 1, 124, "#4a4d51");
    px(ctx, 0, 0, 320, 8, "#35373a");                  // low ceiling
    px(ctx, 0, 8, 320, 3, "#2a2c2f"); for (let x = 4; x < 320; x += 12) px(ctx, x, 8, 6, 2, "#6b5d3a"); // cable tray
    [24, 120, 216].forEach(x => px(ctx, x, 3, 56, 2, L.glow > 0.6 ? "#7a1c1c" : "#e8f0f4")); // strip lights (red when dark)
    px(ctx, 0, 126, 320, 54, "#2e3033");               // sealed concrete floor
    for (let x = 0; x < 320; x += 46) px(ctx, x, 126, 1, 54, "#26282a");
    px(ctx, 0, 123, 320, 3, "#c9a227"); for (let x = 0; x < 320; x += 16) px(ctx, x, 123, 8, 3, "#1d1e20"); // hazard stripe

    // Wall of big screens: a map with a pulsing site, two graphs and the AI panel (ARGUS).
    const wx = 96, wy = 18;
    px(ctx, wx - 3, wy - 3, 214, 64, "#1a1b1e");
    px(ctx, wx, wy, 68, 58, "#0c1a24");                // map screen
    [[8, 14, 20, 10], [30, 8, 26, 14], [14, 30, 18, 16], [40, 30, 20, 12]].forEach(([dx, dy, w, h]) => px(ctx, wx + dx, wy + dy, w, h, "#173a52"));
    if (Math.floor(t * 2) % 2 === 0 || UR.reducedMotion()) px(ctx, wx + 46, wy + 34, 3, 3, "#ff4d4d"); // the water plant
    px(ctx, wx + 71, wy, 68, 28, "#0c1a24"); px(ctx, wx + 71, wy + 30, 68, 28, "#0c1a24"); // graph screens
    for (let i = 0; i < 12; i++) {
      px(ctx, wx + 74 + i * 5, wy + 22 - ((i * 7) % 14), 3, 2 + ((i * 7) % 14), "#63d49c");
      px(ctx, wx + 74 + i * 5, wy + 52 - ((i * 5 + 3) % 12), 3, 2, "#e8c35a");
    }
    px(ctx, wx + 142, wy, 66, 58, "#101b14");          // ARGUS panel: calm green text and a round "eye"
    ctx.fillStyle = "#63d49c"; ctx.beginPath(); ctx.arc(wx + 175, wy + 16, 8, 0, Math.PI * 2); ctx.fill();
    px(ctx, wx + 173, wy + 14, 4, 4, "#101b14");
    for (let i = 0; i < 5; i++) px(ctx, wx + 148, wy + 30 + i * 5, 20 + ((i * 13) % 34), 2, "#3f9d6a");

    // v2.0 (update doc): the lift the character comes down in, with its floor indicator and call button.
    // The doors are drawn by drawLiftDoors (they open and close).
    px(ctx, 12, 44, 50, 82, "#3d4045"); px(ctx, 16, 48, 42, 78, "#0d0e10");
    px(ctx, 16, 48, 42, 4, "#1d1e21");
    px(ctx, 24, 34, 26, 8, "#111214"); px(ctx, 27, 36, 3, 4, "#ff6b3d"); px(ctx, 32, 36, 3, 4, "#ff6b3d"); px(ctx, 38, 37, 8, 2, "#ff6b3d"); // "B5 ▼"
    px(ctx, 66, 76, 8, 12, "#1a1b1e"); px(ctx, 68, 78, 4, 3, "#63d49c"); px(ctx, 68, 83, 4, 3, "#3a3e43");

    // The player's desk: steel top, monitor, keyboard, a desk phone and a thermos.
    px(ctx, 124, 104, 100, 5, "#6f757c"); px(ctx, 124, 109, 100, 2, "#4a4f55");
    px(ctx, 128, 111, 3, 20, "#3a3e43"); px(ctx, 217, 111, 3, 20, "#3a3e43");
    px(ctx, MONITOR.x - 2, MONITOR.y - 2, MONITOR.w + 4, MONITOR.h + 4, "#141518");
    px(ctx, MONITOR.x + 17, MONITOR.y + MONITOR.h + 2, 6, 6, "#141518"); px(ctx, MONITOR.x + 12, MONITOR.y + MONITOR.h + 7, 16, 2, "#141518");
    px(ctx, 172, 101, 26, 3, "#2a2e36");
    px(ctx, 130, 97, 14, 7, "#1d1e20"); px(ctx, 131, 95, 12, 3, "#2a2c2f"); px(ctx, 140, 99, 2, 2, "#e8c35a"); // desk phone
    px(ctx, 210, 92, 5, 12, "#8a3a2c"); px(ctx, 210, 92, 5, 2, "#c9cfd6");   // thermos

    // Server racks on the right with blinking status lights.
    [240, 268].forEach((x, r) => {
      px(ctx, x, 70, 24, 56, "#1a1b1e"); px(ctx, x + 2, 72, 20, 52, "#242629");
      for (let i = 0; i < 8; i++) {
        px(ctx, x + 4, 75 + i * 6, 14, 3, "#35373a");
        const on = (i + r + Math.floor(t * 3)) % 3 !== 0 || UR.reducedMotion();
        px(ctx, x + 17, 76 + i * 6, 1, 1, on ? (i === 5 && r === 1 ? "#ff4d4d" : "#63d49c") : "#1d3a2a");
      }
    });
    px(ctx, 300, 60, 14, 66, "#3d4045"); px(ctx, 302, 64, 10, 4, "#c9a227"); // electrical cabinet
  }

  // The lift doors: open is 0 (closed) to 1 (open). Each panel slides into the frame.
  function drawLiftDoors(ctx, open) {
    const w = Math.round(21 * (1 - open));
    if (w <= 0) return;
    px(ctx, 16, 48, w, 78, "#7a7e85"); px(ctx, 58 - w, 48, w, 78, "#7a7e85");
    px(ctx, 16 + w - 1, 48, 1, 78, "#55585c"); px(ctx, 58 - w, 48, 1, 78, "#55585c");
    for (let y = 56; y < 124; y += 14) { px(ctx, 18, y, Math.max(0, w - 4), 1, "#8a8e95"); px(ctx, 60 - w, y, Math.max(0, w - 4), 1, "#8a8e95"); }
  }

  // The descent before a Master level: a cut-away of the ground with the lift cab going down its shaft,
  // past the city, soil and rock, to the operations centre. p runs 0..1.
  function drawDescent(ctx, look, hat, p, t) {
    const depth = 620;
    const cabBottom = 70 + ease(p) * (596 - 70);                     // world y of the cab floor
    const cam = Math.round(Math.max(0, Math.min(depth - 180, cabBottom - 120)));
    const Y = y => y - cam;
    px(ctx, 0, 0, 320, 180, "#0c0d10");
    // Sky and the city on the surface.
    const sky = ctx.createLinearGradient(0, Y(0), 0, Y(70)); sky.addColorStop(0, "#1c2a52"); sky.addColorStop(1, "#3a4a6e");
    ctx.fillStyle = sky; ctx.fillRect(0, Y(0), 320, 70);
    [[10, 30, 30], [44, 18, 22], [70, 40, 26], [190, 24, 30], [224, 36, 20], [250, 12, 28], [282, 34, 30]].forEach(([x, top, w]) => {
      px(ctx, x, Y(top), w, 70 - top, "#141a26");
      for (let yy = top + 4; yy < 66; yy += 6) for (let xx = x + 3; xx < x + w - 2; xx += 5) if ((xx + yy) % 3) px(ctx, xx, Y(yy), 2, 2, "#e8c35a");
    });
    px(ctx, 120, Y(46), 80, 24, "#2b2f38"); px(ctx, 150, Y(54), 20, 16, "#0d0e10");   // the building over the shaft
    px(ctx, 0, Y(70), 320, 4, "#3f7d46");                                               // street level
    // Soil and rock layers, with stones.
    [[74, 120, "#5a3d27"], [120, 200, "#4a3220"], [200, 300, "#3e3530"], [300, 460, "#34363a"], [460, 600, "#2a2c30"]].forEach(([a, b, c]) => px(ctx, 0, Y(a), 320, b - a, c));
    for (let i = 0; i < 70; i++) { const x = (i * 53) % 320, y = 80 + (i * 97) % 520; if (x < 130 || x > 190) px(ctx, x, Y(y), 3 + i % 4, 2 + i % 3, "rgba(0,0,0,0.25)"); }
    // The operations level at the bottom.
    px(ctx, 0, Y(560), 320, 60, "#55585c"); px(ctx, 0, Y(600), 320, 20, "#2e3033");
    for (let x = 6; x < 320; x += 30) if (x < 130 || x > 190) px(ctx, x, Y(566), 18, 2, "#e8f0f4");
    // Shaft, cables and the cab with the character inside.
    px(ctx, 140, Y(54), 40, depth, "#08090b"); px(ctx, 140, Y(54), 2, depth, "#1d1e21"); px(ctx, 178, Y(54), 2, depth, "#1d1e21");
    const cy = Math.round(Y(cabBottom)) - 40;
    px(ctx, 159, Y(54), 1, cy - Y(54), "#6a6e74");
    px(ctx, 144, cy, 32, 40, "#6a6e74"); px(ctx, 146, cy + 2, 28, 36, "#2a2c30");
    px(ctx, 146, cy + 2, 28, 2, "#fff2c0");
    drawWalker(ctx, look, hat, 154, cy + 38, t, { still: true });
    // Depth read-out.
    ctx.fillStyle = "#ff6b3d"; ctx.font = "8px monospace"; ctx.textBaseline = "top";
    ctx.fillText("\u25BC -" + Math.round(p * 60) + " m", 262, 8);
  }

  // One drawing per tier environment.
  const ROOMS = { home: drawHome, office: drawOffice, newyork: drawNewYork, underground: drawUnderground };

  // What the monitor shows: off, a calm dashboard, or a flashing alert.
  function drawScreen(ctx, mode, t) {
    const { x, y, w, h } = MONITOR;
    if (mode === "off") return px(ctx, x, y, w, h, "#0d0f12");
    if (mode === "alarm") {
      const on = Math.floor(t * 4) % 2 === 0 || UR.reducedMotion();
      px(ctx, x, y, w, h, on ? "#c0281f" : "#3a0d0a");
      px(ctx, x + 18, y + 5, 4, 11, "#fff"); px(ctx, x + 18, y + 18, 4, 3, "#fff");
      return;
    }
    px(ctx, x, y, w, h, "#0e2233");
    px(ctx, x + 2, y + 2, w - 4, 3, "#173a52");
    for (let i = 0; i < 5; i++) px(ctx, x + 3, y + 8 + i * 3, 6 + ((i * 11 + Math.floor(t * 3)) % 24), 1, i === 2 ? "#e8c35a" : "#63d49c");
    px(ctx, x + w - 10, y + 8, 7, 14, "#173a52"); px(ctx, x + w - 9, y + 16, 5, 6, "#63d49c");
  }

  // Side view of the character walking, facing right. Same look data as the portraits; only the cap colour changes per tier.
  // opts (v2.0, for the visitor and the ending): still (no stepping), flip (facing left), hood (0..1, hood up
  // over the head), top / topShade (e.g. the black hoodie), phone (held to the ear). hat null = no cap.
  function drawWalker(ctx, look, hat, x, footY, t, opts) {
    opts = opts || {};
    const step = opts.still ? 0 : Math.floor(t * 8) % 2;
    const ox = Math.round(x);
    const P = (dx, dy, w, h, c) => px(ctx, opts.flip ? ox + 12 - dx - w : ox + dx, footY - 36 + dy, w, h, c);
    const top = opts.top || look.top, shade = opts.topShade || look.topShade;
    P(2, 26, 3, 10 - step, "#2a2b33"); P(6, 26, 3, 9 + step, "#22232a");          // legs
    P(1, 35 - step, 4, 1, "#111"); P(6, 34 + step, 5, 2, "#111");                  // shoes
    P(1, 12, 9, 15, top); P(1, 12, 2, 15, shade);                                   // torso
    if (opts.top) { P(5, 13, 1, 6, "#3a3a44"); P(3, 21, 6, 3, shade); }            // hoodie zip and pocket
    if (opts.phone) { P(7, 7, 2, 8, shade); P(8, 4, 2, 6, "#0b0b0d"); P(8, 9, 2, 1, look.skin); } // arm up, phone at the ear
    else { P(4 + (step ? 2 : -1), 15, 2, 9, shade); P(4 + (step ? 2 : -1), 24, 2, 2, look.skin); } // arm
    P(4, 10, 3, 2, look.skinShade);                                                 // neck
    P(2, 2, 8, 8, look.skin); P(2, 2, 3, 7, look.hair); P(8, 5, 1, 1, "#111");      // head
    if (look.hairStyle === "bun") P(0, 1, 3, 3, look.hair);
    if (look.hairStyle === "bob") P(1, 3, 3, 8, look.hair);
    if (look.beard) P(6, 7, 4, 3, look.hair);
    if (opts.hood >= 0.5) { P(1, 0, 10, 3, top); P(1, 0, 4, 11, top); P(9, 1, 2, 3, top); P(5, 3, 1, 6, shade); } // hood up
    else if (opts.top) P(0, 9, 4, 4, shade);                                        // hood down on the back
    if (hat) { P(2, 0, 8, 3, hat); P(9, 2, 3, 1, hat); }                            // cap
  }

  // ---- v2.0 room props (update doc) ----

  // A standing coat rack with the black hoodie on it, on the left of every room. state: { hoodie, hat }
  // (hat is a cap colour when the cap hangs on the rack, in the ending).
  function drawCoatRack(ctx, x, state) {
    state = state || { hoodie: true };
    px(ctx, x + 2, 131, 11, 2, "#2a221b"); px(ctx, x + 4, 129, 7, 2, "#3a2f25");          // base
    px(ctx, x + 6, 92, 2, 38, "#4a3a2c"); px(ctx, x + 6, 92, 1, 38, "#5e4a38");           // pole
    px(ctx, x + 3, 93, 8, 1, "#4a3a2c"); px(ctx, x + 2, 92, 2, 2, "#4a3a2c"); px(ctx, x + 10, 92, 2, 2, "#4a3a2c"); // hooks
    if (state.hat) { px(ctx, x, 89, 6, 3, state.hat); px(ctx, x + 5, 91, 3, 1, state.hat); }
    if (state.hoodie) {
      // The black hoodie: hood folded over the hook, body and sleeves hanging down.
      px(ctx, x + 8, 92, 6, 5, "#16161b"); px(ctx, x + 9, 93, 3, 3, "#0b0b0e");
      px(ctx, x + 6, 96, 11, 18, "#1b1b21"); px(ctx, x + 6, 96, 2, 18, "#111116");
      px(ctx, x + 15, 97, 3, 16, "#141419"); px(ctx, x + 11, 97, 1, 9, "#3a3a44");
      px(ctx, x + 8, 108, 7, 3, "#141419"); px(ctx, x + 6, 113, 11, 1, "#0d0d10");
    }
  }
  const RACK_X = { home: 62, office: 58, newyork: 84, underground: 78 };

  // Extra people in the shared office (Intermediate): plain colours, not one of the four defenders.
  const NPCS = [
    { skin: "#c99a7a", skinShade: "#a87a5c", hair: "#3b2a1e", hairStyle: "short", top: "#4f7a5a", topShade: "#3b5e44" },
    { skin: "#7a4e36", skinShade: "#5e3a26", hair: "#1a1210", hairStyle: "bun", top: "#d9a441", topShade: "#b5852d" },
    { skin: "#f0cfb4", skinShade: "#d4ae96", hair: "#a8642a", hairStyle: "bob", top: "#6a5acd", topShade: "#5246a8" },
    { skin: "#e2b48f", skinShade: "#c49370", hair: "#2a2a2a", hairStyle: "fade", top: "#2f7f8f", topShade: "#225e6b" }
  ];

  // Someone seen from the front behind a monitor (only the head and shoulders show above it).
  function drawHeadOverMonitor(ctx, look, x, y, t, k) {
    const bob = Math.floor(t * 1.5 + k) % 4 === 0 ? 1 : 0;
    px(ctx, x, y + 10 + bob, 14, 6, look.top);
    px(ctx, x + 3, y + bob, 8, 9, look.skin); px(ctx, x + 3, y + bob, 8, 3, look.hair);
    if (look.hairStyle === "bob") { px(ctx, x + 2, y + bob, 2, 8, look.hair); px(ctx, x + 10, y + bob, 2, 8, look.hair); }
    if (look.hairStyle === "bun") px(ctx, x + 5, y - 2 + bob, 4, 3, look.hair);
    px(ctx, x + 4, y + 5 + bob, 1, 1, "#111"); px(ctx, x + 8, y + 5 + bob, 1, 1, "#111");
  }

  // Back view of the character seated at the desk, looking at the monitor.
  function drawSeated(ctx, look, hat, ox, oy) {
    const x = ox || 140, y = oy || 78;
    px(ctx, x - 1, y + 14, 20, 16, look.top); px(ctx, x - 1, y + 14, 3, 16, look.topShade);
    px(ctx, x - 3, y + 24, 24, 22, "#34343e"); px(ctx, x - 3, y + 24, 24, 2, "#4a4a56"); // chair back, in front of the body
    px(ctx, x + 8, y + 46, 3, 14, "#1d1d24"); px(ctx, x, y + 60, 20, 2, "#1d1d24");
    px(ctx, x + 17, y + 18, 10, 4, look.top); px(ctx, x + 26, y + 19, 4, 3, look.skin); // arm to the keyboard
    px(ctx, x + 6, y + 11, 6, 4, look.skinShade);               // neck
    px(ctx, x + 3, y + 1, 12, 11, look.hair);                   // back of the head
    if (look.hairStyle === "bob") px(ctx, x + 2, y + 4, 14, 10, look.hair);
    if (look.hairStyle === "bun") px(ctx, x + 6, y + 6, 6, 5, look.hair);
    if (look.hairStyle === "fade" || look.hairStyle === "short") px(ctx, x + 4, y + 8, 10, 3, look.skinShade);
    if (look.headphones) { px(ctx, x + 2, y + 4, 2, 5, "#2b2f36"); px(ctx, x + 14, y + 4, 2, 5, "#2b2f36"); px(ctx, x + 3, y, 12, 2, "#2b2f36"); }
    if (hat) { px(ctx, x + 3, y - 1, 12, 5, hat); px(ctx, x + 8, y - 2, 2, 1, hat); } // cap from behind
  }

  // Light sources drawn after the overlay, so lamps and the screen glow at night.
  function drawGlow(ctx, L, screenMode) {
    if (!L.glow) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sc = screenMode === "alarm" ? "255,60,40" : screenMode === "on" ? "90,180,255" : null;
    if (sc) {
      const g = ctx.createRadialGradient(186, 84, 4, 186, 84, 70);
      g.addColorStop(0, "rgba(" + sc + "," + (0.35 * L.glow).toFixed(3) + ")"); g.addColorStop(1, "rgba(" + sc + ",0)");
      ctx.fillStyle = g; ctx.fillRect(100, 20, 180, 140);
    }
    const lg = ctx.createRadialGradient(133, 96, 2, 133, 96, 46);
    lg.addColorStop(0, "rgba(255,210,120," + (0.4 * L.glow).toFixed(3) + ")"); lg.addColorStop(1, "rgba(255,210,120,0)");
    ctx.fillStyle = lg; ctx.fillRect(80, 50, 110, 100);
    ctx.restore();
  }

  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

  // Run the level's room scene on a canvas. Returns controls for the level screen:
  // sit() skips the walk, alarm() starts the warning, zoom() resolves when the camera reaches the monitor.
  // v2.0: in the underground (Master) the character first rides the lift down ("descend"), the doors
  // open ("doors") and they walk out. visitor()/visitorLeave() glitch a teammate in and out (Level 6).
  // cfg.finale runs the ending instead: the scene starts seated and is driven by set()/walk()/tween().
  function room(canvas, cfg) {
    canvas.width = 320; canvas.height = 180;
    const ctx = canvas.getContext("2d");
    const buf = document.createElement("canvas"); buf.width = 320; buf.height = 180;
    const b = buf.getContext("2d");
    const L = LIGHTING[cfg.lighting] || LIGHTING.day;
    const env = ROOMS[cfg.environment] ? cfg.environment : "home";
    const drawRoom = ROOMS[env];
    const lift = env === "underground";
    const still = UR.reducedMotion();
    let phase = cfg.finale ? "finale" : lift && !still ? "descend" : "arrive";
    let phaseAt = performance.now(), raf = 0, alive = true, zoomDone = null;
    const start = performance.now();
    let visitor = null; // { look, hat, at, leaving, done }
    // Ending state (cfg.finale): pose, position and what the character wears.
    const F = { pose: "seated", x: 140, flip: true, hat: cfg.hat, hood: 0, hoodie: false, phone: false, screen: "on",
                rack: { hoodie: true, hat: null }, liftOpen: 0, fade: 0, crt: 0, capFly: null, hidden: false };
    const tweens = [];

    // Draw a figure through a glitch: horizontal slices shifted at random, tinted red and cyan.
    const gbuf = document.createElement("canvas"); gbuf.width = 320; gbuf.height = 180;
    const g = gbuf.getContext("2d");
    function glitchDraw(drawFn, amount) {
      g.clearRect(0, 0, 320, 180);
      drawFn(g);
      if (amount <= 0) { b.drawImage(gbuf, 0, 0); return; }
      for (let y = 90; y < 150; y += 3) {
        const off = Math.random() < amount ? Math.round((Math.random() - 0.5) * 16 * amount) : 0;
        if (Math.random() < amount * 0.5) continue; // missing slices
        b.drawImage(gbuf, 0, y, 320, 3, off, y, 320, 3);
      }
      b.save(); b.globalCompositeOperation = "lighter"; b.globalAlpha = 0.5 * amount;
      b.drawImage(gbuf, -2, 0); b.restore();
    }

    function frame(now) {
      if (!alive) return;
      const t = (now - start) / 1000, pt = (now - phaseAt) / 1000;
      if (phase === "descend" && pt >= 2.6) { setPhase("doors"); UR.audio.ding(); }
      if (phase === "doors" && pt >= 0.8) setPhase("arrive");
      if (phase === "arrive" && (still || pt >= 2.8)) setPhase("seated");
      runTweens(now);
      const screen = cfg.finale ? F.screen : phase === "alarm" || phase === "zoom" ? "alarm" : phase === "work" || phase === "seated" ? "on" : "off";

      if (phase === "descend") {
        drawDescent(b, cfg.look, cfg.hat, Math.min(1, pt / 2.6), t);
      } else {
        drawRoom(b, L, t);
        drawCoatRack(b, RACK_X[env], cfg.finale ? F.rack : { hoodie: true });
        drawScreen(b, screen, t);
        if (screen === "off" && F.crt > 0) { const w = Math.round(MONITOR.w * F.crt); px(b, MONITOR.x + (MONITOR.w - w) / 2, MONITOR.y + MONITOR.h / 2, w, 1, "#dff6ff"); }
        const liftOpen = phase === "doors" ? Math.min(1, pt / 0.6) : phase === "arrive" && lift ? 1 : cfg.finale ? F.liftOpen : 0;
        if (lift && !(phase === "doors" || phase === "arrive" || cfg.finale)) drawLiftDoors(b, 0);
        if (cfg.finale) drawFinaleFigure(t);
        else if (phase === "doors") drawWalker(b, cfg.look, cfg.hat, 31, 126, t, { still: true });
        else if (phase === "arrive") {
          const x = (lift ? 31 : 34) + Math.min(1, pt / 2.6) * (lift ? 101 : 98);
          drawWalker(b, cfg.look, cfg.hat, x, lift && x < 50 ? 126 + Math.round((x - 31) / 19 * 14) : 140, t);
        } else drawSeated(b, cfg.look, cfg.hat);
        // Lift doors go in front of anyone still inside the cab.
        if (lift && (phase === "doors" || cfg.finale)) drawLiftDoors(b, liftOpen);
        if (visitor) drawVisitor(now);
        if (L.overlay) { b.fillStyle = L.overlay; b.fillRect(0, 0, 320, 180); }
        drawScreen(b, screen, t); // the screen itself is never darkened by the overlay
        drawGlow(b, L, screen);
        if (phase === "alarm" || phase === "zoom") {
          const a = still ? 0.18 : 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(t * 12));
          b.fillStyle = "rgba(255,40,30," + a.toFixed(3) + ")"; b.fillRect(0, 0, 320, 180);
        }
        if (F.fade > 0) { b.fillStyle = "rgba(0,0,0," + F.fade.toFixed(3) + ")"; b.fillRect(0, 0, 320, 180); }
      }

      ctx.imageSmoothingEnabled = false;
      if (phase === "zoom") {
        const p = still ? 1 : ease(Math.min(1, pt / 1.2));
        const sw = 320 + (MONITOR.w - 320) * p, sh = sw * 9 / 16;
        const cx = 160 + (MONITOR.x + MONITOR.w / 2 - 160) * p, cy = 90 + (MONITOR.y + MONITOR.h / 2 - 90) * p;
        ctx.drawImage(buf, cx - sw / 2, cy - sh / 2, sw, sh, 0, 0, 320, 180);
        if (p >= 1 && zoomDone) { const done = zoomDone; zoomDone = null; done(); }
      } else {
        const shake = phase === "alarm" && !still ? Math.round(Math.sin(t * 40)) : 0;
        ctx.drawImage(buf, shake, 0);
      }
      for (let y = 0; y < 180; y += 3) { ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(0, y, 320, 1); }
      if (!still || phase === "zoom" && zoomDone || tweens.length || visitor) raf = requestAnimationFrame(frame);
    }

    // The visiting teammate stands near the door, facing the desk, glitching in and out.
    function drawVisitor(now) {
      const v = visitor;
      const age = (now - v.at) / 1000;
      let amount = still ? 0 : Math.max(0, 1 - age / 0.6);
      if (v.leaving) {
        const la = (now - v.leaving) / 1000;
        amount = Math.min(1, la / 0.5);
        if (la >= 0.6 || still) { const done = v.done; visitor = null; if (done) done(); return; }
      }
      glitchDraw(c => drawWalker(c, v.look, v.hat, 92, 140, 0, { still: true }), amount);
    }

    // The ending's figure: seated at the desk, or standing and walking with what they wear right now.
    function drawFinaleFigure(t) {
      if (F.hidden) return;
      const look = cfg.look;
      const wear = F.hoodie ? { top: "#1b1b21", topShade: "#111116" } : {};
      const hatColor = F.hat ? cfg.hat : null;
      if (F.pose === "seated") {
        drawSeated(b, F.hoodie ? Object.assign({}, look, { top: "#1b1b21", topShade: "#111116" }) : look, hatColor);
      } else {
        const foot = F.x < 50 ? 126 + Math.round(Math.max(0, F.x - 31) / 19 * 14) : 140;
        drawWalker(b, look, hatColor, F.x, foot, F.walking ? t : 0, Object.assign({ still: !F.walking, flip: F.flip, hood: F.hood, phone: F.phone }, wear));
      }
      if (F.capFly) { const c = F.capFly; px(b, Math.round(c.x), Math.round(c.y), 7, 3, cfg.hat); px(b, Math.round(c.x) + 6, Math.round(c.y) + 2, 2, 1, cfg.hat); }
    }

    // Tween one numeric field of F (or of an object) over ms milliseconds. Resolves when done.
    function tween(obj, key, to, ms) {
      return new Promise(resolve => {
        if (still || !ms) { obj[key] = to; frame(performance.now()); return resolve(); }
        tweens.push({ obj, key, from: obj[key], to, at: performance.now(), ms, resolve });
        cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
      });
    }
    function runTweens(now) {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        const p = Math.min(1, (now - tw.at) / tw.ms);
        tw.obj[tw.key] = tw.from + (tw.to - tw.from) * p;
        if (p >= 1) { tweens.splice(i, 1); tw.resolve(); }
      }
    }

    function setPhase(p) { phase = p; phaseAt = performance.now(); if (still) frame(performance.now()); }

    frame(performance.now());
    return {
      sit() { if (phase === "arrive" || phase === "descend" || phase === "doors") setPhase("seated"); },
      work() { setPhase("work"); },
      alarm() { setPhase("alarm"); },
      zoom() { return new Promise(resolve => { zoomDone = resolve; setPhase("zoom"); }); },
      visitor(look, hat) { visitor = { look, hat, at: performance.now() }; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
      visitorLeave() {
        return new Promise(resolve => {
          if (!visitor) return resolve();
          visitor.leaving = performance.now(); visitor.done = resolve;
          cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
          setTimeout(() => { visitor = null; resolve(); }, 900); // safety: never hang the intro
        });
      },
      // Ending controls.
      state: F,
      set(props) { Object.assign(F, props); if (still) frame(performance.now()); },
      tween,
      walk(toX, ms) { F.walking = true; F.flip = toX < F.x; return tween(F, "x", toX, ms).then(() => { F.walking = false; frame(performance.now()); }); },
      rackX: RACK_X[env],
      stop() { alive = false; cancelAnimationFrame(raf); tweens.splice(0).forEach(tw => tw.resolve()); }
    };
  }

  // v2.0: the hooded figure on the newspaper page ("What actually happened…"), in the event's colour:
  // black, grey or red. A pixel portrait from the front, face in shadow, lit by a laptop.
  function hacker(canvas, color) {
    const C = { black: ["#1b1b21", "#0d0d11", "#2c2c35"], gray: ["#6b6f75", "#4a4e54", "#868a90"], red: ["#9b1c1c", "#651010", "#c0392b"] }[color] || ["#1b1b21", "#0d0d11", "#2c2c35"];
    canvas.width = 48; canvas.height = 48;
    const ctx = canvas.getContext("2d");
    px(ctx, 0, 0, 48, 48, "#d8d0bd");
    for (let y = 0; y < 48; y += 2) for (let x = (y / 2) % 2; x < 48; x += 2) px(ctx, x, y, 1, 1, "rgba(35,29,21,0.12)"); // halftone
    px(ctx, 8, 30, 32, 18, C[0]); px(ctx, 8, 30, 4, 18, C[1]); px(ctx, 36, 30, 4, 18, C[1]); // shoulders
    px(ctx, 13, 6, 22, 26, C[0]); px(ctx, 11, 10, 26, 20, C[0]); px(ctx, 14, 5, 20, 3, C[2]);  // hood
    px(ctx, 16, 12, 16, 17, "#050506");                                                          // shadowed face
    px(ctx, 19, 19, 3, 1, "#e8f0f4"); px(ctx, 26, 19, 3, 1, "#e8f0f4");                          // eyes catching light
    px(ctx, 22, 30, 1, 8, C[1]); px(ctx, 25, 30, 1, 8, C[1]);                                    // drawstrings
    px(ctx, 10, 40, 28, 8, "#2b2f36"); px(ctx, 12, 41, 24, 1, "#8fd3ff");                        // laptop
    const gl = ctx.createLinearGradient(0, 40, 0, 20); gl.addColorStop(0, "rgba(143,211,255,0.35)"); gl.addColorStop(1, "rgba(143,211,255,0)");
    ctx.fillStyle = gl; ctx.fillRect(14, 20, 20, 20);
  }

  UR.scene = { drawBust, portrait, playScene, room, hacker, HATS, LIGHTING };
})(window.UR = window.UR || {});
