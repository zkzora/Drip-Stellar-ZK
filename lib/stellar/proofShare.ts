// Drip Private — shareable proof packages for third-party verification.
//
// An income proof is ~14.6 KB, far too large for a URL. Instead the receiver
// exports a compact "share code" (base64 of a small JSON envelope) that bundles
// everything a verifier needs: stream id, threshold, and the proof bytes. The
// amount and salt are NEVER included — they stay on the receiver's device.
//
// A verifier pastes the code into /verify, and the page runs a read-only
// `verify_income_proof` simulation against the live contract. No wallet, no
// signature, no fee — just a cryptographic yes/no.

import { Keypair } from "@stellar/stellar-sdk";

const PKG_VERSION = 1;

export interface ProofPackage {
  v: number;
  stream: string; // stream id (decimal string)
  threshold: string; // threshold in stroops (decimal string)
  proof: string; // base64 of the raw UltraHonk proof bytes
}

export interface DecodedProof {
  streamId: string;
  thresholdStroops: bigint;
  proof: Uint8Array;
}

// ── base64 <-> bytes (browser-safe, no Buffer dependency) ───────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// ── encode / decode ─────────────────────────────────────────────────────────────

/** Build a single paste-able share code from a generated proof. */
export function encodeProofPackage(p: {
  streamId: string;
  thresholdStroops: bigint;
  proof: Uint8Array;
}): string {
  const pkg: ProofPackage = {
    v: PKG_VERSION,
    stream: p.streamId,
    threshold: p.thresholdStroops.toString(),
    proof: bytesToBase64(p.proof),
  };
  // base64 the JSON so it's one opaque, whitespace-safe token.
  return btoa(JSON.stringify(pkg));
}

/** Parse a share code (or a raw JSON package) back into verifiable inputs. */
export function decodeProofPackage(code: string): DecodedProof {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Empty share code.");

  // Common mistake: pasting the raw proof hex (0x000…) instead of the share code.
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    throw new Error(
      "That's the raw proof, not the share code. In the proof drawer use the \"Copy share code\" button (under \"Share with a verifier\").",
    );
  }

  let json: string;
  if (trimmed.startsWith("{")) {
    json = trimmed; // already a raw JSON envelope (e.g. an uploaded .json file)
  } else {
    try {
      json = atob(trimmed);
    } catch {
      throw new Error("Invalid share code — could not decode.");
    }
  }

  let pkg: ProofPackage;
  try {
    pkg = JSON.parse(json) as ProofPackage;
  } catch {
    throw new Error("Invalid share code — malformed package.");
  }

  if (!pkg || typeof pkg !== "object") throw new Error("Invalid share code.");
  if (!/^\d+$/.test(String(pkg.stream))) throw new Error("Share code missing a valid stream id.");
  if (!/^\d+$/.test(String(pkg.threshold))) throw new Error("Share code missing a valid threshold.");
  if (!pkg.proof) throw new Error("Share code missing proof data.");

  let proof: Uint8Array;
  try {
    proof = base64ToBytes(pkg.proof);
  } catch {
    throw new Error("Share code proof data is corrupt.");
  }

  return {
    streamId: String(pkg.stream),
    thresholdStroops: BigInt(pkg.threshold),
    proof,
  };
}

/** A JSON file body for the "Download proof" option. */
export function proofPackageFile(p: {
  streamId: string;
  thresholdStroops: bigint;
  proof: Uint8Array;
}): string {
  const pkg: ProofPackage = {
    v: PKG_VERSION,
    stream: p.streamId,
    threshold: p.thresholdStroops.toString(),
    proof: bytesToBase64(p.proof),
  };
  return JSON.stringify(pkg, null, 2);
}

// ── simulation source account ───────────────────────────────────────────────────

const FRIENDBOT_URL = "https://friendbot.stellar.org";
const SIM_SOURCE_KEY = "drip:sim-source";

/**
 * Return a funded testnet account to use as the source for a read-only verify
 * simulation. The public verify page has no wallet, so we mint a throwaway
 * keypair, fund it once via Friendbot, and cache the public key in
 * localStorage. The account never signs anything — it only supplies a sequence
 * number to the simulation.
 *
 * `forceNew` regenerates the account (used to recover if a cached account was
 * reaped by testnet resets).
 */
export async function getSimulationSource(forceNew = false): Promise<string> {
  if (typeof window === "undefined") throw new Error("Simulation source is browser-only.");

  if (!forceNew) {
    const cached = window.localStorage.getItem(SIM_SOURCE_KEY);
    if (cached) return cached;
  }

  const kp = Keypair.random();
  const pub = kp.publicKey();
  const res = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(pub)}`);
  if (!res.ok && res.status !== 400) {
    // 400 usually means "account already funded" — safe to ignore.
    throw new Error("Could not fund a verification account via Friendbot. Try again.");
  }
  window.localStorage.setItem(SIM_SOURCE_KEY, pub);
  return pub;
}

/** Clear the cached simulation source (e.g. after an account-not-found error). */
export function clearSimulationSource(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(SIM_SOURCE_KEY);
}
