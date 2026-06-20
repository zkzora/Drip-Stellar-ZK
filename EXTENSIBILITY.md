# Extensibility — One Circuit, Many Proofs

Drip Private is presented as an *income proof*, but the underlying primitive is general. The Noir circuit proves a single, reusable statement:

```
I know (amount, salt) such that
    pedersen(amount, salt) == commitment      // binds to an on-chain value
    AND amount >= threshold                    // a private comparison
```

Any scenario that reduces to *"prove a committed private number clears a public bar, without revealing the number"* runs on the **same circuit, same verifier contract, same on-chain BN254 verification** — no new contracts required. The examples below are documentation of reach, not separate deployments.

---

## Reusable use cases

### 1. Loan / credit eligibility
**Actor:** a borrower proving creditworthiness to a lender.
**Threshold:** cumulative income ≥ `principal × required-coverage-ratio`.
**Why privacy matters:** the borrower demonstrates they clear the lender's bar without disclosing their full income, savings, or other obligations — the lender gets exactly the one fact underwriting needs.

### 2. Subscription / access gating
**Actor:** a user unlocking a paid tier or gated service.
**Threshold:** committed monthly rate ≥ the tier's minimum.
**Why privacy matters:** the service confirms the user qualifies for a tier without learning their exact spend, so pricing power and usage patterns aren't leaked to the gatekeeper.

### 3. DAO contributor voting weight
**Actor:** a contributor claiming a weighted vote or role.
**Threshold:** committed contribution ≥ the quorum / role threshold.
**Why privacy matters:** the DAO verifies a member meets the participation bar without publishing every contributor's exact contribution on-chain, reducing both doxxing and vote-buying surface.

### 4. Compliance attestation
**Actor:** an employer or platform attesting to a regulator or auditor.
**Threshold:** committed salary ≥ the regional minimum wage.
**Why privacy matters:** the auditor confirms compliance with a legal floor without the employer surfacing individual salaries — the check is binary and the underlying figures stay confidential.

---

## What stays fixed vs what changes

| Fixed (no work needed) | Varies per use case |
|---|---|
| Noir circuit (`drip_proof/src/main.nr`) | Semantic meaning of `amount` and `threshold` |
| `drip_zk_verifier` Soroban contract | Who acts as prover vs verifier |
| BN254 on-chain verification path | The UI/app that collects the threshold |
| Browser proving (Noir.js + bb.js) | What the commitment is bound to |

The circuit is the asset. Income proof is the first product built on it; the rest are a documentation away, not a redeployment away.
