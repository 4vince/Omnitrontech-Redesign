import { HUE, INK, FONT, easeOut, easeInOut, path, seg, trace, window01 } from "./holo-kit.js";

/**
 * Customer Support: one assistant answering every channel.
 *
 * Questions come in from chat, email, phone and the website. The assistant
 * answers from the business's own help content (the page it used lights
 * up and is cited). A sensitive billing case goes to a person with the
 * whole chat attached; routine questions are answered and closed.
 */

export const story = {
  cycle: 15,
  marks: [0, 3.4, 6.8, 10.4],
};

const CHANNELS = [
  { name: "Chat", icon: "ph-chat-circle-dots", hue: HUE.sky, q: "Where's my order?", y: 90 },
  { name: "Email", icon: "ph-envelope-simple", hue: HUE.coral, q: "Change my address", y: 240 },
  { name: "Phone", icon: "ph-phone", hue: HUE.lime, q: "Are you open Sunday?", y: 390 },
  { name: "Website", icon: "ph-globe", hue: HUE.rose, q: "I was charged twice", y: 540 },
];
const CH_W = 340;
const AI = [610, 330];
const AI_R = 48;
const PAGES = [
  { name: "Delivery", icon: "ph-truck", x: 492 },
  { name: "Returns", icon: "ph-arrow-u-up-left", x: 610 },
  { name: "Accounts", icon: "ph-user-circle", x: 728 },
];
const PAGE_Y = 126;
const THREAD = { x: 890, y: 24, w: 600, h: 420 };
const PERSON = [1150, 580];

const IN = CHANNELS.map((c) => trace([CH_W, c.y], [AI[0] - AI_R, AI[1]], 0.5, 22));
// Each help page drops a line down into the assistant.
const PAGE_LINES = PAGES.map(({ x }) => {
  const top = PAGE_Y + 40;
  const bottom = AI[1] - AI_R;
  if (x === AI[0]) return path([[x, top], [x, bottom]]);
  const mid = (top + bottom) / 2;
  const dir = Math.sign(AI[0] - x);
  return path([[x, top], [x, mid - 14], [x + dir * 14, mid], [AI[0] - dir * 14, mid], [AI[0], mid + 14], [AI[0], bottom]]);
});
const TO_THREAD = path([
  [AI[0] + AI_R, AI[1]],
  [THREAD.x, AI[1]],
]);
const TO_PERSON = path([
  [AI[0] + AI_R, AI[1]],
  [780, AI[1]],
  [780, PERSON[1] - 22],
  [802, PERSON[1]],
  [PERSON[0] - 38, PERSON[1]],
]);

// When each channel's question reaches the assistant.
const ARRIVE = [1.0, 1.45, 1.9, 2.35];
const ARRIVE_DUR = 1.0;
// Page lookups: which page lights, and when.
const LOOKUPS = [
  { page: 0, at: 3.9 },
  { page: 2, at: 10.6 },
  { page: 0, at: 11.2 },
];
// Routine questions answered and closed in the last step.
const CLOSED = [
  { ch: 1, at: 11.0 },
  { ch: 2, at: 11.6 },
  { ch: 0, at: 10.6 },
];
const HANDOFF = 7.9;
const OUT = 14.2;

export function build(kit) {
  const { ctx } = kit;

  function bubble(x, y, w, text, hue, a, { align = "left", sub = null, subHue = INK.sub } = {}) {
    if (a <= 0.001) return;
    const h = sub ? 68 : 46;
    const left = align === "left" ? x : x - w;
    const rise = (1 - a) * 10;
    ctx.save();
    ctx.globalAlpha = a;
    kit.roundRect(left, y + rise, w, h, 12);
    ctx.fillStyle = INK.panel;
    ctx.fill();
    ctx.fillStyle = kit.rgba(hue, 0.12);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = kit.rgba(hue, 0.6);
    ctx.stroke();
    ctx.restore();
    kit.text(text, left + 16, y + rise + 23, { size: 17, weight: 580, a, maxW: w - 32 });
    if (sub) kit.text(sub, left + 16, y + rise + 48, { size: 14.5, weight: 620, color: subHue, a, maxW: w - 32 });
  }

  function channels(t, out) {
    CHANNELS.forEach((c, i) => {
      const inn = easeOut(seg(t, 0.1 + i * 0.15, 0.55 + i * 0.15));
      const closed = CLOSED.find((x) => x.ch === i);
      const isClosed = closed && t >= closed.at;
      const sensitive = i === 3 && t >= 7.5;
      kit.chip(CH_W / 2 - (1 - inn) * 24, c.y, {
        icon: c.icon,
        title: c.name,
        sub: isClosed ? "Answered" : c.q,
        hue: c.hue,
        w: CH_W,
        h: 88,
        trail: 30,
        a: inn * out,
        strong: sensitive && t < OUT,
      });
      if (isClosed) kit.check(CH_W - 26, c.y, 15, HUE.teal, seg(t, closed.at, closed.at + 0.35), out);
      if (sensitive) kit.icon("ph-warning-circle", CH_W - 26, c.y, 21, HUE.amber, seg(t, 7.5, 7.8) * out);

      // The question running in to the assistant.
      kit.beam(IN[i], HUE.cobalt, { a: 0.32, halo: 0.5, width: 1.3 });
      const u = seg(t, ARRIVE[i], ARRIVE[i] + ARRIVE_DUR);
      const lit = 1 - seg(t, ARRIVE[i] + ARRIVE_DUR, ARRIVE[i] + ARRIVE_DUR + 0.8);
      if (u > 0 && lit > 0) kit.beam(IN[i], c.hue, { a: 0.85 * lit, width: 1.8, to: easeInOut(u) });
      if (u > 0 && u < 1) kit.packet(IN[i], easeInOut(u), c.hue);
    });
  }

  function library(t, out) {
    kit.card(PAGES[0].x - 92, 14, PAGES[2].x - PAGES[0].x + 184, 170, { title: "Your help content", icon: "ph-books", a: 1 });
    PAGES.forEach((page, i) => {
      const used = Math.max(0, ...LOOKUPS.filter((l) => l.page === i).map((l) => window01(t, l.at, l.at + 1.3, 0.25)));
      kit.box(page.x - 52, PAGE_Y - 34, 104, 74, used > 0.1 ? HUE.ice : HUE.cobalt, { a: 0.6 + used * 0.4, r: 10, fill: 0.05 + used * 0.12, face: true, halo: used });
      kit.icon(page.icon, page.x, PAGE_Y - 9, 23, used > 0.1 ? HUE.ice : HUE.cobalt, 0.85 + used * 0.15);
      kit.text(page.name, page.x, PAGE_Y + 21, { size: 15.5, weight: 620, align: "center", color: used > 0.1 ? INK.text : INK.sub, maxW: 96 });
      const line = PAGE_LINES[i];
      kit.beam(line, HUE.cobalt, { a: 0.26, halo: 0.4, width: 1.2 });
      LOOKUPS.filter((l) => l.page === i).forEach((l) => {
        const u = seg(t, l.at + 0.2, l.at + 0.85);
        const fade = 1 - seg(t, l.at + 0.85, l.at + 1.6);
        if (u > 0 && fade > 0) kit.beam(line, HUE.ice, { a: 0.8 * fade * out, width: 1.6, to: easeInOut(u) });
        if (u > 0 && u < 1) kit.packet(line, easeInOut(u), HUE.ice, { size: 6 });
      });
    });
  }

  function assistant(t) {
    const busy = Math.max(window01(t, 1.9, 3.5, 0.3), window01(t, 3.8, 5.2, 0.3), window01(t, 7.1, 8.0, 0.2), window01(t, 10.5, 11.9, 0.3));
    kit.node(AI[0], AI[1], AI_R, HUE.cobalt, { icon: "ph-chats-circle", iconSize: 34, lit: 0.55 + busy * 0.4, fill: 0.12 + busy * 0.1 });
    kit.spinner(AI[0], AI[1], AI_R + 9, HUE.ice, t, { a: busy * 0.8 });
    kit.text("Assistant", AI[0], AI[1] + AI_R + 28, { size: 17.5, weight: 620, color: INK.sub, align: "center" });
  }

  function thread(t, out) {
    const { x, y, w, h } = THREAD;
    const handed = seg(t, HANDOFF + 1.0, HANDOFF + 1.4);
    kit.beam(TO_THREAD, HUE.cobalt, { a: 0.32, halo: 0.5, width: 1.3 });
    const body = kit.card(x, y, w, h, { title: "Conversation", icon: "ph-chat-text", a: 1, hue: handed > 0.5 && t < OUT ? HUE.amber : HUE.cobalt, strong: true });

    const fade = out;
    const left = x + 18;
    const right = x + w - 18;
    bubble(left, body + 16, 290, "Where's my order #2291?", HUE.sky, easeOut(seg(t, 3.5, 3.9)) * fade);
    bubble(right, body + 76, 470, "It left our depot today and arrives Thursday.", HUE.cobalt, easeOut(seg(t, 5.0, 5.4)) * fade, {
      align: "right",
      sub: "From: Delivery times",
      subHue: HUE.cobalt,
    });
    const resolved = easeOut(seg(t, 10.6, 11.0)) * fade;
    if (resolved > 0) {
      const labelW = kit.text("Resolved", right, body + 170, { size: 15.5, weight: 650, color: HUE.teal, align: "right", a: resolved });
      kit.check(right - labelW - 16, body + 170, 13, HUE.teal, seg(t, 10.6, 10.95), resolved);
    }
    bubble(left, body + 196, 400, "I was charged twice. Please cancel.", HUE.rose, easeOut(seg(t, 7.0, 7.4)) * fade, {
      sub: "Sensitive: billing",
      subHue: HUE.amber,
    });
    const note = easeOut(seg(t, HANDOFF + 1.0, HANDOFF + 1.4)) * fade;
    if (note > 0) {
      kit.icon("ph-user-switch", left + 13, body + 308, 21, HUE.amber, note);
      kit.text("Handed to Sam, with the whole chat", left + 36, body + 308, { size: 17, weight: 620, color: HUE.amber, a: note });
    }
  }

  function person(t, out) {
    kit.beam(TO_PERSON, HUE.amber, { a: 0.3, halo: 0.5, width: 1.2, from: 0.15 });
    const u = seg(t, HANDOFF, HANDOFF + 1.0);
    if (u > 0 && u < 1) {
      kit.packet(TO_PERSON, easeInOut(u), HUE.amber);
    }
    const called = window01(t, HANDOFF + 0.9, OUT - 0.2, 0.35);
    if (u > 0) kit.beam(TO_PERSON, HUE.amber, { a: 0.85 * (u < 1 ? 1 : called) * out, width: 1.8, to: easeInOut(u) });
    kit.node(PERSON[0], PERSON[1], 36, HUE.amber, { icon: "ph-user", lit: 0.2 + called * 0.6, fill: 0.08 + called * 0.14, a: 0.55 + called * 0.45 });
    kit.chip(PERSON[0] + 192, PERSON[1], {
      title: "Sam, support",
      sub: called > 0 ? "Has the full chat" : "Takes sensitive cases",
      hue: HUE.amber,
      w: 304,
      h: 86,
      a: 0.6 + called * 0.4,
      strong: called > 0.5,
    });
  }

  function draw(t) {
    const out = 1 - seg(t, OUT, OUT + 0.6);
    library(t, out);
    person(t, out);
    channels(t, out);
    thread(t, out);
    assistant(t);
  }

  return {
    frame: { w: 1500, h: 640 },
    story,
    staticTime: 12.6,
    draw: (local) => draw(local),
  };
}
