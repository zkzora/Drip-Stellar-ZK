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
  { label: "Block time", value: PROTOCOL_STATS.blockTime, hint: "Solana devnet" },
  { label: "Settlement", value: PROTOCOL_STATS.settlement, hint: "end to end" },
  { label: "Stream fee", value: PROTOCOL_STATS.streamFee, hint: "protocol" },
];

export const LANDING_STREAMING_CARD = {
  rate: 0.000231,
  initialValue: 4.523456,
  startedOffsetMs: 86_400_000,
  activeStreamId: "#4821",
  fromAddress: "7Hk2...q4Wp",
  fromLabel: "master-agent.sol",
  toAddress: "9Bc1...aL3z",
  toLabel: "deepseek-api.node",
  token: "SOL",
  tokenKind: "native",
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
    body: "CSV exports for tax and accounting workflows. Every stream is verifiable on-chain - accountants get clean ledgers, auditors get cryptographic receipts. PDF export coming soon.",
    meta: "CSV export live · PDF export coming next",
  },
];

export const STELLAR_DRIP_PILLARS = [
  {
    n: "i",
    title: "Agent-Native",
    icon: "bot",
    body: "Built for programmatic spending and auto-scaling. Agents hire other agents with budget caps, auto-revoke clauses, and per-token metering - no human in the loop.",
    meta: "Spending policies · Auto-scale · Agent SDK",
  },
  {
    n: "ii",
    title: "Soroban Smart Contracts",
    icon: "gauge",
    body: "Leveraging Stellar's Soroban execution environment for per-second settlement. Streams settle continuously via the Drip contract — trustless, non-custodial.",
    meta: "Stellar Testnet · Soroban · native XLM",
    highlight: true,
  },
  {
    n: "iii",
    title: "Audit-Ready",
    icon: "file-check-2",
    body: "CSV exports for tax and accounting workflows. Every stream is verifiable on Stellar Expert - accountants get clean ledgers, auditors get cryptographic receipts. PDF export coming soon.",
    meta: "CSV export live · PDF export coming next",
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
      "Pay-as-you-watch streaming - SOL/sec instead of monthly.",
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
  hourlyLabel: "$45.00/h · 0.0125 SOL/sec (demo)",
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
  totalSettled: "0.000745 SOL",
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
  { icon: "package", title: "drip-sol SDK (planned)", desc: "Lightweight TypeScript client for the Drip Anchor program - in development. Interact via the IDL today." },
  { icon: "webhook", title: "Stream webhooks (roadmap)", desc: "React to deposit, withdraw, pause, and complete events in real time." },
  { icon: "file-code-2", title: "Anchor IDL - live on devnet", desc: "On-chain program is open-source at D5u3Ci...pkKM6. Audit, fork, or extend today." },
];

export const DEV_CODE_SAMPLE = `<span class="tk-c">// Drip is live on Solana devnet - drip-sol SDK is planned</span>
<span class="tk-c">// Use the Anchor client directly today</span>

<span class="tk-k">import</span> <span class="tk-p">*</span> <span class="tk-k">as</span> <span class="tk-v">anchor</span> <span class="tk-k">from</span> <span class="tk-s">"@coral-xyz/anchor"</span><span class="tk-p">;</span>
<span class="tk-k">import</span> <span class="tk-p">{</span> <span class="tk-v">PublicKey</span> <span class="tk-p">}</span> <span class="tk-k">from</span> <span class="tk-s">"@solana/web3.js"</span><span class="tk-p">;</span>

<span class="tk-k">const</span> <span class="tk-v">receiver</span> <span class="tk-p">=</span> <span class="tk-k">new</span> <span class="tk-f">PublicKey</span><span class="tk-p">(</span><span class="tk-s">"9Bc1...aL3z"</span><span class="tk-p">);</span>

<span class="tk-c">// Create a stream - 0.001 SOL/sec, 0.5 SOL deposit (native SOL)</span>
<span class="tk-k">const</span> <span class="tk-v">tx</span> <span class="tk-p">=</span> <span class="tk-k">await</span> <span class="tk-v">program</span><span class="tk-p">.</span><span class="tk-v">methods</span>
  <span class="tk-p">.</span><span class="tk-f">createStream</span><span class="tk-p">(</span>
    <span class="tk-k">new</span> <span class="tk-v">anchor</span><span class="tk-p">.</span><span class="tk-f">BN</span><span class="tk-p">(</span><span class="tk-n">11574</span><span class="tk-p">),</span>         <span class="tk-c">// lamports per second</span>
    <span class="tk-k">new</span> <span class="tk-v">anchor</span><span class="tk-p">.</span><span class="tk-f">BN</span><span class="tk-p">(</span><span class="tk-n">500_000_000</span><span class="tk-p">),</span>  <span class="tk-c">// deposit (0.5 SOL)</span>
    <span class="tk-k">new</span> <span class="tk-v">anchor</span><span class="tk-p">.</span><span class="tk-f">BN</span><span class="tk-p">(</span><span class="tk-v">expiresAt</span><span class="tk-p">),</span>     <span class="tk-c">// unix timestamp</span>
  <span class="tk-p">)</span>
  <span class="tk-p">.</span><span class="tk-f">accounts</span><span class="tk-p">({</span> <span class="tk-v">receiver</span> <span class="tk-p">})</span>
  <span class="tk-p">.</span><span class="tk-f">rpc</span><span class="tk-p">();</span>
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
  { name: "MoonPay", role: "Fiat on-ramp", icon: "banknote", note: "Card to SOL on-ramp" },
  { name: "Raydium", role: "Yield routing (roadmap)", icon: "sprout", note: "Idle escrow yield - coming soon" },
];

export const FINAL_CTA_STATS = ["devnet · live", "native SOL · MVP", "Anchor · open source"];

export const FOOTER_SOCIALS = [
  { icon: "twitter", href: "https://x.com/Drip_agents" },
];

export const FOOTER_LINK_GROUPS: { title: string; links: string[] }[] = [];

export function createSeedStreams(): MockStream[] {
  const acc = (b: number, rate: number, elapsedSec: number) => b + rate * elapsedSec;
  const now = Date.now();
  return [
    { id: "str_4821", dir: "in",  party: "stripe-payroll.sol",    addr: "7Hk2...q4Wp", token: "SOL", rate: 0.0125,   status: "streaming", started: now, base: acc(5.234,   0.0125,   5 * 86400),       label: "Salary - Stripe Inc (demo)",          deposit: 12,   totalDuration: 30  * 86400, policy: "standard", category: "HUMAN_PAYROLL" },
    { id: "str_3902", dir: "in",  party: "client.maya.sol",        addr: "9Bc1...aL3z", token: "SOL", rate: 0.00231,  status: "streaming", started: now, base: acc(0.812,   0.00231,  12 * 3600),        label: "Freelance - Component lib (demo)",    deposit: 0.8,  totalDuration: 14  * 86400, policy: "standard", category: "HUMAN_PAYROLL" },
    { id: "str_3711", dir: "in",  party: "lumen.tv",               addr: "F2dN...r88M", token: "SOL", rate: 0.00041,  status: "paused",    started: now, base: 0.245,                                      label: "Royalty - Episode 04 (demo)",         deposit: 0.2,  totalDuration: 90  * 86400, policy: "standard", category: "SUBSCRIPTION" },
    { id: "str_2210", dir: "out", party: "Render-GPU-Cluster",     addr: "Aj4Q...7P2x", token: "SOL", rate: 0.0083,   status: "streaming", started: now, base: acc(1.794,   0.0083,   6 * 3600),          label: "GPU compute - Render (demo)",         deposit: 4,    totalDuration: 21  * 86400, policy: "agent",    budgetCap: 5,   autoRevoke: "2026-06-30", category: "AI_COMPUTE" },
    { id: "str_1908", dir: "out", party: "Llama-3-Inference-API",  addr: "K91v...4Mtt", token: "SOL", rate: 0.00012,  status: "streaming", started: now, base: acc(0.0821,  0.00012,  22 * 3600),         label: "Inference - per-token (demo)",        deposit: 0.5,  totalDuration: 60  * 86400, policy: "agent",    budgetCap: 0.5, autoRevoke: "2026-05-31", category: "AI_COMPUTE" },
    { id: "str_1144", dir: "out", party: "Data-Scraper-Bot-04",    addr: "Z4qC...dA08", token: "SOL", rate: 0.000045, status: "streaming", started: now, base: acc(0.0421,  0.000045, 9 * 86400),         label: "Scraper - web ingestion (demo)",      deposit: 0.25, totalDuration: 365 * 86400, policy: "agent",    budgetCap: 0.25, autoRevoke: "2026-12-31", category: "AI_COMPUTE" },
  ];
}

export const HISTORY_DETAILED: MockHistoryItem[] = [
  { id: "tx_88a1", kind: "ended",     party: "redbull.studio",     final: 4.82,  token: "SOL", at: "Apr 22 - 14:08", duration: 12 * 86400 + 4 * 3600, tx: "9af...c14" },
  { id: "tx_61dd", kind: "ended",     party: "podcast.ad",         final: 1.30,  token: "SOL", at: "Apr 14 - 22:11", duration: 7 * 86400,              tx: "71f...22a" },
  { id: "tx_4910", kind: "cancelled", party: "old.contractor",     final: 0.42,  token: "SOL", at: "Apr 16 - 11:22", duration: 2 * 86400 + 6 * 3600,  tx: "67c...9d4" },
  { id: "tx_5a02", kind: "ended",     party: "summer-intern.sol",  final: 18.40, token: "SOL", at: "Apr 12 - 09:00", duration: 60 * 86400,             tx: "ab2...5fc" },
  { id: "tx_4421", kind: "cancelled", party: "demo.client",        final: 0.18,  token: "SOL", at: "Apr 09 - 19:44", duration: 4 * 3600,               tx: "55c...dd1" },
  { id: "tx_3201", kind: "ended",     party: "lumen.tv - ep03",    final: 0.97,  token: "SOL", at: "Apr 07 - 12:33", duration: 14 * 86400,             tx: "7ee...910" },
];

export const AGENTS: MockAgent[] = [
  { id: "gpt4o",   name: "GPT-4o - research",     model: "openai/gpt-4o",          rate: 0.00004,  status: "active", calls: 1284 },
  { id: "claude",  name: "Claude 3.5 - editor",   model: "anthropic/claude-3.5",   rate: 0.00006,  status: "active", calls: 412  },
  { id: "llama",   name: "Llama-self - proxy",     model: "meta/llama-3-70b",       rate: 0.000008, status: "idle",   calls: 89   },
  { id: "custom1", name: "drip-orchestrator",      model: "internal/router",        rate: 0.00002,  status: "active", calls: 2014 },
];

export const AGENT_LOG_DEMO = {
  baseSpent: 0.012408,
  baseSettlements: 1284,
  intervalMs: 700,
  tokenMin: 200,
  tokenSpread: 1800,
  verbs: ["paid", "settled", "metered"],
  targets: ["agent.editor", "agent.research", "agent.publisher", "human.eli", "agent.summarize"],
};

export const DASHBOARD_NAV_ITEMS = [
  { k: "dashboard", icon: "layout-dashboard", label: "Dashboard" },
  { k: "streams",   icon: "waves",            label: "Streams", hasStreamBadge: true },
  { k: "yield",     icon: "sprout",           label: "Yield" },
  { k: "history",   icon: "scroll-text",      label: "History" },
  { k: "agents",    icon: "bot",              label: "Agents" },
  { k: "reports",   icon: "file-text",        label: "Reports & Compliance" },
  { k: "settings",  icon: "settings-2",       label: "Settings" },
];

export const DASHBOARD_ROUTE_LABELS = {
  dashboard: "Dashboard",
  streams:   "Streams",
  yield:     "Yield",
  history:   "History",
  agents:    "Agents",
  reports:   "Reports & Compliance",
  settings:  "Settings",
};

export const DASHBOARD_OVERVIEW_STATS = {
  initialBalance:  28.41832,
  totalStreamed:   184.508,
  lifetimeYield:   0.2174,
  yieldEscrowBase: 8.420,
  sparklineBase:   26.8,
};

export const STREAM_FILTERS = [
  { k: "all",    l: "All" },
  { k: "in",     l: "Incoming" },
  { k: "out",    l: "Outgoing" },
  { k: "paused", l: "Paused" },
];

export const HISTORY_FILTERS = [
  { k: "all",       l: "All" },
  { k: "ended",     l: "Completed" },
  { k: "cancelled", l: "Cancelled" },
];

export const TOP_UP_DEFAULT_AMOUNT = 500;
export const TOP_UP_PRESETS = [100, 500, 1000, 5000];

export const YIELD_DEMO = {
  apy: 4.81,
  escrow: 8.420,
  lifetime: 0.2174,
  claimable: 0.021438,
  pools: [
    { name: "Raydium · SOL / USDC (roadmap)", share: 62, apy: "4.92%",  tvl: "coming soon" },
    { name: "Raydium · SOL / USDT (roadmap)", share: 28, apy: "6.10%",  tvl: "coming soon" },
    { name: "SOL reserve (instant)",          share: 10, apy: "0.00%",  tvl: "-" },
  ],
  lifecycle: [
    ["Stream initialized",    "Funds enter a Drip-managed PDA escrow."],
    ["Yield routing roadmap", "90% routed to Raydium pools is planned - not yet live."],
    ["Yield accrues (planned)", "Will settle to your account every Solana epoch when enabled."],
    ["Receiver withdraws",    "Funds + earned yield, fully composable."],
  ],
};

export const SETTINGS_DEFAULTS = [
  { label: "Default token",         value: "SOL" },
  { label: "Default period",        value: "per month" },
  { label: "Auto-route to Raydium", value: "Roadmap", tone: "neutral" },
  { label: "Notifications",         value: "Email + browser" },
];

export const STELLAR_SETTINGS_DEFAULTS = [
  { label: "Default token",         value: "XLM" },
  { label: "Default period",        value: "per month" },
  { label: "Network",               value: "Stellar Testnet" },
  { label: "Notifications",         value: "Email + browser" },
];

export const NEW_STREAM_DEFAULTS = {
  recipient: "",
  token: "SOL",
  amount: 0.5,
  period: "month",
  label: "",
  deposit: 1.0,
  policy: "standard" as StreamPolicy,
  budgetCap: 0.5,
  autoRevoke: "2026-12-31",
  recipientPlaceholder: "alex.sol  or  9Bc1...aL3z",
  periodSeconds: { hour: 3600, day: 86400, week: 604800, month: 2_592_000 },
  quickRecipients: ["maya.sol", "alex.dev.sol", "team.drip.sol"],
  tokenBalance: "12.48",
  networkFee: "$0.00018",
};

export const STREAM_TOKEN_OPTIONS = [
  { k: "SOL",  color: "from-violet-400 to-fuchsia-500" },
  { k: "USDC", color: "from-cyan-400 to-blue-500",    disabled: true, note: "roadmap" },
  { k: "USDT", color: "from-emerald-400 to-green-500", disabled: true, note: "roadmap" },
];

export const REPORT_LEDGER: ReportLedgerItem[] = [
  { date: "2026-04-22", counterparty: "stripe-payroll.sol", addr: "7Hk2BqXr8nPv4Lm9c3wTfDqYsQvNxAa1RkZjMpUwq4Wp", category: "payroll",    duration: 30 * 86400,             amount: 112.50, tx: "9af3c2d1bbe8714c0a7...c14", type: "in"  },
  { date: "2026-04-19", counterparty: "alex.dev.sol",       addr: "Aj4Q9HgYpXcW7N2zLk0RvBmQfTsUaCdEhFiJkLmP7P2x", category: "payroll",    duration: 21 * 86400,             amount: 48.00,  tx: "5ec7d8a44091d3c2...71a", type: "out" },
  { date: "2026-04-18", counterparty: "openai-gw.sol",      addr: "K91vGd7sBn4MwQpRzXcVfLkJyHa2EuTrCbAoFm84Mtt", category: "ai-compute", duration: 22 * 3600,              amount: 0.97,   tx: "3df1c4a8e7290bbe...22b", type: "out" },
  { date: "2026-04-15", counterparty: "client.maya.sol",    addr: "9Bc1eX5kPfRtUqSvLjMnHzWxYpGdAaCbFhKrTuVwaL3z", category: "payroll",    duration: 14 * 86400,             amount: 28.00,  tx: "71f8e2b9c1d4f7...22a", type: "in"  },
  { date: "2026-04-14", counterparty: "lumen.tv",           addr: "F2dN3wKpQvRsTuXyZbCmHgLkJiFeEaDcBnAoMpQr88M", category: "subs",       duration: 90 * 86400,             amount: 0.37,   tx: "a4e9b2c8f1d6e3...910", type: "in"  },
  { date: "2026-04-12", counterparty: "anthropic.sol",      addr: "B7hR2zQ8sWdEfKlMnPvCxTuYbAaJiHgFnRpKqXyV3Q1", category: "ai-compute", duration: 18 * 3600,              amount: 0.14,   tx: "c6f9a1d2e3b8...7f0", type: "out" },
  { date: "2026-04-10", counterparty: "chronos.host",       addr: "Z4qC2pNbVxRtKsLwMjHdAaFcEyUiOpQsTvBnGmRrdA08", category: "subs",       duration: 365 * 86400,            amount: 1.45,   tx: "82bd1cc6e4f3a7...5b1", type: "out" },
  { date: "2026-04-08", counterparty: "summer-intern.sol",  addr: "P3rX8mLwBqCdHkFjNvTuAyEzOpRsUiVxYbWcGnHr6Hk", category: "payroll",    duration: 60 * 86400,             amount: 18.40,  tx: "12ef9a8b3c2d...4f7", type: "out" },
  { date: "2026-04-06", counterparty: "drip-orchestrator",  addr: "L8mN5kRqPdSwTvXyZbCfHgJiAaEoUpVrFsBnGmHd2Nb", category: "ai-compute", duration: 48 * 3600,              amount: 0.058,  tx: "ee01a4b7c2d9...811", type: "out" },
  { date: "2026-04-03", counterparty: "redbull.studio",     addr: "Q9wPkLmNbCfHjGdTrAyEoUpVxYzBhJiKsRtSvXn1Rb",  category: "subs",       duration: 12 * 86400 + 4 * 3600, amount: 4.82,   tx: "d2c3b4a5f6e7...0a8", type: "in"  },
];

export const COMPLIANCE_CATEGORY_LABELS = {
  all:          "All categories",
  payroll:      "Human Contractors",
  "ai-compute": "AI Agent Expenses",
  subs:         "Subscriptions",
};

export const COMPLIANCE_CATEGORY_ICON = { payroll: "users", "ai-compute": "bot", subs: "repeat" };

export const COMPLIANCE_PRESETS = [
  { k: "month",     label: "This month" },
  { k: "lastmonth", label: "Last month" },
  { k: "q1",        label: "Q1 2026" },
  { k: "q2",        label: "Q2 2026" },
  { k: "ytd",       label: "YTD" },
  { k: "custom",    label: "Custom" },
];

export const COMPLIANCE_CATEGORY_FILTERS = [
  { k: "all",        label: "All",               icon: "layers" },
  { k: "ai-compute", label: "AI Agent Expenses", icon: "bot"    },
  { k: "payroll",    label: "Human Contractors", icon: "users"  },
  { k: "subs",       label: "Subscriptions",     icon: "repeat" },
];

export const COMPLIANCE_DEFAULT_RANGE = { preset: "month", from: "2026-04-01", to: "2026-04-30" };

// ─── Stellar Testnet overrides (used when NEXT_PUBLIC_APP_CHAIN=stellar) ────

export const STELLAR_PROTOCOL_STATS: ProtocolStats = {
  clusterLabel: "Stellar Testnet",
  version: "v0.4.2",
  blockTime: "5s",
  settlement: "<6s",
  streamFee: "0.10%",
  rpcStatus: "RPC ok",
  rpcSlotShort: "56,812k",
  slot: "56,812,441",
  complianceSlot: "56,812,504",
  protocolStatus: "Autonomous",
  finalityLabel: "SETTLING ON STELLAR TESTNET",
  yieldApy: 0,
};

export const STELLAR_LANDING_PROTOCOL_STATS = [
  { label: "Block time",  value: "5s",      hint: "Stellar Testnet" },
  { label: "Settlement",  value: "<6s",     hint: "end to end" },
  { label: "Stream fee",  value: "0.10%",   hint: "protocol" },
];

export const STELLAR_LANDING_STREAMING_CARD = {
  rate: 0.000231,
  initialValue: 4.523456,
  startedOffsetMs: 86_400_000,
  activeStreamId: "#4821",
  fromAddress: "GCKF...W2XZ",
  fromLabel: "master-agent",
  toAddress: "GBCA...3M7Q",
  toLabel: "deepseek-api.node",
  token: "XLM",
  tokenKind: "native",
  txHash: "0x9af...c14",
};

export const STELLAR_LANDING_PARTNERS = ["Stellar", "Soroban", "Freighter", "Horizon", "Friendbot"];

export const STELLAR_ECOSYSTEM_PARTNERS = [
  { name: "Stellar",   role: "Settlement layer",    icon: "circle-dot",  note: "Testnet · Soroban smart contracts" },
  { name: "Soroban",   role: "Smart contracts",     icon: "file-code-2", note: "Native contract execution" },
  { name: "Freighter", role: "Wallet signer",       icon: "fingerprint", note: "Browser extension · no private keys shared" },
  { name: "Horizon",   role: "RPC & API",           icon: "webhook",     note: "Testnet API · stream queries" },
];

export const STELLAR_FINAL_CTA_STATS = ["testnet · live", "native XLM · Soroban"];

export const STELLAR_DEV_CODE_SAMPLE = `<span class="tk-c">// Drip is live on Stellar Testnet — Soroban contract</span>
<span class="tk-c">// Connect with Freighter and call the contract below</span>

<span class="tk-k">import</span> <span class="tk-p">{</span> <span class="tk-v">SorobanRpc</span><span class="tk-p">,</span> <span class="tk-v">Contract</span><span class="tk-p">,</span> <span class="tk-v">TransactionBuilder</span> <span class="tk-p">}</span> <span class="tk-k">from</span> <span class="tk-s">"@stellar/stellar-sdk"</span><span class="tk-p">;</span>

<span class="tk-k">const</span> <span class="tk-v">rpc</span> <span class="tk-p">=</span> <span class="tk-k">new</span> <span class="tk-f">SorobanRpc.Server</span><span class="tk-p">(</span><span class="tk-s">"https://soroban-testnet.stellar.org"</span><span class="tk-p">);</span>
<span class="tk-k">const</span> <span class="tk-v">contract</span> <span class="tk-p">=</span> <span class="tk-k">new</span> <span class="tk-f">Contract</span><span class="tk-p">(</span><span class="tk-v">DRIP_CONTRACT_ID</span><span class="tk-p">);</span>

<span class="tk-c">// Create a stream — 0.001 XLM/sec, 0.5 XLM deposit (native XLM)</span>
<span class="tk-k">const</span> <span class="tk-v">tx</span> <span class="tk-p">=</span> <span class="tk-k">await</span> <span class="tk-v">contract</span><span class="tk-p">.</span><span class="tk-f">call</span><span class="tk-p">(</span>
  <span class="tk-s">"create_stream"</span><span class="tk-p">,</span>
  <span class="tk-v">receiver</span><span class="tk-p">,</span>
  <span class="tk-v">xdr</span><span class="tk-p">.</span><span class="tk-f">ScInt</span><span class="tk-p">(</span><span class="tk-n">10_000</span><span class="tk-p">),</span>         <span class="tk-c">// stroops per second</span>
  <span class="tk-v">xdr</span><span class="tk-p">.</span><span class="tk-f">ScInt</span><span class="tk-p">(</span><span class="tk-n">5_000_000</span><span class="tk-p">),</span>      <span class="tk-c">// deposit (0.5 XLM in stroops)</span>
  <span class="tk-v">xdr</span><span class="tk-p">.</span><span class="tk-f">ScInt</span><span class="tk-p">(</span><span class="tk-v">expiresAt</span><span class="tk-p">),</span>     <span class="tk-c">// unix timestamp</span>
<span class="tk-p">);</span>
`;

export const STELLAR_DRIP_COMPARE_PANELS = [
  {
    kind: "old",
    title: "The old way",
    label: "Lump-sum, deferred",
    timeline: [
      { d: "Day 1",  e: "Work begins. No payment." },
      { d: "Day 15", e: "Still working. Still nothing." },
      { d: "Day 30", e: "Invoice sent. Wait for bank wire." },
      { d: "Day 33", e: "First payment lands." },
    ],
    footer: "Counterparty risk · cash flow gaps · trust required",
  },
  {
    kind: "new",
    title: "The Drip way",
    label: "Real-time, per-second",
    timeline: [
      { d: "00:00.000", e: "Stream initialized on Soroban." },
      { d: "00:05.000", e: "First settlement (Stellar Testnet)." },
      { d: "00:10.000", e: "Funds withdrawable via Freighter." },
      { d: "Continuous", e: "XLM flows while value flows." },
    ],
    footer: "Trustless · zero gap · stop work, stop pay",
  },
];

export const STELLAR_WORKFORCE_DEMO = {
  initialEarned: 2418.4,
  ratePerSec: 0.0125,
  workerName: "Maya Chen",
  workerHandle: "@maya",
  hourlyLabel: "$45.00/h · 0.0125 XLM/sec (demo)",
  tasks: [
    { name: "Landing page redesign", rate: "$45/h", state: "active" },
    { name: "Component library",     rate: "$45/h", state: "queued" },
    { name: "Analytics dashboard",   rate: "$60/h", state: "queued" },
  ],
};

export const STELLAR_LANDING_AGENT_DEMO = {
  sessionName: "Agent mesh · session 1f4e",
  sessionMeta: "4 agents · 12 sub-streams · Freighter signed",
  streamId: "stream://1f4e",
  totalSettled: "0.000745 XLM",
  avgLatency: "5.2s",
  baseSettlements: 12,
  events: [
    { from: "agent.research",   to: "agent.summarize",  amt: "0.000412", note: "tools/web_search · 1.2k tok" },
    { from: "agent.summarize",  to: "agent.editor",     amt: "0.000208", note: "compose/draft · 800 tok" },
    { from: "agent.editor",     to: "agent.publisher",  amt: "0.000094", note: "deliver/markdown · 240 tok" },
    { from: "agent.publisher",  to: "human.eli",        amt: "0.000031", note: "notify/payout · final" },
  ],
};

export const STELLAR_DEV_FEATURES = [
  { icon: "package",      title: "drip-stellar SDK (planned)", desc: "TypeScript client for the Drip Soroban contract — in development. Interact via the contract ABI today." },
  { icon: "webhook",      title: "Stream webhooks (roadmap)",  desc: "React to create, pause, withdraw, and cancel events via Horizon event streaming." },
  { icon: "file-code-2",  title: "Soroban contract — live on testnet", desc: "On-chain Soroban contract is open-source. Testnet only — no real funds." },
];

export const COMPLIANCE_EXPORT = {
  pageSize: 6,
  taxRate: 0.1,
  networkLabel: "Solana devnet",
  ledgerNetworkLabel: "Solana Devnet",
  integrations: ["Xero (planned)", "QuickBooks (planned)", "Wave (planned)"],
  fileStem: "Apr2026",
  secondaryActions: [
    { icon: "mail",             label: "Email to accountant",    sub: "One-tap delivery" },
    { icon: "file-spreadsheet", label: "Export CSV for Xero",    sub: "Coming soon - chart-of-accounts map" },
    { icon: "webhook",          label: "Sync to QuickBooks",     sub: "Coming soon - OAuth sync" },
    { icon: "calendar-clock",   label: "Schedule monthly",       sub: "Auto-generate on the 1st" },
  ],
};

export const STELLAR_COMPLIANCE_EXPORT = {
  pageSize: 6,
  taxRate: 0.1,
  networkLabel: "Stellar Testnet",
  ledgerNetworkLabel: "Stellar Testnet",
  integrations: ["Xero (planned)", "QuickBooks (planned)", "Wave (planned)"],
  fileStem: "Apr2026",
  secondaryActions: [
    { icon: "mail",             label: "Email to accountant",    sub: "One-tap delivery" },
    { icon: "file-spreadsheet", label: "Export CSV for Xero",    sub: "Coming soon - chart-of-accounts map" },
    { icon: "webhook",          label: "Sync to QuickBooks",     sub: "Coming soon - OAuth sync" },
    { icon: "calendar-clock",   label: "Schedule monthly",       sub: "Auto-generate on the 1st" },
  ],
};
