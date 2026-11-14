import { HUE, INK, FONT, easeOut, easeInOut, path, seg, trace, window01 } from "./holo-kit.js";

/**
 * Data & Reporting: one clean view that notices change.
 *
 * Orders, website and stock stream in, are cleaned and joined, and draw one
 * daily line. The usual range is learned around it as a band; a day that
 * breaks well above the band is marked, and an alert reaches the team the
 * same morning.
 *
 * Chart rules (dataviz): one series on one axis, a 2px line, recessive grid
 * and axis labels, text in ink rather than the series colour, and red only
 * for the out-of-range point, with an icon and a label beside it.
 */

export const story = {
  cycle: 15,
  marks: [0, 3.6, 7.2, 10.8],
};

const SOURCES = [
  { name: "Orders", icon: "ph-shopping-cart", hue: HUE.sky, y: 90 },
  { name: "Website", icon: "ph-globe", hue: HUE.lime, y: 260 },
  { name: "Stock", icon: "ph-package", hue: HUE.violet, y: 430 },
];
const SRC_W = 200;
const JOIN = [292, 260];
const CHART = { x: 350, y: 10, w: 690, h: 500 };
const PLOT = { x: 410, y: 96, w: 600, h: 330 };
const ALERT = { x: 1090, y: 40, w: 310, h: 190 };
const TEAM = [1130, 352];

// Four weeks of daily orders: a weekly rhythm with day-to-day noise, then
// one day well above anything usual.
const DAYS = 28;
const SPIKE = 25;
// A line chart reads change, so the axis starts near the data, not at zero.
const Y_MIN = 100;
const Y_MAX = 450;
const base = (i) => 220 + 32 * Math.sin((i * 2 * Math.PI) / 7 - 0.6);
const noise = [9, -14, 6, 17, -8, 3, -19, 12, -4, 15, -11, 7, -16, 5, 18, -6, 10, -13, 4, 14, -9, 8, -15, 11, -3, 0, -12, 6];
const VALUES = Array.from({ length: DAYS }, (_, i) => (i === SPIKE ? 402 : base(i) + noise[i]));
const BAND = 46;
const px = (i) => PLOT.x + (i / (DAYS - 1)) * PLOT.w;
const py = (v) => PLOT.y + PLOT.h - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT.h;

const BEFORE = path(VALUES.slice(0, SPIKE).map((v, i) => [px(i), py(v)]));
const AFTER = path(VALUES.slice(SPIKE - 1).map((v, i) => [px(i + SPIKE - 1), py(v)]));
const SPIKE_PT = [px(SPIKE), py(VALUES[SPIKE])];

const STREAMS = SOURCES.map((s) => trace([SRC_W, s.y], [JOIN[0] - 22, JOIN[1]], 0.5, 20));
const TO_CHART = path([
  [JOIN[0] + 22, JOIN[1]],
  [CHART.x, JOIN[1]],
]);
const TO_ALERT = path([
  [SPIKE_PT[0], SPIKE_PT[1] - 12],
  [SPIKE_PT[0], ALERT.y + 70 - 18],
  [SPIKE_PT[0] + 18, ALERT.y + 70],
  [ALERT.x, ALERT.y + 70],
]);
const TO_TEAM = path([
  [TEAM[0], ALERT.y + ALERT.h],
  [TEAM[0], TEAM[1] - 36],
]);

const ALERT_AT = 10.9;
const OUT = 14.2;

export function build(kit) {
  const { ctx } = kit;

  function sources(t, out) {
    SOURCES.forEach((s, i) => {
      const inn = easeOut(seg(t, 0.1 + i * 0.15, 0.55 + i * 0.15));
      kit.chip(SRC_W / 2 - (1 - inn) * 20, s.y, { icon: s.icon, title: s.name, sub: "Live feed", hue: s.hue, w: SRC_W, h: 62, a: inn * out });
      const stream = STREAMS[i];
      kit.beam(stream, HUE.cobalt, { a: 0.32, halo: 0.5, width: 1.3 });
      // A steady trickle: a packet every 1.2s per feed, offset per feed.
      if (kit.still) return;
      for (let k = 0; k < 12; k += 1) {
        const start = 0.4 + i * 0.35 + k * 1.2;
        const u = seg(t, start, start + 0.9);
        if (u > 0 && u < 1 && start < OUT) kit.packet(stream, easeInOut(u), s.hue, { size: 5.5, a: k === 0 ? 1 : 0.7 });
      }
    });
    kit.beam(TO_CHART, HUE.cobalt, { a: 0.5, halo: 0.6, width: 1.4 });
    kit.node(JOIN[0], JOIN[1], 22, HUE.cobalt, { icon: "ph-funnel-simple", iconSize: 20, lit: 0.6 });
    kit.text("Cleaned", JOIN[0], JOIN[1] + 40, { size: 13, weight: 560, color: INK.sub, align: "center" });
  }

  function chart(t, out) {
    kit.card(CHART.x, CHART.y, CHART.w, CHART.h, { title: "Daily orders, last 4 weeks", icon: "ph-chart-line", a: 1, strong: true });

    // Recessive grid and one y axis.
    [100, 200, 300, 400].forEach((v) => {
      const y = py(v);
      ctx.save();
      ctx.fillStyle = kit.rgba(HUE.cobalt, v === 100 ? 0.4 : 0.16);
      ctx.fillRect(PLOT.x, y, PLOT.w, 1);
      ctx.restore();
      kit.text(String(v), PLOT.x - 12, y, { size: 12.5, weight: 500, family: FONT.mono, color: INK.faint, align: "right" });
    });
    ["4 wks ago", "3 wks", "2 wks", "Last week"].forEach((label, w) => {
      kit.text(label, px(w * 7), PLOT.y + PLOT.h + 22, { size: 12.5, weight: 540, color: INK.faint, align: w === 0 ? "left" : "center" });
    });

    // Learned usual range: a band that grows out from the line.
    const learn = easeInOut(seg(t, 3.8, 5.4)) * out;
    if (learn > 0) {
      const top = [];
      const bottom = [];
      for (let i = 0; i < DAYS; i += 1) {
        top.push([px(i), py(base(i) + BAND * learn)]);
        bottom.push([px(i), py(base(i) - BAND * learn)]);
      }
      ctx.save();
      ctx.beginPath();
      top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let i = bottom.length - 1; i >= 0; i -= 1) ctx.lineTo(bottom[i][0], bottom[i][1]);
      ctx.closePath();
      ctx.fillStyle = kit.rgba(HUE.teal, 0.12 * learn);
      ctx.fill();
      ctx.restore();
      kit.beam(path(top), HUE.teal, { a: 0.6 * learn, width: 1, dash: [5, 6], halo: 0 });
      kit.beam(path(bottom), HUE.teal, { a: 0.6 * learn, width: 1, dash: [5, 6], halo: 0 });
      const la = seg(t, 5.0, 5.4) * out;
      kit.text("Usual range", px(2), py(base(2) + BAND) - 14, { size: 13, weight: 600, color: INK.sub, a: la });
    }

    // The line: four weeks drawn in, then the newest days.
    const draw1 = easeInOut(seg(t, 0.8, 3.3));
    kit.beam(BEFORE, HUE.cobalt, { a: out, width: 2, to: draw1, halo: 0.9 });
    if (draw1 > 0 && draw1 < 1) {
      const [hx, hy] = BEFORE.points[Math.min(BEFORE.points.length - 1, Math.floor(draw1 * (BEFORE.points.length - 1)))];
      kit.glow(hx, hy, 18, HUE.ice, 0.9);
    }
    const draw2 = easeOut(seg(t, 7.3, 8.1));
    if (draw2 > 0) kit.beam(AFTER, HUE.cobalt, { a: out, width: 2, to: draw2, halo: 0.9 });

    // The out-of-range day.
    const flag = seg(t, 7.85, 8.2) * out;
    if (flag > 0) {
      const pulse = kit.still ? 0 : (t * 0.9) % 1;
      kit.glow(SPIKE_PT[0], SPIKE_PT[1], 30, HUE.red, 0.7 * flag);
      ctx.save();
      ctx.globalAlpha = flag * (1 - pulse);
      ctx.strokeStyle = HUE.red;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(SPIKE_PT[0], SPIKE_PT[1], 8 + pulse * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = flag;
      ctx.fillStyle = HUE.red;
      ctx.beginPath();
      ctx.arc(SPIKE_PT[0], SPIKE_PT[1], 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0a1440";
      ctx.stroke();
      ctx.restore();
      const la = seg(t, 8.2, 8.6) * out;
      kit.icon("ph-warning", SPIKE_PT[0] - 150, SPIKE_PT[1] - 2, 17, HUE.red, la);
      kit.text("Well above usual", SPIKE_PT[0] - 134, SPIKE_PT[1] - 1, { size: 14, weight: 650, a: la });
    }
  }

  function alert(t, out) {
    kit.beam(TO_ALERT, HUE.cobalt, { a: 0.22, halo: 0.3, width: 1.2 });
    const u = seg(t, ALERT_AT, ALERT_AT + 0.7);
    if (u > 0) kit.beam(TO_ALERT, HUE.red, { a: 0.85 * out, width: 1.8, to: easeInOut(u) });
    if (u > 0 && u < 1) kit.packet(TO_ALERT, easeInOut(u), HUE.red);

    const a = easeOut(seg(t, ALERT_AT + 0.6, ALERT_AT + 1.0)) * out;
    const body = kit.card(ALERT.x, ALERT.y, ALERT.w, ALERT.h, { title: "Alert", icon: "ph-bell-ringing", hue: a > 0 ? HUE.red : HUE.cobalt, a: Math.max(0.45, a), strong: a > 0.5 });
    if (a > 0) {
      kit.text("Orders well above usual", ALERT.x + 18, body + 30, { size: 16, weight: 650, family: FONT.display, a, maxW: ALERT.w - 36 });
      kit.text("Tuesday, from 9:00", ALERT.x + 18, body + 56, { size: 14, weight: 540, color: INK.sub, a });
      kit.text("Check stock for best sellers", ALERT.x + 18, body + 82, { size: 14, weight: 540, color: INK.sub, a, maxW: ALERT.w - 36 });
    } else {
      kit.text("Watching for change", ALERT.x + 18, body + 30, { size: 14.5, weight: 540, color: INK.sub, a: 0.75 });
    }

    kit.beam(TO_TEAM, HUE.amber, { a: 0.3, halo: 0.5, width: 1.2 });
    const v = seg(t, 12.1, 12.7);
    if (v > 0) kit.beam(TO_TEAM, HUE.amber, { a: 0.85 * out, width: 1.8, to: easeInOut(v) });
    if (v > 0 && v < 1) kit.packet(TO_TEAM, easeInOut(v), HUE.amber);
    const told = window01(t, 12.6, OUT - 0.1, 0.35);
    kit.node(TEAM[0], TEAM[1], 36, HUE.amber, { icon: "ph-users-three", lit: 0.2 + told * 0.6, fill: 0.08 + told * 0.14, a: 0.55 + told * 0.45 });
    kit.chip(TEAM[0] + 160, TEAM[1], {
      title: "Ops team",
      sub: told > 0 ? "Told the same morning" : "Gets the alerts",
      hue: HUE.amber,
      w: 214,
      h: 60,
      a: 0.6 + told * 0.4,
      strong: told > 0.5,
    });
  }

  function draw(t) {
    const out = 1 - seg(t, OUT, OUT + 0.6);
    sources(t, out);
    chart(t, out);
    alert(t, out);
  }

  return {
    frame: { w: 1400, h: 520 },
    story,
    staticTime: 13.6,
    draw: (local) => draw(local),
  };
}
