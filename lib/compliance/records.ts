import type { SolanaCluster } from "../solana/constants";
import { getExplorerAddressUrl } from "../solana/explorer";

export interface ComplianceStreamRecord {
  streamAccount: string;
  streamId: string;
  payer: string;
  receiver: string;
  direction: "in" | "out";
  category: string;
  status: string;
  startTime: number;
  expirationTime: number;
  durationSeconds: number;
  depositedAmountSol: number;
  withdrawnAmountSol: number;
  flowRateSolPerSecond: number;
  maxBudgetSol: number;
  totalPausedSeconds: number;
  estimatedUnlockedSol: number;
  txSignature?: string;
  explorerUrl: string;
}

export function mapUiStreamToComplianceRecord(
  stream: Record<string, any>,
  cluster: SolanaCluster,
): ComplianceStreamRecord {
  const streamAccount: string = stream.publicKey ?? stream.id ?? "";
  const streamId: string = stream.id ?? streamAccount;
  const direction: "in" | "out" = stream.dir === "out" ? "out" : "in";

  // payerPublicKey and receiverPublicKey are the full on-chain addresses, added in Phase 9
  const payer: string = stream.payerPublicKey ?? stream.addr ?? "unknown";
  const receiver: string = stream.receiverPublicKey ?? stream.addr ?? "unknown";

  const category: string =
    stream.policy === "agent" ? "AI_COMPUTE" : "OTHER";

  const status: string = stream.status ?? "unknown";
  const startTime: number = stream.startedUnix ?? 0;
  const expirationTime: number = stream.expirationTime ?? 0;
  const durationSeconds: number = stream.totalDuration ?? 0;
  const depositedAmountSol: number = stream.deposit ?? 0;
  const withdrawnAmountSol: number = stream.withdrawnAmountSol ?? 0;
  const flowRateSolPerSecond: number = stream.rate ?? 0;
  const maxBudgetSol: number = stream.maxBudgetSol ?? 0;
  const totalPausedSeconds: number = stream.totalPausedSeconds ?? 0;
  const estimatedUnlockedSol: number = stream.base ?? 0;
  const txSignature: string | undefined = stream.lastTxSignature ?? undefined;
  const explorerUrl: string = streamAccount
    ? getExplorerAddressUrl(streamAccount, cluster)
    : "";

  return {
    streamAccount,
    streamId,
    payer,
    receiver,
    direction,
    category,
    status,
    startTime,
    expirationTime,
    durationSeconds,
    depositedAmountSol,
    withdrawnAmountSol,
    flowRateSolPerSecond,
    maxBudgetSol,
    totalPausedSeconds,
    estimatedUnlockedSol,
    txSignature,
    explorerUrl,
  };
}
