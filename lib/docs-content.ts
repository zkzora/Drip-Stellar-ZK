export type DocSection =
  | {
      type: "text";
      title: string;
      body: string[];
    }
  | {
      type: "list";
      title: string;
      intro?: string;
      items: string[];
    }
  | {
      type: "steps";
      title: string;
      steps: { title: string; body: string }[];
    }
  | {
      type: "cards";
      title: string;
      intro?: string;
      cards: { title: string; body: string }[];
    }
  | {
      type: "faq";
      title: string;
      items: { question: string; answer: string }[];
    }
  | {
      type: "code";
      title: string;
      intro?: string;
      language: string;
      filename?: string;
      code: string;
    }
  | {
      type: "reference";
      title: string;
      intro?: string;
      items: { label: string; body: string; meta?: string }[];
    }
  | {
      type: "note";
      title: string;
      body: string;
      tone?: "info" | "warning";
    };

export type DocPage = {
  slug: string;
  href: string;
  title: string;
  navTitle: string;
  description: string;
  eyebrow: string;
  lead: string;
  icon: string;
  sections: DocSection[];
};

export const DOCS_PAGES: DocPage[] = [
  {
    slug: "overview",
    href: "/docs",
    title: "What is DRIP?",
    navTitle: "What is DRIP?",
    description:
      "DRIP is a Solana-native streaming escrow and access layer for time-based payments and payment-aware access.",
    eyebrow: "Overview",
    icon: "waves",
    lead:
      "DRIP lets a wallet pay over time instead of sending a full upfront payment. Funds vest inside a Solana stream, receivers withdraw what has vested, and stream state can be used to control access to agents, APIs, and digital services.",
    sections: [
      {
        type: "text",
        title: "A streaming escrow and access layer",
        body: [
          "DRIP is a Solana-native streaming escrow and access layer. A payer creates a stream, deposits native SOL, and defines how funds vest over time.",
          "The receiver does not need to wait for the full stream to finish. They can withdraw the vested portion as it becomes available.",
          "The payer keeps control over the unvested portion of the stream. Depending on stream state, they can pause, resume, or cancel the stream.",
        ],
      },
      {
        type: "cards",
        title: "Who participates in a stream",
        cards: [
          {
            title: "Payer",
            body:
              "The wallet that creates and funds the stream. The payer can pause, resume, or cancel according to the stream rules.",
          },
          {
            title: "Receiver",
            body:
              "The wallet that earns over time. The receiver can withdraw vested funds without waiting for the stream to complete.",
          },
          {
            title: "Builder or service",
            body:
              "An app, agent, API, or service can read stream state and allow access only while payment conditions are met.",
          },
        ],
      },
      {
        type: "list",
        title: "What stream state can unlock",
        intro:
          "A DRIP stream can represent more than a payment schedule. It can also become a wallet-native access signal.",
        items: [
          "Active stream: access can be allowed.",
          "Paused stream: access can be blocked until the stream resumes.",
          "Cancelled stream: access can be blocked because future payment is no longer available.",
          "Insufficient or expired stream: apps can ask the payer to create a new stream or adjust access.",
        ],
      },
    ],
  },
  {
    slug: "how-it-works",
    href: "/docs/how-it-works",
    title: "How DRIP Works",
    navTitle: "How it works",
    description:
      "Create a stream, vest funds over time, withdraw vested funds, and use stream state for access control.",
    eyebrow: "Stream flow",
    icon: "repeat",
    lead:
      "A DRIP stream is a time-based escrow. It starts with a funded stream, vests over time, and gives both sides clear controls for settlement and access.",
    sections: [
      {
        type: "steps",
        title: "The stream lifecycle",
        steps: [
          {
            title: "Create stream",
            body:
              "The payer connects a wallet, chooses a receiver, sets the stream terms, and signs a transaction that funds the stream escrow with native SOL.",
          },
          {
            title: "Funds vest over time",
            body:
              "Once active, funds become available according to the stream's time-based rules. The vested amount increases while the stream remains active.",
          },
          {
            title: "Withdraw vested funds",
            body:
              "The receiver can withdraw the amount that has vested. Withdrawing does not require the stream to end.",
          },
          {
            title: "Pause or resume",
            body:
              "The payer can pause a stream when access or payment should stop temporarily. Resuming the stream allows vesting and access checks to continue.",
          },
          {
            title: "Cancel and recover unvested funds",
            body:
              "When a payer cancels, vested funds remain owed to the receiver and unvested funds return to the payer according to the stream rules.",
          },
        ],
      },
      {
        type: "cards",
        title: "Access from stream state",
        intro:
          "Services can use stream state as a deterministic access signal.",
        cards: [
          {
            title: "Active stream",
            body:
              "Access can be allowed because the payer has an active payment relationship with the receiver or service.",
          },
          {
            title: "Paused stream",
            body:
              "Access can be blocked until the payer resumes the stream or the user creates another eligible stream.",
          },
          {
            title: "Cancelled stream",
            body:
              "Access can be blocked because the payment relationship no longer has future funding.",
          },
        ],
      },
      {
        type: "note",
        title: "Deterministic does not mean risk-free",
        body:
          "Stream state gives apps a clear payment signal, but users should still review every wallet prompt before signing.",
        tone: "info",
      },
    ],
  },
  {
    slug: "use-cases",
    href: "/docs/use-cases",
    title: "Use Cases",
    navTitle: "Use cases",
    description:
      "Examples of how Solana builders and early users can apply DRIP streams.",
    eyebrow: "Applications",
    icon: "layers",
    lead:
      "DRIP is designed for products where access, work, or service delivery happens over time. Instead of one upfront payment, a wallet can keep a stream active while value is being delivered.",
    sections: [
      {
        type: "cards",
        title: "Common patterns",
        cards: [
          {
            title: "AI agent access",
            body:
              "Allow an agent session, workflow, or premium model route only while a user's stream remains active.",
          },
          {
            title: "API and service access",
            body:
              "Gate API usage, hosted services, or compute access with a wallet-native payment stream.",
          },
          {
            title: "Wallet-native subscriptions",
            body:
              "Replace card subscriptions with an onchain stream that can be paused or cancelled from the payer wallet.",
          },
          {
            title: "Contributor payouts",
            body:
              "Pay contributors continuously during an engagement while retaining control over unvested funds.",
          },
          {
            title: "Grants and bounties",
            body:
              "Fund milestone work with a stream that vests over the active work period instead of paying everything upfront.",
          },
          {
            title: "Digital services",
            body:
              "Meter access to communities, tools, datasets, or private services using active stream status.",
          },
        ],
      },
      {
        type: "list",
        title: "Where DRIP fits best",
        items: [
          "The user or buyer should be able to stop future payment.",
          "The receiver should be able to claim funds as they vest.",
          "Access should depend on payment status.",
          "Both sides benefit from transparent onchain state.",
        ],
      },
      {
        type: "note",
        title: "What DRIP is not",
        body:
          "DRIP is not a trading product, not a Raydium or yield strategy, and not a promise of returns. Its core purpose is streaming escrow and payment-aware access.",
        tone: "warning",
      },
    ],
  },
  {
    slug: "dashboard",
    href: "/docs/dashboard",
    title: "Dashboard Guide",
    navTitle: "Dashboard",
    description:
      "How to use the DRIP dashboard to create, inspect, pause, resume, withdraw, and cancel streams.",
    eyebrow: "User guide",
    icon: "gauge",
    lead:
      "The DRIP dashboard is the main interface for early users. It helps you inspect stream state, preview transactions, simulate before signing, and control active streams from your wallet.",
    sections: [
      {
        type: "steps",
        title: "Core actions",
        steps: [
          {
            title: "Connect wallet",
            body:
              "Connect an approved Solana wallet. In private alpha, access is limited to wallets that are eligible for alpha mode.",
          },
          {
            title: "Create stream",
            body:
              "Choose the receiver, funding amount, and stream terms. Review the summary before you sign.",
          },
          {
            title: "View stream state",
            body:
              "Inspect whether a stream is active, paused, cancelled, expired, or withdrawable. The dashboard presents stream status before you take action.",
          },
          {
            title: "Pause or resume",
            body:
              "Payers can pause a stream to stop ongoing vesting and access. Resuming makes the stream active again.",
          },
          {
            title: "Withdraw",
            body:
              "Receivers can withdraw vested funds. The dashboard shows the available amount before the wallet prompt.",
          },
          {
            title: "Cancel",
            body:
              "Payers can cancel a stream. Vested funds remain claimable by the receiver, and unvested funds return to the payer according to stream rules.",
          },
        ],
      },
      {
        type: "cards",
        title: "Before signing",
        cards: [
          {
            title: "Transaction preview",
            body:
              "The dashboard should show what action is being requested, which stream is affected, and the expected payment movement before the wallet prompt.",
          },
          {
            title: "Simulation before wallet prompt",
            body:
              "When supported, DRIP simulates transactions before asking you to sign so failed or unexpected transactions can be caught earlier.",
          },
          {
            title: "Real funds warning",
            body:
              "Private alpha may involve real SOL. Always read the wallet prompt and only sign transactions you understand.",
          },
        ],
      },
      {
        type: "note",
        title: "Wallet prompts still matter",
        body:
          "DRIP can improve previews and checks, but your wallet signature is still the final approval. Do not sign if the action, account, or amount looks wrong.",
        tone: "warning",
      },
    ],
  },
  {
    slug: "agent",
    href: "/docs/agent",
    title: "DRIP Agent Documentation",
    navTitle: "Agent Docs",
    description:
      "Complete guide to agent budgets, stream-based access, SDK helpers, and API and CLI integration surfaces.",
    eyebrow: "Agent budgets",
    icon: "bot",
    lead:
      "DRIP gives an AI agent a wallet-bound real-time budget. A payer streams SOL into escrow, the agent or service receives funds as they vest, and apps can use stream state to allow, pause, or revoke access without custodying private keys.",
    sections: [
      {
        type: "text",
        title: "Introduction",
        body: [
          "The DRIP agent model is built around streams, not lump-sum agent wallets. A human, team, or upstream agent creates a stream to an agent wallet, sets the flow rate, caps the maximum spend, and can pause or cancel the stream if the work should stop.",
          "The current devnet build supports real on-chain SOL streams and a dashboard agent demo. The terminal activity shown in the dashboard is simulated, while the budget panel can be backed by real on-chain stream state when a wallet is connected.",
          "For mainnet alpha, the same primitives give agents a way to prove they are funded, let services check access, and help teams audit spend from on-chain history.",
        ],
      },
      {
        type: "cards",
        title: "Core concepts",
        cards: [
          {
            title: "Agent wallet",
            body:
              "The receiver wallet for an agent, service, model route, tool runner, or worker. Any Solana wallet can be an agent wallet.",
          },
          {
            title: "Budget stream",
            body:
              "A funded stream from a payer to the agent wallet. It defines deposit, flow rate, optional max budget, and optional expiration time.",
          },
          {
            title: "Access controller",
            body:
              "A service-side check that reads stream state and decides whether an agent session, API route, or workflow is allowed.",
          },
          {
            title: "Payer controls future spend",
            body:
              "The payer funds the stream and can pause, resume, or cancel future vesting according to the program rules.",
          },
          {
            title: "Receiver earns over time",
            body:
              "The agent wallet can withdraw only the vested amount. It cannot withdraw unvested funds from the escrow.",
          },
          {
            title: "Audit trail",
            body:
              "Stream creation, withdrawal, pause, resume, and cancel actions emit on-chain events that can be indexed for reports.",
          },
        ],
      },
      {
        type: "steps",
        title: "Quick start with the dashboard",
        steps: [
          {
            title: "Connect a devnet wallet",
            body:
              "Open the DRIP dashboard, connect a Solana wallet, and make sure the wallet is set to Devnet for the current MVP.",
          },
          {
            title: "Create an agent stream",
            body:
              "Choose the agent receiver wallet, select the agent policy, enter the deposit, flow rate, max budget, and optional expiration.",
          },
          {
            title: "Review before signing",
            body:
              "Confirm the receiver address, budget cap, and expected stream behavior before approving the wallet prompt.",
          },
          {
            title: "Monitor live budget state",
            body:
              "The dashboard shows stream status, available vested balance, spend progress, and the stream account when on-chain data is available.",
          },
          {
            title: "Withdraw, pause, resume, or cancel",
            body:
              "The receiver can withdraw vested funds. The payer can pause, resume, or cancel the stream to control future spend.",
          },
        ],
      },
      {
        type: "code",
        title: "Developer quick start",
        intro:
          "Inside this repo, the frontend uses the Solana helpers directly. This example creates a one-hour agent budget stream.",
        language: "ts",
        filename: "create-agent-stream.ts",
        code: `import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { createStream } from "@/lib/solana/stream";

const agentWallet = new PublicKey("AGENT_WALLET_PUBLIC_KEY");
const oneHourFromNow = Math.floor(Date.now() / 1000) + 60 * 60;

await createStream({
  wallet,
  receiver: agentWallet,
  depositedAmountLamports: new BN("50000000"), // 0.05 SOL
  flowRateLamportsPerSecond: new BN("10000"), // 0.00001 SOL/sec
  maxBudgetLamports: new BN("50000000"),
  expirationTime: oneHourFromNow,
});`,
      },
      {
        type: "cards",
        title: "Current on-chain deployment",
        cards: [
          {
            title: "Program ID",
            body:
              "D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6",
          },
          {
            title: "Cluster",
            body:
              "Solana Devnet for the current public build. Mainnet deployment details are published with the alpha release.",
          },
          {
            title: "Supported asset",
            body:
              "Native SOL only. SPL tokens and USDC are roadmap items and should not be assumed live.",
          },
          {
            title: "Escrow model",
            body:
              "Each stream has a stream state PDA and native SOL escrow PDA derived from the payer, receiver, and stream id.",
          },
        ],
      },
      {
        type: "reference",
        title: "Anchor program instructions",
        intro:
          "These are the live devnet program instructions exposed by the current Anchor program.",
        items: [
          {
            label: "initialize_stream(stream_id, deposited_amount, flow_rate_per_second, max_budget, expiration_time)",
            body:
              "Creates a stream account, derives the escrow account, transfers the funded SOL into escrow, and stores the stream policy.",
          },
          {
            label: "withdraw()",
            body:
              "Receiver-only action that transfers the currently vested amount from escrow to the receiver wallet.",
          },
          {
            label: "pause_stream()",
            body:
              "Payer-only action that stops new vesting while preserving stream state and already vested funds.",
          },
          {
            label: "resume_stream()",
            body:
              "Payer-only action that resumes vesting and records how long the stream was paused.",
          },
          {
            label: "cancel_stream()",
            body:
              "Payer-only action that pays any vested amount due to the receiver, returns remaining stream funds to the payer, and marks the stream cancelled.",
          },
        ],
      },
      {
        type: "cards",
        title: "Budget policy fields",
        cards: [
          {
            title: "Deposit",
            body:
              "Total SOL placed into the stream escrow. The stream cannot pay more than the escrowed amount.",
          },
          {
            title: "Flow rate",
            body:
              "Lamports per second that vest while the stream is active. Higher rates unlock the budget faster.",
          },
          {
            title: "Max budget",
            body:
              "Optional cap for agent streams. If set, vested funds are capped at this amount even when deposit is larger.",
          },
          {
            title: "Expiration",
            body:
              "Optional Unix timestamp after which the stream stops unlocking additional funds.",
          },
          {
            title: "Status",
            body:
              "Derived from on-chain fields: streaming, paused, completed, cancelled, or expired.",
          },
          {
            title: "Category",
            body:
              "Frontend classification used for reporting, such as AI_COMPUTE or API_COSTS. The current program enforces payment state, not accounting labels.",
          },
        ],
      },
      {
        type: "reference",
        title: "SDK helpers in this repo",
        intro:
          "These TypeScript helpers power the app and define the shape of the agent SDK integration.",
        items: [
          {
            label: "createStream(params)",
            body:
              "Creates and funds a new stream by calling initialize_stream.",
          },
          {
            label: "fetchStream(params)",
            body:
              "Fetches one stream account and maps it into a DripStream object.",
          },
          {
            label: "fetchStreamsForWallet(params)",
            body:
              "Fetches streams where a wallet is payer, receiver, or both using account memcmp filters.",
          },
          {
            label: "withdrawFromStream(params)",
            body:
              "Lets the receiver withdraw vested SOL from a stream.",
          },
          {
            label: "pauseStream(params)",
            body:
              "Lets the payer pause an active stream.",
          },
          {
            label: "resumeStream(params)",
            body:
              "Lets the payer resume a paused stream.",
          },
          {
            label: "cancelStream(params)",
            body:
              "Lets the payer cancel the stream, settle vested funds, and recover unvested escrow.",
          },
        ],
      },
      {
        type: "code",
        title: "Access check pattern",
        intro:
          "A service can treat stream state as a payment signal. If verification fails or the stream is missing, access should fail closed.",
        language: "ts",
        filename: "agent-access-check.ts",
        code: `import { fetchStreamsForWallet } from "@/lib/solana/stream";

const streams = await fetchStreamsForWallet({
  wallet,
  walletPublicKey: payerWallet,
  role: "payer",
});

const stream = streams.find((candidate) =>
  candidate.receiver.equals(agentWallet) && !candidate.isCancelled
);

const allowed = stream?.status === "streaming";
const reason = allowed ? "active_stream" : stream?.status ?? "missing_stream";

return {
  allowed,
  reason,
  stream: stream?.publicKey.toBase58() ?? null,
};`,
      },
      {
        type: "reference",
        title: "API Reference",
        intro:
          "Service endpoints for agent profiles, budget state, access checks, stream records, and infrastructure health.",
        items: [
          {
            label: "GET /api/agents/:wallet",
            body:
              "Return public agent profile, wallet, supported capabilities, and current payment requirements.",
          },
          {
            label: "GET /api/agents/:wallet/budget",
            body:
              "Return active stream summary, available vested funds, flow rate, cap, and expiration for an agent wallet.",
          },
          {
            label: "GET /api/agents/:wallet/streams",
            body:
              "List streams connected to an agent wallet as receiver, payer, or both.",
          },
          {
            label: "POST /api/agents/:wallet/access-check",
            body:
              "Evaluate whether a payer has an eligible active stream for the requested agent capability.",
          },
          {
            label: "GET /api/streams/:stream",
            body:
              "Return normalized stream state for dashboards, services, and audit exports.",
          },
          {
            label: "POST /api/streams/sync/:stream",
            body:
              "Refresh cached stream state from chain after a wallet transaction or webhook event.",
          },
          {
            label: "GET /health",
            body:
              "Return API, RPC, indexer, and cache health for infrastructure monitoring.",
          },
        ],
      },
      {
        type: "code",
        title: "Access response",
        intro:
          "Access APIs should return deterministic reasons so apps can show the next required action.",
        language: "json",
        filename: "access-response.json",
        code: `{
  "allowed": true,
  "reason": "active_stream",
  "trust_source": "solana_stream",
  "stream": "STREAM_ACCOUNT_PUBLIC_KEY",
  "status": "streaming",
  "payer": "PAYER_PUBLIC_KEY",
  "agent": "AGENT_PUBLIC_KEY",
  "available_lamports": "1200000",
  "flow_rate_lamports_per_second": "10000",
  "expires_at": "2026-06-01T00:00:00Z",
  "recommended_action": null
}`,
      },
      {
        type: "reference",
        title: "CLI Reference",
        intro:
          "Terminal commands for creating agent streams, checking budgets, validating access, and controlling stream state.",
        items: [
          {
            label: "drip agent create-stream --receiver <wallet> --deposit <sol> --rate <sol/sec>",
            body:
              "Create and fund an agent stream from the connected wallet.",
          },
          {
            label: "drip agent budget <wallet> --json",
            body:
              "Inspect active budget state for an agent wallet.",
          },
          {
            label: "drip agent allow --payer <wallet> --agent <wallet> --json",
            body:
              "Run the same access check a service would use before allowing an agent workflow.",
          },
          {
            label: "drip stream withdraw --stream <address>",
            body:
              "Withdraw vested funds as the receiver wallet.",
          },
          {
            label: "drip stream pause --stream <address>",
            body:
              "Pause an active stream as the payer.",
          },
          {
            label: "drip stream resume --stream <address>",
            body:
              "Resume a paused stream as the payer.",
          },
          {
            label: "drip stream cancel --stream <address>",
            body:
              "Cancel a stream, settle vested funds, and recover unvested escrow.",
          },
        ],
      },
      {
        type: "code",
        title: "Agent Budget Manifest",
        intro:
          "A lightweight JSON profile can help tools discover the agent wallet, capabilities, and payment requirements.",
        language: "json",
        filename: "drip-agent.json",
        code: `{
  "drip_version": "1.0",
  "name": "Research Agent",
  "description": "Autonomous research workflow with stream-gated access.",
  "wallet": "AGENT_PUBLIC_KEY",
  "capabilities": ["research", "summarization", "reporting"],
  "protocols": ["drip"],
  "budget": {
    "asset": "SOL",
    "cluster": "mainnet-beta",
    "stream_required": true,
    "minimum_flow_rate_lamports_per_second": "10000",
    "recommended_max_budget_lamports": "50000000"
  },
  "endpoints": {
    "api": "https://agent.example.com/api",
    "webhook": "https://agent.example.com/webhook"
  },
  "created_at": "2026-05-23T00:00:00Z"
}`,
      },
      {
        type: "cards",
        title: "Safety boundaries",
        cards: [
          {
            title: "No private key custody",
            body:
              "DRIP never needs the user's private key. Users approve transactions through their wallet.",
          },
          {
            title: "Agent cannot drain unvested funds",
            body:
              "The receiver can withdraw only funds that have vested under the stream rules.",
          },
          {
            title: "Payer can stop future spend",
            body:
              "Pausing stops new vesting. Cancelling settles vested funds and returns remaining stream funds to the payer.",
          },
          {
            title: "Fail closed",
            body:
              "If a service cannot verify stream state, the safest access decision is to block and ask the payer to reconnect or retry.",
          },
          {
            title: "No trading or yield decisions",
            body:
              "The agent controller checks payment state. It does not trade, route funds, or promise returns.",
          },
          {
            title: "Mainnet requires fresh review",
            body:
              "Before public mainnet use, deployment, API, CLI, and SDK docs should be verified against the exact shipped program and infrastructure.",
          },
        ],
      },
      {
        type: "faq",
        title: "Agent FAQ",
        items: [
          {
            question: "Does DRIP register an agent identity on-chain?",
            answer:
              "DRIP identifies agent budgets through Solana wallets and stream accounts. Agent metadata can be published through the Agent Budget Manifest.",
          },
          {
            question: "Can an agent withdraw automatically?",
            answer:
              "The receiver wallet signs withdrawals through the app. Agent autopilot can use the same stream rules to trigger withdrawals programmatically.",
          },
          {
            question: "Can an agent spend more than the budget?",
            answer:
              "No. The program unlocks funds by flow rate and caps withdrawal by deposit and optional max budget.",
          },
          {
            question: "Is the dashboard agent terminal real execution?",
            answer:
              "The terminal log is a demo simulation. The budget panel can reflect real on-chain stream state when a wallet is connected.",
          },
          {
            question: "Can agents pay other agents?",
            answer:
              "Yes at the protocol level because any wallet can be a payer or receiver. Agent-to-agent orchestration uses the same payer, receiver, budget, and stream controls.",
          },
          {
            question: "Is this ready for public mainnet?",
            answer:
              "No. DRIP is currently devnet/private-alpha oriented. Mainnet docs must be rechecked against the final deployment, API, CLI, and SDK before public release.",
          },
        ],
      },
    ],
  },
  {
    slug: "private-alpha",
    href: "/docs/private-alpha",
    title: "Private Alpha Access",
    navTitle: "Private alpha",
    description:
      "How DRIP private alpha access works for approved wallets and wallet-bound sessions.",
    eyebrow: "Access",
    icon: "lock",
    lead:
      "DRIP is preparing for private mainnet alpha. Access is intentionally limited so the team can test with a small group of approved wallets before any public launch.",
    sections: [
      {
        type: "cards",
        title: "Alpha access model",
        cards: [
          {
            title: "Invite-only access",
            body:
              "Private alpha is limited to invited users and builders. An invite does not mean DRIP is publicly launched.",
          },
          {
            title: "Wallet-bound sessions",
            body:
              "Sessions are tied to the connected wallet so access decisions can be matched to approved alpha wallets.",
          },
          {
            title: "Approved wallet login",
            body:
              "The dashboard can require an approved wallet before enabling alpha actions.",
          },
          {
            title: "Onchain alpha allowlist",
            body:
              "Eligibility can be checked against an onchain allowlist so access rules are transparent and wallet-based.",
          },
        ],
      },
      {
        type: "list",
        title: "Alpha mode expectations",
        items: [
          "Small approved-wallet testing group.",
          "Mainnet alpha preparation, not public launch.",
          "Product behavior may change as feedback and safety reviews continue.",
          "Users should start with small amounts and review every transaction.",
        ],
      },
      {
        type: "note",
        title: "Not a public launch",
        body:
          "Private alpha is a controlled testing stage. Public availability, broader limits, and long-term support details should not be assumed until DRIP announces them.",
        tone: "warning",
      },
    ],
  },
  {
    slug: "safety",
    href: "/docs/safety",
    title: "Safety Model",
    navTitle: "Safety",
    description:
      "The DRIP safety model, including wallet custody boundaries, previews, simulations, allowlists, and known limitations.",
    eyebrow: "Safety",
    icon: "shield-check",
    lead:
      "DRIP is designed to make stream actions understandable and bounded, but no wallet interaction is risk-free. The safety model combines non-custodial wallets, previews, simulation, allowlists, and conservative access behavior.",
    sections: [
      {
        type: "cards",
        title: "Safety principles",
        cards: [
          {
            title: "No private key custody",
            body:
              "DRIP does not ask for or store your private key. Transactions are approved through your wallet.",
          },
          {
            title: "Transaction preview",
            body:
              "Users should see the intended action, affected stream, and expected outcome before signing.",
          },
          {
            title: "Simulation before signing",
            body:
              "When possible, transactions are simulated before the wallet prompt to catch failures and reduce surprises.",
          },
          {
            title: "Onchain allowlist",
            body:
              "Private alpha access can be restricted to approved wallets through an onchain allowlist.",
          },
          {
            title: "Fail-closed configuration",
            body:
              "If access state cannot be verified, alpha and agent access should default to blocked rather than allowed.",
          },
          {
            title: "Payer controls unvested funds",
            body:
              "The payer can pause, resume, or cancel streams and recover unvested funds according to stream rules.",
          },
        ],
      },
      {
        type: "list",
        title: "Limitations and risks",
        items: [
          "DRIP is not claiming to be fully audited.",
          "A transaction preview or simulation can reduce risk, but it cannot guarantee every outcome in all conditions.",
          "Wallet drain is not impossible in the general sense of wallet security. Users must still verify prompts, domains, accounts, and amounts.",
          "Private alpha may change as testing continues.",
          "Native SOL is the supported asset for now, so users should not assume token support unless announced.",
        ],
      },
      {
        type: "note",
        title: "User responsibility",
        body:
          "Use small amounts during alpha, verify the app you are using, and do not sign a transaction unless the preview and wallet prompt match what you intended to do.",
        tone: "warning",
      },
    ],
  },
  {
    slug: "faq",
    href: "/docs/faq",
    title: "FAQ",
    navTitle: "FAQ",
    description:
      "Frequently asked questions about DRIP, stream payments, private alpha, assets, and agent access.",
    eyebrow: "Questions",
    icon: "info",
    lead:
      "Short answers for early users and builders evaluating DRIP during private alpha preparation.",
    sections: [
      {
        type: "faq",
        title: "Frequently asked questions",
        items: [
          {
            question: "Is DRIP live on mainnet?",
            answer:
              "DRIP is preparing for private mainnet alpha with approved wallets. It is not a public mainnet launch.",
          },
          {
            question: "Do I need an invite?",
            answer:
              "Yes for private alpha access. Alpha mode is intended for a small approved-wallet testing group.",
          },
          {
            question: "What is a stream?",
            answer:
              "A stream is a time-based escrow funded by a payer. Funds vest over time and the receiver can withdraw the vested amount.",
          },
          {
            question: "What are vested and unvested funds?",
            answer:
              "Vested funds are the portion the receiver has earned under the stream rules. Unvested funds are the portion that has not yet been earned and can return to the payer when a stream is cancelled.",
          },
          {
            question: "What happens when I cancel?",
            answer:
              "Cancelling stops the stream. Vested funds remain owed to the receiver, and unvested funds return to the payer according to the stream rules.",
          },
          {
            question: "What does the DRIP Agent do?",
            answer:
              "The DRIP Agent Controller reads stream state and allows or blocks service access with deterministic reasons and recommendations. It does not sign transactions.",
          },
          {
            question: "Can DRIP access my private key?",
            answer:
              "No. DRIP does not custody private keys. You approve transactions through your own wallet.",
          },
          {
            question: "Is DRIP a trading bot?",
            answer:
              "No. DRIP is a streaming escrow and access layer. It is not a trading bot and does not make trading decisions.",
          },
          {
            question: "What assets are supported?",
            answer:
              "Native SOL is supported for now. Do not assume SPL token support unless DRIP announces it for the active release.",
          },
          {
            question: "Is this public launch?",
            answer:
              "No. DRIP is preparing for private alpha access. Public launch details will need to be announced separately.",
          },
        ],
      },
    ],
  },
];

export const DOCS_NAV = DOCS_PAGES.map(({ slug, href, navTitle, icon }) => ({
  slug,
  href,
  navTitle,
  icon,
}));

export const DOCS_SLUGS = DOCS_PAGES.filter((page) => page.slug !== "overview").map(
  (page) => page.slug,
);

export function getDocPage(slug?: string) {
  const normalized = !slug || slug === "overview" ? "overview" : slug;
  return DOCS_PAGES.find((page) => page.slug === normalized);
}
