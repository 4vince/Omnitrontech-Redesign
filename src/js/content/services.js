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
    outcome: "A clear plan for where AI earns its keep.",
    summary:
      "We map the work, the tools and the constraints first, then build a costed roadmap with the governance to match.",
    description:
      "We start with how work actually moves through your business, not with a technology looking for a problem. You leave with a short list of decisions, a costed sequence and the safeguards to scale without creating new risk.",
    value:
      "AI is not a plug-and-play solution; it is a paradigm shift. Our consulting practice aligns artificial intelligence with your core business objectives, identifies high-impact use cases, and establishes the ethical guardrails necessary for enterprise-scale adoption.",
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
    name: "Intelligent Automation",
    shortName: "Automation",
    headline: "Operations at the Speed of Light",
    outcome: "Hours back every week, without adding headcount.",
    summary:
      "We connect the tools you already use and automate the routine tasks, hand-offs and approvals that quietly eat the week.",
    description:
      "The work is rarely one big task. It is the ten small hand-offs around it. We automate the repeatable path end to end, keep people in control of the exceptions, and make every hand-off visible.",
    value:
      "Automation is not just moving data; it is reliability. We engineer advanced workflows with built-in error handling and fallback logic. While agents think, automations do: executing your defined processes perfectly, every single time.",
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
    name: "Agentic Solutions",
    shortName: "Agentic",
    headline: "The Future of Digital Labor",
    outcome: "Multi-step work that keeps moving on its own.",
    summary:
      "Agents that take on multi-step work across your stack, check their own results and escalate at the right moment.",
    description:
      "Useful autonomy is bounded autonomy. We design agents around a real process, give them the context and permissions they need, and define exactly when a person must step in. No black boxes, no unsupervised spending.",
    value:
      "True intelligence lies in agency. We engineer custom agentic systems capable of autonomous reasoning and decision-making: from a specialised research agent to a full-scale cognitive architecture, we build the brains that power your enterprise.",
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
    name: "Customer Experience",
    shortName: "Experience",
    headline: "Empathy at Infinite Scale",
    outcome: "Support that scales without losing the human touch.",
    summary:
      "A responsive layer around your customer conversations: faster answers, cleaner hand-offs and service that holds up on your busiest day.",
    description:
      "Customers do not want a clever bot. They want the right answer, quickly, and a person when it matters. We connect your knowledge, channels and service team so the routine is fast and the human moments stay human.",
    value:
      "Our CX agents do not just answer FAQs. They understand intent, handle complex dispute resolutions, and drive sales through personalised, context-aware conversations that feel indistinguishable from your best human agents.",
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
    name: "Data & Insights",
    shortName: "Data",
    headline: "Foresight, Not Hindsight",
    outcome: "One clear view of what's working, and what to do next.",
    summary:
      "We pull scattered data into one working view, label what is illustrative, and build reporting your team can actually use.",
    description:
      "Reporting should arrive before the decision, not after it. We clean and connect the sources you already have, define the few measures that matter, and build a view that shows what changed and where to look next.",
    value:
      "Stop looking at the rear-view mirror. Our cognitive analytics engines ingest unstructured data such as emails, logs and market reports to generate forward-looking intelligence, spotting trends and anomalies before they impact the bottom line.",
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
