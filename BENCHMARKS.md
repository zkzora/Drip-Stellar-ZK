# Benchmarks

All numbers below are **measured**, not estimated. Method and caveats are stated so they can be reproduced and so the limits of the measurement are clear.

**Measurement environment**
- Network: Stellar **Testnet** via `soroban-testnet.stellar.org`
- WASM sizes: fetched from the **deployed on-chain** contract code (`getContractWasmByContractId`) — the exact artifact running on-chain, post-optimization
- Resource fees: `simulateTransaction` against live testnet ledger state, reading `minResourceFee`
- Proving time: Node.js (single-threaded) on the dev machine, median of 3 runs
- XLM price for USD conversion: **$0.216468** (CoinGecko, captured at measurement time — recompute for current price)

> ⚠️ **Testnet, not mainnet.** Resource fees come from testnet `simulateTransaction`. Mainnet figures will differ: network congestion shifts the fee market, and storage/archival rent is calculated against mainnet ledger parameters. Treat these as order-of-magnitude, not invoices.

---

## 1. Contract size (deployed on-chain WASM)

| Contract | Size | |
|---|---|---|
| `drip_stream` | **11,469 bytes** | 11.2 KiB |
| `drip_zk_verifier` | **26,950 bytes** | 26.3 KiB |

The verifier is ~2.6× the streaming contract — expected, since it vendors the UltraHonk/BN254 verification logic. Both are comfortably under Soroban's contract size limits.

---

## 2. On-chain operation cost (`simulateTransaction`)

Fees are the simulated **resource fee** + the 100-stroop base inclusion fee. 1 XLM = 10,000,000 stroops.

| Operation | Total fee (stroops) | XLM | USD @ $0.216 | Submitted on-chain in the app? |
|---|---|---|---|---|
| `create_stream` | 9,366,671 | 0.937 | ~$0.20 | Yes (payer signs) |
| `withdraw` | 9,367,259 | 0.937 | ~$0.20 | Yes (receiver signs) |
| `register_commitment` | 31,801,492 | 3.180 | ~$0.69 | Yes (payer signs, **one-time per private stream**) |
| `verify_income_proof` | 22,558,088 | 2.256 | ~$0.49 | **No — runs as a read-only simulation (see below)** |

Measured against testnet stream **#11** (the first stream found with a registered commitment) for `verify_income_proof` and `withdraw`; a fresh Friendbot-funded account for `create_stream`; and a real stream payer for `register_commitment`.

> Note: `verify_income_proof` was measured on the pre-liveness verifier. The shipped version adds one read-only cross-contract `get_stream` read (the liveness gate), a small increment on top of the figure above. It remains a read-only simulation in the app, so the real-world cost to a verifier is still **$0**.

---

## 3. Browser proving time

| Engine | Median proof time | Source |
|---|---|---|
| Node.js (single-threaded) | **~4.9 s** (5283 / 4889 / 4931 ms) | measured here |
| Chrome desktop | *to measure in-browser* | — |
| Firefox desktop | *to measure in-browser* | — |
| Mobile Safari | *to measure in-browser* | — |

The Node figure is a real baseline on the same WASM (Noir.js + bb.js, keccak transcript). **Per-browser numbers were not measured from this environment** — they require running in each browser engine and are left explicit rather than fabricated. Expect browser times in the same ~5–10 s range single-threaded; enabling cross-origin isolation (COOP/COEP) unlocks bb.js multithreading and cuts this substantially.

---

## Interpretation

**The verification a third party actually runs is free.** The headline ZK cost — `verify_income_proof` at ~2.26 XLM (~$0.49) — is the cost *if you submitted it as an on-chain transaction*. The app never does. Both the `/verify` page and the in-dashboard "Verify on Stellar" button run `verify_income_proof` through `simulateTransaction`, which is a read-only RPC call: no transaction is submitted, no signature is required, and **no fee is paid**. The on-chain BN254 host functions still do the real elliptic-curve work during simulation, so the result is a genuine on-chain verification — it just isn't a billable ledger write. In practice a landlord, client, or grant committee verifies a proof for **$0**. The 2.26 XLM number matters as a measure of computational weight (on-chain ZK verification is heavy), not as a per-check price.

**The costs that are actually paid are modest and mostly one-time.** Creating a stream (~$0.20) and withdrawing (~$0.20) are ordinary streaming-escrow operations. `register_commitment` is the priciest real cost at ~3.18 XLM (~$0.69), but it is a **one-time setup per private stream** and is dominated by persistent storage rent for the new commitment entry, not computation. That is also the clearest optimization target: rent scales with entry TTL, so tuning the commitment's TTL (and batching/extending only as needed) brings this down. It is a current measurement, not a fixed floor — the optimization path includes TTL tuning and, longer term, folding the commitment into the stream entry under the planned confidential-streaming redesign so it isn't a separate rented entry at all.

**Viability read.** For the target use cases — income verification for rentals, lending, grants, and contractor payouts — a one-time ~$0.69 setup and free, unlimited verifications is well within range. The model is viable precisely because the expensive part (ZK verification) is consumed as a simulation rather than a submitted transaction. The honest caveat remains the mainnet delta: storage rent and the fee market will move these numbers, and a security review precedes any mainnet deployment.
