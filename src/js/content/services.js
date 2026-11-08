/**
 * The five AI Solutions service lines.
 * One source of truth for the homepage switcher, the AI Solutions page
 * and the contact form's service prefill.
 *
 * Service headlines, capabilities and deployment phases mirror the live
 * Omnitron service pages (omnitron.tech/services) so the redesign does not
 * drift from the published offer.
 */

export const services = [
  {
    id: "strategy",
    slug: "strategy-consulting",
    index: "01",
    name: "Strategy & Consulting",
    shortName: "Strategy",
    headline: "Navigate the Intelligence Age",
    outcome: "A practical plan for where AI can help.",
    summary: "Find useful AI work, estimate costs, and set clear safeguards.",
    description:
      "We start with how work actually moves through your business, not with a technology looking for a problem. You leave with a short list of decisions, a costed sequence and the safeguards to scale without creating new risk.",
    value:
      "AI is not plug-and-play. Our consulting practice aligns AI with your business objectives, finds high-impact use cases, and sets the guardrails needed to scale safely.",
    icon: "ph-compass",
    tags: ["Opportunity map", "Costed roadmap", "Governance"],
    chips: ["Discovery", "Business case", "Roadmap", "Governance"],
    capabilities: [
      "AI maturity assessment",
      "Ethical governance frameworks",
      "ROI impact modelling",
    ],
    industries: [
      "Financial services",
      "Traditional SME",
      "Manufacturing",
      "Healthcare",
      "Retail & FMCG",
      "Legal",
    ],
    phases: [
      {
        title: "Operational audit",
        text: "Map the manual workflows, bottlenecks and the real cost of delay.",
      },
      {
        title: "Business-case design",
        text: "Price the opportunity and sequence the first proof of value.",
      },
      {
        title: "Governance protocol",
        text: "Set the rules for data, privacy and human oversight.",
      },
      {
        title: "Costed rollout",
        text: "Scale what works, with a quarterly ROI review.",
      },
    ],
    stack: ["Miro", "Lucidchart", "ROI frameworks"],
    flow: [
      { label: "Request", text: "A business goal and the work around it" },
      { label: "Omnitron", text: "Opportunity mapping, cost model and risk review" },
      {
        label: "Result",
        text: "A plan your team can act on next quarter",
        result: true,
      },
    ],
  },
  {
    id: "automation",
    slug: "intelligent-automation",
    index: "02",
    name: "Workflow Automation",
    shortName: "Automation",
    headline: "Operations at the Speed of Light",
    outcome: "Repeatable work handled, with exceptions kept visible.",
    summary:
      "Connect your tools and automate repeat tasks, approvals, and hand-offs.",
    description:
      "The work is rarely one big task. It is the ten small hand-offs around it. We automate the repeatable path end to end, keep people in control of the exceptions, and make every hand-off visible.",
    value:
      "Automation is reliability. We engineer workflows with error handling and fallbacks, so routine work runs perfectly while people handle the exceptions.",
    icon: "ph-plugs-connected",
    tags: ["Workflow design", "System integration", "Exception handling"],
    chips: ["Intake", "Routing", "Approvals", "Exceptions"],
    capabilities: [
      "Advanced workflow orchestration",
      "Error-proof architecture",
      "High-volume data processing",
    ],
    industries: [
      "Finance & accounting",
      "E-commerce & retail",
      "Property & real estate",
      "Construction & logistics",
      "Healthcare & biotech",
      "Legal & compliance",
    ],
    phases: [
      {
        title: "Process mining",
        text: "Visualise the exact path a request takes through your systems.",
      },
      {
        title: "Connect & digitise",
        text: "Secure bank feeds, OCR and structured intake at the source.",
      },
      {
        title: "Routing & approvals",
        text: "Automate sign-off, exception handling and ERP sync.",
      },
      {
        title: "Auto-closing",
        text: "The routine runs itself and the books close on time.",
      },
    ],
    stack: ["Zapier", "Make", "n8n", "HubSpot", "Salesforce", "Apollo"],
    flow: [
      { label: "Request", text: "A repeated process with too many hand-offs" },
      { label: "Omnitron", text: "Map, connect and automate the path end to end" },
      {
        label: "Result",
        text: "The routine runs itself; people handle the edge cases",
        result: true,
      },
    ],
  },
  {
    id: "agentic",
    slug: "agentic-solutions",
    index: "03",
    name: "AI Agents",
    shortName: "AI agents",
    headline: "The Future of Digital Labor",
    outcome: "Multi-step tasks with people in control.",
    summary:
      "Agents handle approved tasks, check results, and escalate exceptions.",
    description:
      "Useful autonomy is bounded autonomy. We design agents around a real process, give them the context and permissions they need, and define exactly when a person must step in. No black boxes, no unsupervised spending.",
    value:
      "We engineer bounded agents that take on multi-step work, check their own results, and escalate at the right moment.",
    icon: "ph-robot",
    tags: ["Scoped autonomy", "Tool use", "Human escalation"],
    chips: ["Context", "Tool use", "Checks", "Escalation"],
    capabilities: [
      "Cognitive architectures",
      "Goal-directed behaviour",
      "Proprietary agent frameworks",
    ],
    industries: [
      "Cross-industry",
      "Logistics",
      "Recruitment",
      "Private healthcare",
      "Manufacturing",
      "Boutique hospitality",
    ],
    phases: [
      {
        title: "Nuance training",
        text: "Inject regional language, policy and negotiation context.",
      },
      {
        title: "API handshake",
        text: "Connect the agent to your CRM, channels and internal tools.",
      },
      {
        title: "Cold run",
        text: "Test reasoning and tool use in a private sandbox.",
      },
      {
        title: "Autonomous launch",
        text: "Widen permissions only after the results hold up.",
      },
    ],
    roster: [
      "WhatsApp Negotiator",
      "Regional Compliance Guard",
      "Payroll & CPF Auditor",
      "Multi-Channel SDR",
      "Sentiment Guardian",
      "Last-Mile Dispatcher",
      "KYC Onboarding Officer",
      "Document Intel Clerk",
    ],
    stack: ["LangGraph", "CrewAI", "Pinecone", "Weaviate", "AutoGen"],
    flow: [
      { label: "Request", text: "A multi-step process that stalls between tools" },
      {
        label: "Omnitron",
        text: "Scoped agents, guardrails and a human escalation path",
      },
      {
        label: "Result",
        text: "Work keeps moving, with a person on the exceptions",
        result: true,
      },
    ],
  },
  {
    id: "experience",
    slug: "customer-experience",
    index: "04",
    name: "Customer Support",
    shortName: "Customer support",
    headline: "Empathy at Infinite Scale",
    outcome: "Faster customer answers with a human hand-off.",
    summary:
      "Faster answers for customers, with a person ready for harder cases.",
    description:
      "Customers do not want a clever bot. They want the right answer, quickly, and a person when it matters. We connect your knowledge, channels and service team so the routine is fast and the human moments stay human.",
    value:
      "Our CX agents understand intent, handle complex cases, and keep conversations context-aware and human-feeling.",
    icon: "ph-headset",
    tags: ["Service design", "Knowledge grounding", "Warm hand-off"],
    chips: ["Channels", "Knowledge", "Triage", "Hand-off"],
    capabilities: [
      "Sentiment-aware support",
      "Real-time translation",
      "Predictive sales outreach",
    ],
    industries: [
      "SaaS startups",
      "Professional services",
      "Luxury retail",
      "Banking & fintech",
      "Travel & hospitality",
      "Telecoms",
    ],
    phases: [
      {
        title: "Doc vectorisation",
        text: "Index APIs, policies and help content for semantic search.",
      },
      {
        title: "Context ingestion",
        text: "Read the product, the account history and the open ticket.",
      },
      {
        title: "Tone calibration",
        text: "Shape the agent to sound like your best service lead.",
      },
      {
        title: "Ticket deflection",
        text: "Resolve the routine before it reaches a human queue.",
      },
    ],
    stack: ["Intercom", "OpenAI", "ElevenLabs", "Zendesk"],
    flow: [
      { label: "Request", text: "A customer question, on any channel" },
      {
        label: "Omnitron",
        text: "Ground the answer, route the context and flag the sensitive cases",
      },
      {
        label: "Result",
        text: "A fast answer, or a warm hand-off with the full story",
        result: true,
      },
    ],
  },
  {
    id: "data",
    slug: "data-insights",
    index: "05",
    name: "Data & Reporting",
    shortName: "Data and reporting",
    headline: "Foresight, Not Hindsight",
    outcome: "A clearer view of what changed and what to do next.",
    summary:
      "Bring scattered information together before decisions have to be made.",
    description:
      "Reporting should arrive before the decision, not after it. We clean and connect the sources you already have, define the few measures that matter, and build a view that shows what changed and where to look next.",
    value:
      "Our analytics engines turn scattered data into forward-looking signals that spot trends and anomalies before they impact the bottom line.",
    icon: "ph-chart-line-up",
    tags: ["Data modelling", "Decision views", "Honest reporting"],
    chips: ["Sources", "Model", "Signals", "Decisions"],
    capabilities: [
      "Predictive anomaly detection",
      "Automated KPI reporting",
      "Unstructured data mining",
    ],
    industries: [
      "Manufacturing",
      "Financial services",
      "HR & recruitment",
      "Retail",
      "Logistics",
      "Energy",
    ],
    phases: [
      {
        title: "Sensor & source install",
        text: "Bring assets, logs and operational data into one frame.",
      },
      {
        title: "Baseline data",
        text: "Establish what normal looks like before modelling risk.",
      },
      {
        title: "Failure training",
        text: "Teach the model what a breakdown or anomaly looks like.",
      },
      {
        title: "Predictive ops",
        text: "Trigger the work order before the failure reaches the line.",
      },
    ],
    stack: ["BigQuery", "Looker", "Python", "Snowflake"],
    flow: [
      { label: "Request", text: "Scattered data and reporting that arrives late" },
      {
        label: "Omnitron",
        text: "Connect the sources and define the measures that matter",
      },
      {
        label: "Result",
        text: "One decision view the team trusts and uses",
        result: true,
      },
    ],
  },
];

export const serviceCount = services.length;

export function findService(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  return (
    services.find(
      (service) =>
        service.slug === key ||
        service.id === key ||
        service.name.toLowerCase() === key ||
        service.shortName.toLowerCase() === key,
    ) || null
  );
}

export function serviceContactHref(service) {
  return service ? `/contact/?service=${encodeURIComponent(service.slug)}` : "/contact/";
}
