import { clamp, easeInOut, easeOut, path, seg } from "./holo-kit.js";

/**
 * Homepage, "The business runs. You carry the gaps."
 *
 * A flat paper diagram (holo-kit, theme "paper") in four panels, one per gap,
 * read left to right. Each panel plays during its caption's step and then
 * holds its end state, so the last frame shows all four at once.
 *
 *   01  Work hides in the hand-offs   a request is copied from inbox to
 *                                     spreadsheet to someone's memory, and waits
 *   02  The tools don't talk          each tool holds one piece; the pieces
 *                                     are carried across by hand
 *   03  Every decision needs a person approvals and follow-ups pile up on one
 *                                     person
 *   04  The data is there, the signal isn't   the warning row sits in an
 *                                     export; the report lands after the decision
 *
 * Colour: ink and grey are manual work, amber a person or waiting, red the
 * missed signal (always with an icon and a label), cobalt the request.
 */

export const story = {
  cycle: 16,
  marks: [0, 4, 8, 12],
};

const STEP = 4;
const PANEL = { y: 30, w: 320, h: 470, gap: 40 };
const panelX = (i) => i * (PANEL.w + PANEL.gap);
const cx = (i) => panelX(i) + PANEL.w / 2;

// Panel 2: four tools, each holding one piece of the answer.
const TOOLS = [
  { name: "CRM", icon: "ph-address-book", piece: "sky" },
  { name: "Inbox", icon: "ph-envelope-simple", piece: "coral" },
  { name: "Finance", icon: "ph-receipt", piece: "lime" },
  { name: "Files", icon: "ph-folder-simple", piece: "violet" },
];
const TILE = { w: 104, h: 84 };
const toolAt = (k) => [cx(1) + (k % 2 === 0 ? -72 : 72), 140 + Math.floor(k / 2) * 124];
const ANSWER = { x: cx(1) - 122, y: 352, w: 244, h: 112 };
const slotAt = (k) => [ANSWER.x + 34 + k * 59, ANSWER.y + 74];

// Panel 3: the queue that lands on one person.
const QUEUE = [
  { label: "Approve quote", icon: "ph-seal-check" },
  { label: "Follow up", icon: "ph-arrow-bend-up-right" },
  { label: "Weekly report", icon: "ph-file-text" },
  { label: "Approve refund", icon: "ph-seal-check" },
  { label: "Chase invoice", icon: "ph-receipt" },
  { label: "Follow up", icon: "ph-arrow-bend-up-right" },
];
const PERSON_Y = 448;
const slotY = (k) => 372 - k * 50;

// Panel 4: an export with one row that mattered.
const ROWS = [0.72, 0.5, 0.86, 0.62, 0.78, 0.56, 0.9];
const SIGNAL = 4;
const EXPORT_H = 292;

export function build(kit) {
  const { ctx, HUE, INK, FONT } = kit;

  /* ── shared pieces ── */

  function panel(i, active) {
    const x = panelX(i);
    kit.box(x, PANEL.y, PANEL.w, PANEL.h, active ? HUE.cobalt : HUE.ice, {
      r: 16,
      face: true,
      width: active ? 1.8 : 1.2,
      a: active ? 0.9 : 0.55,
    });
    kit.text(`0${i + 1}`, x + 22, PANEL.y + 30, {
      size: 14,
      weight: 600,
      family: FONT.mono,
      color: active ? HUE.cobalt : INK.faint,
    });
  }

  /** A small rounded tile with an icon and a label under it. */
  function tile(x, y, w, h, { icon, label, hue = HUE.ice, a = 1, lit = false }) {
    kit.box(x - w / 2, y - h / 2, w, h, lit ? hue : HUE.ice, { r: 12, face: true, a, width: lit ? 1.6 : 1.2, fill: lit ? 0.06 : 0 });
    kit.icon(icon, x, y - 12, 24, lit ? hue : INK.sub, a);
    kit.text(label, x, y + 20, { size: 15, weight: 620, align: "center", color: INK.text, a });
  }

  function dashed(x1, y1, x2, y2, { color = INK.faint, a = 1, width = 1.5 } = {}) {
    ctx.save();
    ctx.globalAlpha = clamp(a);
    ctx.setLineDash([5, 6]);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function rect(x, y, w, h, color, { a = 1, r = 4 } = {}) {
    ctx.save();
    ctx.globalAlpha = clamp(a);
    kit.roundRect(x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  /** The request: a cobalt envelope in a disc. */
  function request(x, y, a = 1) {
    if (a <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.fillStyle = HUE.cobalt;
    ctx.fill();
    ctx.restore();
    kit.icon("ph-envelope-simple", x, y, 19, "#ffffff", a);
  }

  /* ── 01 Work hides in the hand-offs ── */
  const HAND = {
    inbox: [cx(0), 136],
    sheet: [cx(0), 250],
    note: [cx(0), 364],
  };
  const LEG1 = path([[HAND.inbox[0], HAND.inbox[1] + 32], [HAND.sheet[0], HAND.sheet[1] - 32]]);
  const LEG2 = path([[HAND.sheet[0], HAND.sheet[1] + 32], [HAND.note[0], HAND.note[1] - 36]]);

  function handoffs(u, out) {
    const pre = u === null;
    const t = pre ? 0 : u;
    kit.chip(HAND.inbox[0], HAND.inbox[1], { icon: "ph-envelope-simple", title: "Inbox", sub: "New request", hue: HUE.ice, w: 250, h: 64 });
    kit.chip(HAND.sheet[0], HAND.sheet[1], { icon: "ph-table", title: "Spreadsheet", sub: "Copied by hand", hue: HUE.ice, w: 250, h: 64 });
    // Someone's memory: a sticky note, slightly askew.
    ctx.save();
    ctx.translate(HAND.note[0], HAND.note[1]);
    ctx.rotate(-0.035);
    rect(-118, -36, 236, 72, "#fff3c4", { r: 6 });
    ctx.restore();
    kit.icon("ph-note", HAND.note[0] - 94, HAND.note[1], 22, "#8a6a12");
    kit.text("Someone's memory", HAND.note[0] - 74, HAND.note[1] + 1, { size: 16, weight: 620, color: "#5a4508", maxW: 176 });

    dashed(LEG1.points[0][0], LEG1.points[0][1], LEG1.points[1][0], LEG1.points[1][1]);
    dashed(LEG2.points[0][0], LEG2.points[0][1], LEG2.points[1][0], LEG2.points[1][1]);

    // The request: arrives, is copied down, and stops on the note.
    const arrive = easeOut(seg(t, 0.2, 0.7));
    const l1 = easeInOut(seg(t, 0.9, 1.6));
    const l2 = easeInOut(seg(t, 1.9, 2.6));
    let rx = HAND.inbox[0] + 98;
    let ry = HAND.inbox[1] - 22;
    if (l2 > 0) [rx, ry] = [HAND.note[0] + 112, HAND.note[1] - 36 + (1 - l2) * -78];
    else if (l1 > 0) [rx, ry] = [HAND.sheet[0] + 98, HAND.sheet[1] - 22 - (1 - l1) * 114];
    if (!pre) request(rx, ry - (1 - arrive) * 24, arrive * out);

    // Then it waits: a clock ring fills.
    const wait = seg(t, 2.7, 3.7);
    const wy = 456;
    const wx = panelX(0) + 52;
    ctx.save();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "rgba(23, 25, 31, 0.12)";
    ctx.beginPath();
    ctx.arc(wx, wy, 15, 0, Math.PI * 2);
    ctx.stroke();
    if (!pre && wait > 0) {
      ctx.globalAlpha = out;
      ctx.strokeStyle = HUE.amber;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(wx, wy, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * wait);
      ctx.stroke();
    }
    ctx.restore();
    const days = pre ? 0 : Math.round(wait * 3);
    kit.text(pre ? "Waiting" : `Waiting · ${days} day${days === 1 ? "" : "s"}`, wx + 28, wy + 1, {
      size: 16,
      weight: 650,
      color: !pre && wait > 0 ? HUE.amber : INK.faint,
    });
  }

  /* ── 02 The tools don't talk ── */
  function tools(u, out) {
    const pre = u === null;
    const t = pre ? 0 : u;
    // Broken links: dashed, with a gap in the middle.
    const [a, b, c, d] = [0, 1, 2, 3].map(toolAt);
    const broken = (p, q) => {
      const mx = (p[0] + q[0]) / 2;
      const my = (p[1] + q[1]) / 2;
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      // Half-length of the visible link: from tile edge to tile edge.
      const reach = (Math.abs(ux) > 0.5 ? (len - TILE.w) : (len - TILE.h)) / 2;
      dashed(mx - ux * reach, my - uy * reach, mx - ux * 9, my - uy * 9, { width: 1.6 });
      dashed(mx + ux * 9, my + uy * 9, mx + ux * reach, my + uy * reach, { width: 1.6 });
      kit.icon("ph-x", mx, my, 13, INK.faint);
    };
    broken(a, b);
    broken(c, d);
    broken(a, c);
    broken(b, d);

    TOOLS.forEach((tool, k) => {
      const [x, y] = toolAt(k);
      tile(x, y, TILE.w, TILE.h, { icon: tool.icon, label: tool.name });
      // Its piece of the answer, until it is carried away.
      const taken = !pre && t > 0.55 + k * 0.78;
      if (!taken || out < 1) rect(x + TILE.w / 2 - 24, y - TILE.h / 2 + 10, 14, 14, HUE[tool.piece], { a: taken ? 1 - out : 1 });
    });

    // The answer, assembled by hand.
    kit.box(ANSWER.x, ANSWER.y, ANSWER.w, ANSWER.h, HUE.ice, { r: 12, face: true, width: 1.2 });
    kit.text("One answer", ANSWER.x + 18, ANSWER.y + 28, { size: 16, weight: 650, family: FONT.display });
    TOOLS.forEach((tool, k) => {
      const [sx, sy] = slotAt(k);
      const landed = !pre && t > 0.55 + k * 0.78 + 0.6;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = "rgba(23, 25, 31, 0.28)";
      kit.roundRect(sx - 22, sy - 14, 44, 28, 5);
      ctx.stroke();
      ctx.restore();
      if (landed) rect(sx - 20, sy - 12, 40, 24, HUE[tool.piece], { a: out });
    });

    // The cursor: one piece at a time.
    if (!pre) {
      for (let k = 0; k < TOOLS.length; k += 1) {
        const s = 0.55 + k * 0.78;
        const m = easeInOut(seg(t, s, s + 0.6));
        if (m <= 0 || m >= 1) continue;
        const [x0, y0] = toolAt(k);
        const from = [x0 + TILE.w / 2 - 17, y0 - TILE.h / 2 + 17];
        const to = slotAt(k);
        const x = from[0] + (to[0] - from[0]) * m;
        const y = from[1] + (to[1] - from[1]) * m;
        rect(x - 7, y - 7, 14, 14, HUE[TOOLS[k].piece], { a: out });
        kit.icon("ph-cursor", x + 12, y + 14, 24, INK.text, out);
      }
    }
    kit.text("Copied by hand", cx(1), ANSWER.y + ANSWER.h + 24, { size: 15, weight: 600, color: INK.sub, align: "center" });
  }

  /* ── 03 Every decision needs a person ── */
  function person(u, out) {
    const pre = u === null;
    const t = pre ? 0 : u;
    const landed = pre ? 0 : QUEUE.filter((_, k) => t > 0.3 + k * 0.5 + 0.45).length;
    QUEUE.forEach((item, k) => {
      const s = 0.3 + k * 0.5;
      const drop = pre ? 0 : easeOut(seg(t, s, s + 0.45));
      if (drop <= 0) {
        // Its slot, empty.
        ctx.save();
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(23, 25, 31, 0.14)";
        kit.roundRect(cx(2) - 112, slotY(k) - 19, 224, 38, 8);
        ctx.stroke();
        ctx.restore();
        return;
      }
      const y = slotY(k) - (1 - drop) * 60;
      const a = drop * out + (1 - out) * 0;
      kit.box(cx(2) - 112, y - 19, 224, 38, HUE.amber, { r: 8, face: true, width: 1.2, a: Math.max(a, 0.001), fill: 0.04 });
      kit.icon(item.icon, cx(2) - 88, y, 19, HUE.amber, a);
      kit.text(item.label, cx(2) - 68, y + 1, { size: 15, weight: 620, a });
    });
    // The one person it all waits on. Strained while the pile grows.
    const strain = pre ? 0 : (0.5 + 0.5 * Math.sin(t * 6)) * seg(t, 1.5, 2.2) * out;
    kit.chip(cx(2), PERSON_Y, {
      icon: "ph-user",
      title: "Ops lead",
      sub: landed ? `${landed} waiting on them` : "Signs off the work",
      hue: HUE.amber,
      w: 262,
      h: 70,
      strong: strain > 0.5,
    });
  }

  /* ── 04 The data is there. The signal isn't. ── */
  function signal(u, out) {
    const pre = u === null;
    const t = pre ? 0 : u;
    const x0 = panelX(3) + 22;
    const top = 70;
    const body = kit.card(x0, top, PANEL.w - 44, EXPORT_H, { title: "Orders export.csv", icon: "ph-file-csv", hue: HUE.ice });
    const found = pre ? 0 : seg(t, 0.9, 1.3) * out;
    ROWS.forEach((w, k) => {
      const y = body + 18 + k * 22;
      const isSignal = k === SIGNAL;
      const appear = pre ? 1 : seg(t, 0.1 + k * 0.06, 0.3 + k * 0.06);
      rect(x0 + 18, y, (PANEL.w - 80) * w, 10, isSignal && found > 0 ? HUE.red : "rgba(23, 25, 31, 0.14)", {
        a: isSignal && found > 0 ? 0.25 + 0.75 * found : appear,
        r: 3,
      });
    });
    if (found > 0) {
      const y = body + 18 + SIGNAL * 22 + 5;
      kit.icon("ph-warning", x0 + PANEL.w - 64, y, 18, HUE.red, found);
    }
    kit.text("Missed signal", x0 + 18, top + EXPORT_H - 24, {
      size: 15,
      weight: 650,
      color: found > 0 ? HUE.red : INK.faint,
      a: pre ? 0.9 : 0.6 + 0.4 * found,
    });

    // The calendar: the decision is made Monday, the report arrives Friday.
    const dayW = 124;
    const dy = 410;
    const decided = pre ? 0 : seg(t, 1.6, 2.0) * out;
    const late = pre ? 0 : easeOut(seg(t, 2.3, 2.9)) * out;
    const day = (x, label, sub, color, a, icon) => {
      kit.box(x, dy - 40, dayW, 80, color, { r: 12, face: true, width: 1.3, a: Math.max(0.45, a) });
      kit.text(label, x + 16, dy - 14, { size: 14, weight: 600, family: FONT.mono, color: INK.sub });
      kit.text(sub, x + 16, dy + 14, { size: 16, weight: 650, color: a > 0.2 ? INK.text : INK.faint });
      if (icon && a > 0) kit.icon(icon, x + dayW - 22, dy - 15, 18, color, a);
    };
    day(x0, "MON", "Decision", decided > 0 ? INK.text : HUE.ice, decided, "ph-check");
    day(x0 + PANEL.w - 44 - dayW, "FRI", "Report", late > 0 ? HUE.red : HUE.ice, late, "ph-clock-countdown");
    kit.text("Lands after the decision", cx(3), dy + 62, {
      size: 15,
      weight: 620,
      align: "center",
      color: late > 0 ? INK.text : INK.faint,
    });
  }

  const ZONES = [handoffs, tools, person, signal];

  function draw(t) {
    // The last moments fade the moving parts back to rest before the loop.
    const out = 1 - seg(t, story.cycle - 0.8, story.cycle - 0.1);
    ZONES.forEach((zone, i) => {
      const start = story.marks[i];
      const active = t >= start && t < start + STEP;
      panel(i, active);
      zone(t >= start ? Math.min(t - start, STEP) : null, out);
    });
  }

  return {
    frame: { w: 4 * PANEL.w + 3 * PANEL.gap, h: 530 },
    story,
    // All four panels at their end state.
    staticTime: 15.0,
    draw: (local) => draw(local),
  };
}
