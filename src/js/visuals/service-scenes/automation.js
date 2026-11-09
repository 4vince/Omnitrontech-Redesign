import { HEX, chip, easeBack, easeOut, pastel, seg, window01 } from "./kit.js";

/**
 * Workflow Automation: a conveyor of real requests.
 *
 * Emails, scanned invoices and web forms ride a belt through four stations
 * (read, match, approve, update). Routine items get a tick and drop into the
 * accounts; an unusual one is switched off the line to a person's desk.
 */

const STATIONS = [
  { name: "Read details", icon: "ph-scan", x: -3.2 },
  { name: "Match order", icon: "ph-check-square-offset", x: -1.0 },
  { name: "Approve", icon: "ph-seal-check", x: 1.0 },
  { name: "Update records", icon: "ph-database", x: 2.9 },
];

const KINDS = [
  { icon: "ph-envelope-simple", title: "Supplier email", hue: "sky" },
  { icon: "ph-file-pdf", title: "Scanned invoice", hue: "coral" },
  { icon: "ph-textbox", title: "Web form", hue: "lime" },
];

const START = -5.5;
const END = 4.15;
const LENGTH = END - START;
const SPEED = 0.95;
const ITEMS = 6;
const MATCH_X = STATIONS[1].x;
const BRANCH = 2.05;
const AMBER_DIM = 0xd9952f; // the side track to a person, brighter while called out

export const story = {
  cycle: 12,
  marks: [0, 3, 6, 9],
};

export function build(kit) {
  const { THREE, root, box, card, texture, faceCamera } = kit;

  /* Belt with a moving chevron surface */
  const belt = box(LENGTH + 0.6, 0.18, 1.34, HEX.navy, 0.06);
  belt.position.set((START + END) / 2, 0.09, 0);
  root.add(belt);

  const chevrons = texture(1, 1.3, (ctx, W, H) => {
    ctx.fillStyle = "#14286e";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(185, 196, 229, 0.38)";
    ctx.lineWidth = W * 0.06;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W * 0.35, H * 0.25);
    ctx.lineTo(W * 0.6, H * 0.5);
    ctx.lineTo(W * 0.35, H * 0.75);
    ctx.stroke();
  }, 120);
  chevrons.wrapS = THREE.RepeatWrapping;
  chevrons.repeat.set(LENGTH + 0.4, 1);
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(LENGTH + 0.4, 1.16),
    new THREE.MeshBasicMaterial({ map: chevrons, toneMapped: false }),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.set((START + END) / 2, 0.182, 0);
  root.add(surface);

  /* Branch to the review desk */
  const branch = box(1.1, 0.16, BRANCH + 0.2, AMBER_DIM, 0.05);
  branch.position.set(MATCH_X, 0.08, 0.55 + BRANCH / 2);
  root.add(branch);

  const desk = box(1.9, 0.5, 0.95, pastel("amber", 0.55), 0.08);
  desk.position.set(MATCH_X + 2.75, 0.25, BRANCH + 0.2);
  const person = card({ w: 2.5, h: 0.66, paint: chip({ icon: "ph-user-check", title: "A person checks", sub: "Only the unusual ones", tone: "person" }) });
  person.group.position.set(MATCH_X + 2.75, 1.0, BRANCH + 0.2);
  root.add(desk, person.group);

  /* Stations: a gate over the belt with a light strip and a name card */
  const stations = STATIONS.map((s) => {
    const group = new THREE.Group();
    group.position.x = s.x;
    [-0.82, 0.82].forEach((z) => {
      const post = box(0.13, 1.5, 0.13, HEX.slab, 0.03);
      post.position.set(0, 0.75, z);
      group.add(post);
    });
    const beam = box(0.2, 0.18, 1.82, HEX.white, 0.05);
    beam.position.set(0, 1.55, 0);
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.035, 1.5),
      new THREE.MeshBasicMaterial({ color: 0x5b7bff, transparent: true, opacity: 0.25, toneMapped: false }),
    );
    light.position.set(0, 1.44, 0);
    group.add(beam, light);
    const label = card({ w: 1.75, h: 0.46, paint: chip({ icon: s.icon, title: s.name }) });
    label.group.position.set(s.x, 2.05, 0);
    root.add(group, label.group);
    return { ...s, light, label };
  });

  /* Accounts: where finished records land */
  const ledger = new THREE.Group();
  ledger.position.set(END + 0.85, 0, 0);
  const discs = [0, 1, 2].map((i) => {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.24, 40), kit.mat(i === 2 ? HEX.success : pastel("teal", 0.6 - i * 0.12)));
    disc.castShadow = true;
    disc.receiveShadow = true;
    kit.outline(disc);
    disc.position.y = 0.13 + i * 0.27;
    ledger.add(disc);
    return disc;
  });
  const ledgerLabel = card({ w: 2.0, h: 0.54, paint: chip({ icon: "ph-database", title: "Accounts", hue: "teal", solid: true }) });
  ledgerLabel.group.position.set(END + 0.95, 1.3, 0.2);
  root.add(ledger, ledgerLabel.group);

  /* Requests riding the belt */
  const items = Array.from({ length: ITEMS }, (_, i) => {
    const item = card({ w: 1.55, h: 0.5, paints: KINDS.map((k) => chip({ icon: k.icon, title: k.title, hue: k.hue, solid: true })) });
    const done = card({ w: 0.5, h: 0.5, paint: chip({ icon: "ph-check", tone: "success" }) });
    const flag = card({ w: 1.55, h: 0.46, paint: chip({ icon: "ph-warning", title: "Needs a look", tone: "person" }) });
    root.add(item.group, done.group, flag.group);
    return { i, item, done, flag };
  });

  const pulse = { strength: 0 };

  function update(local, dt, t) {
    // Captions: which part of the line is being called out right now.
    const focus = [
      window01(local, 0, 3),
      window01(local, 3, 6),
      window01(local, 6, 9),
      window01(local, 9, 12),
    ];

    chevrons.offset.x = -(t * SPEED) % 1;

    const gateHits = stations.map(() => 0);
    let landed = 0;

    items.forEach(({ i, item, done, flag }) => {
      const travel = t * SPEED + (i * (LENGTH + 1.2)) / ITEMS;
      const lap = Math.floor(travel / (LENGTH + 1.2));
      const s = travel % (LENGTH + 1.2); // 1.2: a short gap before respawn
      const flagged = (lap + i) % 4 === 1;
      item.show((lap + i) % KINDS.length);

      let x = START + s;
      let z = 0;
      let visible = s <= LENGTH;
      let scale = easeBack(seg(s, 0, 0.5));

      if (flagged && x > MATCH_X) {
        // Switched off the line at the match station, held at the desk.
        const d = Math.min(x - MATCH_X, BRANCH);
        x = MATCH_X + ((i % 3) - 1) * 0.12;
        z = d;
      } else if (x > END - 0.4) {
        // Drops into the accounts.
        scale *= 1 - easeOut(seg(x, END - 0.4, END));
        if (x > END - 0.3) landed = Math.max(landed, 1 - seg(x, END - 0.3, END));
      }

      if (!flagged || x <= MATCH_X) {
        stations.forEach((st, k) => {
          const d = Math.abs(x - st.x);
          if (d < 0.45) gateHits[k] = Math.max(gateHits[k], 1 - d / 0.45);
        });
      } else if (Math.abs(START + s - MATCH_X) < 0.45) {
        gateHits[1] = Math.max(gateHits[1], 1 - Math.abs(START + s - MATCH_X) / 0.45);
      }

      item.group.visible = visible && scale > 0.001;
      item.group.position.set(x, 0.5, z);
      item.group.scale.setScalar(Math.max(0.0001, scale));

      const passedMatch = START + s > MATCH_X + 0.3;
      const doneK = !flagged && passedMatch ? easeBack(seg(START + s, MATCH_X + 0.3, MATCH_X + 0.7)) * scale : 0;
      done.group.visible = visible && doneK > 0.001;
      done.group.position.set(x + 0.72, 0.85, z + 0.05);
      done.group.scale.setScalar(Math.max(0.0001, doneK));

      const flagK = flagged && passedMatch ? easeBack(seg(START + s, MATCH_X + BRANCH * 0.7, MATCH_X + BRANCH + 0.3)) : 0;
      flag.group.visible = visible && flagK > 0.001;
      flag.group.position.set(x - 0.2, 1.02, z);
      flag.group.scale.setScalar(Math.max(0.0001, flagK));

      faceCamera(item.group);
      faceCamera(done.group);
      faceCamera(flag.group);
    });

    // Station lights flash as items pass and stay brighter while called out.
    stations.forEach((st, k) => {
      const called = k === 0 || k === 1 ? focus[1] : k === 3 ? focus[3] : 0;
      st.light.material.opacity = 0.22 + Math.max(gateHits[k], called * 0.7) * 0.78;
      st.label.group.scale.setScalar(1 + called * 0.06);
      faceCamera(st.label.group);
    });

    person.group.scale.setScalar(1 + focus[2] * 0.08);
    faceCamera(person.group);
    branch.material.color.setHex(focus[2] > 0.5 ? 0xf5a623 : AMBER_DIM);

    pulse.strength = Math.max(landed, focus[3] * 0.5);
    discs[2].position.y = 0.67 + pulse.strength * 0.08;
    ledgerLabel.group.scale.setScalar(1 + focus[3] * 0.06);
    faceCamera(ledgerLabel.group);

    belt.material.color.setHex(focus[0] > 0.5 ? 0x14286e : HEX.navy);
  }

  return {
    frame: { w: 11.8, h: 6.2, target: [-0.3, 0.7, 0.6], yaw: -0.2, elev: 0.72 },
    story,
    staticTime: 4.5,
    update,
  };
}
