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
  /** Replaces title/lead/description/sections when IS_STELLAR_MODE is true. */
  stellarOverride?: {
    title: string;
    lead: string;
    description: string;
    sections: DocSection[];
  };
};

export const DOCS_PAGES: DocPage[] = [
  // ─── Overview ───────────────────────────────────────────────────────────────
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
            body: "The wallet that creates and funds the stream. The payer can pause, resume, or cancel according to the stream rules.",
          },
          {
            title: "Receiver",
            body: "The wallet that earns over time. The receiver can withdraw vested funds without waiting for the stream to complete.",
          },
          {
            title: "Builder or service",
            body: "An app, agent, API, or service can read stream state and allow access only while payment conditions are met.",
          },
        ],
      },
      {
        type: "list",
        title: "What stream state can unlock",
        intro: "A DRIP stream can represent more than a payment schedule. It can also become a wallet-native access signal.",
        items: [
          "Active stream: access can be allowed.",
          "Paused stream: access can be blocked until the stream resumes.",
          "Cancelled stream: access can be blocked because future payment is no longer available.",
          "Insufficient or expired stream: apps can ask the payer to create a new stream or adjust access.",
        ],
      },
    ],
    stellarOverride: {
      title: "What is DRIP?",
      description: "DRIP is a Stellar-native streaming escrow layer for time-based XLM payments using Soroban smart contracts.",
      lead: "DRIP lets a wallet stream native XLM over time using Soroban on Stellar Testnet. Funds vest inside a smart contract, receivers can withdraw what has vested, and payers keep control over unvested amounts.",
      sections: [
        {
          type: "text",
          title: "A streaming escrow layer on Stellar",
          body: [
            "DRIP is a Stellar-native streaming escrow layer. A payer creates a stream, locks native XLM in a Soroban contract, and defines how funds vest over time.",
            "The receiver does not need to wait for the stream to finish. They can withdraw the vested portion at any time while the stream is active.",
            "The payer retains control over unvested XLM. They can pause, resume, or cancel the stream at any time.",
          ],
        },
        {
          type: "cards",
          title: "Who participates in a stream",
          cards: [
            {
              title: "Payer",
              body: "The Freighter wallet that creates and funds the XLM stream. The payer can pause, resume, or cancel according to the stream rules.",
            },
            {
              title: "Receiver",
              body: "The Stellar address that earns over time. The receiver can withdraw vested XLM without waiting for the stream to complete.",
            },
            {
              title: "Service or app",
              body: "An app or service can read Soroban stream state and allow access only while a valid stream remains active.",
            },
          ],
        },
        {
          type: "list",
          title: "What stream state represents",
          intro: "A DRIP stream provides a transparent, on-chain payment signal for both sides.",
          items: [
            "Active stream: XLM is vesting and the receiver can withdraw.",
            "Paused stream: vesting is stopped; unvested XLM is preserved.",
            "Cancelled stream: vested XLM is released to receiver; remaining XLM returns to payer.",
            "Completed stream: all XLM has vested; receiver can withdraw the full amount.",
          ],
        },
        {
          type: "note",
          title: "Testnet only",
          body: "This deployment uses Stellar Testnet. No real funds are involved. Transactions are visible on Stellar Expert.",
          tone: "info",
        },
      ],
    },
  },

  // ─── How it works ────────────────────────────────────────────────────────────
  {
    slug: "how-it-works",
    href: "/docs/how-it-works",
    title: "How DRIP Works",
    navTitle: "How it works",
    description: "Create a stream, vest funds over time, withdraw vested funds, and use stream state for access control.",
    eyebrow: "Stream flow",
    icon: "repeat",
    lead: "A DRIP stream is a time-based escrow. It starts with a funded stream, vests over time, and gives both sides clear controls for settlement and access.",
    sections: [
      {
        type: "steps",
        title: "The stream lifecycle",
        steps: [
          {
            title: "Create stream",
            body: "The payer connects a wallet, chooses a receiver, sets the stream terms, and signs a transaction that funds the stream escrow with native SOL.",
          },
          {
            title: "Funds vest over time",
            body: "Once active, funds become available according to the stream's time-based rules. The vested amount increases while the stream remains active.",
          },
          {
            title: "Withdraw vested funds",
            body: "The receiver can withdraw the amount that has vested. Withdrawing does not require the stream to end.",
          },
          {
            title: "Pause or resume",
            body: "The payer can pause a stream when access or payment should stop temporarily. Resuming the stream allows vesting and access checks to continue.",
          },
          {
            title: "Cancel and recover unvested funds",
            body: "When a payer cancels, vested funds remain owed to the receiver and unvested funds return to the payer according to the stream rules.",
          },
        ],
      },
      {
        type: "cards",
        title: "Access from stream state",
        intro: "Services can use stream state as a deterministic access signal.",
        cards: [
          {
            title: "Active stream",
            body: "Access can be allowed because the payer has an active payment relationship with the receiver or service.",
          },
          {
            title: "Paused stream",
            body: "Access can be blocked until the payer resumes the stream or the user creates another eligible stream.",
          },
          {
            title: "Cancelled stream",
            body: "Access can be blocked because the payment relationship no longer has future funding.",
          },
        ],
      },
      {
        type: "note",
        title: "Deterministic does not mean risk-free",
        body: "Stream state gives apps a clear payment signal, but users should still review every wallet prompt before signing.",
        tone: "info",
      },
    ],
    stellarOverride: {
      title: "How XLM streams work",
      description: "How to create, manage, and close native XLM streams on Stellar Testnet using Soroban and Freighter.",
      lead: "DRIP lets users create native XLM streams on Stellar Testnet using Soroban smart contracts and Freighter. Funds are locked in a contract, vest over time, and can be withdrawn by the receiver or reclaimed by the payer.",
      sections: [
        {
          type: "steps",
          title: "The XLM stream lifecycle",
          steps: [
            {
              title: "Connect Freighter on Stellar Testnet",
              body: "Open the DRIP dashboard and connect your Freighter extension. Make sure Freighter is set to Testnet.",
            },
            {
              title: "Create an XLM stream",
              body: "Choose a receiver Stellar address, enter the total XLM amount and duration. Review the transaction preview before signing with Freighter.",
            },
            {
              title: "Funds are locked in a Soroban contract",
              body: "After signing, the XLM is transferred into the Soroban stream contract. The contract tracks vesting state and enforces the stream rules.",
            },
            {
              title: "Value vests over time",
              body: "The vested amount increases continuously while the stream is active. The receiver can check withdrawn and available balances at any time.",
            },
            {
              title: "Receiver withdraws vested XLM",
              body: "The receiver signs a withdraw transaction through Freighter. Only the vested amount can be withdrawn — unvested XLM remains in the contract.",
            },
            {
              title: "Payer can pause, resume, or cancel",
              body: "The payer can pause to stop vesting temporarily, resume to continue it, or cancel to settle vested funds and recover unvested XLM.",
            },
            {
              title: "View on Stellar Expert",
              body: "Every transaction — create, pause, resume, withdraw, cancel — is visible on Stellar Expert testnet with the transaction hash.",
            },
          ],
        },
        {
          type: "cards",
          title: "Stream state signals",
          intro: "Soroban stream state is on-chain and transparent.",
          cards: [
            { title: "Active",    body: "XLM is vesting. Receiver can withdraw. Payer can pause or cancel." },
            { title: "Paused",    body: "Vesting is stopped. Unvested XLM stays in the contract. Payer can resume." },
            { title: "Cancelled", body: "Stream is closed. Vested XLM goes to receiver; unvested XLM returns to payer." },
            { title: "Completed", body: "Stream reached end time. All XLM has vested and is available for withdrawal." },
          ],
        },
        {
          type: "note",
          title: "Testnet only — no real funds",
          body: "This is Stellar Testnet. No real XLM is at risk. DRIP never asks for your private key or seed phrase. All transactions require explicit Freighter approval.",
          tone: "info",
        },
      ],
    },
  },

  // ─── Use cases ───────────────────────────────────────────────────────────────
  {
    slug: "use-cases",
    href: "/docs/use-cases",
    title: "Use Cases",
    navTitle: "Use cases",
    description: "Examples of how Solana builders and early users can apply DRIP streams.",
    eyebrow: "Applications",
    icon: "layers",
    lead: "DRIP is designed for products where access, work, or service delivery happens over time. Instead of one upfront payment, a wallet can keep a stream active while value is being delivered.",
    sections: [
      {
        type: "cards",
        title: "Common patterns",
        cards: [
          { title: "AI agent access",             body: "Allow an agent session, workflow, or premium model route only while a user's stream remains active." },
          { title: "API and service access",       body: "Gate API usage, hosted services, or compute access with a wallet-native payment stream." },
          { title: "Wallet-native subscriptions",  body: "Replace card subscriptions with an onchain stream that can be paused or cancelled from the payer wallet." },
          { title: "Contributor payouts",          body: "Pay contributors continuously during an engagement while retaining control over unvested funds." },
          { title: "Grants and bounties",          body: "Fund milestone work with a stream that vests over the active work period instead of paying everything upfront." },
          { title: "Digital services",             body: "Meter access to communities, tools, datasets, or private services using active stream status." },
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
        body: "DRIP is not a trading product, not a Raydium or yield strategy, and not a promise of returns. Its core purpose is streaming escrow and payment-aware access.",
        tone: "warning",
      },
    ],
    stellarOverride: {
      title: "Use Cases",
      description: "Examples of how builders and users can apply DRIP XLM streams on Stellar Testnet.",
      lead: "DRIP is designed for products where access, work, or service delivery happens over time. Instead of one upfront payment, a wallet can keep a stream active while value is being delivered.",
      sections: [
        {
          type: "cards",
          title: "Common patterns",
          cards: [
            { title: "Service access",               body: "Gate API usage, hosted services, or compute access with a wallet-native XLM payment stream." },
            { title: "Wallet-native subscriptions",  body: "Replace card subscriptions with an on-chain XLM stream that can be paused or cancelled from the payer's Freighter wallet." },
            { title: "Contributor payouts",          body: "Pay contributors continuously in XLM during an engagement while retaining control over unvested funds." },
            { title: "Grants and bounties",          body: "Fund milestone work with an XLM stream that vests over the active work period instead of paying everything upfront." },
            { title: "Digital services",             body: "Meter access to communities, tools, datasets, or private services using active Stellar stream status." },
            { title: "Testnet exploration",          body: "Try streaming escrow mechanics on Stellar Testnet with no real funds at risk." },
          ],
        },
        {
          type: "list",
          title: "Where DRIP fits best",
          items: [
            "The payer should be able to stop future payment at any time.",
            "The receiver should be able to claim XLM as it vests.",
            "Access or service delivery should depend on active stream status.",
            "Both sides benefit from transparent, verifiable on-chain state.",
          ],
        },
        {
          type: "note",
          title: "What DRIP is not",
          body: "DRIP is not a trading product, not a yield strategy, and not a promise of returns. Its core purpose is streaming escrow and payment-aware access on Stellar.",
          tone: "warning",
        },
      ],
    },
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  {
    slug: "dashboard",
    href: "/docs/dashboard",
    title: "Dashboard Guide",
    navTitle: "Dashboard",
    description: "How to use the DRIP dashboard to create, inspect, pause, resume, withdraw, and cancel streams.",
    eyebrow: "User guide",
    icon: "gauge",
    lead: "The DRIP dashboard is the main interface for early users. It helps you inspect stream state, preview transactions, simulate before signing, and control active streams from your wallet.",
    sections: [
      {
        type: "steps",
        title: "Core actions",
        steps: [
          { title: "Connect wallet",     body: "Connect an approved Solana wallet. In private alpha, access is limited to wallets that are eligible for alpha mode." },
          { title: "Create stream",      body: "Choose the receiver, funding amount, and stream terms. Review the summary before you sign." },
          { title: "View stream state",  body: "Inspect whether a stream is active, paused, cancelled, expired, or withdrawable. The dashboard presents stream status before you take action." },
          { title: "Pause or resume",    body: "Payers can pause a stream to stop ongoing vesting and access. Resuming makes the stream active again." },
          { title: "Withdraw",           body: "Receivers can withdraw vested funds. The dashboard shows the available amount before the wallet prompt." },
          { title: "Cancel",             body: "Payers can cancel a stream. Vested funds remain claimable by the receiver, and unvested funds return to the payer according to stream rules." },
        ],
      },
      {
        type: "cards",
        title: "Before signing",
        cards: [
          { title: "Transaction preview",             body: "The dashboard should show what action is being requested, which stream is affected, and the expected payment movement before the wallet prompt." },
          { title: "Simulation before wallet prompt", body: "When supported, DRIP simulates transactions before asking you to sign so failed or unexpected transactions can be caught earlier." },
          { title: "Real funds warning",              body: "Private alpha may involve real SOL. Always read the wallet prompt and only sign transactions you understand." },
        ],
      },
      {
        type: "note",
        title: "Wallet prompts still matter",
        body: "DRIP can improve previews and checks, but your wallet signature is still the final approval. Do not sign if the action, account, or amount looks wrong.",
        tone: "warning",
      },
    ],
    stellarOverride: {
      title: "Dashboard Guide",
      description: "How to use the DRIP dashboard to create, inspect, pause, resume, withdraw, and cancel XLM streams on Stellar Testnet.",
      lead: "The DRIP dashboard is the main interface for Stellar Testnet streams. Use it to create XLM streams, inspect on-chain state, and control active streams through Freighter.",
      sections: [
        {
          type: "steps",
          title: "Core actions",
          steps: [
            { title: "Connect Freighter",       body: "Install the Freighter browser extension and connect it to Stellar Testnet. The dashboard detects your connection automatically." },
            { title: "Create an XLM stream",    body: "Enter a receiver Stellar address, XLM amount, and duration. Review the Soroban transaction preview before signing with Freighter." },
            { title: "View stream state",        body: "Load a stream by ID to see its current on-chain state: Active, Paused, Cancelled, or Completed. The dashboard fetches state directly from the Soroban contract." },
            { title: "Pause or resume",          body: "Payers can pause a stream to stop ongoing vesting. Resuming makes the stream active again. Both actions require a Freighter signature." },
            { title: "Withdraw vested XLM",      body: "Receivers can withdraw the amount that has vested. The dashboard shows available XLM before presenting the Freighter prompt." },
            { title: "Cancel the stream",        body: "Payers can cancel a stream. Vested XLM remains claimable by the receiver, and unvested XLM returns to the payer." },
          ],
        },
        {
          type: "cards",
          title: "Before signing",
          cards: [
            { title: "Transaction preview",  body: "The dashboard shows the action, affected stream, and expected XLM movement before the Freighter signature prompt." },
            { title: "Soroban simulation",   body: "Transactions are simulated against the Soroban RPC before asking you to sign, catching errors before they reach the network." },
            { title: "Testnet only",         body: "This deployment uses Stellar Testnet. No real funds are at risk. Verify the transaction in Freighter before approving." },
          ],
        },
        {
          type: "note",
          title: "Freighter prompts still matter",
          body: "DRIP shows previews and runs simulations, but your Freighter signature is the final approval. Do not sign if the receiver address, amount, or action looks wrong.",
          tone: "warning",
        },
      ],
    },
  },

  // ─── Agent (blocked in Stellar mode) ────────────────────────────────────────
  {
    slug: "agent",
    href: "/docs/agent",
    title: "DRIP Agent Documentation",
    navTitle: "Agent Docs",
    description: "Complete guide to agent budgets, stream-based access, SDK helpers, and API and CLI integration surfaces.",
    eyebrow: "Agent budgets",
    icon: "bot",
    lead: "DRIP gives an AI agent a wallet-bound real-time budget. A payer streams SOL into escrow, the agent or service receives funds as they vest, and apps can use stream state to allow, pause, or revoke access without custodying private keys.",
    sections: [
      {
        type: "text",
        title: "Introduction",
        body: [
          "The DRIP agent model is built around streams, not lump-sum agent wallets.",
          "The current devnet build supports real on-chain SOL streams and a dashboard agent demo.",
          "For mainnet alpha, the same primitives give agents a way to prove they are funded.",
        ],
      },
    ],
  },

  // ─── Private alpha (blocked in Stellar mode) ────────────────────────────────
  {
    slug: "private-alpha",
    href: "/docs/private-alpha",
    title: "Private Alpha Access",
    navTitle: "Private alpha",
    description: "How DRIP private alpha access works for approved wallets and wallet-bound sessions.",
    eyebrow: "Access",
    icon: "lock",
    lead: "DRIP is preparing for private mainnet alpha. Access is intentionally limited so the team can test with a small group of approved wallets before any public launch.",
    sections: [
      {
        type: "note",
        title: "Not a public launch",
        body: "Private alpha is a controlled testing stage. Public availability, broader limits, and long-term support details should not be assumed until DRIP announces them.",
        tone: "warning",
      },
    ],
  },

  // ─── Safety ──────────────────────────────────────────────────────────────────
  {
    slug: "safety",
    href: "/docs/safety",
    title: "Safety Model",
    navTitle: "Safety",
    description: "The DRIP safety model, including wallet custody boundaries, previews, simulations, allowlists, and known limitations.",
    eyebrow: "Safety",
    icon: "shield-check",
    lead: "DRIP is designed to make stream actions understandable and bounded, but no wallet interaction is risk-free. The safety model combines non-custodial wallets, previews, simulation, allowlists, and conservative access behavior.",
    sections: [
      {
        type: "cards",
        title: "Safety principles",
        cards: [
          { title: "No private key custody",      body: "DRIP does not ask for or store your private key. Transactions are approved through your wallet." },
          { title: "Transaction preview",          body: "Users should see the intended action, affected stream, and expected outcome before signing." },
          { title: "Simulation before signing",    body: "When possible, transactions are simulated before the wallet prompt to catch failures and reduce surprises." },
          { title: "Onchain allowlist",            body: "Private alpha access can be restricted to approved wallets through an onchain allowlist." },
          { title: "Fail-closed configuration",    body: "If access state cannot be verified, alpha and agent access should default to blocked rather than allowed." },
          { title: "Payer controls unvested funds", body: "The payer can pause, resume, or cancel streams and recover unvested funds according to stream rules." },
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
        body: "Use small amounts during alpha, verify the app you are using, and do not sign a transaction unless the preview and wallet prompt match what you intended to do.",
        tone: "warning",
      },
    ],
    stellarOverride: {
      title: "Safety Model",
      description: "The DRIP Stellar safety model — no private keys, Freighter-only signing, Soroban previews, and testnet isolation.",
      lead: "DRIP on Stellar Testnet is designed to make stream actions transparent and bounded. The safety model relies on Freighter for signing, Soroban simulation before submission, and testnet isolation.",
      sections: [
        {
          type: "cards",
          title: "Safety principles",
          cards: [
            { title: "No private key custody",      body: "DRIP does not ask for or store your private key or seed phrase. All transactions are approved through Freighter." },
            { title: "Transaction preview",          body: "The dashboard shows the action, affected stream, and expected XLM movement before presenting the Freighter signature prompt." },
            { title: "Soroban simulation",           body: "Transactions are simulated against the Soroban RPC before signing, catching errors before they reach the network." },
            { title: "Testnet isolation",            body: "This deployment is Stellar Testnet only. No bridge exists to mainnet. No real XLM is at risk." },
            { title: "Fail-closed behavior",         body: "If stream state cannot be verified, access defaults to blocked. DRIP will not allow actions it cannot confirm are safe." },
            { title: "Payer controls unvested XLM",  body: "The payer can pause, resume, or cancel a stream and recover unvested XLM at any time." },
          ],
        },
        {
          type: "list",
          title: "Limitations and known constraints",
          items: [
            "The Soroban contract has not been publicly audited. Use on Testnet only.",
            "Simulation can reduce risk but cannot guarantee every outcome under all conditions.",
            "Verify the domain, receiver address, and amount in every Freighter prompt before signing.",
            "Ledger entries expire on Stellar Testnet if not accessed for an extended period.",
            "Native XLM is the only supported asset. Do not assume token support.",
          ],
        },
        {
          type: "note",
          title: "Testnet only — always verify Freighter prompts",
          body: "This is a testnet deployment. No real funds are involved. Always verify the receiver, amount, and network shown in Freighter before approving any transaction.",
          tone: "info",
        },
      ],
    },
  },

  // ─── FAQ ─────────────────────────────────────────────────────────────────────
  {
    slug: "faq",
    href: "/docs/faq",
    title: "FAQ",
    navTitle: "FAQ",
    description: "Frequently asked questions about DRIP, stream payments, private alpha, assets, and agent access.",
    eyebrow: "Questions",
    icon: "info",
    lead: "Short answers for early users and builders evaluating DRIP during private alpha preparation.",
    sections: [
      {
        type: "faq",
        title: "Frequently asked questions",
        items: [
          { question: "Is DRIP live on mainnet?",         answer: "DRIP is preparing for private mainnet alpha with approved wallets. It is not a public mainnet launch." },
          { question: "Do I need an invite?",             answer: "Yes for private alpha access. Alpha mode is intended for a small approved-wallet testing group." },
          { question: "What is a stream?",                answer: "A stream is a time-based escrow funded by a payer. Funds vest over time and the receiver can withdraw the vested amount." },
          { question: "What are vested and unvested funds?", answer: "Vested funds are the portion the receiver has earned under the stream rules. Unvested funds have not yet been earned and can return to the payer when a stream is cancelled." },
          { question: "What happens when I cancel?",      answer: "Cancelling stops the stream. Vested funds remain owed to the receiver, and unvested funds return to the payer according to the stream rules." },
          { question: "What does the DRIP Agent do?",     answer: "The DRIP Agent Controller reads stream state and allows or blocks service access with deterministic reasons and recommendations. It does not sign transactions." },
          { question: "Can DRIP access my private key?",  answer: "No. DRIP does not custody private keys. You approve transactions through your own wallet." },
          { question: "Is DRIP a trading bot?",           answer: "No. DRIP is a streaming escrow and access layer. It is not a trading bot and does not make trading decisions." },
          { question: "What assets are supported?",       answer: "Native SOL is supported for now. Do not assume SPL token support unless DRIP announces it for the active release." },
          { question: "Is this public launch?",           answer: "No. DRIP is preparing for private alpha access. Public launch details will need to be announced separately." },
        ],
      },
    ],
    stellarOverride: {
      title: "FAQ",
      description: "Frequently asked questions about DRIP, XLM streams, Freighter, Soroban, and Stellar Testnet.",
      lead: "Short answers for users and builders exploring DRIP on Stellar Testnet.",
      sections: [
        {
          type: "faq",
          title: "Frequently asked questions",
          items: [
            { question: "Is this on Stellar mainnet?",              answer: "No. This is a Stellar Testnet deployment. No real XLM is involved. Do not send real funds." },
            { question: "What do I need to use DRIP on Stellar?",   answer: "Install the Freighter browser extension and set it to Stellar Testnet. You also need testnet XLM from the Stellar Friendbot or laboratory." },
            { question: "What is a stream?",                        answer: "A stream is a time-based XLM escrow locked in a Soroban smart contract. Funds vest over time and the receiver can withdraw the vested amount at any time." },
            { question: "What are vested and unvested XLM?",        answer: "Vested XLM is the portion the receiver has earned under the stream rules. Unvested XLM has not yet been earned and returns to the payer when the stream is cancelled." },
            { question: "What happens when I cancel?",              answer: "Cancelling stops the stream. Vested XLM remains claimable by the receiver, and unvested XLM returns to the payer — all enforced by the Soroban contract." },
            { question: "Can DRIP access my private key?",          answer: "No. DRIP never asks for or stores your private key or seed phrase. All transactions are signed through Freighter." },
            { question: "How do I find my stream?",                 answer: "Every stream has a numeric ID returned when you create it. Enter that ID in the Streams page to load the stream's on-chain state." },
            { question: "Where can I verify transactions?",         answer: "Every transaction hash links to Stellar Expert testnet explorer. You can verify any create, pause, resume, withdraw, or cancel transaction there." },
            { question: "What assets are supported?",               answer: "Native XLM only on this Testnet deployment. No other tokens are supported." },
            { question: "Is this a public mainnet launch?",         answer: "No. This is a Stellar Testnet deployment for testing and development. No real funds are involved." },
          ],
        },
      ],
    },
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

// Slugs that are hidden/redirected in Stellar-only mode (isStellar=true).
export const STELLAR_BLOCKED_SLUGS: string[] = ["agent", "private-alpha"];

export function getDocPage(slug?: string) {
  const normalized = !slug || slug === "overview" ? "overview" : slug;
  return DOCS_PAGES.find((page) => page.slug === normalized);
}
