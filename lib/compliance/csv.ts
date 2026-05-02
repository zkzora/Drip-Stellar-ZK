import type { ComplianceStreamRecord } from "./records";

const CSV_HEADERS = [
  "stream_id", "stream_account", "payer", "receiver",
  "direction", "category", "status",
  "start_time", "expiration_time", "duration_seconds",
  "deposited_sol", "withdrawn_sol", "flow_rate_sol_per_second",
  "max_budget_sol", "total_paused_seconds", "estimated_unlocked_sol",
  "explorer_url",
] as const;

function escapeField(v: string | number): string {
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function recordsToCsv(records: ComplianceStreamRecord[]): string {
  const rows = [CSV_HEADERS.join(",")];
  for (const r of records) {
    rows.push([
      r.streamId, r.streamAccount, r.payer, r.receiver,
      r.direction, r.category, r.status,
      r.startTime, r.expirationTime, r.durationSeconds,
      r.depositedAmountSol, r.withdrawnAmountSol, r.flowRateSolPerSecond,
      r.maxBudgetSol, r.totalPausedSeconds, r.estimatedUnlockedSol,
      r.explorerUrl,
    ].map(escapeField).join(","));
  }
  return rows.join("\n");
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getCsvFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `drip-compliance-report-${y}-${m}-${day}.csv`;
}
