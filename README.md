![Drip](public/banner.png)

# Drip

![Stellar](https://img.shields.io/badge/stellar-testnet%20live-7D4CDB?style=flat-square)
![Contract Tests](https://img.shields.io/badge/contract%20tests-14%2F14%20passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

**Programmable cashflow for AI agents and modern workforces.**

> Give AI agents a budget that streams, stops, and audits itself.  
> Agents should not receive lump sums. They should receive revocable real-time budgets.

Drip is a streaming payments protocol built on **Stellar Soroban**. Set a flow rate, a max budget, and an expiry — then let the escrow stream XLM by the second with full on-chain enforcement.

---

## Quick Start

```bash
cp .env.example .env.local   # fill in your Stellar config
npm install
npm run dev                  # http://localhost:3000
```

Install [Freighter](https://freighter.app), switch to **Testnet** mode, and get test XLM from [friendbot.stellar.org](https://friendbot.stellar.org).

---

## Environment

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_STELLAR_CONTRACT_ID=CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

---

## Stack

| Layer       | Technology                                           |
|-------------|------------------------------------------------------|
| Frontend    | Next.js 16 · React 18 · Tailwind CSS · Framer Motion |
| Blockchain  | Stellar Soroban (XLM token streaming)                |
| Wallets     | Freighter                                            |
| UI/UX       | Lucide icons · Custom CSS · Glassmorphism            |
| Language    | TypeScript · Rust                                    |

---

## Commands

```bash
# Next.js
npm run dev        # dev server at http://localhost:3000
npm run build      # production build
npm run typecheck  # TypeScript type checking

# Stellar Soroban
cd stellar
stellar contract build --manifest-path Cargo.toml   # build wasm
cargo test                                           # run unit tests
```

---

## Deployed Contract

### Stellar Testnet

| Field       | Value                                                                                                                                       |
|-------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| Contract ID | `CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV`                                                                               |
| Network     | Stellar Testnet (`Test SDF Network ; September 2015`)                                                                                       |
| Explorer    | [View on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV)                |

See [DEMO.md](DEMO.md) for the full demo script and walkthrough.

---

## Features

### ✅ Stream Management

- Create streams with custom flow rates (XLM/sec), deposits, max budgets, and expiration
- Real-time streaming counter with sub-second UI updates
- Withdraw unlocked funds — receiver only, enforced on-chain
- Pause and resume streams — payer only, enforced on-chain
- Cancel streams and recover remaining escrow — payer only
- Pre-flight transaction simulation before any Freighter prompt

### ✅ Dashboard

- Real-time stream monitoring with live balance updates
- Stream filtering and search
- Transaction history
- Wallet integration via Freighter

### ✅ Compliance & Reporting

- Real on-chain stream records
- CSV export (22 columns, Excel-compatible)
- Audit-ready transaction logs with category filtering and date range selection

### ✅ Agent Terminal

- Live inference log and real-time spend counter
- Budget panel wired to real on-chain stream state when a wallet is connected
- Demonstrates the autonomous agent-to-agent payment model

---

## Pages

| Route          | Description                                          |
|----------------|------------------------------------------------------|
| `/`            | Landing page — hero, features, calculator, use cases |
| `/dashboard`   | Main dashboard with stream management                |
| `/docs`        | Documentation hub                                    |
| `/docs/[slug]` | Individual doc pages (how-it-works, use-cases, etc.) |
| `/faq`         | Frequently asked questions                           |
| `/compliance`  | Compliance reporting and CSV export                  |

---

## Project Structure

```
drip/
├── app/                    # Next.js app router
│   ├── page.tsx            # Landing page entry
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles
│   ├── dashboard/          # Dashboard page
│   ├── docs/               # Documentation pages
│   ├── faq/                # FAQ page
│   ├── compliance/         # Compliance reporting
│   └── api/                # API routes
├── components/             # React components
│   ├── landing/            # Landing page components
│   ├── dashboard/          # DashboardApp, stream cards, etc.
│   ├── streams/            # StellarStreamPanel, chain selector
│   ├── docs/               # Documentation renderer
│   ├── compliance/         # Compliance & CSV export
│   ├── providers/          # AppProviders
│   ├── faq/                # FAQ components
│   └── ui/                 # Reusable UI primitives
├── lib/                    # Utilities and helpers
│   ├── stellar/            # Freighter hook, Soroban transactions, stream hook
│   │   ├── registry.ts
│   │   ├── transactions.ts
│   │   ├── useFreighterWallet.ts
│   │   ├── useStellarStreams.ts
│   │   └── wallet.ts
│   ├── adapters/           # Chain-agnostic access adapter
│   │   ├── index.ts
│   │   ├── stellar.ts
│   │   └── types.ts
│   ├── supabase/           # Supabase client (server)
│   ├── compliance/         # Compliance data utilities
│   ├── docs-content.ts     # Documentation content
│   ├── format.ts           # Number/time formatting helpers
│   ├── mock-data.ts        # Mock stream data for demo/dev
│   ├── rates.ts            # Flow rate calculations
│   └── types.ts            # Shared TypeScript types
├── stellar/                # Soroban contract workspace
│   └── contracts/drip_stream/src/lib.rs
└── public/                 # Static assets
```

---

## Testing

```bash
# Soroban contract tests
cd stellar/contracts/drip_stream
cargo test
# → 14/14 passing ✅

# TypeScript
npm run typecheck
```

---

## Limitations

| Feature          | Status                                                       |
|------------------|--------------------------------------------------------------|
| Token            | **XLM only** — other Stellar assets on roadmap              |
| PDF export       | Stub — shows "coming soon" toast                            |
| Agent terminal   | Demo simulation — not real on-chain agent execution         |
| Deployment       | **Testnet only** — mainnet pending security review          |

---

## Roadmap

| Feature                      | Status                                                         |
|------------------------------|----------------------------------------------------------------|
| XLM streaming                | ✅ Contract deployed, UI integrated on testnet                 |
| Agent autopilot withdrawals  | Planned — automated pull from on-chain stream balance         |
| Multi-asset support          | Planned — other Stellar assets beyond XLM                     |
| PDF audit export             | Planned — PDF generation for the compliance page              |
| `drip-stellar` SDK package   | Planned — lightweight TypeScript client on npm                |
| Mainnet deployment           | Planned — after security review and audit                     |

---

## Contributing

Contributions are welcome! This project is open source under the MIT license.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Demo

See [DEMO.md](DEMO.md) for the full demo script and walkthrough.

---

Built with ❤️ for the autonomous agent economy
