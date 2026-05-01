import { PublicKey } from "@solana/web3.js";

export type SolanaCluster = "devnet" | "localnet" | "mainnet-beta";

const FALLBACK_PROGRAM_ID = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkgPj3GVjKqLx";
const FALLBACK_RPC = "https://api.devnet.solana.com";
const FALLBACK_CLUSTER: SolanaCluster = "devnet";

export const SOLANA_CLUSTER: SolanaCluster =
  (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as SolanaCluster | undefined) ??
  FALLBACK_CLUSTER;

export const SOLANA_RPC_URL: string =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? FALLBACK_RPC;

function parseProgramId(): PublicKey {
  const raw = process.env.NEXT_PUBLIC_DRIP_PROGRAM_ID ?? FALLBACK_PROGRAM_ID;
  try {
    return new PublicKey(raw);
  } catch {
    console.error(`[drip] Invalid NEXT_PUBLIC_DRIP_PROGRAM_ID: "${raw}", falling back to IDL address.`);
    return new PublicKey(FALLBACK_PROGRAM_ID);
  }
}

export const DRIP_PROGRAM_ID: PublicKey = parseProgramId();

export const LAMPORTS_PER_SOL_NUM = 1_000_000_000;

const _rawProgramId = process.env.NEXT_PUBLIC_DRIP_PROGRAM_ID;
export const DRIP_PROGRAM_ID_CONFIGURED =
  !!_rawProgramId && _rawProgramId !== "REPLACE_WITH_DEPLOYED_PROGRAM_ID";
