export const problems = [
  {
    icon: "ph-git-branch",
    title: "Work hides in the hand-offs",
    body: "A request moves through email, a spreadsheet and someone's memory. Nobody can see where it waits, so it waits longer.",
  },
  {
    icon: "ph-plugs-connected",
    title: "The tools don't talk",
    body: "Your CRM, inbox, finance system and files each hold a piece of the answer. Joining them is still a manual job.",
  },
  {
    icon: "ph-users-three",
    title: "Every decision needs a person",
    body: "Approvals, follow-ups and reporting queue behind the same few people. Growth adds pressure instead of capacity.",
  },
  {
    icon: "ph-database",
    title: "The data is there. The signal isn't.",
    body: "Reporting arrives after the decision. The patterns worth acting on stay buried inside exports nobody has time to read.",
  },
];

export const proofRows = [
  {
    sector: "Manufacturing",
    state: "Predictive maintenance pilot",
    slot: "Reserved",
  },
  {
    sector: "Financial services",
    state: "Reporting and exception automation",
    slot: "Reserved",
  },
  {
    sector: "HR & recruitment",
    state: "Candidate operations and scheduling",
    slot: "Reserved",
  },
  {
    sector: "Professional services",
    state: "Client intake, triage and hand-off",
    slot: "Reserved",
  },
];

/*
 * Each applied example carries a three-step flow rendered as a flat diagram.
 * The last step is the "person decides" step: the system prepares the work,
 * a human keeps the judgement call (brand promise, see hero subtext).
 */
export const appliedExamples = [
  {
    sector: "Manufacturing",
    title: "See the line before it stops.",
    body: "Predictive maintenance and yield signals built from the data your plant already produces.",
    icon: "ph-factory",
    flow: [
      { icon: "ph-gauge", label: "Machine readings", meta: "Sensors, PLC logs" },
      { icon: "ph-warning-diamond", label: "Drift flagged", meta: "Pattern vs. baseline" },
      { icon: "ph-wrench", label: "Service booked", meta: "Planner approves" },
    ],
  },
  {
    sector: "Financial services",
    title: "Close the month without the scramble.",
    body: "Connected portfolios, automated reporting and exceptions flagged before they become a problem.",
    icon: "ph-chart-polar",
    flow: [
      { icon: "ph-bank", label: "Ledgers synced", meta: "Bank, ERP, sheets" },
      { icon: "ph-magnifying-glass", label: "Exceptions isolated", meta: "Only the odd ones" },
      { icon: "ph-file-text", label: "Report drafted", meta: "Controller signs off" },
    ],
  },
  {
    sector: "HR & recruitment",
    title: "Keep candidates warm, not waiting.",
    body: "Screening, scheduling and onboarding steps that move without a recruiter chasing every thread.",
    icon: "ph-users-three",
    flow: [
      { icon: "ph-tray", label: "Application in", meta: "Job board, email" },
      { icon: "ph-calendar-check", label: "Interview scheduled", meta: "Both calendars checked" },
      { icon: "ph-handshake", label: "Shortlist ready", meta: "Recruiter decides" },
    ],
  },
  {
    sector: "Logistics",
    title: "Catch the exception before it cascades.",
    body: "Route, inventory and supplier signals joined into one view, with the next action already queued.",
    icon: "ph-flow-arrow",
    flow: [
      { icon: "ph-truck", label: "Shipment delayed", meta: "Carrier update" },
      { icon: "ph-package", label: "Stock impact checked", meta: "Orders at risk" },
      { icon: "ph-paper-plane-tilt", label: "Customer notified", meta: "Ops lead approves" },
    ],
  },
];

export const contactSteps = [
  {
    label: "01",
    body: "You send the context: what is slowing down, and what you have already tried.",
  },
  {
    label: "02",
    body: "We reply within two working days with the few questions that actually matter.",
  },
  {
    label: "03",
    body: "If there is a fit, we book a 30-minute working call. No pitch deck required.",
  },
];
