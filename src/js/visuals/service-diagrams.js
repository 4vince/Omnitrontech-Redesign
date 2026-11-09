/**
 * Descriptive, literal service visuals for the AI Solutions page.
 *
 * Each service gets a flat HTML diagram that shows what the service actually
 * produces (a plan, a running workflow, an agent run, a support inbox, a
 * decision view) instead of an abstract 3D scene. Everything is static markup
 * styled by service-visuals.css; motion is CSS-only and runs while the visual
 * is in view (`.is-live`), and is disabled under prefers-reduced-motion.
 */

const icon = (name) => `<i class="ph ${name}" aria-hidden="true"></i>`;

function frame({ title, status, body, steps, label }) {
  return `<div class="sv" role="img" aria-label="${label}">
    <div class="sv__bar">
      <span class="sv__title">${title}</span>
      ${status}
    </div>
    <div class="sv__body">${body}</div>
    <ol class="sv__steps">
      ${steps
        .map(
          (step, i) =>
            `<li style="--i:${i}"><span>${String(i + 1).padStart(2, "0")}</span>${step}</li>`,
        )
        .join("")}
    </ol>
  </div>`;
}

const pill = (text, tone = "") =>
  `<span class="sv-pill${tone ? ` sv-pill--${tone}` : ""}">${text}</span>`;

/* 01 — Strategy & Consulting: where AI helps, what it costs, what comes first */
function strategy() {
  const tasks = [
    { name: "Invoice entry", x: 14, y: 16, pick: true },
    { name: "Customer emails", x: 40, y: 46 },
    { name: "Weekly reports", x: 12, y: 84 },
    { name: "Contract review", x: 80, y: 30 },
    { name: "Stock forecasts", x: 82, y: 64 },
  ];

  const body = `<div class="sv-strategy">
    <section class="sv-card sv-strategy__map">
      <span class="sv-label">${icon("ph-magnifying-glass")} Where AI can help</span>
      <div class="sv-matrix">
        <span class="sv-matrix__axis sv-matrix__axis--y">Value to the business →</span>
        <div class="sv-matrix__plot">
          <span class="sv-matrix__q sv-matrix__q--pick"><em>Start here</em></span>
          <span class="sv-matrix__q"></span>
          <span class="sv-matrix__q"></span>
          <span class="sv-matrix__q"></span>
          ${tasks
            .map(
              (t, i) =>
                `<span class="sv-dot${t.pick ? " sv-dot--pick" : ""}${t.x > 60 ? " sv-dot--flip" : ""}" style="left:${t.x}%;top:${t.y}%;--i:${i}"><b></b>${t.name}</span>`,
            )
            .join("")}
        </div>
        <span class="sv-matrix__axis sv-matrix__axis--x">Effort to start →</span>
      </div>
    </section>

    <section class="sv-card sv-strategy__cost">
      <span class="sv-label">${icon("ph-coins")} What it may cost</span>
      <dl class="sv-rows">
        <div><dt>Set-up</dt><dd>Fixed range</dd></div>
        <div><dt>Running cost</dt><dd>Agreed upfront</dd></div>
        <div><dt>Time saved</dt><dd class="sv-good">Measured in the pilot</dd></div>
      </dl>
      <div class="sv-meter">
        <span>Payback estimated before you commit</span>
        <i><b></b></i>
      </div>
    </section>

    <section class="sv-card sv-strategy__plan">
      <span class="sv-label">${icon("ph-flag")} What to do first</span>
      <ol class="sv-timeline">
        <li class="is-now"><span>Month 1</span>Pilot: automate invoice entry</li>
        <li><span>Month 2-3</span>Measure results, agree data rules</li>
        <li><span>Month 4+</span>Expand to customer emails</li>
      </ol>
    </section>
  </div>`;

  return frame({
    title: `${icon("ph-compass")} AI opportunity plan`,
    // No prices or results here: the real range comes after a discovery
    // call (PRODUCT.md: never invent pricing or metrics).
    status: pill("Example plan", "blue"),
    body,
    steps: ["Discovery", "Business case", "Roadmap", "Governance"],
    label:
      "An AI opportunity plan: a value-versus-effort map that marks invoice entry as the place to start, example figures for set-up cost, running cost, time saved and payback, and a first-steps roadmap.",
  });
}

/* 02 — Workflow Automation: inputs flow through automated steps; exceptions go to a person */
function automation() {
  const body = `<div class="sv-flow">
    <div class="sv-flow__col">
      <span class="sv-label">Comes in</span>
      <div class="sv-chip-card">${icon("ph-envelope-simple")} Supplier email</div>
      <div class="sv-chip-card">${icon("ph-file-pdf")} Scanned invoice</div>
      <div class="sv-chip-card">${icon("ph-textbox")} Web form</div>
    </div>

    <div class="sv-flow__wire" aria-hidden="true"><i></i></div>

    <div class="sv-flow__col sv-flow__col--steps">
      <span class="sv-label">Runs automatically</span>
      <ol class="sv-pipeline">
        <li style="--i:0">${icon("ph-scan")} Read the details</li>
        <li style="--i:1">${icon("ph-check-square-offset")} Match to purchase order</li>
        <li style="--i:2">${icon("ph-arrows-split")} Send for approval</li>
        <li style="--i:3">${icon("ph-database")} Update the accounts</li>
      </ol>
    </div>

    <div class="sv-flow__wire" aria-hidden="true"><i></i></div>

    <div class="sv-flow__col">
      <span class="sv-label">Result</span>
      <div class="sv-outcome sv-outcome--done">
        ${icon("ph-check-circle")}
        <div><strong>Most</strong><span>Approved &amp; recorded automatically</span></div>
      </div>
      <div class="sv-outcome sv-outcome--person">
        ${icon("ph-user-focus")}
        <div><strong>A few</strong><span>Need a person: amount over your limit</span></div>
      </div>
    </div>
  </div>`;

  return frame({
    title: `${icon("ph-plugs-connected")} Invoice approval workflow`,
    status: pill("Running", "good"),
    body,
    steps: ["Intake", "Routing", "Approvals", "Exceptions"],
    label:
      "An automated invoice workflow: emails, scanned invoices and web forms are read, matched to purchase orders, sent for approval and recorded. Most go through automatically; unusual ones are passed to a person.",
  });
}

/* 03 — AI Agents: a multi-step run with limited access and a human approval gate */
function agentic() {
  const steps = [
    { text: "Look up the order", tool: "Orders" },
    { text: "Find the next delivery slot", tool: "Dispatch" },
    { text: "Draft a message to the customer", tool: "Email" },
  ];

  const body = `<div class="sv-agent">
    <section class="sv-card sv-agent__run">
      <span class="sv-label">${icon("ph-target")} Goal</span>
      <p class="sv-agent__goal">Rebook a late delivery and let the customer know</p>
      <ol class="sv-checklist">
        ${steps
          .map(
            (s, i) =>
              `<li style="--i:${i}"><span class="sv-check">${icon("ph-check")}</span><span>${s.text}</span><em>${s.tool}</em></li>`,
          )
          .join("")}
        <li class="sv-checklist__gate" style="--i:3">
          <span class="sv-check sv-check--wait">${icon("ph-hand")}</span>
          <span>Offer a S$40 delivery credit<small>Paused: over the agent's S$25 limit</small></span>
          <em>Payments</em>
        </li>
      </ol>
      <div class="sv-approve">
        <span>${icon("ph-user")} Needs your approval</span>
        <span class="sv-btn sv-btn--primary">Approve</span>
        <span class="sv-btn">Edit</span>
      </div>
    </section>

    <section class="sv-card sv-agent__access">
      <span class="sv-label">${icon("ph-lock-key")} What it can access</span>
      <ul class="sv-access">
        <li>${icon("ph-package")} Orders <span>Read</span></li>
        <li>${icon("ph-truck")} Dispatch <span>Read &amp; book</span></li>
        <li>${icon("ph-envelope-simple")} Email <span>Draft only</span></li>
        <li class="is-locked">${icon("ph-credit-card")} Payments <span>Ask a person</span></li>
      </ul>
      <span class="sv-label sv-agent__rules">${icon("ph-shield-check")} Rules</span>
      <ul class="sv-rules">
        <li>Stop and ask above S$25</li>
        <li>Never change prices</li>
        <li>Log every action</li>
      </ul>
    </section>
  </div>`;

  return frame({
    title: `${icon("ph-robot")} Agent run · Order #4821`,
    status: pill("Waiting for a person", "blue"),
    body,
    steps: ["Context", "Tool use", "Checks", "Escalation"],
    label:
      "An AI agent working through a goal: it has looked up an order, found a new delivery slot and drafted a customer message, then paused because offering a credit is above its limit and needs a person's approval. A side panel lists the limited tools it may use and its rules.",
  });
}

/* 04 — Customer Support: routine questions answered fast; sensitive ones handed to a person */
function experience() {
  const body = `<div class="sv-support">
    <section class="sv-card sv-support__chat">
      <span class="sv-label">${icon("ph-chat-circle-text")} Common question</span>
      <div class="sv-msg sv-msg--in" style="--i:0">Hi, where is my order? It was due on Tuesday.</div>
      <div class="sv-msg sv-msg--out" style="--i:1">
        It's on its way. The courier shows delivery tomorrow before 6pm, here's your tracking link.
        <small>${icon("ph-book-open")} From: order #20417 · Shipping policy</small>
      </div>
      <div class="sv-meta" style="--i:2">${icon("ph-lightning")} Answered in seconds · Resolved</div>
    </section>

    <section class="sv-card sv-support__handoff">
      <span class="sv-label">${icon("ph-warning-circle")} Needs a person</span>
      <div class="sv-msg sv-msg--in" style="--i:0">I've been charged twice and I'm really frustrated.</div>
      <div class="sv-flags" style="--i:1">
        <span>Billing issue</span><span>Upset customer</span>
      </div>
      <div class="sv-handoff" style="--i:2">
        <div class="sv-handoff__who">
          <span class="sv-avatar">${icon("ph-headset")}</span>
          <div><strong>Passed to your support team</strong><span>With the full story attached</span></div>
        </div>
        <ul>
          <li>${icon("ph-receipt")} Payment history</li>
          <li>${icon("ph-chats")} Conversation so far</li>
          <li>${icon("ph-lightbulb")} Suggested: refund duplicate charge</li>
        </ul>
      </div>
    </section>
  </div>`;

  return frame({
    title: `${icon("ph-headset")} Support inbox`,
    status: `<span class="sv-channels">${pill("Chat")}${pill("WhatsApp")}${pill("Email")}</span>`,
    body,
    steps: ["Channels", "Knowledge", "Triage", "Hand-off"],
    label:
      "A support inbox: a routine 'where is my order' question is answered in seconds using the order record and shipping policy, while a frustrated double-charge complaint is flagged and passed to a person with the payment history and conversation attached.",
  });
}

/* 05 — Data & Reporting: scattered sources become one view that flags what changed */
function data() {
  const values = [70, 73, 71, 52, 64, 72, 74];
  const points = values.map((v, i) => `${i * 50},${110 - v}`).join(" ");
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const body = `<div class="sv-data">
    <div class="sv-data__sources">
      <span class="sv-label">Sources</span>
      <div class="sv-chip-card">${icon("ph-shopping-cart")} Sales</div>
      <div class="sv-chip-card">${icon("ph-bank")} Finance</div>
      <div class="sv-chip-card">${icon("ph-gear-six")} Equipment logs</div>
      <div class="sv-chip-card">${icon("ph-ticket")} Service tickets</div>
    </div>

    <div class="sv-flow__wire sv-data__wire" aria-hidden="true"><i></i></div>

    <section class="sv-card sv-data__view">
      <div class="sv-kpis">
        <div><span>Orders</span><strong>1,284</strong><em class="sv-good">▲ 6%</em></div>
        <div><span>On-time delivery</span><strong>94%</strong><em>▼ 1%</em></div>
        <div class="is-alert"><span>Line 3 output</span><strong>−18%</strong><em>Unusual</em></div>
      </div>

      <div class="sv-chart">
        <span class="sv-label">Line 3 output · this week</span>
        <div class="sv-chart__plot">
          <svg viewBox="0 0 300 110" preserveAspectRatio="none" aria-hidden="true">
            <rect class="sv-chart__band" x="0" y="30" width="300" height="18"></rect>
            <polyline class="sv-chart__line" points="${points}" pathLength="1" vector-effect="non-scaling-stroke"></polyline>
          </svg>
          <span class="sv-chart__band-label">Usual range</span>
          <span class="sv-chart__mark" style="left:${(3 / 6) * 100}%;top:${((110 - values[3]) / 110) * 100}%"></span>
          <span class="sv-chart__callout" style="left:${(3 / 6) * 100}%">Thu: output dropped 18%</span>
        </div>
        <div class="sv-chart__days">${days.map((d) => `<span>${d}</span>`).join("")}</div>
      </div>

      <div class="sv-next">
        ${icon("ph-arrow-bend-down-right")}
        <span><strong>Next step:</strong> check Line 3 maintenance log before Friday's run</span>
      </div>
    </section>
  </div>`;

  return frame({
    title: `${icon("ph-chart-line-up")} Weekly operations view`,
    status: pill("Example figures", "blue"),
    body,
    steps: ["Sources", "Model", "Signals", "Decisions"],
    label:
      "A weekly operations report built from sales, finance, equipment and service data: headline numbers, a chart showing Line 3 output dropping below its usual range on Thursday, and a suggested next step to check the maintenance log.",
  });
}

const builders = { strategy, automation, agentic, experience, data };

export function serviceDiagramMarkup(serviceId) {
  const build = builders[serviceId];
  if (!build) throw new Error(`Missing AI Solutions diagram for "${serviceId}".`);
  return build();
}
