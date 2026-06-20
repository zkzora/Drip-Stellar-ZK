![Drip](public/banner.png)

# Drip

![Stellar](https://img.shields.io/badge/stellar-testnet%20live-7D4CDB?style=flat-square)
![Stream Tests](https://img.shields.io/badge/stream%20tests-14%2F14%20passing-brightgreen?style=flat-square)
![ZK Tests](https://img.shields.io/badge/ZK%20verifier%20tests-11%2F11%20passing-brightgreen?style=flat-square)
![Circuit Tests](https://img.shields.io/badge/Noir%20circuit%20tests-3%2F3%20passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

**Drip is the first streaming payment protocol on Stellar with on-chain zero-knowledge income proofs.**

Receivers can prove *"I receive at least X XLM per month from a valid stream"* to any third party — without revealing the actual amount — using a Noir **UltraHonk** proof verified inside a Soroban contract via Stellar's **BN254 host functions** (Protocol 23+). The verifier is a real on-chain check, not a mock.

Built on top of a working XLM streaming escrow with full lifecycle controls (create, pause, resume, withdraw, cancel) — set a flow rate, a max budget, and an expiry, then let the escrow stream XLM by the second with full on-chain enforcement.

Employment verification, loan applications, credit checks, rental screening — all provable without leaking the number.

---

## How the ZK works

```
PAYER                          RECEIVER                    VERIFIER (anyone)
  │                               │                               │
create stream (normal)            │                               │
  │                               │                               │
commitment = pedersen(amount, salt)                               │
register_commitment(stream_id, ──►│                               │
                    commitment)   │                               │
  │                     save (salt, amount)                       │
  │                               │                               │
  │                    generate ZK proof:                         │
  │                    "I know (amount, salt) such that           │
  │                     pedersen(amount,salt)==commitment         │
  │                     AND amount >= threshold"  ───────────►  verify_income_proof(
  │                               │                               stream_id, threshold, proof)
  │                               │                               │   → true / false
```

The commitment is a **Pedersen hash** of `(amount, salt)`. The proof is a Noir **UltraHonk** proof verified on-chain via Stellar's **BN254 host functions** (Protocol 23+). Public inputs are `[commitment, threshold]` — the amount never appears on-chain.

The ZK is **load-bearing**: without the proof, no one can determine whether a stream's amount meets a threshold. The on-chain verifier does real elliptic-curve arithmetic inside the Soroban contract; this is not a mock.

---

## Privacy Model & Threat Analysis

Drip Private provides **selective disclosure**, not full on-chain confidentiality. Being explicit about the boundary:

**What's protected:** The exact stream amount is hidden from a third-party verifier who holds only a share code. They learn a single bit — *amount ≥ threshold* — and nothing more. They need no access to the stream itself.

**What's NOT protected:** The underlying `drip_stream` contract stores the stream amount in **cleartext**. Anyone who reads that contract's ledger entries directly can still see the real amount. Privacy is scoped to verifiers who only receive a share code, not to on-chain observers of the streaming contract.

**Why this scope:** `drip_stream` was intentionally left unmodified so the streaming escrow stays backward-compatible and independently auditable. `drip_zk_verifier` is a purely **additive** layer on top — it adds the commitment + proof machinery without touching the working, tested escrow. This is a deliberate trade-off: a smaller, safer change surface now, with a clear upgrade path later.

| Adversary | Amount disclosure |
|---|---|
| Third-party verifier with only a share code | **Protected** ✓ |
| On-chain observer reading `drip_stream` ledger entries | **Not protected** ✗ |
| Verifier colluding with someone who reads the stream contract | **Not protected** ✗ |

**Roadmap — Confidential streaming:** the next milestone moves the commitment into the streaming contract itself and stores the amount as an encrypted value, so the cleartext never hits the ledger. That requires a redesigned `drip_stream` and is tracked as future work — see [Limitations](#limitations--honest-notes).

---

## Why ZK (and not a signed attestation)?

A simpler design would have the payer sign a message — *"I pay this receiver ≥ X XLM/month"* — and hand it over. That breaks down fast. ZK is necessary, not decorative:

- **Receiver-driven thresholds.** The receiver picks the threshold at proving time. With signed attestations, every new threshold (or every verifier asking for a different bar) means going back to the payer for a fresh signature. With ZK, one commitment supports unlimited thresholds the receiver chooses themselves.
- **Multi-verifier without sharing the salt.** From a single registered commitment the receiver can generate many independent proofs for many verifiers — none of which reveal the salt or the amount. A signature would have to be reissued per verifier and would leak the exact figure.
- **Payer-availability decoupling.** The receiver can prove their income at any time, even if the payer is offline, unreachable, or no longer cooperative. A signed-attestation scheme makes the payer a permanent online dependency.

See the [Comparison table](#comparison) for how this stacks up against the alternatives, and [EXTENSIBILITY.md](EXTENSIBILITY.md) for other proofs the same circuit supports.

---

## Deployed Contracts (Stellar Testnet)

| Contract | ID | Explorer |
|---|---|---|
| `drip_stream` | `CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV` | [View](https://stellar.expert/explorer/testnet/contract/CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV) |
| `drip_zk_verifier` | `CCUOR6VPMCFDOU7MODZGOI2K264YR3LNRSQ4LMJ37LGTZCTOAHSXWNV5` | [View](https://stellar.expert/explorer/testnet/contract/CCUOR6VPMCFDOU7MODZGOI2K264YR3LNRSQ4LMJ37LGTZCTOAHSXWNV5) |

Deploy transactions:
- WASM upload: `38dcf86ea39033001879832490dd46a61143e60438e65c95d80c9bd6c31037e8`
- Contract create: `9f959fb07855ac526e1cfe3593602abee9681c507c7f1adc99d66e4fce43f557`
- Initialize: `feb8394549a9b8a48fa2647a97f13426cbc39a696568d4c9a51e4f0a2e753403`

---

## Quick Start

```bash
cp .env.example .env.local   # fill in your Stellar config
npm install
npm run dev                  # http://localhost:3000
```

Install [Freighter](https://freighter.app), switch to **Testnet**, get test XLM from [friendbot.stellar.org](https://friendbot.stellar.org).

`.env.local` minimum:

```env
NEXT_PUBLIC_APP_CHAIN=stellar
NEXT_PUBLIC_STELLAR_CONTRACT_ID=CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_ZK_CONTRACT_ID=CCUOR6VPMCFDOU7MODZGOI2K264YR3LNRSQ4LMJ37LGTZCTOAHSXWNV5
```

---

## Demo Flow — Drip Private (ZK)

**As the payer:**
1. Open the dashboard, connect Freighter (testnet).
2. Create a stream → toggle **Private Mode ON**.
3. After creation, the *Drip Private* modal generates a random salt, computes `commitment = pedersen(amount, salt)`, and submits `register_commitment` to the verifier contract on-chain. The stream shows a **Private** badge.
4. The salt is saved to `localStorage`; an optional shareable link lets the receiver auto-fill the proof form on another device. *(This link contains the salt — it is for the receiver only, never a third party.)*

**As the receiver:**
1. Open the stream (proof drawer auto-fills amount + salt) and enter the threshold to prove (e.g. 100 XLM).
2. Click **Generate Proof** — Noir.js + Barretenberg run locally in your browser (~5–10 seconds). The amount never leaves your device.
3. In **Share with a verifier**, copy the `/verify` **link** and the **share code** (proof + stream ID + threshold — but *not* the amount or salt). Send both to whoever needs to check your income.

**As a verifier (anyone — no wallet, no Drip account):**
1. Open the **`/verify`** page (linked from the landing nav).
2. Paste the share code (or upload the `.json`) and click **Verify on Stellar**.
3. The page runs a read-only `verify_income_proof` simulation against the live contract and shows **Income Verified** or **Not Verified** — without ever learning the actual amount.

Normal streams (Private Mode off) are completely unaffected.

---

## Comparison

How Drip Private's verification compares to the alternatives a receiver might otherwise use:

| Approach | Privacy | Trust assumption | On-chain verifiable |
|---|---|---|---|
| Payer signs an attestation | Amount leaked to verifier | Trust the payer keeps signing, per threshold & verifier | No |
| Off-chain ZK proof | Amount hidden | Trust the prover/verifier ran it honestly | No (off-chain only) |
| **Drip Private** | **Amount hidden** | **Trustless** | **Yes (BN254 on-chain)** |

See [Why ZK (and not a signed attestation)?](#why-zk-and-not-a-signed-attestation) for the reasoning behind each row.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 · React 18 · Tailwind CSS · Framer Motion |
| Blockchain | Stellar Soroban (XLM streaming + ZK verification) |
| Wallet | Freighter |
| ZK Circuit | Noir `1.0.0-beta.9` (UltraHonk, keccak transcript) |
| ZK Proving (browser) | `@noir-lang/noir_js` + `@aztec/bb.js 0.87.0` |
| ZK Verification (on-chain) | Stellar BN254 host functions (Protocol 23+) via [`rs-soroban-ultrahonk`](https://github.com/yugocabrio/rs-soroban-ultrahonk) |
| Language | TypeScript · Rust |

---

## Architecture

```
drip_proof/
  src/main.nr                  Noir circuit — proves commitment + threshold
  target/
    drip_income_proof.json     ACIR artifact (imported by frontend)
    vk                         1760-byte UltraHonk verification key
    proof                      14592-byte sample proof (used in contract tests)

stellar/
  contracts/
    drip_stream/               XLM streaming escrow (untouched, 14/14 tests)
    drip_zk_verifier/          Income-proof verifier (11/11 tests)
  crates/
    ultrahonk-soroban-verifier/ Vendored BN254 UltraHonk verifier

lib/
  zk/zkProof.ts                Browser proof generation (Noir.js + bb.js)
  stellar/zkVerifier.ts        Soroban verifier contract client
  stellar/proofShare.ts        Encode/decode shareable proof codes + sim source

app/
  verify/page.tsx              Public proof verification page (no wallet needed)

components/streams/
  PrivateStreamModal.tsx        Payer: generates salt, registers commitment
  GenerateProofButton.tsx       Receiver: generates proof + share code
  StellarStreamPanel.tsx        Dashboard stream list with Private 🔒 badge
```

---

## Features

### Stream Management
- Create streams: flow rate (XLM/sec), deposit, max budget, expiry
- Real-time streaming counter with sub-second UI updates
- Withdraw vested funds — receiver only, enforced on-chain
- Pause and resume streams — payer only, enforced on-chain
- Cancel streams and recover remaining escrow — payer only
- Pre-flight transaction simulation before any Freighter prompt

### Drip Private (ZK)
- **Private Mode** toggle on stream creation — opt-in, normal streams unchanged
- Pedersen commitment registered on-chain — stream amount never stored in cleartext on the verifier
- Browser-side UltraHonk proof generation with Noir.js (~5–10s)
- On-chain proof verification via Stellar's BN254 host functions
- `has_commitment` flag drives the **Private** dashboard badge
- Income proof generation is **receiver-only** — the proof button is hidden from the payer
- **Public `/verify` page** — any third party can verify a proof with no wallet and no Drip account; the page funds a throwaway Friendbot account for the read-only simulation
- **Shareable proof code** — receiver exports a compact code (or `.json`) bundling the proof + stream ID + threshold; the amount and salt are never included, so it is safe to send to anyone
- Receiver-convenience proof link persists the salt in `localStorage` / an optional URL so re-opening the proof form on the same device skips manual entry
- Selective disclosure: receiver chooses what threshold to prove, to whom, and when

### Compliance & Reporting
- Real on-chain stream records
- CSV export (22 columns, Excel-compatible)
- Audit-ready transaction logs with category filtering and date range selection

---

## ZK Contract API (`drip_zk_verifier`)

| Function | Description |
|---|---|
| `initialize(admin, drip_stream, vk)` | One-time setup. Validates and stores the 1760-byte VK. |
| `register_commitment(caller, stream_id, commitment)` | Payer-only. Cross-contract read confirms `caller` is the stream's payer, then stores the 32-byte Pedersen commitment. |
| `verify_income_proof(stream_id, threshold, proof) → bool` | Read-only. Verifies a 14592-byte UltraHonk proof against `[commitment, threshold]`. Returns `true` iff valid. |
| `get_commitment(stream_id) → BytesN<32>` | Returns the registered commitment. |
| `has_commitment(stream_id) → bool` | Whether a commitment exists (drives the UI badge). |
| `vk_bytes() → Bytes` | Returns the stored VK for auditability. |

---

## Testing

```bash
# Soroban contracts
cd stellar
cargo test --package drip-stream        # 14/14 passing
cargo test --package drip-zk-verifier   # 11/11 passing
                                        # includes test_verify_income_proof_valid:
                                        # a real 14592-byte proof through the host BN254 path

# Noir circuit
cd drip_proof
nargo test                              # 3/3 passing

# TypeScript
npm run typecheck
```

**Key correctness result:** `bb.js pedersenHash([5000, 123456789])` produces `0x0491f0ab…5cd5` — identical to the Noir circuit output and to what the on-chain verifier reconstructs from the registered commitment. The proof generated in the browser will verify in the contract. This was verified byte-for-byte.

---

## Build from Source

**Prerequisites:** Rust, Stellar CLI, Node.js 18+.

```bash
# Install Noir (version-pinned)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup -v 1.0.0-beta.9

# Compile circuit + regenerate artifacts
cd drip_proof && ./build.sh

# Build contracts
cd ../stellar && stellar contract build --manifest-path Cargo.toml

# Frontend
cd .. && npm install && npm run dev
```

> The frontend imports `drip_proof/target/drip_income_proof.json`. Run `./build.sh` before `npm run build` or the import will fail.

---

## Benchmarks

Measured (not estimated) contract sizes, on-chain resource fees, and proving time are in [BENCHMARKS.md](BENCHMARKS.md). Headline: deployed WASM is 11.2 KiB (`drip_stream`) + 29.3 KiB (`drip_zk_verifier`); the third-party verification a verifier runs is **free** (read-only simulation, no transaction submitted); the one-time `register_commitment` setup is ~$0.69 at current XLM price.

---

## Limitations & Honest Notes

These split into two kinds, and the distinction matters: scope limitations are *temporary* and clear with engineering; the privacy-model limitation is *architectural* and needs a contract redesign, not just more work.

### Current scope (solvable with engineering)

| Item | Status |
|---|---|
| Token | **XLM only** — other Stellar assets are SAC-compatible and on the roadmap |
| Deployment | **Testnet only** — mainnet pending security review |
| Browser proving speed | bb.js runs single-threaded without cross-origin isolation (~5–10s). Correct as-is; COOP/COEP headers enable multithreading and cut this substantially |
| Toolchain pinning | Proofs only verify with **Noir 1.0.0-beta.9 + Barretenberg 0.87.0 + keccak transcript**. Documented in [`DRIP_PRIVATE.md`](DRIP_PRIVATE.md) |
| PDF export | Stub — shows "coming soon" toast |

None of these change the security model. They are roadmap and ergonomics.

### Privacy model (architectural — needs a redesign)

| Item | Status |
|---|---|
| Cleartext amount in stream contract | The `drip_stream` contract stores the stream amount in cleartext. Drip Private layers a ZK commitment/proof on top, so the amount is hidden from a verifier holding only a share code — but **not** from anyone reading the stream contract's ledger entries directly. See [Privacy Model & Threat Analysis](#privacy-model--threat-analysis). |

This is the one limitation you cannot engineer away within the current architecture. Closing it means **Confidential streaming**: a redesigned `drip_stream` that moves the commitment in-contract and never persists the cleartext amount. It is the headline item on the roadmap, called out deliberately rather than buried — selective disclosure is real and useful today, and full confidentiality is the next milestone, not a claim we make now.

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, features, calculator, use cases |
| `/dashboard` | Stream management with Private 🔒 badges and Income Proof actions |
| `/verify` | Public ZK proof verification — paste a share code, verify on-chain, no wallet |
| `/docs` | Documentation hub |
| `/compliance` | Compliance reporting and CSV export |
| `/faq` | Frequently asked questions |

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

Built with ❤️ on Stellar · Submitted to **Stellar Hacks: Real-World ZK**
