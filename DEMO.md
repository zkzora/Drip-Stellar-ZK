# Drip - 3-Minute Hackathon Demo Script

**Solana Frontier 2026 · Native SOL MVP · Devnet**

---

## The Problem (20 seconds)

> "AI agents need money to operate - they pay for APIs, compute, storage, and sub-agents. But today they receive lump-sum wallet transfers. That's risky. If an agent misbehaves, overspends, or gets compromised, the entire balance is gone."

> "There's no pause button. No rate limit. No automatic expiry. No audit trail."

---

## The Solution (20 seconds)

> "Drip gives agents programmable cashflow. Instead of a lump sum, you define: a flow rate in SOL per second, a maximum budget cap, an expiration time, and the ability to pause, cancel, or withdraw at any point. Every stream is an on-chain contract enforced by an Anchor program deployed on Solana devnet."

---

## Live Demo Flow

### 1. Landing Page (15 seconds)

- Open `http://localhost:3000`
- Point out the hero copy: *"Programmable cashflow for AI agents."*
- Show the animated streaming card ticking in real time
- Note the "Now live on Solana devnet" badge
- Click **Launch App**

---

### 2. Dashboard loads (10 seconds)

- Dashboard renders with demo seed data
- Point out the sidebar navigation: Streams, Yield, History, Agents, Reports, Settings
- Top-right shows **devnet** badge and wallet connect button

---

### 3. Connect devnet wallet (15 seconds)

- Click **Connect Wallet** (top-right or the notice in the dashboard)
- Jupiter's unified wallet modal opens - select Phantom (or any installed wallet)
- **Confirm wallet is set to Devnet** in the wallet extension
- Once connected, wallet address appears and real on-chain streams load (or demo data if none exist yet)

> "The wallet is set to devnet. Make sure you have some devnet SOL - you can airdrop from faucet.solana.com."

---

### 4. Create an AI Agent stream (30 seconds)

- Click **New Stream** (top-right or "+ New stream" button)
- The drawer opens with fields: receiver, amount per period, deposit, policy
- Click **Create demo agent stream** quick-action OR fill manually:
  - Receiver: a second devnet wallet address you control
  - Rate: 0.01 SOL/hour
  - Deposit: 0.5 SOL
  - Policy: Agent (enables max budget + expiration)
  - Max budget: 0.25 SOL
- Bottom of drawer shows: cluster, program ID, estimated rate in lamports/sec
- Click **Start streaming**
- Approve the transaction in your wallet
- Confirm: stream appears in the Streams page with a green STREAMING badge

> "One transaction on Solana creates a PDA escrow account. Funds unlock continuously by the second."

---

### 5. Show the live ticker (15 seconds)

- Navigate to **Streams** page
- Point to the stream card - the unlocked SOL amount ticks live in real time
- Show: deposit, flow rate, status badge, payer/receiver addresses, explorer link

> "The amount visible here is unlocked and immediately withdrawable by the receiver."

---

### 6. Withdraw unlocked funds (20 seconds)

- Switch wallet to the **receiver** address (or use a second browser/wallet)
- Click **Withdraw** on the stream card
- Approve the transaction
- Balance updates; stream continues streaming

> "Withdraw doesn't stop the stream - it just claims what's already unlocked."

---

### 7. Pause, Resume, Cancel (20 seconds)

- From the **payer** wallet:
  - Click **Pause** - stream stops ticking, status turns amber
  - Click **Resume** - stream resumes from where it left off
  - Click **Cancel** - stream is terminated, remaining escrow is returned to payer
- Each action is a single on-chain transaction

> "The payer has full control. Pause when the agent misbehaves. Cancel when the job is done."

---

### 8. Compliance page + CSV export (20 seconds)

- Navigate to **Reports** in the sidebar
- Show the executive summary: total streamed, received, net position
- Scroll to the on-chain ledger preview - each row is a real stream record
- Click **Export CSV**
- CSV downloads with 22 columns: stream ID, addresses, amounts, flow rate, duration, explorer link

> "Every stream generates an audit-ready record. The CSV maps directly to accounting software like Xero or QuickBooks."

---

### 9. Agents page - simulation (20 seconds)

- Navigate to **Agents** in the sidebar
- If a real stream exists: hero panel shows live budget utilization from the on-chain stream
- The terminal shows simulated agent activity - labeled **[DEMO SIMULATION]**
- Stats panel shows: connected agents, combined rate, simulated session spend, settlements

> "The agent terminal is a simulation showing what autonomous micro-payment flows look like. The budget panel - that's your real on-chain stream state."

---

## Close (15 seconds)

> "Drip is programmable payment infrastructure for autonomous work on Solana."

> "Agents should not receive lump sums. They should receive revocable real-time budgets - with rate limits, expiry, pause/resume, and a full audit trail, all enforced on-chain."

> "This is the financial primitive the autonomous economy needs."

---

## Key Facts for Judges

| Fact | Value |
|------|-------|
| Program ID | `D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6` |
| Cluster | Solana Devnet |
| Token | Native SOL (SPL/USDC on roadmap) |
| Stream controls | create, withdraw, pause, resume, cancel |
| Compliance | CSV export with 22 columns |
| Agent budget | rate + max budget + expiration + pause |
| Tests | Anchor program tests pass on localnet |

## Current MVP scope

- Native SOL only - no SPL tokens yet
- Raydium/yield is a UI placeholder - not wired
- PDF export is a stub (toast notification)
- Agent terminal activity is a demo simulation
- Devnet deployment only

---

*Demo setup: browser wallet (Phantom/Backpack) set to Devnet. Two funded devnet wallets recommended to demo both payer and receiver actions.*
