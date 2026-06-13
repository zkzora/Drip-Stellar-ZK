// Drip Private — transaction helpers for the drip_zk_verifier Soroban contract.
//
// Browser-only. Mirrors the build / simulate / submit pattern in
// ./transactions.ts. Three operations:
//   • register_commitment  — payer registers a Pedersen commitment (signed tx)
//   • verify_income_proof  — verify a proof; read-only, run via simulation so it
//                            needs no wallet and returns the boolean instantly
//   • get_commitment / has_commitment — read registered commitment state
//
// The verifier contract id is independent from the streaming contract:
//   NEXT_PUBLIC_STELLAR_ZK_CONTRACT_ID

import {
  rpc,
  xdr,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Contract,
  Address,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";

const ZK_CONTRACT_ID = process.env.NEXT_PUBLIC_STELLAR_ZK_CONTRACT_ID ?? "";
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "";
const NETWORK_PASSPHRASE = Networks.TESTNET;

export type ZkBuildResult = { ok: boolean; txXdr?: string; error?: string };
export type ZkVerifyResult = { ok: boolean; verified?: boolean; error?: string };
export type ZkCommitmentResult = { ok: boolean; commitmentHex?: string | null; error?: string };

export function isZkConfigured(): boolean {
  return (
    !!ZK_CONTRACT_ID &&
    ZK_CONTRACT_ID !== "REPLACE_WITH_ZK_VERIFIER_CONTRACT_ID" &&
    !!RPC_URL
  );
}

function getServer(): rpc.Server {
  return new rpc.Server(RPC_URL);
}

// ── Encoding helpers ────────────────────────────────────────────────────────────

/** Normalize a hex commitment ("0x…" or bare) to a 32-byte big-endian buffer. */
export function commitmentHexToBytes(hex: string): Uint8Array {
  let h = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (h.length % 2 !== 0) h = "0" + h;
  // Left-pad to 32 bytes (64 hex chars) — field elements are < 2^254.
  h = h.padStart(64, "0");
  if (h.length !== 64) throw new Error("commitment must encode to 32 bytes");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function bytesScVal(bytes: Uint8Array): xdr.ScVal {
  // BytesN<32> and Bytes both accept an scvBytes payload.
  return xdr.ScVal.scvBytes(Buffer.from(bytes));
}

// ── Build / simulate ────────────────────────────────────────────────────────────

async function buildAndSimulate(
  callerAddress: string,
  op: xdr.Operation,
): Promise<ZkBuildResult> {
  if (!isZkConfigured()) {
    return {
      ok: false,
      error:
        "ZK verifier not configured. Set NEXT_PUBLIC_STELLAR_ZK_CONTRACT_ID and NEXT_PUBLIC_STELLAR_RPC_URL in .env.local.",
    };
  }
  try {
    const server = getServer();
    const account = await server.getAccount(callerAddress);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(60)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      return { ok: false, error: `Simulation failed: ${sim.error.slice(0, 300)}` };
    }
    const assembled = rpc.assembleTransaction(tx, sim).build();
    return { ok: true, txXdr: assembled.toXDR() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.slice(0, 300) };
  }
}

/**
 * Build a signed-tx-ready `register_commitment(caller, stream_id, commitment)`.
 * Only the stream's payer can register (enforced on-chain).
 */
export async function buildRegisterCommitment(params: {
  payerAddress: string;
  streamId: bigint;
  commitmentHex: string;
}): Promise<ZkBuildResult> {
  if (!isZkConfigured()) return { ok: false, error: "ZK verifier not configured." };
  let commitmentBytes: Uint8Array;
  try {
    commitmentBytes = commitmentHexToBytes(params.commitmentHex);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "bad commitment" };
  }
  const contract = new Contract(ZK_CONTRACT_ID);
  const op = contract.call(
    "register_commitment",
    new Address(params.payerAddress).toScVal(),
    nativeToScVal(params.streamId, { type: "u64" }),
    bytesScVal(commitmentBytes),
  );
  return buildAndSimulate(params.payerAddress, op);
}

/**
 * Verify an income proof by SIMULATING `verify_income_proof` against current
 * ledger state. This is read-only (the contract method changes no state and
 * needs no auth), so it returns the boolean result instantly with no wallet
 * signature or fee. `sourceAddress` is any funded account used as the tx source
 * for simulation.
 */
export async function verifyIncomeProof(params: {
  sourceAddress: string;
  streamId: bigint;
  threshold: bigint;
  proof: Uint8Array;
}): Promise<ZkVerifyResult> {
  if (!isZkConfigured()) return { ok: false, error: "ZK verifier not configured." };
  try {
    const server = getServer();
    const contract = new Contract(ZK_CONTRACT_ID);
    const op = contract.call(
      "verify_income_proof",
      nativeToScVal(params.streamId, { type: "u64" }),
      nativeToScVal(params.threshold, { type: "i128" }),
      bytesScVal(params.proof),
    );
    const account = await server.getAccount(params.sourceAddress);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(60)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      // A contract `Err` (e.g. CommitmentNotFound) surfaces here.
      return { ok: false, error: sim.error.slice(0, 300) };
    }
    const retval = sim.result?.retval;
    if (!retval) return { ok: false, error: "No result returned from verifier." };
    const verified = scValToNative(retval) as boolean;
    return { ok: true, verified: Boolean(verified) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.slice(0, 300) };
  }
}

/** Read the commitment registered for a stream. Returns null if none. */
export async function getCommitment(params: {
  sourceAddress: string;
  streamId: bigint;
}): Promise<ZkCommitmentResult> {
  if (!isZkConfigured()) return { ok: false, error: "ZK verifier not configured." };
  try {
    const server = getServer();
    const contract = new Contract(ZK_CONTRACT_ID);
    const op = contract.call(
      "has_commitment",
      nativeToScVal(params.streamId, { type: "u64" }),
    );
    const account = await server.getAccount(params.sourceAddress);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(60)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      return { ok: false, error: sim.error.slice(0, 200) };
    }
    const has = sim.result?.retval ? Boolean(scValToNative(sim.result.retval)) : false;
    if (!has) return { ok: true, commitmentHex: null };

    // Fetch the actual commitment bytes.
    const op2 = contract.call("get_commitment", nativeToScVal(params.streamId, { type: "u64" }));
    const tx2 = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op2)
      .setTimeout(60)
      .build();
    const sim2 = await server.simulateTransaction(tx2);
    if (rpc.Api.isSimulationError(sim2) || !sim2.result?.retval) {
      return { ok: true, commitmentHex: null };
    }
    const raw = scValToNative(sim2.result.retval) as Uint8Array | Buffer;
    return { ok: true, commitmentHex: bytesToHex(Uint8Array.from(raw)) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.slice(0, 200) };
  }
}

export { ZK_CONTRACT_ID };
