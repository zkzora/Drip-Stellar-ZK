"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  loadRegistry,
  upsertStreamRecord,
  removeStreamRecord,
  clearRegistryForWallet,
  type StellarStreamRecord,
} from "./registry";
import { getStreamState, type StreamState } from "./transactions";

export type TrackedStream = StellarStreamRecord & {
  onChainState: StreamState | null;
  loadError: string | null;
  isLoading: boolean;
};

export type UseStellarStreamsReturn = {
  streams: TrackedStream[];
  loading: boolean;
  refresh: () => Promise<void>;
  addStream: (record: StellarStreamRecord) => void;
  removeStream: (streamId: string) => void;
  clearAll: () => void;
  count: number;
};

export function useStellarStreams(walletAddress: string | null): UseStellarStreamsReturn {
  const [recordCount, setRecordCount] = useState(0);
  const [streams, setStreams] = useState<TrackedStream[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchingRef = useRef(false);

  // Sync count from storage on wallet change
  useEffect(() => {
    if (!walletAddress) {
      setRecordCount(0);
      setStreams([]);
      return;
    }
    setRecordCount(loadRegistry(walletAddress).length);
  }, [walletAddress]);

  const refresh = useCallback(async () => {
    if (!walletAddress) return;
    if (fetchingRef.current) return;
    const current = loadRegistry(walletAddress); // always fresh from storage
    if (current.length === 0) {
      setStreams([]);
      return;
    }
    fetchingRef.current = true;
    setLoading(true);
    setStreams(current.map((r) => ({ ...r, onChainState: null, loadError: null, isLoading: true })));

    const results = await Promise.all(
      current.map(async (rec): Promise<TrackedStream> => {
        try {
          const result = await getStreamState(BigInt(rec.streamId));
          if (result.ok && result.stream) {
            const updated: StellarStreamRecord = {
              ...rec,
              lastKnownStatus: result.stream.status,
              lastLoadedAt: new Date().toISOString(),
              payer: result.stream.payer || rec.payer,
              receiver: result.stream.receiver || rec.receiver,
              amountStroops: result.stream.amount || rec.amountStroops,
            };
            upsertStreamRecord(walletAddress, updated);
            return { ...updated, onChainState: result.stream, loadError: null, isLoading: false };
          }
          return { ...rec, onChainState: null, loadError: result.error ?? "Not found", isLoading: false };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { ...rec, onChainState: null, loadError: msg.slice(0, 120), isLoading: false };
        }
      }),
    );

    setStreams(results);
    setLoading(false);
    fetchingRef.current = false;
  }, [walletAddress]);

  // Fetch on-chain state whenever recordCount changes (covers add/remove)
  useEffect(() => {
    if (walletAddress && recordCount > 0) {
      void refresh();
    } else {
      setStreams([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordCount, walletAddress]);

  const addStream = useCallback(
    (record: StellarStreamRecord) => {
      if (!walletAddress) return;
      upsertStreamRecord(walletAddress, record);
      setRecordCount(loadRegistry(walletAddress).length);
    },
    [walletAddress],
  );

  const removeStream = useCallback(
    (streamId: string) => {
      if (!walletAddress) return;
      removeStreamRecord(walletAddress, streamId);
      setRecordCount(loadRegistry(walletAddress).length);
    },
    [walletAddress],
  );

  const clearAll = useCallback(() => {
    if (!walletAddress) return;
    clearRegistryForWallet(walletAddress);
    setRecordCount(0);
    setStreams([]);
  }, [walletAddress]);

  return {
    streams,
    loading,
    refresh,
    addStream,
    removeStream,
    clearAll,
    count: recordCount,
  };
}
