import { HEX, chip, easeBack, easeInOut, easeOut, pastel, seg } from "./kit.js";

/**
 * Customer Support: one desk for every channel.
 *
 * Questions arrive from WhatsApp, email and web chat and fly to an
 * assistant that sits on a stack of your own help content. Routine
 * questions come back answered; a sensitive one is passed to a person,
 * with the full conversation clipped to it.
 */

const CHANNELS = [
  { name: "WhatsApp", icon: "ph-whatsapp-logo", hue: "green", x: -4.3, z: -1.7 },
  { name: "Email", icon: "ph-envelope-simple", hue: "sky", x: -4.5, z: 0.1 },
  { name: "Web chat", icon: "ph-chat-circle-dots", hue: "coral", x: -4.3, z: 1.9 },
];

const HUB = { x: -0.4, z: 0 };
const ANSWERED = { x: 3.6, z: -1.5 };
const TEAM = { x: 3.4, z: 1.75 };

// Questions in one loop: which channel, when it is sent, and whether it is
// routine (answered) or sensitive (passed to a person).
const QUESTIONS = [
  { text: "Where is my order?", channel: 0, at: 0.4, routine: true },
  { text: "Change my booking", channel: 2, at: 1.5, routine: true },
  { text: "Opening hours?", channel: 1, at: 2.6, routine: true },
  { text: "I was charged twice", channel: 1, at: 7.2, routine: false },
  { text: "Reset my password", channel: 0, at: 9.0, routine: true },
];

const KNOWLEDGE = [
  { name: "Help articles", icon: "ph-book-open", hue: "lime" },
  { name: "Policies", icon: "ph-shield-check", hue: "rose" },
  { name: "Account history", icon: "ph-clock-counter-clockwise", hue: "cobalt" },
];

export const story = {
  cycle: 15,
  marks: [0, 3.4, 6.8, 10.4],
};

export function build(kit) {
  const { THREE, root, box, card, line, faceCamera, mat } = kit;

  /* Channels: upright source cards on short stands */
  const channels = CHANNELS.map((c) => {
    const stand = box(0.9, 0.3, 0.9, pastel(c.hue, 0.5), 0.06);
    stand.position.set(c.x, 0.15, c.z);
    const label = card({ w: 1.95, h: 0.56, paint: chip({ icon: c.icon, title: c.name, hue: c.hue, solid: true }) });
    label.group.position.set(c.x, 0.85, c.z);
    root.add(stand, label.group);
    return { ...c, label };
  });

  /* The assistant on its knowledge stack */
  const stack = KNOWLEDGE.map((k, i) => {
    const slab = box(2.6 - i * 0.25, 0.3, 1.9 - i * 0.18, pastel(k.hue, 0.6), 0.06);
    slab.position.set(HUB.x, 0.15 + i * 0.34, HUB.z);
    root.add(slab);
    const label = card({ w: 2.1, h: 0.5, paint: chip({ icon: k.icon, title: k.name, hue: k.hue }) });
    root.add(label.group);
    return { slab, label, ...k };
  });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.34, 48), mat(HEX.blue, { roughness: 0.4 }));
  core.castShadow = true;
  kit.outline(core);
  core.position.set(HUB.x, 1.2, HUB.z);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.025, 10, 80),
    new THREE.MeshBasicMaterial({ color: HEX.blue, transparent: true, opacity: 0.5, toneMapped: false }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(HUB.x, 1.2, HUB.z);
  const hubLabel = card({ w: 2.0, h: 0.56, paint: chip({ icon: "ph-headset", title: "Assistant", tone: "blue" }) });
  hubLabel.group.position.set(HUB.x, 1.95, HUB.z);
  root.add(core, ring, hubLabel.group);

  /* Outcomes: an answered tray and the service team's desk */
  const tray = box(1.8, 0.16, 1.4, pastel("teal", 0.55), 0.06);
  tray.position.set(ANSWERED.x, 0.08, ANSWERED.z);
  const trayLabel = card({ w: 1.9, h: 0.56, paint: chip({ icon: "ph-check", title: "Answered", tone: "success" }) });
  trayLabel.group.position.set(ANSWERED.x, 1.75, ANSWERED.z - 0.2);
  const desk = box(1.8, 0.5, 0.95, pastel("amber", 0.55), 0.08);
  desk.position.set(TEAM.x, 0.25, TEAM.z);
  const team = card({ w: 2.3, h: 0.66, paint: chip({ icon: "ph-user", title: "Service team", sub: "Sensitive cases", tone: "person" }) });
  team.group.position.set(TEAM.x, 1.1, TEAM.z);
  root.add(tray, trayLabel.group, desk, team.group);

  /* Question / answer bubbles */
  const bubbles = QUESTIONS.map((q) => {
    const ask = card({ w: 2.0, h: 0.5, paint: chip({ icon: "ph-question", title: q.text, hue: CHANNELS[q.channel].hue }) });
    const reply = q.routine
      ? card({ w: 2.0, h: 0.5, paint: chip({ icon: "ph-check", title: q.text, tone: "blue" }) })
      : card({ w: 2.3, h: 0.62, paint: chip({ icon: "ph-warning", title: q.text, sub: "Full chat attached", tone: "person" }) });
    root.add(ask.group, reply.group);
    return { q, ask, reply };
  });

  const handoff = line(HEX.amber, 0.95);
  root.add(handoff.object);

  const arc = (a, b, k, lift) => {
    const p = new THREE.Vector3().lerpVectors(a, b, k);
    p.y += Math.sin(Math.PI * k) * lift;
    return p;
  };

  const hubPoint = new THREE.Vector3(HUB.x, 1.35, HUB.z);

  function update(t, dt, total) {
    const out = 1 - easeOut(seg(t, 14.3, 14.9));
    ring.scale.setScalar(1 + Math.sin(total * 2) * 0.04);
    ring.material.opacity = 0.35 + 0.25 * Math.sin(total * 2.4);

    let thinking = 0;
    let routineCount = 0;
    handoff.object.visible = false;
    bubbles.forEach(({ q, ask, reply }) => {
      const ch = CHANNELS[q.channel];
      const from = new THREE.Vector3(ch.x + 0.3, 1.5, ch.z);

      // question flies channel → assistant
      const fly = easeInOut(seg(t, q.at, q.at + 1.2));
      ask.group.position.copy(arc(from, hubPoint, fly, 0.9));
      const askScale = easeBack(seg(t, q.at, q.at + 0.35)) * (1 - seg(t, q.at + 1.0, q.at + 1.25));
      ask.group.scale.setScalar(Math.max(0.0001, askScale));
      ask.group.visible = askScale > 0.001;
      if (t > q.at + 0.9 && t < q.at + 1.9) thinking = 1;

      // reply leaves the assistant once the answer is found
      const leave = q.at + 1.7;
      const go = easeInOut(seg(t, leave, leave + 1.3));
      let target;
      if (q.routine) {
        const slot = routineCount;
        target = new THREE.Vector3(ANSWERED.x, 0.42 + slot * 0.2, ANSWERED.z + 0.3 - slot * 0.06);
        routineCount += 1;
      } else {
        target = new THREE.Vector3(TEAM.x, 2.0, TEAM.z);
      }
      reply.group.position.copy(arc(hubPoint, target, go, q.routine ? 0.8 : 0.5));
      const replyScale = easeBack(seg(t, leave, leave + 0.35)) * out;
      reply.group.scale.setScalar(Math.max(0.0001, replyScale));
      reply.group.visible = replyScale > 0.001;
      // Answers settle flat into the tray; the hand-off stays upright.
      if (q.routine) reply.group.rotation.set((-Math.PI / 2) * 0.85 * easeOut(seg(t, leave + 1.0, leave + 1.3)), 0, 0);
      else faceCamera(reply.group);
      if (!q.routine && go > 0) {
        handoff.setPoints([hubPoint, arc(hubPoint, target, go, 0.5)]);
        handoff.object.visible = replyScale > 0.01;
      }
      faceCamera(ask.group);
    });

    core.position.y = 1.2 + thinking * Math.sin(total * 10) * 0.02;
    core.material.color.setHex(thinking ? 0x3651f0 : HEX.blue);

    // The knowledge stack lights up while answers are being looked up.
    stack.forEach((s, i) => {
      const lit = thinking * (0.5 + 0.5 * Math.sin(total * 6 - i));
      s.slab.position.y = 0.15 + i * 0.34;
      s.label.group.position.set(HUB.x - 1.95, 0.32 + i * 0.58, HUB.z + 1.2 - i * 0.12);
      s.label.group.scale.setScalar(1 + lit * 0.05 + (t > 3.4 && t < 6.8 ? 0.05 : 0));
      faceCamera(s.label.group);
    });

    channels.forEach((c) => faceCamera(c.label.group));
    faceCamera(hubLabel.group);
    faceCamera(trayLabel.group);
    team.group.scale.setScalar(1 + seg(t, 9.6, 9.9) * (1 - seg(t, 14.2, 14.6)) * 0.08);
    faceCamera(team.group);
  }

  return {
    frame: { w: 11.4, h: 5.8, target: [-0.3, 1.0, 0], yaw: -0.22, elev: 0.6 },
    story,
    staticTime: 11.9,
    update,
  };
}
