import type {
  MockAgent,
  MockHistoryItem,
  MockStream,
  ProtocolStats,
  ReportLedgerItem,
  StreamPolicy,
  UserWalletProfile,
} from "./types";

export type {
  MockAgent,
  MockHistoryItem,
  MockStream,
  ProtocolStats,
  ReportLedgerItem,
  StreamPolicy,
  UserWalletProfile,
} from "./types";

export const USER_WALLET_PROFILE: UserWalletProfile = {
  name: "eli.sol",
  email: "eli@drip.fi",
  shortAddress: "7Hk2...q4Wp",
  walletLabel: "Privy · 7Hk2...q4Wp",
  embeddedWalletLabel: "Privy embedded wallet · 7Hk2...q4Wp",
  recovery: "Google · GitHub",
  twoFactor: "Passkey enabled",
};

export const PROTOCOL_STATS: ProtocolStats = {
  clusterLabel: "Solana devnet",
  version: "v0.4.2",
  blockTime: "400ms",
  settlement: "<1s",
  streamFee: "0.10%",
  rpcStatus: "RPC ok",
  rpcSlotShort: "287,401k",
  slot: "287,401,238",
  complianceSlot: "287,401,883",
  protocolStatus: "Autonomous",
  finalityLabel: "SETTLING EVERY 400ms",
  yieldApy: 4.81,
};

export const LANDING_NAV_LINKS = ["Protocol", "Use cases", "Developers", "Ecosystem", "Docs"];

export const LANDING_PROTOCOL_STATS = [
  { label: "Block time", value: PROTOCOL_STATS.blockTime, hint: "Solana mainnet" },
  { label: "Settlement", value: PROTOCOL_STATS.settlement, hint: "end to end" },
  { label: "Stream fee", value: PROTOCOL_STATS.streamFee, hint: "protocol" },
];

export const LANDING_STREAMING_CARD = {
  rate: 0.005,
  initialValue: 1452.987654,
  startedOffsetMs: 290_473_000,
  activeStreamId: "#4821",
  fromAddress: "7Hk2...q4Wp",
  fromLabel: "master-agent.sol",
  toAddress: "9Bc1...aL3z",
  toLabel: "deepseek-api.node",
  token: "USDC",
  tokenKind: "SPL",
  txHash: "0x9af...c14",
};

export const LANDING_PARTNERS = ["Solana", "MoonPay", "Raydium", "Privy", "Anchor", "Jupiter", "Pyth", "Phantom"];

export const DRIP_COMPARE_PANELS = [
  {
    kind: "old",
    title: "The old way",
    label: "Lump-sum, deferred",
    timeline: [
      { d: "Day 1", e: "Work begins. No payment." },
      { d: "Day 15", e: "Still working. Still nothing." },
      { d: "Day 30", e: "Invoice sent. Wait for ACH." },
      { d: "Day 33", e: "First payment lands." },
    ],
    footer: "Counterparty risk · cash flow gaps · trust required",
  },
  {
    kind: "new",
    title: "The Drip way",
    label: "Real-time, per-second",
    timeline: [
      { d: "00:00.000", e: "Stream initialized on-chain." },
      { d: "00:00.400", e: "First settlement (Solana block)." },
      { d: "00:00.800", e: "Funds withdrawable. No waiting." },
      { d: "Continuous", e: "Money flows while value flows." },
    ],
    footer: "Trustless · zero gap · stop work, stop pay",
  },
];

export const DRIP_PILLARS = [
  {
    n: "i",
    title: "Agent-Native",
    icon: "bot",
    body: "Built for programmatic spending and auto-scaling. Agents hire other agents with budget caps, auto-revoke clauses, and per-token metering - no human in the loop.",
    meta: "Spending policies · Auto-scale · Agent SDK",
  },
  {
    n: "ii",
    title: "Sub-second Finality",
    icon: "gauge",
    body: "Leveraging Solana's 400ms block time for micro-settlement. Streams settle continuously, sub-cent per transaction, with 65k TPS of headroom.",
    meta: "Solana · 400ms · Anchor PDAs",
    highlight: true,
  },
  {
    n: "iii",
    title: "Audit-Ready",
    icon: "file-check-2",
    body: "Instant PDF/CSV exports for enterprise-level tax and legal compliance. Every stream is verifiable on-chain - accountants get clean ledgers, auditors get cryptographic receipts.",
    meta: "IRS Form 8949 · DAC8 · Xero / QuickBooks",
  },
];

export const LANDING_USE_CASES = [
  {
    key: "workforce",
    tag: "FOR HUMANS",
    title: "The modern workforce.",
    lede: "Pay freelancers per second of work. Stop the task - stop the pay. No invoices, no Net-30, no awkward follow-ups.",
    icon: "briefcase-business",
    bullets: [
      "Pause/resume from any device, instantly mirrored on-chain.",
      "Per-second precision - fairer than hourly, simpler than milestones.",
      "Withdraw anytime, even mid-stream. No locked balances.",
    ],
    demo: "workforce",
  },
  {
    key: "subs",
    tag: "FOR PRODUCTS",
    title: "Usage-based subscriptions.",
    lede: "Charge for media or SaaS only for the exact seconds used. The death of the forgotten $14.99/mo charge.",
    icon: "play-circle",
    bullets: [
      "Pay-as-you-watch streaming - $0.0008/sec instead of monthly.",
      "API rate-metered billing - per-token, per-call, per-second.",
      "Cancel by closing the tab. Refunds are automatic.",
    ],
    demo: "subs",
  },
  {
    key: "agents",
    tag: "FOR MACHINES",
    title: "AI agent economy.",
    lede: "Autonomous agents hire other agents and pay them per token of compute. Settlement happens at the speed of inference.",
    icon: "bot",
    bullets: [
      "Per-token payment rails for LLM-to-LLM coordination.",
      "MCP-compatible - agents auth & pay via embedded keys.",
      "Programmatic sub-streams for tool calls and chained tasks.",
    ],
    demo: "agents",
  },
];

export const WORKFORCE_DEMO = {
  initialEarned: 2418.4,
  ratePerSec: 0.0125,
  workerName: "Maya Chen",
  workerHandle: "@maya · maya.sol",
  hourlyLabel: "$45.00/h · 0.0125 USDC/sec",
  tasks: [
    { name: "Landing page redesign", rate: "$45/h", state: "active" },
    { name: "Component library", rate: "$45/h", state: "queued" },
    { name: "Analytics dashboard", rate: "$60/h", state: "queued" },
  ],
};

export const SUBSCRIPTION_DEMO = {
  initialCost: 0.4823,
  ratePerSec: 0.000823,
  provider: "Lumen TV",
  content: "Episode 04 · The Cartographers",
  progressPercent: 37,
  progressLabel: "17:22 / 46:08",
  monthlyPrice: "$14.99",
  savingsLabel: "-96.8%",
};

export const LANDING_AGENT_DEMO = {
  sessionName: "Agent mesh · session 1f4e",
  sessionMeta: "4 agents · 12 sub-streams · MCP signed",
  streamId: "stream://1f4e",
  totalSettled: "$0.000745",
  avgLatency: "412ms",
  baseSettlements: 12,
  events: [
    { from: "agent.research", to: "agent.summarize", amt: "0.000412", note: "tools/web_search · 1.2k tok" },
    { from: "agent.summarize", to: "agent.editor", amt: "0.000208", note: "compose/draft · 800 tok" },
    { from: "agent.editor", to: "agent.publisher", amt: "0.000094", note: "deliver/markdown · 240 tok" },
    { from: "agent.publisher", to: "human.eli", amt: "0.000031", note: "notify/payout · final" },
  ],
};

export const DEV_FEATURES = [
  { icon: "package", title: "npm i drip-sol", desc: "Lightweight client. Works in browser, node, edge runtimes." },
  { icon: "webhook", title: "Stream webhooks", desc: "React to deposit, withdraw, pause, complete events in real time." },
  { icon: "file-code-2", title: "Anchor IDL", desc: "On-chain program is open-source. Audit, fork, or extend." },
];

export const DEV_CODE_SAMPLE = `<span class="tk-c">// Install: npm i drip-sol @solana/web3.js</span>
<span class="tk-k">import</span> <span class="tk-p">{</span> <span class="tk-v">drip</span> <span class="tk-p">}</span> <span class="tk-k">from</span> <span class="tk-s">"drip-sol"</span><span class="tk-p">;</span>
<span class="tk-k">import</span> <span class="tk-p">{</span> <span class="tk-v">PublicKey</span> <span class="tk-p">}</span> <span class="tk-k">from</span> <span class="tk-s">"@solana/web3.js"</span><span class="tk-p">;</span>

<span class="tk-k">const</span> <span class="tk-v">receiver</span> <span class="tk-p">=</span> <span class="tk-k">new</span> <span class="tk-f">PublicKey</span><span class="tk-p">(</span><span class="tk-s">"9Bc1...aL3z"</span><span class="tk-p">);</span>

<span class="tk-c">// Open a real-time stream - settles every Solana block.</span>
<span class="tk-k">const</span> <span class="tk-v">stream</span> <span class="tk-p">=</span> <span class="tk-k">await</span> <span class="tk-v">drip</span><span class="tk-p">.</span><span class="tk-f">createStream</span><span class="tk-p">({</span>
  <span class="tk-v">to</span><span class="tk-p">:</span>     <span class="tk-v">receiver</span><span class="tk-p">,</span>
  <span class="tk-v">rate</span><span class="tk-p">:</span>   <span class="tk-n">0.01</span><span class="tk-p">,</span>           <span class="tk-c">// USDC per second</span>
  <span class="tk-v">token</span><span class="tk-p">:</span>  <span class="tk-s">"USDC"</span><span class="tk-p">,</span>
  <span class="tk-v">yield</span><span class="tk-p">:</span>  <span class="tk-s">"raydium"</span><span class="tk-p">,</span>      <span class="tk-c">// idle escrow -> APY</span>
<span class="tk-p">});</span>

<span class="tk-v">stream</span><span class="tk-p">.</span><span class="tk-f">on</span><span class="tk-p">(</span><span class="tk-s">"tick"</span><span class="tk-p">,</span> <span class="tk-p">(</span><span class="tk-v">e</span><span class="tk-p">)</span> <span class="tk-k">=&gt;</span> <span class="tk-v">console</span><span class="tk-p">.</span><span class="tk-f">log</span><span class="tk-p">(</span><span class="tk-v">e</span><span class="tk-p">.</span><span class="tk-v">settled</span><span class="tk-p">));</span>
`;

export const CALCULATOR_DEMO = {
  defaultMonthly: 5000,
  minMonthly: 100,
  maxMonthly: 50000,
  step: 100,
};

export const ECOSYSTEM_PARTNERS = [
  { name: "Solana", role: "Settlement layer", icon: "circle-dot", note: "400ms blocks · 65k TPS" },
  { name: "Privy", role: "Auth & wallets", icon: "fingerprint", note: "Email, Google, Apple" },
  { name: "MoonPay", role: "Fiat on-ramp", icon: "banknote", note: "Card -> USDC in 12s" },
  { name: "Raydium", role: "Yield routing", icon: "sprout", note: "Idle escrow -> 4.81% APY" },
];

export const FINAL_CTA_STATS = ["devnet · live", "$2.4M streamed in test", "1,284 active streams"];

export const FOOTER_SOCIALS = ["github", "twitter", "send", "youtube"];

export const FOOTER_LINK_GROUPS = [
  { title: "Protocol", links: ["Whitepaper", "Architecture", "Security", "Audits", "Status"] },
  { title: "Builders", links: ["Quickstart", "SDK reference", "Examples", "Anchor program", "Grants"] },
  { title: "Company", links: ["Manifesto", "Team", "Press", "Brand kit", "Contact"] },
];

export function createSeedStreams(): MockStream[] {
  // base = already-accumulated amount at a fixed representative snapshot.
  // started = Date.now() so elapsed ≈ 0 at first render; the live counter ticks
  // forward from base. Using fixed elapsed constants (not Date.now() arithmetic)
  // makes base deterministic — identical on SSR and client, eliminating hydration
  // mismatches from stream-value components.
  const acc = (b: number, rate: number, elapsedSec: number) => b + rate * elapsedSec;
  const now = Date.now();
  return [
    { id: "str_4821", dir: "in",  party: "stripe-payroll.sol",    addr: "7Hk2...q4Wp", token: "USDC", rate: 0.0125,   status: "streaming", started: now, base: acc(5400.234,  0.0125,   5 * 86400),       label: "Salary - Stripe Inc",             deposit: 12000, totalDuration: 30  * 86400, policy: "standard", category: "HUMAN_PAYROLL" },
    { id: "str_3902", dir: "in",  party: "client.maya.sol",        addr: "9Bc1...aL3z", token: "USDC", rate: 0.00231,  status: "streaming", started: now, base: acc(99.812,    0.00231,  12 * 3600),        label: "Freelance - Component lib",       deposit: 800,   totalDuration: 14  * 86400, policy: "standard", category: "HUMAN_PAYROLL" },
    { id: "str_3711", dir: "in",  party: "lumen.tv",               addr: "F2dN...r88M", token: "USDC", rate: 0.00041,  status: "paused",    started: now, base: 12.45,                                       label: "Royalty - Episode 04",            deposit: 200,   totalDuration: 90  * 86400, policy: "standard", category: "SUBSCRIPTION" },
    { id: "str_2210", dir: "out", party: "Render-GPU-Cluster",     addr: "Aj4Q...7P2x", token: "USDC", rate: 0.0083,   status: "streaming", started: now, base: acc(178.94,    0.0083,   6 * 3600),         label: "GPU compute - Render network",    deposit: 4000,  totalDuration: 21  * 86400, policy: "agent",    budgetCap: 5000, autoRevoke: "2026-06-30", category: "AI_COMPUTE" },
    { id: "str_1908", dir: "out", party: "Llama-3-Inference-API",  addr: "K91v...4Mtt", token: "USDC", rate: 0.00012,  status: "streaming", started: now, base: acc(8.214,     0.00012,  22 * 3600),        label: "Inference - per-token metered",   deposit: 100,   totalDuration: 60  * 86400, policy: "agent",    budgetCap: 500,  autoRevoke: "2026-05-31", category: "AI_COMPUTE" },
    { id: "str_1144", dir: "out", party: "Data-Scraper-Bot-04",    addr: "Z4qC...dA08", token: "USDC", rate: 0.000045, status: "streaming", started: now, base: acc(4.21,      0.000045, 9 * 86400),        label: "Scraper - web ingestion",         deposit: 250,   totalDuration: 365 * 86400, policy: "agent",    budgetCap: 250,  autoRevoke: "2026-12-31", category: "AI_COMPUTE" },
  ];
}

export const HISTORY_DETAILED: MockHistoryItem[] = [
  { id: "tx_88a1", kind: "ended", party: "redbull.studio", final: 482.4, token: "USDC", at: "Apr 22 - 14:08", duration: 12 * 86400 + 4 * 3600, tx: "9af...c14" },
  { id: "tx_61dd", kind: "ended", party: "podcast.ad", final: 130, token: "USDC", at: "Apr 14 - 22:11", duration: 7 * 86400, tx: "71f...22a" },
  { id: "tx_4910", kind: "cancelled", party: "old.contractor", final: 42.1, token: "USDC", at: "Apr 16 - 11:22", duration: 2 * 86400 + 6 * 3600, tx: "67c...9d4" },
  { id: "tx_5a02", kind: "ended", party: "summer-intern.sol", final: 1840, token: "USDC", at: "Apr 12 - 09:00", duration: 60 * 86400, tx: "ab2...5fc" },
  { id: "tx_4421", kind: "cancelled", party: "demo.client", final: 18.5, token: "USDC", at: "Apr 09 - 19:44", duration: 4 * 3600, tx: "55c...dd1" },
  { id: "tx_3201", kind: "ended", party: "lumen.tv - ep03", final: 96.8, token: "USDC", at: "Apr 07 - 12:33", duration: 14 * 86400, tx: "7ee...910" },
];

export const AGENTS: MockAgent[] = [
  { id: "gpt4o", name: "GPT-4o - research", model: "openai/gpt-4o", rate: 0.00004, status: "active", calls: 1284 },
  { id: "claude", name: "Claude 3.5 - editor", model: "anthropic/claude-3.5", rate: 0.00006, status: "active", calls: 412 },
  { id: "llama", name: "Llama-self - proxy", model: "meta/llama-3-70b", rate: 0.000008, status: "idle", calls: 89 },
  { id: "custom1", name: "drip-orchestrator", model: "internal/router", rate: 0.00002, status: "active", calls: 2014 },
];

export const AGENT_LOG_DEMO = {
  baseSpent: 12.408214,
  baseSettlements: 1284,
  intervalMs: 700,
  tokenMin: 200,
  tokenSpread: 1800,
  verbs: ["paid", "settled", "metered"],
  targets: ["agent.editor", "agent.research", "agent.publisher", "human.eli", "agent.summarize"],
};

export const DASHBOARD_NAV_ITEMS = [
  { k: "dashboard", icon: "layout-dashboard", label: "Dashboard" },
  { k: "streams", icon: "waves", label: "Streams", hasStreamBadge: true },
  { k: "yield", icon: "sprout", label: "Yield" },
  { k: "history", icon: "scroll-text", label: "History" },
  { k: "agents", icon: "bot", label: "Agents" },
  { k: "reports", icon: "file-text", label: "Reports & Compliance" },
  { k: "settings", icon: "settings-2", label: "Settings" },
];

export const DASHBOARD_ROUTE_LABELS = {
  dashboard: "Dashboard",
  streams: "Streams",
  yield: "Yield",
  history: "History",
  agents: "Agents",
  reports: "Reports & Compliance",
  settings: "Settings",
};

export const DASHBOARD_OVERVIEW_STATS = {
  initialBalance: 28_403.41832,
  totalStreamed: 184_212.508,
  lifetimeYield: 184.2174,
  yieldEscrowBase: 8420,
  sparklineBase: 26800,
};

export const STREAM_FILTERS = [
  { k: "all", l: "All" },
  { k: "in", l: "Incoming" },
  { k: "out", l: "Outgoing" },
  { k: "paused", l: "Paused" },
];

export const HISTORY_FILTERS = [
  { k: "all", l: "All" },
  { k: "ended", l: "Completed" },
  { k: "cancelled", l: "Cancelled" },
];

export const TOP_UP_DEFAULT_AMOUNT = 500;
export const TOP_UP_PRESETS = [100, 500, 1000, 5000];

export const YIELD_DEMO = {
  apy: 4.81,
  escrow: 8420,
  lifetime: 184.2174,
  claimable: 21.4382,
  pools: [
    { name: "Raydium · USDC / USDT", share: 62, apy: "4.92%", tvl: "$120.4M" },
    { name: "Raydium · USDC / SOL", share: 28, apy: "6.10%", tvl: "$84.2M" },
    { name: "USDC reserve (instant)", share: 10, apy: "0.00%", tvl: "-" },
  ],
  lifecycle: [
    ["Stream initialized", "Funds enter a Drip-managed PDA escrow."],
    ["90% routed to Raydium", "Reserve 10% kept liquid for instant withdrawals."],
    ["Yield accrues per block", "Settled to your account every Solana epoch."],
    ["Receiver withdraws", "Funds + your earned yield, fully composable."],
  ],
};

export const SETTINGS_DEFAULTS = [
  { label: "Default token", value: "USDC" },
  { label: "Default period", value: "per month" },
  { label: "Auto-route to Raydium", value: "On", tone: "up" },
  { label: "Notifications", value: "Email + browser" },
];

export const NEW_STREAM_DEFAULTS = {
  recipient: "",
  token: "USDC",
  amount: 2000,
  period: "month",
  label: "",
  deposit: 2000,
  policy: "standard" as StreamPolicy,
  budgetCap: 500,
  autoRevoke: "2026-12-31",
  recipientPlaceholder: "alex.sol  or  9Bc1...aL3z",
  periodSeconds: { hour: 3600, day: 86400, week: 604800, month: 2_592_000 },
  quickRecipients: ["maya.sol", "alex.dev.sol", "team.drip.sol"],
  tokenBalance: "12,481.40",
  networkFee: "$0.00018",
};

export const STREAM_TOKEN_OPTIONS = [
  { k: "USDC", color: "from-cyan-400 to-blue-500" },
  { k: "SOL", color: "from-violet-400 to-fuchsia-500" },
  { k: "USDT", color: "from-emerald-400 to-green-500" },
];

export const REPORT_LEDGER: ReportLedgerItem[] = [
  { date: "2026-04-22", counterparty: "stripe-payroll.sol", addr: "7Hk2BqXr8nPv4Lm9c3wTfDqYsQvNxAa1RkZjMpUwq4Wp", category: "payroll", duration: 30 * 86400, amount: 11250.0, tx: "9af3c2d1bbe8714c0a7...c14", type: "in" },
  { date: "2026-04-19", counterparty: "alex.dev.sol", addr: "Aj4Q9HgYpXcW7N2zLk0RvBmQfTsUaCdEhFiJkLmP7P2x", category: "payroll", duration: 21 * 86400, amount: 4800.0, tx: "5ec7d8a44091d3c2...71a", type: "out" },
  { date: "2026-04-18", counterparty: "openai-gw.sol", addr: "K91vGd7sBn4MwQpRzXcVfLkJyHa2EuTrCbAoFm84Mtt", category: "ai-compute", duration: 22 * 3600, amount: 9.74, tx: "3df1c4a8e7290bbe...22b", type: "out" },
  { date: "2026-04-15", counterparty: "client.maya.sol", addr: "9Bc1eX5kPfRtUqSvLjMnHzWxYpGdAaCbFhKrTuVwaL3z", category: "payroll", duration: 14 * 86400, amount: 2800.0, tx: "71f8e2b9c1d4f7...22a", type: "in" },
  { date: "2026-04-14", counterparty: "lumen.tv", addr: "F2dN3wKpQvRsTuXyZbCmHgLkJiFeEaDcBnAoMpQr88M", category: "subs", duration: 90 * 86400, amount: 36.9, tx: "a4e9b2c8f1d6e3...910", type: "in" },
  { date: "2026-04-12", counterparty: "anthropic.sol", addr: "B7hR2zQ8sWdEfKlMnPvCxTuYbAaJiHgFnRpKqXyV3Q1", category: "ai-compute", duration: 18 * 3600, amount: 14.22, tx: "c6f9a1d2e3b8...7f0", type: "out" },
  { date: "2026-04-10", counterparty: "chronos.host", addr: "Z4qC2pNbVxRtKsLwMjHdAaFcEyUiOpQsTvBnGmRrdA08", category: "subs", duration: 365 * 86400, amount: 145.5, tx: "82bd1cc6e4f3a7...5b1", type: "out" },
  { date: "2026-04-08", counterparty: "summer-intern.sol", addr: "P3rX8mLwBqCdHkFjNvTuAyEzOpRsUiVxYbWcGnHr6Hk", category: "payroll", duration: 60 * 86400, amount: 3600.0, tx: "12ef9a8b3c2d...4f7", type: "out" },
  { date: "2026-04-06", counterparty: "drip-orchestrator", addr: "L8mN5kRqPdSwTvXyZbCfHgJiAaEoUpVrFsBnGmHd2Nb", category: "ai-compute", duration: 48 * 3600, amount: 5.81, tx: "ee01a4b7c2d9...811", type: "out" },
  { date: "2026-04-03", counterparty: "redbull.studio", addr: "Q9wPkLmNbCfHjGdTrAyEoUpVxYzBhJiKsRtSvXn1Rb", category: "subs", duration: 12 * 86400 + 4 * 3600, amount: 482.4, tx: "d2c3b4a5f6e7...0a8", type: "in" },
];

export const COMPLIANCE_CATEGORY_LABELS = {
  all: "All categories",
  payroll: "Human Contractors",
  "ai-compute": "AI Agent Expenses",
  subs: "Subscriptions",
};

export const COMPLIANCE_CATEGORY_ICON = { payroll: "users", "ai-compute": "bot", subs: "repeat" };

export const COMPLIANCE_PRESETS = [
  { k: "month", label: "This month" },
  { k: "lastmonth", label: "Last month" },
  { k: "q1", label: "Q1 2026" },
  { k: "q2", label: "Q2 2026" },
  { k: "ytd", label: "YTD" },
  { k: "custom", label: "Custom" },
];

export const COMPLIANCE_CATEGORY_FILTERS = [
  { k: "all", label: "All", icon: "layers" },
  { k: "ai-compute", label: "AI Agent Expenses", icon: "bot" },
  { k: "payroll", label: "Human Contractors", icon: "users" },
  { k: "subs", label: "Subscriptions", icon: "repeat" },
];

export const COMPLIANCE_DEFAULT_RANGE = { preset: "month", from: "2026-04-01", to: "2026-04-30" };

export const COMPLIANCE_EXPORT = {
  pageSize: 6,
  taxRate: 0.1,
  networkLabel: "Solana mainnet",
  ledgerNetworkLabel: "Solana Mainnet",
  integrations: ["Xero", "QuickBooks", "Wave"],
  fileStem: "Apr2026",
  secondaryActions: [
    { icon: "mail", label: "Email to accountant", sub: "One-tap delivery" },
    { icon: "webhook", label: "Sync to QuickBooks", sub: "Live sync · OAuth" },
    { icon: "file-spreadsheet", label: "Export CSV for Xero", sub: "Direct chart-of-accounts map" },
    { icon: "calendar-clock", label: "Schedule monthly", sub: "Auto-generate on the 1st" },
    { icon: "webhook", label: "Sync to QuickBooks", sub: "Live sync · OAuth" },
    { icon: "file-spreadsheet", label: "Export CSV for Xero", sub: "Direct chart-of-accounts map" },
    { icon: "calendar-clock", label: "Schedule monthly", sub: "Auto-generate on the 1st" },
  ],
};
