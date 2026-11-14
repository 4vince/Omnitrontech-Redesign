/**
 * Holographic stage for the AI Solutions service visuals.
 *
 * Flat, 2D and crisp: each service is a small schematic drawn in light on
 * navy, in the same world as the home page's brain hero (cobalt linework,
 * ice-white highlights, amber for people). Lines carry a soft halo under a
 * sharp core, packets of light travel along them, a slow scan passes over
 * the board. Text is never blended or blurred, so labels stay sharp.
 *
 * Canvas 2D only (no Three.js). `createHoloStage` returns the same control
 * object the old 3D stage did, so solutions.js drives it unchanged:
 *   pause, resume, restart, setScroll, setMotionEnabled, dispose.
 *
 * A scene module exports `build(kit)` and returns:
 *   frame      { w, h }                design units the scene is laid out in
 *   story      { cycle, marks }        one loop and where each step starts
 *   staticTime t drawn as the single reduced-motion frame
 *   draw(local, dt, t)                 paint the scene at loop time `local`
 */

/* ── Light palette. Colour carries meaning (same as DESIGN.md):
     cobalt  the AI / the system doing the work
     amber   a person: hand-offs, approvals, the team
     teal    safe and finished
     red     blocked or out of range
     sky, coral, lime, rose: kinds of input, so the eye can follow one. ── */
export const HUE = {
  cobalt: "#6f9bff",
  ice: "#d6e6ff",
  amber: "#ffa64d",
  teal: "#3fe0bd",
  red: "#ff6b5b",
  sky: "#5cc8ff",
  coral: "#ff8f73",
  lime: "#b5e36a",
  rose: "#ff7fb0",
  violet: "#a99bff",
};

export const INK = {
  text: "#eaf0ff",
  sub: "#a9b8e6",
  faint: "rgba(169, 184, 230, 0.55)",
  panel: "rgba(7, 16, 52, 0.82)",
};

export const FONT = {
  display: '"Archivo Variable", Arial, sans-serif',
  body: '"Manrope Variable", Arial, sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, monospace',
};

/* ── Small math ── */
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
/** 0→1 progress of `t` through the window [a, b]. */
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeOutQuart = (t) => 1 - (1 - t) ** 4;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeBack = (t) => {
  const c = 1.4;
  return t === 0 ? 0 : 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
export const lerp = (a, b, t) => a + (b - a) * t;
/** In over [a, a+fade], out over [b, b+fade]. */
export const window01 = (t, a, b, fade = 0.4) => seg(t, a, a + fade) * (1 - seg(t, b, b + fade));

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* ── Phosphor glyphs, read from the icon font's own CSS ── */
const glyphs = new Map();
function glyph(name) {
  if (glyphs.has(name)) return glyphs.get(name);
  const probe = document.createElement("i");
  probe.className = `ph ${name}`;
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;left:-9999px;top:0;opacity:0;pointer-events:none";
  document.body.append(probe);
  const raw = getComputedStyle(probe, "::before").content;
  probe.remove();
  const char = raw && raw !== "none" ? raw.replace(/^["']|["']$/g, "") : "";
  glyphs.set(name, char);
  return char;
}

/* ── Polylines: [[x, y], …] with cached lengths ── */
export function path(points) {
  const lens = [0];
  for (let i = 1; i < points.length; i += 1) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    lens.push(lens[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  return { points, lens, length: lens[lens.length - 1] };
}

/** Point at 0…1 along a path. */
export function pointAt(p, u) {
  const d = clamp(u) * p.length;
  let i = 1;
  while (i < p.lens.length - 1 && p.lens[i] < d) i += 1;
  const a = p.points[i - 1];
  const b = p.points[i];
  const span = p.lens[i] - p.lens[i - 1] || 1;
  const k = (d - p.lens[i - 1]) / span;
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
}

/** Right-angle circuit trace from a to b, turning at `bend` (0…1 of the run). */
export function trace(a, b, bend = 0.5, r = 18) {
  const mx = lerp(a[0], b[0], bend);
  if (Math.abs(a[1] - b[1]) < 1) return path([a, b]);
  const dir = Math.sign(b[1] - a[1]);
  const rr = Math.min(r, Math.abs(b[1] - a[1]) / 2, Math.abs(mx - a[0]), Math.abs(b[0] - mx));
  const sx = Math.sign(b[0] - a[0]) || 1;
  // Approximate the two rounded corners with short chamfers: crisp, cheap.
  return path([
    a,
    [mx - rr * sx, a[1]],
    [mx, a[1] + rr * dir],
    [mx, b[1] - rr * dir],
    [mx + rr * sx, b[1]],
    b,
  ]);
}

/* ── Glow sprites: one radial falloff per hue, drawn with drawImage ── */
const sprites = new Map();
function sprite(hex) {
  if (sprites.has(hex)) return sprites.get(hex);
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, rgba(hex, 1));
  grad.addColorStop(0.18, rgba(hex, 0.55));
  grad.addColorStop(0.45, rgba(hex, 0.16));
  grad.addColorStop(1, rgba(hex, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  sprites.set(hex, c);
  return c;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   build: (kit: object) => object,
 *   animate?: boolean,
 *   panel?: boolean,     the scene plays inside a display panel (light cards)
 *   host?: Element,      pointer parallax listens here
 *   onStep?: (index: number | null, story: object) => void,
 * }} options
 */
export async function createHoloStage(canvas, { build, animate = true, panel = false, host, onStep, surface = null } = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Wait for the fonts the labels use, so the first frame is not a fallback face.
  try {
    await Promise.all([
      document.fonts.load(`600 20px ${FONT.display}`),
      document.fonts.load(`600 16px ${FONT.body}`),
      document.fonts.load(`500 14px ${FONT.mono}`),
      document.fonts.load(`20px Phosphor`),
    ]);
  } catch {
    /* draw with whatever is there */
  }

  // Keep the title band (top) and caption band (bottom) clear on navy cards;
  // inside a panel the whole box is the scene's.
  const pad = panel ? { top: 0.06, bottom: 0.06, side: 0.03 } : { top: 0.24, bottom: 0.13, side: 0.02 };

  const state = {
    animate,
    running: false,
    disposed: false,
    t: 0,
    step: undefined,
    scroll: 0,
    scrollTarget: 0,
    px: 0,
    py: 0,
    pxTarget: 0,
    pyTarget: 0,
    w: 0,
    h: 0,
    dpr: 1,
    scale: 1,
    ox: 0,
    oy: 0,
    flicker: 1,
    // Projected as a hologram texture (holo3d/projection.js): labels set larger.
    textScale: surface?.textScale ?? 1,
  };

  /* ── Drawing helpers handed to the scene (all in design units) ── */
  const kit = {
    ctx,
    HUE,
    INK,
    FONT,
    get still() {
      return !state.animate;
    },

    /** Soft light at a point (additive). */
    glow(x, y, r, hue, a = 1) {
      if (a <= 0.001) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp(a * state.flicker);
      ctx.drawImage(sprite(hue), x - r, y - r, r * 2, r * 2);
      ctx.restore();
    },

    /**
     * A line of light: wide faint halo, then a sharp core. `from`/`to`
     * (0…1) draw only part of it, for lines that draw themselves on.
     */
    beam(p, hue, { a = 1, width = 1.6, from = 0, to = 1, dash = null, halo = 1 } = {}) {
      if (a <= 0.001 || to <= from) return;
      const pts = subPath(p, from, to);
      if (pts.length < 2) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (dash) ctx.setLineDash(dash);
      ctx.globalCompositeOperation = "lighter";
      const f = state.flicker;
      if (halo > 0) {
        stroke(pts, rgba(hue, 0.09 * a * halo * f), width + 14);
        stroke(pts, rgba(hue, 0.2 * a * halo * f), width + 5);
      }
      ctx.globalCompositeOperation = "source-over";
      stroke(pts, rgba(hue, clamp(a)), width);
      ctx.restore();
    },

    /** A packet of light at `u` along a path, with a short fading tail. */
    packet(p, u, hue, { a = 1, size = 7, tail = 0.12 } = {}) {
      if (a <= 0.001 || u < 0 || u > 1) return;
      const steps = 6;
      for (let i = steps; i >= 1; i -= 1) {
        const k = i / steps;
        const [x, y] = pointAt(p, u - (tail * k * 90) / Math.max(90, p.length));
        kit.glow(x, y, size * (2.6 - k * 1.2), hue, a * 0.22 * (1 - k));
      }
      const [x, y] = pointAt(p, u);
      kit.glow(x, y, size * 3.4, hue, a * 0.9);
      ctx.save();
      ctx.globalAlpha = clamp(a);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, size * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    /** Crisp ring node with a glow behind it. */
    node(x, y, r, hue, { a = 1, fill = 0.14, lit = 0.65, icon = null, iconSize = r * 0.95 } = {}) {
      if (a <= 0.001) return;
      kit.glow(x, y, r * 3.2, hue, a * lit);
      ctx.save();
      ctx.globalAlpha = clamp(a);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = INK.panel;
      ctx.fill();
      ctx.fillStyle = rgba(hue, fill);
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = rgba(hue, 0.95);
      ctx.stroke();
      ctx.restore();
      if (icon) kit.icon(icon, x, y, iconSize, hue, a);
    },

    /** A rotating dashed ring: the system is busy here. */
    spinner(x, y, r, hue, t, { a = 1, speed = 1.2 } = {}) {
      if (a <= 0.001) return;
      ctx.save();
      ctx.globalAlpha = clamp(a);
      ctx.translate(x, y);
      ctx.rotate(t * speed);
      ctx.setLineDash([r * 0.5, r * 0.32]);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rgba(hue, 0.85);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },

    icon(name, x, y, size, color, a = 1) {
      const char = glyph(name);
      if (!char || a <= 0.001) return;
      ctx.save();
      ctx.globalAlpha = clamp(a);
      ctx.font = `${size}px Phosphor`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.fillText(char, x, y);
      ctx.restore();
    },

    text(str, x, y, { size = 18, weight = 600, family = FONT.body, color = INK.text, align = "left", base = "middle", a = 1, maxW = 0, track = 0 } = {}) {
      if (a <= 0.001) return;
      ctx.save();
      ctx.globalAlpha = clamp(a);
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = base;
      let s = size * state.textScale;
      ctx.font = `${weight} ${s}px ${family}`;
      if (track) ctx.letterSpacing = `${track}px`;
      while (maxW && s > 9 && ctx.measureText(str).width > maxW) {
        s -= 0.5;
        ctx.font = `${weight} ${s}px ${family}`;
      }
      ctx.fillText(str, x, y);
      ctx.restore();
    },

    /**
     * Glass label: navy face, hairline in the hue, icon tile, title and sub.
     * (x, y) is the card's centre. Returns its box.
     */
    chip(x, y, { icon, title, sub, hue = HUE.cobalt, w = 230, h = 64, a = 1, lit = 0.35, scale = 1, strong = false } = {}) {
      if (a <= 0.001) return null;
      const W = w * scale;
      const H = h * scale;
      const left = x - W / 2;
      const top = y - H / 2;
      ctx.save();
      ctx.globalAlpha = clamp(a);
      // Halo: a lit edge, additive, under the crisp face.
      ctx.globalCompositeOperation = "lighter";
      roundRect(left - 3, top - 3, W + 6, H + 6, 14 * scale + 3);
      ctx.lineWidth = 8;
      ctx.strokeStyle = rgba(hue, 0.22 * lit * state.flicker);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      roundRect(left, top, W, H, 14 * scale);
      ctx.fillStyle = INK.panel;
      ctx.fill();
      ctx.fillStyle = rgba(hue, strong ? 0.16 : 0.06);
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = rgba(hue, strong ? 0.95 : 0.6);
      ctx.stroke();
      ctx.restore();

      const pad = 12 * scale;
      const tile = H - pad * 2;
      if (icon) {
        ctx.save();
        ctx.globalAlpha = clamp(a);
        roundRect(left + pad, top + pad, tile, tile, 9 * scale);
        ctx.fillStyle = rgba(hue, 0.18);
        ctx.fill();
        ctx.restore();
        kit.icon(icon, left + pad + tile / 2, top + H / 2, tile * 0.56, hue, a);
      }
      const tx = left + pad + (icon ? tile + 12 * scale : 4 * scale);
      const maxW = left + W - pad - tx;
      if (sub) {
        // Larger labels (projected boards) need the two lines further apart.
        const spread = (state.textScale - 1) * 0.12;
        kit.text(title, tx, top + H * (0.39 - spread), { size: 17 * scale, weight: 650, family: FONT.display, a, maxW });
        kit.text(sub, tx, top + H * (0.7 + spread), { size: 13.5 * scale, weight: 560, color: INK.sub, a, maxW });
      } else {
        kit.text(title, tx, top + H / 2 + 1, { size: 17 * scale, weight: 650, family: FONT.display, a, maxW });
      }
      return { left, top, w: W, h: H };
    },

    /** Corner brackets around a box: a target lock. */
    brackets(x, y, w, h, hue, { a = 1, arm = 16, gap = 8 } = {}) {
      if (a <= 0.001) return;
      const l = x - w / 2 - gap;
      const r = x + w / 2 + gap;
      const t = y - h / 2 - gap;
      const b = y + h / 2 + gap;
      ctx.save();
      ctx.globalAlpha = clamp(a);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = hue;
      ctx.beginPath();
      ctx.moveTo(l, t + arm);
      ctx.lineTo(l, t);
      ctx.lineTo(l + arm, t);
      ctx.moveTo(r - arm, t);
      ctx.lineTo(r, t);
      ctx.lineTo(r, t + arm);
      ctx.moveTo(r, b - arm);
      ctx.lineTo(r, b);
      ctx.lineTo(r - arm, b);
      ctx.moveTo(l + arm, b);
      ctx.lineTo(l, b);
      ctx.lineTo(l, b - arm);
      ctx.stroke();
      ctx.restore();
    },

    /** Rounded box outline in light (no fill unless asked). */
    box(x, y, w, h, hue, { a = 1, r = 14, fill = 0, face = false, dash = null, width = 1.4, halo = 1 } = {}) {
      if (a <= 0.001) return;
      ctx.save();
      if (halo > 0) {
        ctx.globalCompositeOperation = "lighter";
        roundRect(x, y, w, h, r);
        ctx.lineWidth = width + 6;
        ctx.strokeStyle = rgba(hue, 0.08 * a * halo * state.flicker);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }
      roundRect(x, y, w, h, r);
      if (face) {
        ctx.globalAlpha = clamp(a);
        ctx.fillStyle = INK.panel;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (fill > 0) {
        ctx.fillStyle = rgba(hue, fill * a);
        ctx.fill();
      }
      if (dash) ctx.setLineDash(dash);
      ctx.lineWidth = width;
      ctx.strokeStyle = rgba(hue, 0.9 * a);
      ctx.stroke();
      ctx.restore();
    },

    /**
     * A titled readout card: glass face, icon and title in a header, a rule
     * under it. Returns the y where its body starts.
     */
    card(x, y, w, h, { title, icon, hue = HUE.cobalt, a = 1, strong = false } = {}) {
      if (a <= 0.001) return y + 52;
      kit.box(x, y, w, h, hue, { a: a * (strong ? 1 : 0.8), r: 14, fill: strong ? 0.08 : 0.04, face: true, halo: strong ? 1 : 0.6 });
      if (icon) kit.icon(icon, x + 26, y + 26, 19, hue, a);
      kit.text(title, x + (icon ? 46 : 18), y + 27, { size: 15.5, weight: 650, family: FONT.display, a, maxW: w - 64 });
      ctx.save();
      ctx.globalAlpha = clamp(a) * 0.45;
      ctx.fillStyle = hue;
      ctx.fillRect(x + 16, y + 50, w - 32, 1);
      ctx.restore();
      return y + 50;
    },

    /** A check mark drawn on over `p` (0…1). */
    check(x, y, s, hue, p = 1, a = 1) {
      if (p <= 0 || a <= 0.001) return;
      const pts = path([
        [x - s * 0.5, y],
        [x - s * 0.12, y + s * 0.38],
        [x + s * 0.55, y - s * 0.4],
      ]);
      kit.beam(pts, hue, { a, width: 2.4, to: easeOut(clamp(p)), halo: 0.8 });
    },

    rgba,
  };

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
  kit.roundRect = roundRect;

  function stroke(pts, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  function subPath(p, from, to) {
    if (from <= 0 && to >= 1) return p.points;
    const a = clamp(from) * p.length;
    const b = clamp(to) * p.length;
    const out = [pointAt(p, from)];
    for (let i = 1; i < p.points.length - 1; i += 1) {
      if (p.lens[i] > a && p.lens[i] < b) out.push(p.points[i]);
    }
    out.push(pointAt(p, to));
    return out;
  }

  const api = build(kit);
  const frame = api.frame ?? { w: 1500, h: 640 };

  // Surface mode: no layout, loop or listeners of its own. The board is drawn
  // into `canvas` at `res` pixels per design unit, for a 3D stage to place
  // (holo3d/projection.js).
  if (surface) {
    let res = 0;
    const resize = (next) => {
      if (Math.abs(next - res) < 0.02) return;
      res = next;
      canvas.width = Math.round(frame.w * res);
      canvas.height = Math.round(frame.h * res);
    };
    resize(surface.scale ?? 1);
    return {
      canvas,
      frame,
      story: api.story,
      staticTime: api.staticTime,
      resize,
      render(local, dt, t, animate) {
        state.animate = animate;
        state.t = t;
        state.flicker = animate ? 1 + 0.03 * Math.sin(t * 13.1) * Math.sin(t * 3.7) : 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(res, 0, 0, res, 0, 0);
        api.draw(local, animate ? dt : 0, t);
      },
    };
  }

  /* ── Layout ── */
  function fit() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (!w || !h) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    if (w === state.w && h === state.h && dpr === state.dpr) return false;
    state.w = w;
    state.h = h;
    state.dpr = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const availW = w * (1 - pad.side * 2);
    const availH = h * (1 - pad.top - pad.bottom);
    state.scale = Math.min(availW / frame.w, availH / frame.h);
    state.ox = (w - frame.w * state.scale) / 2;
    state.oy = h * pad.top + (availH - frame.h * state.scale) / 2;
    return true;
  }

  /* ── Story clock ── */
  function stepAt(local) {
    const { marks } = api.story;
    let index = 0;
    for (let i = 0; i < marks.length; i += 1) if (local >= marks[i]) index = i;
    return index;
  }

  function draw(dt) {
    if (state.disposed) return;
    const k = state.animate ? 1 - Math.exp(-4 * dt) : 1;
    state.scroll = lerp(state.scroll, state.scrollTarget, k);
    state.px = lerp(state.px, state.pxTarget, k);
    state.py = lerp(state.py, state.pyTarget, k);
    // A faint shimmer on the light (never the text), as on the hero.
    state.flicker = state.animate ? 1 + 0.03 * Math.sin(state.t * 13.1) * Math.sin(state.t * 3.7) : 1;

    const local = state.animate ? state.t % api.story.cycle : api.staticTime;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const s = state.scale * state.dpr;
    // Parallax: a few pixels of pointer and scroll drift, whole board.
    const dx = state.px * 10;
    const dy = state.py * 6 + state.scroll * -14;
    ctx.setTransform(s, 0, 0, s, (state.ox + dx) * state.dpr, (state.oy + dy) * state.dpr);

    if (state.animate) sweep(local);
    api.draw(local, state.animate ? dt : 0, state.t);

    const nextStep = state.animate ? stepAt(local) : null;
    if (nextStep !== state.step) {
      state.step = nextStep;
      onStep?.(nextStep, api.story);
    }
  }

  // Slow scan line across the board, once per story step.
  function sweep(local) {
    const period = api.story.cycle / api.story.marks.length;
    const u = (local % period) / period;
    if (u > 0.55) return;
    const x = lerp(-160, frame.w + 160, easeInOut(u / 0.55));
    // Feathered on both sides and faded at the top and bottom: a pass of
    // light, never a bar.
    const fade = Math.sin(Math.PI * (u / 0.55));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(x - 140, 0, x + 140, 0);
    g.addColorStop(0, rgba(HUE.cobalt, 0));
    g.addColorStop(0.5, rgba(HUE.cobalt, 0.07 * fade));
    g.addColorStop(1, rgba(HUE.cobalt, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 140, 0, 280, frame.h);
    ctx.restore();
  }

  let last = 0;
  let raf = 0;
  function loop(now) {
    if (!state.running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.t += dt;
    draw(dt);
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    state.running = false;
    cancelAnimationFrame(raf);
  }

  function resume() {
    if (state.disposed) return;
    if (!state.animate) {
      draw(0);
      return;
    }
    if (state.running) return;
    state.running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function resize() {
    if (state.disposed) return;
    if (fit() && !state.running) draw(0);
  }

  const tiltHost = host ?? canvas;
  function onPointerMove(event) {
    const rect = tiltHost.getBoundingClientRect();
    state.pxTarget = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    state.pyTarget = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
  }
  function onPointerLeave() {
    state.pxTarget = 0;
    state.pyTarget = 0;
  }

  const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  resizeObserver?.observe(canvas);
  if (state.animate) {
    tiltHost.addEventListener("pointermove", onPointerMove);
    tiltHost.addEventListener("pointerleave", onPointerLeave);
  }
  fit();
  draw(0);

  return {
    pause,
    resume,
    /** -1 … 1 across the section's pass through the viewport. */
    setScroll(value) {
      state.scrollTarget = state.animate ? clamp(value, -1, 1) : 0;
    },
    /** Restart the story from its first step (first time it is seen). */
    restart() {
      state.t = 0;
    },
    setMotionEnabled(enabled) {
      state.animate = Boolean(enabled);
      if (state.animate) resume();
      else {
        pause();
        state.scrollTarget = 0;
        state.pxTarget = 0;
        state.pyTarget = 0;
        draw(0);
      }
    },
    /** Test hook: draw the story at a given loop time. */
    seek(local) {
      state.t = local;
      draw(0);
    },
    dispose() {
      if (state.disposed) return;
      state.disposed = true;
      pause();
      resizeObserver?.disconnect();
      tiltHost.removeEventListener("pointermove", onPointerMove);
      tiltHost.removeEventListener("pointerleave", onPointerLeave);
    },
  };
}
