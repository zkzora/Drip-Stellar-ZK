![Drip](public/banner.png)

# Drip

![Stellar](https://img.shields.io/badge/stellar-testnet%20live-7D4CDB?style=flat-square)
![Stream Tests](https://img.shields.io/badge/stream%20tests-14%2F14%20passing-brightgreen?style=flat-square)
![ZK Tests](https://img.shields.io/badge/ZK%20verifier%20tests-11%2F11%20passing-brightgreen?style=flat-square)
![Circuit Tests](https://img.shields.io/badge/Noir%20circuit%20tests-3%2F3%20passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

**Real-time XLM streaming payments on Stellar — with zero-knowledge income proofs.**

Drip is a streaming payments protocol built on **Stellar Soroban**. Set a flow rate, a max budget, and an expiry — then let the escrow stream XLM by the second with full on-chain enforcement.

**Drip Private** extends this with a zero-knowledge layer: a stream receiver can prove *"I receive at least X XLM per month from a valid Drip stream"* to any third party — without revealing the exact amount on-chain. Employment verification, loan applications, credit checks — all provable with a ZK proof verified inside a Soroban contract using Stellar's native BN254 host functions.

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
3. After creation, the *Drip Private* modal generates a random salt, computes `commitment = pedersen(amount, salt)`, and submits `register_commitment` to the verifier contract on-chain.
4. Click **Copy Proof Link** — a shareable URL is copied to clipboard containing the stream ID and salt.
5. Send the link to the receiver via any channel. The stream shows a **Private** badge on the dashboard.

**As the receiver:**
1. Open the shared proof link — dashboard loads, proof drawer auto-opens.
2. Stream amount and salt are **auto-filled**. Only enter the threshold (e.g. 100 XLM).
3. Click **Generate Proof** — Noir.js + Barretenberg run locally in your browser (~5–10 seconds).
4. Click **Verify on Stellar** — proof is submitted to `drip_zk_verifier` on testnet.
5. Contract returns `true` → UI shows **Income Verified: stream pays ≥ [threshold] XLM/month**.

Normal streams (Private Mode off) are completely unaffected.

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

components/streams/
  PrivateStreamModal.tsx        Payer: generates salt, registers commitment
  GenerateProofButton.tsx       Receiver: generates + submits proof
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
- **Shareable Proof Link** — payer copies a URL containing the stream ID and salt; receiver opens it and the proof form auto-fills (amount + salt), no manual copy-paste
- Salt also persisted in `localStorage` so re-opening the proof form on the same device skips the link entirely
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

## Limitations & Honest Notes

| Item | Status |
|---|---|
| Token | **XLM only** — other Stellar assets on roadmap |
| Stream amount privacy | The `drip_stream` contract stores the cleartext amount (it was intentionally not modified). Drip Private adds the ZK commitment/proof layer on top. Full end-to-end confidentiality would require a streaming contract that never stores the cleartext amount — noted as a future improvement. |
| Toolchain pinning | Proofs only verify with **Noir 1.0.0-beta.9 + Barretenberg 0.87.0 + keccak transcript**. Documented in [`DRIP_PRIVATE.md`](DRIP_PRIVATE.md). |
| Browser proving speed | bb.js runs single-threaded without cross-origin isolation. Proving takes ~5–10s. Works correctly; COOP/COEP headers would speed it up. |
| Deployment | **Testnet only** — mainnet pending security review |
| PDF export | Stub — shows "coming soon" toast |

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, features, calculator, use cases |
| `/dashboard` | Stream management with Private 🔒 badges and Income Proof actions |
| `/docs` | Documentation hub |
| `/compliance` | Compliance reporting and CSV export |
| `/faq` | Frequently asked questions |

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

Built with ❤️ on Stellar · Submitted to **Stellar Hacks: Real-World ZK**
