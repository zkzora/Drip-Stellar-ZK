// Drip Private — browser-side zero-knowledge proof generation with Noir.js.
//
// Generates UltraHonk proofs for the `drip_income_proof` circuit so a stream
// receiver can prove "my committed amount is >= threshold" without revealing
// the amount. Proofs use the keccak transcript so they verify against the
// on-chain `drip_zk_verifier` Soroban contract.
//
// The heavy WASM libraries (@noir-lang/noir_js, @aztec/bb.js) are imported
// dynamically so they only load in the browser, never during SSR.
//
// Prerequisite: the circuit must be compiled first —
//   cd drip_proof && nargo compile
// which produces drip_proof/target/drip_income_proof.json (imported below).

import type { CompiledCircuit } from "@noir-lang/noir_js";
// JSON artifact produced by `nargo compile`. Path alias @/* -> project root.
import circuitJson from "@/drip_proof/target/drip_income_proof.json";

const circuit = circuitJson as unknown as CompiledCircuit;

export interface ProofInputs {
  amount: bigint; // private: actual stream amount in stroops
  salt: bigint; // private: random salt (see generateSalt)
  threshold: bigint; // public: minimum income threshold to prove
}

export interface ProofResult {
  proof: Uint8Array; // 14592-byte UltraHonk proof (send to the contract)
  commitment: string; // hex-encoded public commitment (pedersen_hash([amount, salt]))
  threshold: bigint; // public threshold the proof attests to
}

/**
 * Compute `commitment = pedersen_hash([amount, salt])` exactly as the Noir
 * circuit (and the on-chain verifier) does. Used by the payer to register a
 * commitment when creating a private stream — no proof needed.
 *
 * Returns a 0x-prefixed, 32-byte big-endian hex string.
 */
export async function computeCommitment(amount: bigint, salt: bigint): Promise<string> {
  const { BarretenbergSync, Fr } = await import("@aztec/bb.js");
  const bb = await BarretenbergSync.initSingleton();
  const hash = bb.pedersenHash([new Fr(amount), new Fr(salt)], 0);
  return hash.toString();
}

/**
 * Generate an income proof: proves knowledge of (amount, salt) hashing to the
 * commitment AND that amount >= threshold. The amount itself stays private.
 *
 * Takes ~5–10s in the browser. Returns the bare proof bytes plus the public
 * commitment; the on-chain verifier reconstructs the public inputs from the
 * registered commitment and the threshold.
 */
export async function generateIncomeProof(inputs: ProofInputs): Promise<ProofResult> {
  const { Noir } = await import("@noir-lang/noir_js");
  const { UltraHonkBackend } = await import("@aztec/bb.js");

  const commitment = await computeCommitment(inputs.amount, inputs.salt);

  const noir = new Noir(circuit);
  const { witness } = await noir.execute({
    amount: inputs.amount.toString(),
    salt: inputs.salt.toString(),
    commitment, // must equal pedersen_hash([amount, salt]); circuit asserts it
    threshold: inputs.threshold.toString(),
  });

  const backend = new UltraHonkBackend(circuit.bytecode);
  // keccak: true selects the keccak transcript that the Soroban verifier expects.
  const { proof, publicInputs } = await backend.generateProof(witness, { keccak: true });
  await backend.destroy();

  return {
    proof,
    // publicInputs[0] is the commitment, publicInputs[1] is the threshold.
    commitment: publicInputs[0] ?? commitment,
    threshold: inputs.threshold,
  };
}

/**
 * Generate a cryptographically-random 31-byte salt that fits inside the BN254
 * scalar field. The payer must save this — the receiver needs it to generate
 * proofs later.
 */
export function generateSalt(): bigint {
  const bytes = new Uint8Array(31); // 31 bytes stays within the BN254 field
  crypto.getRandomValues(bytes);
  return BigInt(
    "0x" +
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
  );
}

/** Format proof bytes as a 0x hex string for display / copy. */
export function proofToHex(proof: Uint8Array): string {
  return (
    "0x" +
    Array.from(proof)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
