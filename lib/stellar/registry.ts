// Lightweight localStorage-backed registry for Stellar streams tracked per wallet.
// Key format:  drip:stellar-testnet:streams:<walletAddress>
// Browser-only — all functions silently no-op in SSR (no window/localStorage).

export type StellarStreamRecord = {
  streamId: string;        // numeric as string, e.g. "3"
  payer: string;           // G… address
  receiver: string;        // G… address
  amountStroops: string;   // raw i128 as string
  createdTxHash?: string;
  createdAt?: string;      // ISO 8601
  lastKnownStatus: string; // "Active" | "Paused" | "Cancelled" | "Completed" | "unknown"
  lastLoadedAt: string;    // ISO 8601
};

const PREFIX = "drip:stellar-testnet:streams:";

function storageKey(walletAddress: string): string {
  return PREFIX + walletAddress;
}

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function loadRegistry(walletAddress: string): StellarStreamRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(storageKey(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistRegistry(walletAddress: string, records: StellarStreamRecord[]): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(storageKey(walletAddress), JSON.stringify(records));
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

/** Insert or update a record (matched by streamId). Newest records sort first. */
export function upsertStreamRecord(
  walletAddress: string,
  record: StellarStreamRecord,
): void {
  const records = loadRegistry(walletAddress);
  const idx = records.findIndex((r) => r.streamId === record.streamId);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...record };
  } else {
    records.unshift(record);
  }
  persistRegistry(walletAddress, records);
}

export function removeStreamRecord(walletAddress: string, streamId: string): void {
  const records = loadRegistry(walletAddress);
  persistRegistry(walletAddress, records.filter((r) => r.streamId !== streamId));
}

export function clearRegistryForWallet(walletAddress: string): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(storageKey(walletAddress));
  } catch {}
}
