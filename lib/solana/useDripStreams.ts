"use client";

import { useState, useEffect, useCallback } from "react";
import { useDripWallet } from "./useDripWallet";
import { fetchStreamsForWallet } from "./stream";
import { calculateUnlockedAmountClientSide } from "../rates";
import { createSeedStreams } from "../mock-data";
import type { DripStream } from "./types";
import type { PublicKey } from "@solana/web3.js";

const L = 1_000_000_000;

function shortAddr(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;
}

function mapToUiStream(stream: DripStream, walletKey: PublicKey): Record<string, any> {
  const isOut = stream.payer.equals(walletKey);
  const counterparty = isOut ? stream.receiver : stream.payer;
  const cStr = counterparty.toBase58();

  const nowSec = Math.floor(Date.now() / 1000);
  const unlocked = calculateUnlockedAmountClientSide(stream, nowSec);
  const baseSOL = unlocked.toNumber() / L;

  // Map on-chain status to UI status (UI only knows streaming/paused/completed)
  const uiStatus =
    stream.status === "cancelled" || stream.status === "expired" ? "completed" : stream.status;

  return {
    id: stream.publicKey.toBase58(),
    dir: isOut ? "out" : "in",
    party: shortAddr(cStr),
    addr: shortAddr(cStr),
    token: "SOL",
    rate: stream.flowRateLamportsPerSecond.toNumber() / L,
    status: uiStatus,
    // Reset started to now so elapsed = 0 and live counter ticks from baseSOL
    started: Date.now(),
    base: baseSOL,
    label: `Stream ${stream.publicKey.toBase58().slice(0, 8)}`,
    deposit: stream.depositedAmountLamports.toNumber() / L,
    totalDuration:
      stream.flowRateLamportsPerSecond.gtn(0)
        ? stream.depositedAmountLamports.toNumber() / stream.flowRateLamportsPerSecond.toNumber()
        : 0,
    policy:
      stream.maxBudgetLamports.gtn(0) || stream.expirationTime > 0 ? "agent" : "standard",
    publicKey: stream.publicKey.toBase58(),
    receiverPublicKey: stream.receiver.toBase58(),
    payerPublicKey: stream.payer.toBase58(),
    withdrawnAmountSol: stream.withdrawnAmountLamports.toNumber() / L,
    // Fields preserved for compliance records
    startedUnix: stream.startTime,
    expirationTime: stream.expirationTime,
    maxBudgetSol: stream.maxBudgetLamports.toNumber() / L,
    totalPausedSeconds: stream.totalPausedSeconds,
  };
}

export function useDripStreams() {
  const { connected, wallet, publicKey } = useDripWallet();
  const [streams, setStreams] = useState<any[]>(() => createSeedStreams());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(true);

  const refresh = useCallback(async () => {
    if (!connected || !wallet || !publicKey) {
      setStreams(createSeedStreams());
      setUsingMockData(true);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchStreamsForWallet({ wallet, walletPublicKey: publicKey, role: "both" });
      setStreams(raw.map((s) => mapToUiStream(s, publicKey)));
      setUsingMockData(false);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setUsingMockData(false);
    } finally {
      setLoading(false);
    }
  }, [connected, wallet, publicKey]);

  const pkStr = publicKey?.toBase58();
  useEffect(() => {
    if (connected && wallet && publicKey) {
      void refresh();
    } else {
      setStreams(createSeedStreams());
      setUsingMockData(true);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, pkStr]);

  return {
    streams,
    setStreams,
    incomingStreams: streams.filter((s) => s.dir === "in"),
    outgoingStreams: streams.filter((s) => s.dir === "out"),
    loading,
    error,
    refresh,
    usingMockData,
  };
}
