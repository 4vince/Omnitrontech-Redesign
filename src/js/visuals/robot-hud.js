/**
 * "AI view" heads-up display drawn on a 2D canvas.
 *
 * Used as the texture on the robot's visor (robot-scene.js) and, when WebGL
 * is unavailable, mounted directly as the hero visual. It shows the AI at
 * work: three incoming tasks are read, routed through the AI node and land
 * as finished outcomes, on a loop.
 *
 * Layout notes: at the start of the homepage hero the camera sits so close
 * that only the middle ~58% of the canvas width is on screen, so everything
 * that must be read lives in that centre band. The top-centre strip is kept
 * clear for the page headline, which sits over the lens at that moment.
 */

export const HUD_W = 2048;
export const HUD_H = 768;

const C = {
  bg: "#f3f5fc",
  bgEdge: "#e6eaf7",
  dot: "rgba(43, 70, 214, 0.16)",
  ink: "#17191f",
  muted: "#4e535d",
  faint: "#8a92a3",
  line: "rgba(23, 25, 31, 0.16)",
  blue: "#2b46d6",
  blueTint: "#e4e9fb",
  green: "#1d8a5f",
  greenTint: "#dff1e8",
  card: "#ffffff",
};

const FONT = {
  mono: '"JetBrains Mono Variable", ui-monospace, monospace',
  body: '"Manrope Variable", Arial, sans-serif',
  display: '"Archivo Variable", Arial, sans-serif',
};

const TASKS = [
  { input: "Email thread", inputMeta: "Client asks for an update", output: "Reply drafted", icon: "mail" },
  { input: "Invoice", inputMeta: "S$4,280 · Supplier #118", output: "Invoice checked", icon: "file" },
  { input: "Spreadsheet", inputMeta: "Weekly numbers", output: "Report drafted", icon: "table" },
];

const CYCLE = 3.4; // seconds per task

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t);
const smooth = (a, b, v) => ease(clamp01((v - a) / (b - a)));

/* ~180ms state blends at 3.4s per task. */
const BLEND = 0.053;

/* Colours as [r, g, b, a] for blending between card states. */
const RGB = {
  card: [255, 255, 255, 1],
  blueTint: [228, 233, 251, 1],
  greenTint: [223, 241, 232, 1],
  line: [23, 25, 31, 0.16],
  blue: [43, 70, 214, 1],
  blueFaint: [43, 70, 214, 0.25],
  green: [29, 138, 95, 1],
  greenLine: [29, 138, 95, 0.45],
  muted: [78, 83, 93, 1],
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgba = ([r, g, b, a]) => `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a.toFixed(3)})`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function icon(ctx, kind, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (kind === "mail") {
    ctx.rect(-15, -11, 30, 22);
    ctx.moveTo(-15, -11);
    ctx.lineTo(0, 2);
    ctx.lineTo(15, -11);
  } else if (kind === "file") {
    ctx.moveTo(-11, -15);
    ctx.lineTo(5, -15);
    ctx.lineTo(12, -8);
    ctx.lineTo(12, 15);
    ctx.lineTo(-11, 15);
    ctx.closePath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(6, 0);
    ctx.moveTo(-5, 7);
    ctx.lineTo(6, 7);
  } else if (kind === "table") {
    ctx.rect(-15, -11, 30, 22);
    ctx.moveTo(-15, -2);
    ctx.lineTo(15, -2);
    ctx.moveTo(-4, -11);
    ctx.lineTo(-4, 11);
  } else if (kind === "check") {
    ctx.moveTo(-9, 1);
    ctx.lineTo(-3, 8);
    ctx.lineTo(10, -7);
  }
  ctx.stroke();
  ctx.restore();
}

function bezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function link(from, to) {
  const dx = (to.x - from.x) * 0.5;
  return [from, { x: from.x + dx, y: from.y }, { x: to.x - dx, y: to.y }, to];
}

function strokeLink(ctx, pts, color, width, dash = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.bezierCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y);
  ctx.stroke();
  ctx.restore();
}

/*
 * `scale` raises the backing resolution without touching the layout: every
 * draw call below stays in HUD_W x HUD_H units. At p=0 the visor display
 * fills a desktop screen, so on high-density displays a 1x texture is
 * magnified and the type goes soft; robot-scene.js asks for 1.5x there.
 */
export function createHud({ scale = 1 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(HUD_W * scale);
  canvas.height = Math.round(HUD_H * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create the AI view display canvas.");
  ctx.scale(scale, scale);

  // Geometry of the flow, in canvas pixels.
  // At p=0 the display is "cover"-fitted to the viewport, so its top and
  // bottom bands sit under the fixed nav and the scroll caption. The flow is
  // lifted to keep its last row clear of the caption; the status row (see
  // statusBar) sits below the nav.
  const node = { x: HUD_W / 2, y: 518, r: 62 };
  const card = { w: 344, h: 86 };
  const inX = node.x - 170 - card.w;
  const outX = node.x + 170;
  const rowsY = [414, 518, 622];

  // Card copy is short by design, but never let it cross the card edge:
  // step the size down, then truncate with an ellipsis.
  function fitText(text, x, y, maxWidth, weight, size, family) {
    let px = size;
    ctx.font = `${weight} ${px}px ${family}`;
    while (ctx.measureText(text).width > maxWidth && px > size * 0.82) {
      px -= 1;
      ctx.font = `${weight} ${px}px ${family}`;
    }
    let out = text;
    if (ctx.measureText(out).width > maxWidth) {
      while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
      out = `${out.trimEnd()}…`;
    }
    ctx.fillText(out, x, y);
  }

  function background() {
    const g = ctx.createRadialGradient(HUD_W / 2, HUD_H / 2, 200, HUD_W / 2, HUD_H / 2, HUD_W * 0.62);
    g.addColorStop(0, C.bg);
    g.addColorStop(1, C.bgEdge);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, HUD_W, HUD_H);

    ctx.fillStyle = C.dot;
    for (let x = 24; x < HUD_W; x += 32) {
      for (let y = 24; y < HUD_H; y += 32) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }

    // corner brackets, framing the centre band seen at the start
    ctx.strokeStyle = C.blue;
    ctx.lineWidth = 4;
    const bx0 = HUD_W * 0.235;
    const bx1 = HUD_W * 0.765;
    const by0 = 118;
    const by1 = HUD_H - 96;
    const L = 40;
    [
      [bx0, by0, 1, 1],
      [bx1, by0, -1, 1],
      [bx0, by1, 1, -1],
      [bx1, by1, -1, -1],
    ].forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * L);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * L, y);
      ctx.stroke();
    });
  }

  // No counters here: the page promises "no invented numbers", so the bar
  // states the working arrangement instead of fake throughput. The dot is
  // steady; the task flow below is the only motion in the HUD.
  function statusBar() {
    const y = 150;
    const label = "AI PREPARES · YOU DECIDE";
    ctx.textBaseline = "middle";
    ctx.font = `500 22px ${FONT.mono}`;
    ctx.fillStyle = C.faint;
    ctx.textAlign = "left";
    ctx.fillText("AI VIEW", HUD_W * 0.235 + 56, y);
    ctx.textAlign = "right";
    ctx.fillStyle = C.blue;
    ctx.fillText(label, HUD_W * 0.765 - 56, y);
    const w = ctx.measureText(label).width;
    ctx.beginPath();
    ctx.arc(HUD_W * 0.765 - 56 - w - 18, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Static telemetry outside the centre band (seen once zoomed out). It is
  // context, not activity, so it does not move: the task flow is the motion.

  function sidePanels() {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `500 20px ${FONT.mono}`;
    ctx.fillStyle = C.faint;
    ctx.fillText("SOURCES", 120, 520);
    ["Inbox", "Accounts", "Drive"].forEach((label, i) => {
      const y = 560 + i * 52;
      ctx.fillStyle = C.muted;
      ctx.font = `600 24px ${FONT.body}`;
      ctx.fillText(label, 120, y);
      // A state, not a fake fill level.
      ctx.fillStyle = C.blue;
      ctx.beginPath();
      ctx.arc(126, y + 22, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `500 18px ${FONT.mono}`;
      ctx.fillText("CONNECTED", 142, y + 28);
    });

    const rx = HUD_W - 330;
    ctx.fillStyle = C.faint;
    ctx.font = `500 20px ${FONT.mono}`;
    ctx.fillText("DECISION", rx, 520);
    ctx.fillStyle = C.ink;
    ctx.font = `600 64px ${FONT.display}`;
    ctx.fillText("Yours", rx, 588);
    ctx.fillStyle = C.muted;
    ctx.font = `500 22px ${FONT.body}`;
    ctx.fillText("Every output waits", rx, 636);
    ctx.fillText("for a person.", rx, 666);
  }

  /*
   * Cards blend between states instead of snapping:
   *   active (0-1) → blue tint + blue border
   *   done   (0-1) → green tint + green border, check icon
   *   dim    (0-1) → faded "queued" look
   * Each blend runs over BLEND of the cycle (~180ms at 3.4s per task).
   */
  function taskCard(x, y, { title, meta, kind, active = 0, done = 0, dim = 0 }) {
    ctx.save();
    ctx.globalAlpha = 1 - 0.6 * dim;
    roundRect(ctx, x, y - card.h / 2, card.w, card.h, 18);
    ctx.fillStyle = rgba(mix(mix(RGB.card, RGB.blueTint, active), RGB.greenTint, done));
    ctx.fill();
    ctx.lineWidth = 2.5 + 1.5 * active * (1 - done);
    ctx.strokeStyle = rgba(mix(mix(RGB.line, RGB.blue, active), RGB.greenLine, done));
    ctx.stroke();

    icon(ctx, kind, x + 40, y, rgba(mix(mix(RGB.muted, RGB.blue, active), RGB.green, done)));

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const textMax = card.w - 74 - 22;
    ctx.fillStyle = C.ink;
    fitText(title, x + 74, y - 4, textMax, 600, 28, FONT.body);
    ctx.fillStyle = C.muted;
    fitText(meta, x + 74, y + 26, textMax, 500, 21, FONT.body);
    ctx.restore();
  }

  function draw(t) {
    const loop = Math.floor(t / CYCLE);
    const active = loop % TASKS.length;
    const prev = (active + TASKS.length - 1) % TASKS.length;
    const f = (t % CYCLE) / CYCLE;

    // Blend amounts (see taskCard).
    const enterNew = smooth(0, BLEND, f); // this cycle's task comes up
    const leavePrev = loop > 0 ? 1 - enterNew : 0; // the previous route fades
    const inHighlight = (i) => (i === active ? enterNew * (1 - smooth(0.43, 0.43 + BLEND, f)) : 0);
    const inLive = (i) => (i === active ? enterNew : i === prev ? leavePrev : 0);
    const outLive = (i) => (i === active ? smooth(0.5, 0.5 + BLEND, f) : i === prev ? leavePrev : 0);
    // Outputs go green as each task lands; when the loop starts over they
    // all fade back to queued together.
    const wrapFade = active === 0 && loop > 0 ? 1 - smooth(0, 0.08, f) : 0;
    const doneAt = (i) =>
      Math.max(i < active ? 1 : i === active ? smooth(0.85, 0.85 + BLEND, f) : 0, wrapFade);
    const sendingAt = (i) => (i === active ? smooth(0.55, 0.55 + BLEND, f) : 0);

    background();
    sidePanels();
    statusBar();

    const nodeLeft = { x: node.x - node.r, y: node.y };
    const nodeRight = { x: node.x + node.r, y: node.y };

    // Links: a dashed base, with the live route drawn over it and faded.
    TASKS.forEach((task, i) => {
      const inPts = link({ x: inX + card.w, y: rowsY[i] }, nodeLeft);
      const outPts = link(nodeRight, { x: outX, y: rowsY[i] });
      strokeLink(ctx, inPts, C.line, 2.5, [10, 10]);
      strokeLink(ctx, outPts, C.line, 2.5, [10, 10]);
      [
        [inPts, inLive(i)],
        [outPts, outLive(i)],
      ].forEach(([pts, amount]) => {
        if (amount < 0.01) return;
        ctx.save();
        ctx.globalAlpha = amount;
        strokeLink(ctx, pts, C.blue, 4);
        ctx.restore();
      });
    });

    // Cards
    TASKS.forEach((task, i) => {
      taskCard(inX, rowsY[i], { title: task.input, meta: task.inputMeta, kind: task.icon, active: inHighlight(i) });

      const done = doneAt(i);
      const sending = sendingAt(i) * (1 - done);
      taskCard(outX, rowsY[i], {
        title: task.output,
        meta: done > 0.5 ? "Ready · you decide" : sending > 0.5 ? "Preparing…" : "Queued",
        kind: done > 0.5 ? "check" : task.icon,
        active: sending,
        done,
        dim: 1 - Math.max(done, sending),
      });
    });

    // Packet travelling along the active route
    const inPts = link({ x: inX + card.w, y: rowsY[active] }, nodeLeft);
    const outPts = link(nodeRight, { x: outX, y: rowsY[active] });
    let packet = null;
    if (f < 0.42) packet = bezierPoint(...inPts, ease(clamp01(f / 0.42)));
    else if (f > 0.55 && f < 0.85) packet = bezierPoint(...outPts, ease(clamp01((f - 0.55) / 0.3)));
    if (packet) {
      ctx.fillStyle = "rgba(43,70,214,0.18)";
      ctx.beginPath();
      ctx.arc(packet.x, packet.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.blue;
      ctx.beginPath();
      ctx.arc(packet.x, packet.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // AI node: the ring lengthens and darkens while it decides, then eases back.
    const busy = smooth(0.38, 0.38 + BLEND, f) * (1 - smooth(0.6, 0.6 + BLEND, f));
    ctx.fillStyle = C.card;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.blue;
    ctx.stroke();
    ctx.strokeStyle = rgba(mix(RGB.blueFaint, RGB.blue, busy));
    ctx.beginPath();
    const spin = t * 3;
    ctx.arc(node.x, node.y, node.r + 18, spin, spin + Math.PI * (0.5 + 0.7 * busy));
    ctx.stroke();
    ctx.fillStyle = C.blue;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 40px ${FONT.display}`;
    ctx.fillText("AI", node.x, node.y + 2);
    ctx.font = `500 20px ${FONT.mono}`;
    ctx.fillStyle = C.muted;
    ctx.fillText(busy > 0.5 ? "ROUTING…" : "READY", node.x, node.y + node.r + 40);
  }

  return { canvas, draw };
}

/** Make sure the web fonts are ready before the first frame is drawn. */
export async function hudFontsReady() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load(`600 28px ${FONT.body}`),
      document.fonts.load(`500 22px ${FONT.mono}`),
      document.fonts.load(`600 40px ${FONT.display}`),
    ]);
  } catch {
    /* fall back to the stack's system fonts */
  }
}
