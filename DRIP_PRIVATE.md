# Drip Private — confidential income proofs

Drip Private lets a stream **receiver** prove *"I receive at least X XLM per
month from a valid Drip stream"* to a third party — **without revealing the
exact stream amount on-chain**. Think employment verification, loan
applications, or credit checks, settled with a zero-knowledge proof on Stellar.

It is **opt-in**. Normal Drip streams stay fully public and unchanged; the
deployed `drip_stream` contract is not modified.

---

## How it works

```
        PAYER                         RECEIVER                     VERIFIER (anyone)
          │                              │                              │
  create normal stream                  │                              │
          │                             │                              │
  commitment = pedersen(amount, salt)   │                              │
  register_commitment(stream_id, ───►   │                              │
                      commitment)       │                              │
          │                    save salt + amount                      │
          │                             │                              │
          │                   generate ZK proof:                       │
          │                   "I know (amount, salt) s.t.              │
          │                    pedersen(amount,salt)==commitment       │
          │                    AND amount >= threshold"  ───────────►  verify_income_proof(
          │                             │                                stream_id, threshold, proof)
          │                             │                              │   → true / false
```

The commitment is a **Pedersen hash** of `(amount, salt)`. The proof is a Noir
**UltraHonk** proof verified on-chain via Stellar's **BN254 host functions**
(Protocol 23+). The public inputs are `[commitment, threshold]` — the amount
never appears anywhere on-chain.

### Components

| Component | Path | What it does |
|-----------|------|--------------|
| Noir circuit | `drip_proof/src/main.nr` | Proves `pedersen(amount,salt)==commitment` ∧ `amount≥threshold` |
| Verifier contract | `stellar/contracts/drip_zk_verifier/` | Stores commitments, verifies proofs on-chain |
| Vendored verifier | `stellar/crates/ultrahonk-soroban-verifier/` | UltraHonk verifier ([yugocabrio/rs-soroban-ultrahonk](https://github.com/yugocabrio/rs-soroban-ultrahonk)) |
| Browser proving | `lib/zk/zkProof.ts` | Noir.js + bb.js proof generation |
| Verifier client | `lib/stellar/zkVerifier.ts` | Build/simulate the verifier contract calls |
| UI | `components/streams/PrivateStreamModal.tsx`, `GenerateProofButton.tsx` | Register commitment, generate & verify proofs |

---

## Toolchain (pinned)

The on-chain verifier is byte-compatible with a specific prover toolchain.
**Use these exact versions** or proofs will not verify:

| Tool | Version |
|------|---------|
| Noir (`nargo`) | `1.0.0-beta.9` |
| Barretenberg (`bb`) | `0.87.0` |
| UltraHonk flavor | native BN254, **keccak** transcript, non-ZK |

```bash
# Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup -v 1.0.0-beta.9

# Barretenberg
curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/master/barretenberg/bbup/install | bash
bbup -v 0.87.0
```

---

## 1. Compile the circuit & generate artifacts

```bash
cd drip_proof
./build.sh          # nargo compile + bb prove + bb write_vk (keccak)
```

This produces:

- `target/drip_income_proof.json` — ACIR, imported by the frontend.
- `target/vk` — **1760-byte** verification key (passed to `initialize`).
- `target/proof` — **14592-byte** sample proof (used by contract tests).
- `target/public_inputs` — 64 bytes = `[commitment, threshold]`.

> The frontend imports `drip_proof/target/drip_income_proof.json`, so the
> circuit **must** be compiled before `npm run build`.

---

## 2. Build, test & deploy the verifier contract

```bash
cd stellar
cargo test -p drip-zk-verifier          # 11/11 passing — verifies a REAL proof
stellar contract build --package drip-zk-verifier
```

Deploy and initialize (testnet):

```bash
# Deploy
ZK_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/drip_zk_verifier.wasm \
  --source <YOUR_ACCOUNT> --network testnet)

# Initialize: admin, the existing drip_stream contract, and the circuit VK
stellar contract invoke --id "$ZK_ID" --source <YOUR_ACCOUNT> --network testnet \
  -- initialize \
  --admin <YOUR_ADDRESS> \
  --drip_stream CBY5243GMCIED3ODKDQPOXU4HDYEQMOJGXGHNBQ2E6B5MJ43Q2UXVLRV \
  --vk-file-path ../drip_proof/target/vk
```

Then point the frontend at it in `.env.local`:

```env
NEXT_PUBLIC_STELLAR_ZK_CONTRACT_ID=<ZK_ID from deploy>
```

---

## 3. Frontend

```bash
npm install        # installs @noir-lang/noir_js and @aztec/bb.js
npm run dev
```

In the dashboard's **Stellar Testnet** panel:

1. **Create a stream → toggle "Private Mode" on.** After it's created, the
   *Private Stream* modal generates a salt (save it!) and registers the
   commitment on-chain. The stream now shows a **Private 🔒** badge and its
   amount renders as **Hidden**.
2. As the receiver, click **Income Proof** on the private stream. Enter the
   threshold, the stream amount, and the saved salt → **Generate Proof**
   (~5–10s, runs locally in the browser).
3. Click **Verify on Stellar** → the proof is checked by the
   `drip_zk_verifier` contract → **✅ Income Verified: ≥ <threshold> XLM/month**.

> bb.js runs single-threaded unless the page is *cross-origin isolated*
> (COOP/COEP headers). It still works without isolation — proving is just a few
> seconds slower. Enable isolation only if you don't load cross-origin assets
> that would break under COEP.

---

## Contract API (`drip_zk_verifier`)

| Function | Description |
|----------|-------------|
| `initialize(admin, drip_stream, vk)` | One-time setup. Validates and stores the VK. |
| `register_commitment(caller, stream_id, commitment)` | Payer-only. Confirms `caller` is the stream's payer via a cross-contract read, then stores the commitment. |
| `verify_income_proof(stream_id, threshold, proof) -> bool` | Verifies the proof against `[commitment, threshold]`. Read-only. |
| `get_commitment(stream_id) -> BytesN<32>` | Read the registered commitment. |
| `has_commitment(stream_id) -> bool` | Whether a commitment exists (drives the UI badge). |
| `vk_bytes() -> Bytes` | The stored VK, for auditability. |

---

## Security notes

- This is a **testnet prototype**. The vendored UltraHonk verifier implements
  the non-ZK, non-recursive BN254 path only (see
  `stellar/crates/ultrahonk-soroban-verifier/VERIFIER_PROVENANCE.md`).
- In this hybrid design the underlying `drip_stream` amount is still public
  (the streaming contract was intentionally left unmodified). Drip Private adds
  the ZK commitment/proof layer on top; full end-to-end confidentiality would
  require a streaming contract that never stores the cleartext amount.
- The salt is a secret. Anyone with `(amount, salt)` can generate proofs for a
  commitment; treat it like a credential.
