"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@/components/ui/Icon";
import { DashboardBackground } from "@/components/ui/backgrounds";
import { IS_STELLAR_MODE } from "@/lib/app-config";

const CompliancePage = dynamic(() => import("@/components/compliance/CompliancePage"), { ssr: false });
import { StellarStreamPanel } from "@/components/streams/StellarStreamPanel";
import { useDripWallet } from "@/lib/solana/useDripWallet";
import { useFreighterWallet } from "@/lib/stellar/useFreighterWallet";
import { fetchStellarHistory, type StellarHistoryItem, EXPLORER_TX_URL as STELLAR_EXPLORER_TX_URL } from "@/lib/stellar/transactions";
import { useStellarStreams, type UseStellarStreamsReturn } from "@/lib/stellar/useStellarStreams";
import { useDripStreams } from "@/lib/solana/useDripStreams";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { createStream as createSolanaStream, withdrawFromStream, pauseStream, resumeStream, cancelStream } from "@/lib/solana/stream";
import { generateStreamId } from "@/lib/solana/pda";
import { LAMPORTS_PER_SOL_NUM, SOLANA_CLUSTER, SOLANA_RPC_URL, DRIP_PROGRAM_ID, DRIP_PROGRAM_ID_CONFIGURED } from "@/lib/solana/constants";
import { getExplorerTxUrl, getExplorerAddressUrl } from "@/lib/solana/explorer";
import {
  AGENT_LOG_DEMO,
  AGENTS,
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_OVERVIEW_STATS,
  DASHBOARD_ROUTE_LABELS,
  HISTORY_DETAILED,
  HISTORY_FILTERS,
  NEW_STREAM_DEFAULTS,
  PROTOCOL_STATS,
  SETTINGS_DEFAULTS,
  STELLAR_SETTINGS_DEFAULTS,
  STREAM_FILTERS,
  STREAM_TOKEN_OPTIONS,
  TOP_UP_DEFAULT_AMOUNT,
  TOP_UP_PRESETS,
  USER_WALLET_PROFILE,
  YIELD_DEMO,
  createSeedStreams,
} from "@/lib/mock-data";

// Drip Dashboard - single-file React app with full routing
// ---- Utils ----------------------------------------------------------------
const fmtUSD = (n, frac = 6) => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const [w, d = ""] = abs.toFixed(frac).split(".");
  return sign + w.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac ? "." + d : "");
};
const fmtDuration = (sec) => {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const shortWalletAddress = (address) => (address ? `${address.slice(0, 4)}...${address.slice(-4)}` : null);

// Format very small SOL/s values without scientific notation — up to 9 decimals
const fmtRate = (n: number): string => {
  if (n === 0) return "0.000000000";
  // Find first significant digit; use at least 6, up to 9 decimal places
  const decimals = Math.min(9, Math.max(6, -Math.floor(Math.log10(Math.abs(n))) + 2));
  return n.toFixed(decimals);
};

// Rent/deposit minimums for devnet stream creation
// StreamState account (~164 bytes) + escrow system account rent-exempt minimums
const RENT_RESERVE_LAMPORTS = 2_039_280;
const MIN_STREAM_LAMPORTS = 100_000; // 0.0001 SOL minimum practical stream funding
const MIN_DEPOSIT_LAMPORTS = RENT_RESERVE_LAMPORTS + MIN_STREAM_LAMPORTS;
const MIN_DEPOSIT_SOL = MIN_DEPOSIT_LAMPORTS / 1_000_000_000;
const MIN_WITHDRAW_LAMPORTS = 5_000; // block dust/rent-threshold withdrawals

function mapStreamError(err: any): string {
  const msg: string = err?.message ?? String(err);
  if (msg.includes("NothingToWithdraw")) return "No unlocked funds available yet.";
  if (msg.includes("StreamPaused")) return "This stream is paused.";
  if (msg.includes("UnauthorizedPayer")) return "Only the payer can do this.";
  if (msg.includes("UnauthorizedReceiver")) return "Only the receiver can withdraw.";
  if (msg.includes("AlreadyPaused")) return "This stream is already paused.";
  if (msg.includes("NotPaused")) return "This stream is not paused.";
  if (msg.includes("AlreadyCancelled")) return "This stream has already been cancelled.";
  if (msg.includes("InsufficientEscrowFunds")) return "Escrow has insufficient releasable funds.";
  if (msg.includes("Attempt to load a program that does not exist")) return "The configured DRIP program is not deployed on this cluster.";
  if (msg.includes("already been processed")) return "This transaction was already submitted. Refreshing stream state...";
  if (msg.includes("insufficient funds for rent")) return "Account needs more devnet SOL or the withdraw amount is too small. Wait longer or fund the wallet.";
  if (msg.includes("User rejected") || msg.includes("rejected the request") || msg.includes("Transaction rejected") || msg.includes("WalletSignTransactionError")) return "Transaction was rejected in wallet.";
  return msg.length > 200 ? msg.slice(0, 200) + "..." : msg;
}

// Smooth ticker - runs on rAF, accumulates from a base + rate*elapsed.
function useStreamingValue(initial, ratePerSec, running = true) {
  const [v, setV] = useState(initial);
  const startRef = useRef({ t: performance.now(), base: initial });
  useEffect(() => {
    startRef.current = { t: performance.now(), base: v };
    // eslint-disable-next-line
  }, [ratePerSec, running]);
  useEffect(() => {
    let id;
    const tick = () => {
      if (running) {
        const elapsed = (performance.now() - startRef.current.t) / 1000;
        setV(startRef.current.base + elapsed * ratePerSec);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [ratePerSec, running]);
  return v;
}

// Solana avatar - deterministic pixel-blob from seed
function SolAvatar({ seed = "x", size = 32 }: any) {
  // hash â†’ color
  let h = 0; for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i);
  const hue1 = Math.abs(h) % 360;
  const hue2 = (hue1 + 60) % 360;
  return (
    <span className="relative inline-block rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
      <span className="absolute inset-0" style={{
        background: `radial-gradient(circle at 30% 30%, hsl(${hue1}, 80%, 65%), hsl(${hue2}, 75%, 45%) 70%, hsl(${(hue1+180)%360}, 70%, 30%))`,
      }} />
      <span className="absolute inset-0" style={{
        background: `repeating-linear-gradient(${(h%180)}deg, transparent 0 4px, rgba(255,255,255,0.08) 4px 5px)`,
      }} />
    </span>
  );
}

// =========================================================================
// Backdrop / Sidebar / Topbar
// =========================================================================
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <DashboardBackground />
    </div>
  );
}

function DripMark({ size = 26 }: any) {
  return <img src="/logo.png" width={size} height={size} alt="Drip" style={{ display: "inline-block" }} />;
}

function Sidebar({ active, onChange, streams, stellarStreamCount }: any) {
  const items = DASHBOARD_NAV_ITEMS
    .filter((item) => !(IS_STELLAR_MODE && (item.k === "yield" || item.k === "agents")))
    .map((item) => ({
      ...item,
      badge: item.hasStreamBadge
        ? (stellarStreamCount !== undefined
            ? (stellarStreamCount > 0 ? stellarStreamCount : undefined)
            : streams.filter((s) => s.status === "streaming").length || undefined)
        : undefined,
    }));
  return (
    <aside className="hidden lg:flex flex-col w-[240px] shrink-0 border-r border-white/5 px-4 py-5 sticky top-0 h-screen">
      <a href="/" className="flex items-center gap-2.5 px-2 py-1">
        <DripMark />
        <span className="font-medium tracking-tight text-[16px]">Drip</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-violet-300/70 ml-1 px-1.5 py-0.5 rounded border border-violet-400/20">
          {IS_STELLAR_MODE ? "testnet" : "devnet"}
        </span>
      </a>
      <nav className="mt-7 space-y-0.5">
        {items.map((it) => (
          <button
            key={it.k}
            onClick={() => onChange(it.k)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition ${active === it.k ? "bg-white/[0.04] text-white border border-violet-400/20" : "text-white/55 hover:text-white hover:bg-white/[0.02] border border-transparent"}`}
          >
            <Icon name={it.icon} size={15} className={active === it.k ? "text-violet-200" : ""} />
            <span className="flex-1 text-left">{it.label}</span>
            {it.badge ? <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-full bg-violet-400/15 text-violet-200">{it.badge}</span> : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto">
        {IS_STELLAR_MODE ? (
          <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-sky-200/80 font-mono">Stellar Testnet</div>
            <div className="mt-1.5 text-[13px] text-white/85">Native XLM streams via Soroban. Testnet only — no real funds.</div>
            <a href="https://laboratory.stellar.org/#account-creator?network=test" target="_blank" rel="noopener noreferrer" className="mt-3 w-full text-[12px] btn-ghost rounded-md py-1.5 hover:bg-sky-400/10 flex items-center justify-center gap-1.5">
              <Icon name="zap" size={12} /> Get testnet XLM
            </a>
          </div>
        ) : (
          <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200/80 font-mono">Native SOL MVP</div>
            <div className="mt-1.5 text-[13px] text-white/85">Streams native SOL on devnet. SPL token support is on the roadmap.</div>
            <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="mt-3 w-full text-[12px] btn-ghost rounded-md py-1.5 hover:bg-violet-400/10 flex items-center justify-center gap-1.5">
              <Icon name="zap" size={12} /> Get devnet SOL
            </a>
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 px-2 text-[11px] font-mono text-white/35">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
          <span>{PROTOCOL_STATS.rpcStatus} · slot {PROTOCOL_STATS.rpcSlotShort}</span>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ route, onNewStream, streamChain, freighter }: any) {
  // In Stellar mode we skip the Solana wallet entirely — IS_STELLAR_MODE is checked below.
  const solanaWallet = useDripWallet();
  const { connected, connecting, publicKeyString, connect, disconnect, providerName } = IS_STELLAR_MODE
    ? { connected: false, connecting: false, publicKeyString: null, connect: null, disconnect: null, providerName: null }
    : solanaWallet;
  const walletLabel = connected ? shortWalletAddress(publicKeyString) : connecting ? "Connecting..." : "Connect";
  const walletMeta = connected ? providerName ?? "Solana wallet" : "Solana signer";

  const handleWalletClick = () => {
    if (connected) { void disconnect?.(); return; }
    void connect?.();
  };

  const isStellar = IS_STELLAR_MODE || streamChain === "stellar-testnet";

  const stellarLabel = freighter?.connecting
    ? "Connecting..."
    : freighter?.connected && freighter.address
    ? `${freighter.address.slice(0, 4)}...${freighter.address.slice(-4)}`
    : !freighter?.available
    ? "Install Freighter"
    : "Connect Freighter";
  const stellarMeta = freighter?.connected
    ? freighter.network ?? "Stellar Testnet"
    : "Stellar signer";

  const handleStellarClick = () => {
    if (!freighter?.available) {
      window.open("https://freighter.app", "_blank", "noopener,noreferrer");
      return;
    }
    if (freighter?.connected) { freighter.disconnect(); return; }
    void freighter?.connect();
  };

  return (
    <div className="sticky top-0 z-30 backdrop-blur-md border-b border-white/5 bg-[#070612]/70">
      <div className="flex items-center gap-2 px-4 sm:px-8 py-3.5">
        <div className="flex items-center gap-2 text-[13px] text-white/45 font-mono min-w-0">
          <span className="lg:hidden font-medium text-white/60 shrink-0">Drip</span>
          <Icon name="chevron-right" size={12} className="lg:hidden shrink-0" />
          <span className="text-white/85 truncate">{DASHBOARD_ROUTE_LABELS[route]}</span>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-[12.5px] text-white/55 w-[260px]">
            <Icon name="search" size={13} />
            <span className="flex-1">Search streams, addresses, txns...</span>
            <span className="font-mono text-[10px] text-white/35 px-1.5 rounded border border-white/10">⌘K</span>
          </div>
          <button className="hidden sm:flex btn-ghost rounded-full w-9 h-9 items-center justify-center text-white/60 hover:text-white">
            <Icon name="bell" size={14} />
          </button>
          {!isStellar && (
            <button onClick={onNewStream} className="btn-primary rounded-full px-2.5 sm:px-4 py-2 text-[13px] font-medium text-white flex items-center gap-1.5">
              <Icon name="plus" size={14} />
              <span className="hidden sm:inline">New stream</span>
            </button>
          )}
          {isStellar ? (
            <button
              onClick={handleStellarClick}
              disabled={freighter?.connecting}
              className={`flex items-center gap-1.5 pl-1.5 pr-2 sm:pr-3 py-1 rounded-full border border-white/10 hover:border-sky-400/30 transition ${freighter?.connecting ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 shrink-0" />
              <div className="text-left leading-tight hidden sm:block">
                <div className="text-[12px] text-white">{stellarLabel}</div>
                <div className="text-[10px] font-mono text-white/45">{stellarMeta}</div>
              </div>
            </button>
          ) : (
            <button onClick={handleWalletClick} className="flex items-center gap-1.5 pl-1.5 pr-2 sm:pr-3 py-1 rounded-full border border-white/10 hover:border-violet-400/30 transition">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 shrink-0" />
              <div className="text-left leading-tight hidden sm:block">
                <div className="text-[12px] text-white">{walletLabel}</div>
                <div className="text-[10px] font-mono text-white/45">{walletMeta}</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({ active, onChange }: any) {
  const items = DASHBOARD_NAV_ITEMS
    .filter((item) => !(IS_STELLAR_MODE && (item.k === "yield" || item.k === "agents")))
    .slice(0, 5);
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#07060f]/95 backdrop-blur-md safe-area-inset-bottom">
      <div className="flex items-center">
        {items.map((item) => (
          <button
            key={item.k}
            onClick={() => onChange(item.k)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition ${active === item.k ? "text-violet-300" : "text-white/40"}`}
          >
            <Icon name={item.icon} size={18} />
            <span className="text-[9.5px] font-mono">{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// =========================================================================
// Page header (consistent across routes)
// =========================================================================
function PageHeader({ eyebrow, title, sub, right }: any) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300/70 font-mono">{eyebrow}</div>
        <h1 className="mt-2 text-[22px] sm:text-[34px] leading-[1.05] tracking-[-0.02em] font-medium text-iri">{title}</h1>
        {sub && <p className="mt-2 text-[14px] text-white/55 max-w-[600px] leading-[1.55]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function WalletDemoNotice({ error, onConnect }: any) {
  if (IS_STELLAR_MODE) return null;
  return (
    <div className="rounded-2xl border border-violet-400/25 bg-violet-400/[0.06] px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="w-8 h-8 rounded-full bg-violet-400/15 text-violet-200 flex items-center justify-center">
        <Icon name="fingerprint" size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-white">Demo data is still visible while your wallet is disconnected.</div>
        <div className="text-[11.5px] font-mono text-white/45">
          Connect a Solana wallet before signing transaction actions.
          {error ? <span className="text-rose-300"> {error}</span> : null}
        </div>
      </div>
      <button onClick={onConnect} className="btn-primary rounded-full px-4 py-2 text-[12.5px] font-medium text-white flex items-center gap-1.5">
        <Icon name="fingerprint" size={13} /> Connect Wallet
      </button>
    </div>
  );
}

// =========================================================================
// DASHBOARD page
// =========================================================================
// =========================================================================
// STELLAR DASHBOARD — replaces DashboardPage in Stellar mode.
// Derives stats from the local stream registry + on-chain state.
// =========================================================================
const STELLAR_FEATURE_CARDS = [
  { icon: "plus-circle",  title: "Create XLM streams",    desc: "Stream native XLM to any Stellar address. Set total amount and duration — funds vest per second via Soroban." },
  { icon: "pause-circle", title: "Pause & resume",         desc: "Halt vesting instantly on-chain. No funds are lost — resume anytime with a single Freighter signature." },
  { icon: "download",     title: "Withdraw vested XLM",    desc: "Receiver withdraws any vested portion at any time during or after the stream — fully self-custodial." },
  { icon: "x-circle",     title: "Cancel & reclaim",       desc: "Payer can cancel early. Vested XLM goes to receiver; unvested remainder returns to payer automatically." },
];

function StellarDashboard({ walletConnected, onConnectWallet, onNewStream, onGoTo, stellarStreams }: any) {
  const ss: UseStellarStreamsReturn | undefined = stellarStreams;
  const trackedStreams = ss?.streams ?? [];
  const hasStreams = trackedStreams.length > 0;

  const totalXlm = trackedStreams.reduce((a, s) => {
    try { return a + Number(BigInt(s.amountStroops || "0")) / 10_000_000; } catch { return a; }
  }, 0);
  const withdrawnXlm = trackedStreams.reduce((a, s) => {
    try { return a + Number(BigInt(s.onChainState?.withdrawn || "0")) / 10_000_000; } catch { return a; }
  }, 0);
  const activeCount    = trackedStreams.filter(s => s.onChainState?.status === "Active").length;
  const pausedCount    = trackedStreams.filter(s => s.onChainState?.status === "Paused").length;
  const cancelledCount = trackedStreams.filter(s => s.onChainState?.status === "Cancelled" || s.onChainState?.status === "Completed").length;
  const loadingCount   = trackedStreams.filter(s => s.isLoading).length;

  const contractConfigured = !!(
    process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID &&
    process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID !== "REPLACE_WITH_STELLAR_TESTNET_CONTRACT_ID"
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="01  -  Overview"
        title={walletConnected ? <>Your Stellar streams.</> : <>Real-time XLM payment streaming.</>}
        sub={
          walletConnected
            ? "Track and manage your XLM streams on Stellar Testnet via Soroban."
            : "Native XLM · Soroban smart contracts · Stellar Testnet · no real funds"
        }
        right={walletConnected ? (
          <button onClick={onNewStream} className="hidden sm:flex btn-primary rounded-full px-5 py-3 text-[13.5px] font-medium text-white items-center gap-2">
            <Icon name="zap" size={14} /> New stream
          </button>
        ) : undefined}
      />

      {/* ═══════════════════════════════════════════════════════
          STATE A — FREIGHTER NOT CONNECTED
      ═══════════════════════════════════════════════════════ */}
      {!walletConnected && (
        <>
          {/* Full-width hero card */}
          <section className="grad-border glass-strong rounded-3xl p-1.5 relative overflow-hidden">
            <div
              className="absolute -top-28 -right-28 w-80 h-80 rounded-full opacity-25 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(56,189,248,0.55) 0%, transparent 70%)" }}
            />
            <div
              className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)" }}
            />
            <div className="rounded-[22px] bg-gradient-to-br from-[#100e26]/95 to-[#07060f] p-6 sm:p-10 relative">
              <div className="grid lg:grid-cols-12 gap-8 items-start">

                {/* Left — headline + CTA */}
                <div className="lg:col-span-7 space-y-5">

                  <h2 className="text-[26px] sm:text-[34px] lg:text-[40px] tracking-tight leading-[1.07] text-white">
                    Connect Freighter<br className="hidden sm:block" /> to start streaming XLM.
                  </h2>
                  <p className="text-[14.5px] text-white/55 leading-relaxed max-w-[500px]">
                    Create, track, and manage Stellar Testnet payment streams using Soroban smart contracts. Funds vest continuously — pause, withdraw, or cancel anytime on-chain.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      onClick={onConnectWallet}
                      className="btn-primary rounded-full px-6 py-3 text-[14px] font-medium text-white inline-flex items-center gap-2"
                    >
                      <Icon name="fingerprint" size={15} /> Connect Freighter
                    </button>
                    <a
                      href="https://freighter.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost rounded-full px-6 py-3 text-[13.5px] text-white/65 inline-flex items-center gap-2"
                    >
                      Get Freighter <Icon name="arrow-up-right" size={13} />
                    </a>
                  </div>
                </div>

                {/* Right — network info panel */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/30 font-mono mb-4">Network info</div>
                    <div className="space-y-3">
                      {[
                        { k: "Network",    v: "Stellar Testnet",               cls: "text-sky-300"     },
                        { k: "Asset",      v: "Native XLM",                    cls: "text-white/65"    },
                        { k: "Contract",   v: contractConfigured ? "Configured ✓" : "Not configured",
                                           cls: contractConfigured ? "text-emerald-300" : "text-amber-300" },
                        { k: "Signer",     v: "Freighter extension",            cls: "text-white/55"    },
                        { k: "Mode",       v: "Testnet only · no real funds",   cls: "text-white/40"    },
                      ].map(({ k, v, cls }) => (
                        <div key={k} className="flex items-start justify-between gap-4">
                          <span className="text-[11.5px] text-white/30 font-mono shrink-0 pt-0.5">{k}</span>
                          <span className={`text-[12px] font-mono text-right ${cls}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-4 border-t border-white/5">
                      <a
                        href="https://laboratory.stellar.org/#account-creator?network=test"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full btn-ghost rounded-xl py-2 text-[12px] text-sky-300/70 hover:text-sky-200 flex items-center justify-center gap-1.5 transition"
                      >
                        <Icon name="zap" size={12} /> Get free testnet XLM
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Feature cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STELLAR_FEATURE_CARDS.map((card) => (
              <div key={card.title} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                <div className="w-10 h-10 rounded-xl bg-sky-400/10 flex items-center justify-center text-sky-300 mb-4">
                  <Icon name={card.icon} size={17} />
                </div>
                <div className="text-[14px] text-white font-medium leading-snug">{card.title}</div>
                <div className="mt-1.5 text-[12.5px] text-white/40 leading-relaxed">{card.desc}</div>
              </div>
            ))}
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          LOADING SPINNER (while fetching on-chain state)
      ═══════════════════════════════════════════════════════ */}
      {walletConnected && ss?.loading && (
        <div className="flex items-center gap-2 text-[12px] font-mono text-sky-300/70 px-1">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-sky-400 border-t-transparent animate-spin shrink-0" />
          Loading on-chain stream states…
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          STATE B — CONNECTED BUT NO TRACKED STREAMS
      ═══════════════════════════════════════════════════════ */}
      {walletConnected && !hasStreams && !ss?.loading && (
        <>
          {/* Zero-state metric row */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "layers",   label: "Tracked streams",  value: "0",       sub: "no streams yet"     },
              { icon: "waves",    label: "Active streams",   value: "0",       sub: "create one below"   },
              { icon: "coins",    label: "Total XLM locked", value: "0.0000",  sub: "across all streams" },
              { icon: "download", label: "Withdrawn XLM",    value: "0.0000",  sub: "nothing released"   },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/25 mb-4">
                  <Icon name={m.icon} size={16} />
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-mono">{m.label}</div>
                <div className="mt-2 text-[30px] font-num leading-none tracking-[-0.02em] text-white/20">{m.value}</div>
                <div className="mt-1.5 text-[12px] text-white/25">{m.sub}</div>
              </div>
            ))}
          </section>

          {/* CTA card */}
          <section className="rounded-2xl border border-sky-400/15 bg-sky-400/[0.03] p-8 sm:p-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-sky-300/65 mb-3">
                <Icon name="waves" size={12} /> Getting started
              </div>
              <h3 className="text-[22px] sm:text-[26px] tracking-tight text-white leading-snug">
                No tracked Stellar streams yet.
              </h3>
              <p className="mt-2.5 text-[13.5px] text-white/50 leading-relaxed max-w-[480px]">
                Create a new XLM stream or load an existing stream ID. Your streams will appear here automatically and persist across sessions.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  onClick={onNewStream}
                  className="btn-primary rounded-full px-6 py-3 text-[14px] font-medium text-white inline-flex items-center gap-2"
                >
                  <Icon name="plus" size={14} /> New XLM stream
                </button>
                <button
                  onClick={() => onGoTo("streams")}
                  className="btn-ghost rounded-full px-6 py-3 text-[13.5px] text-white/65 inline-flex items-center gap-2"
                >
                  Load stream ID <Icon name="arrow-right" size={13} />
                </button>
              </div>
            </div>
          </section>

          {/* Feature cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STELLAR_FEATURE_CARDS.map((card) => (
              <div key={card.title} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/40 mb-4">
                  <Icon name={card.icon} size={17} />
                </div>
                <div className="text-[14px] text-white font-medium leading-snug">{card.title}</div>
                <div className="mt-1.5 text-[12.5px] text-white/35 leading-relaxed">{card.desc}</div>
              </div>
            ))}
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          STATE C — CONNECTED WITH TRACKED STREAMS
      ═══════════════════════════════════════════════════════ */}
      {walletConnected && hasStreams && (
        <>
          {/* Full-width stats grid */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryTile
              icon="layers"
              label="Tracked streams"
              value={`${trackedStreams.length}`}
              sub={loadingCount > 0 ? `${loadingCount} syncing…` : "in local registry"}
              onClick={() => onGoTo("streams")}
            />
            <SummaryTile
              icon="waves"
              label="Active streams"
              value={`${activeCount}`}
              sub={`${pausedCount} paused · ${cancelledCount} closed`}
              onClick={() => onGoTo("streams")}
            />
            <SummaryTile
              icon="coins"
              label="Total XLM locked"
              value={totalXlm.toFixed(4)}
              sub="across all tracked streams"
              accent
            />
            <SummaryTile
              icon="download"
              label="Withdrawn XLM"
              value={withdrawnXlm.toFixed(4)}
              sub="released to receivers"
            />
          </section>

          {/* Stream mini grid */}
          <section>
            <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-sky-300/70 font-mono">Your streams</div>
                <h3 className="mt-1.5 text-[20px] tracking-tight">Active &amp; recent.</h3>
              </div>
              <button
                onClick={() => onGoTo("streams")}
                className="text-[12.5px] text-white/50 hover:text-white flex items-center gap-1 transition"
              >
                Manage all <Icon name="arrow-right" size={12} />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {trackedStreams.slice(0, 6).map((s) => {
                const xlm = (() => {
                  try { return (Number(BigInt(s.amountStroops || "0")) / 10_000_000).toFixed(2); }
                  catch { return "—"; }
                })();
                const wdn = (() => {
                  try { return (Number(BigInt(s.onChainState?.withdrawn || "0")) / 10_000_000).toFixed(4); }
                  catch { return "0.0000"; }
                })();
                const status = s.isLoading ? "loading…" : (s.onChainState?.status ?? s.lastKnownStatus);
                const statusCls =
                  status === "Active"   ? "text-emerald-300" :
                  status === "Paused"   ? "text-amber-300"   :
                  s.isLoading           ? "text-white/25"    : "text-white/35";
                return (
                  <div
                    key={s.streamId}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-start gap-3 hover:border-sky-400/20 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-400/10 flex items-center justify-center text-sky-300 shrink-0 mt-0.5">
                      <Icon name="waves" size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[13px] text-white font-mono">Stream #{s.streamId}</span>
                        <span className={`text-[10px] font-mono ${statusCls}`}>{status}</span>
                      </div>
                      <div className="text-[11px] font-mono text-white/30 truncate mt-0.5">
                        {s.receiver ? `→ ${s.receiver.slice(0, 8)}…${s.receiver.slice(-4)}` : "—"}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-sky-300">{xlm} XLM total</span>
                        <span className="text-white/25">{wdn} withdrawn</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {trackedStreams.length > 6 && (
              <button
                onClick={() => onGoTo("streams")}
                className="mt-3 w-full rounded-xl border border-white/5 py-2.5 text-[12.5px] text-white/40 hover:text-white hover:border-white/15 transition font-mono"
              >
                + {trackedStreams.length - 6} more streams — view all
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function DashboardPage({ streams, onNewStream, onGoTo, walletConnected, walletError, onConnectWallet, onRequireWallet, stellarStreams }: any) {
  // Stellar mode: derive real stats from tracked streams instead of Solana mock data
  if (IS_STELLAR_MODE) {
    return (
      <StellarDashboard
        walletConnected={walletConnected}
        onConnectWallet={onConnectWallet}
        onNewStream={onNewStream}
        onGoTo={onGoTo}
        stellarStreams={stellarStreams}
      />
    );
  }

  const inSum = streams.filter((s) => s.dir === "in" && s.status === "streaming").reduce((a, s) => a + s.rate, 0);
  const outSum = streams.filter((s) => s.dir === "out" && s.status === "streaming").reduce((a, s) => a + s.rate, 0);
  const net = inSum - outSum;
  const positive = net >= 0;

  const balance = useStreamingValue(DASHBOARD_OVERVIEW_STATS.initialBalance, net, true);
  const valStr = fmtUSD(balance, 6);
  const [whole, decimal] = valStr.split(".");
  const stableDec = decimal.slice(0, 2);
  const fastDec = decimal.slice(2);

  const totalStreamed = useStreamingValue(DASHBOARD_OVERVIEW_STATS.totalStreamed, inSum + outSum, true);
  const yieldEarned = useStreamingValue(
    DASHBOARD_OVERVIEW_STATS.lifetimeYield,
    (DASHBOARD_OVERVIEW_STATS.yieldEscrowBase * (PROTOCOL_STATS.yieldApy / 100)) / (365 * 86400),
    true,
  );
  const activeCount = streams.filter(s => s.status === "streaming").length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="01  -  Overview"
        title={<>Your money, in motion.</>}
        sub={IS_STELLAR_MODE
          ? "The Net Flow Engine settles your incoming and outgoing streams on Stellar Testnet. Everything below ticks live."
          : "The Net Flow Engine settles your incoming and outgoing streams every Solana block. Everything below ticks live."}
        right={
          <button onClick={onNewStream} className="hidden sm:flex btn-primary rounded-full px-5 py-3 text-[13.5px] font-medium text-white items-center gap-2">
            <Icon name="zap" size={14} /> Create new stream
          </button>
        }
      />

      {!walletConnected && <WalletDemoNotice error={walletError} onConnect={onConnectWallet} />}

      {/* Net Flow Engine */}
      <section className="grad-border glass-strong rounded-3xl p-1.5 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 iri-orb rounded-full opacity-50" />
        <div className="absolute -bottom-32 -left-24 w-72 h-72 glow-orb opacity-30" />
        <div className="rounded-[22px] bg-gradient-to-br from-[#100e26]/95 to-[#07060f] p-5 sm:p-8 relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-violet-300/80">
                <Icon name="waves" size={13} /> Net flow engine · live
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[12.5px] text-emerald-300/90 font-mono">{PROTOCOL_STATS.finalityLabel}</span>
                <span className="text-white/25">·</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-violet-400/40 bg-violet-400/10 text-[11px] font-mono uppercase tracking-[0.16em] text-violet-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-300 pulse-dot" />
                  Protocol Status: {PROTOCOL_STATS.protocolStatus}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onRequireWallet("Connect a wallet before withdrawing demo stream funds.")}
                className={`btn-ghost rounded-full px-3 py-1.5 text-[12px] text-white/75 flex items-center gap-1.5 ${!walletConnected ? "opacity-60" : ""}`}
              >
                <Icon name="download" size={12} /> Withdraw
              </button>
              <button
                onClick={() => onRequireWallet("Connect a wallet before swapping stream tokens.")}
                className={`btn-ghost rounded-full px-3 py-1.5 text-[12px] text-white/75 flex items-center gap-1.5 ${!walletConnected ? "opacity-60" : ""}`}
              >
                <Icon name="arrow-left-right" size={12} /> Swap
              </button>
            </div>
          </div>

          <div className="mt-8 grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40 font-mono">
                Streaming balance · {IS_STELLAR_MODE ? "XLM" : "SOL"}{" "}
                <span className="text-white/25 normal-case tracking-normal text-[9px]">({IS_STELLAR_MODE ? "testnet demo" : "devnet demo"})</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1 num-stable">
                <span className="text-white/40 text-[22px] sm:text-[30px] lg:text-[36px] font-num">◎</span>
                <span className="text-iri text-[44px] sm:text-[58px] lg:text-[72px] font-num leading-[0.95] tracking-[-0.025em]">{whole}</span>
                <span className="text-iri text-[44px] sm:text-[58px] lg:text-[72px] font-num leading-[0.95] tracking-[-0.025em]">.</span>
                <span className="text-iri text-[44px] sm:text-[58px] lg:text-[72px] font-num leading-[0.95] tracking-[-0.025em]">{stableDec}</span>
                <span className="text-violet-300/90 text-[22px] sm:text-[30px] lg:text-[36px] font-num leading-[0.95] tracking-[-0.025em]">{fastDec}</span>
              </div>

              {/* Pulse indicator */}
              <div className="mt-5 flex items-center flex-wrap gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/10 text-emerald-300 text-[12.5px] font-mono">
                  <Icon name="arrow-down-left" size={12} />
                  + {IS_STELLAR_MODE ? "✦" : "◎"}{(inSum).toFixed(6)} / sec <span className="text-emerald-300/60 ml-1">incoming</span>
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-400/10 text-rose-300 text-[12.5px] font-mono">
                  <Icon name="arrow-up-right" size={12} />
                  - {IS_STELLAR_MODE ? "✦" : "◎"}{(outSum).toFixed(6)} / sec <span className="text-rose-300/60 ml-1">outgoing</span>
                </span>
                <span className={`px-3 py-1.5 rounded-full text-[12.5px] font-mono border ${positive ? "border-emerald-400/30 text-emerald-300" : "border-rose-400/30 text-rose-300"}`}>
                  Net: {positive ? "+" : ""}{net.toFixed(6)} {IS_STELLAR_MODE ? "XLM" : "SOL"}/sec ~{positive ? "+" : ""}{IS_STELLAR_MODE ? "✦" : "◎"}{(net * 86400).toFixed(4)}/day
                </span>
              </div>
            </div>

            <div className="hidden sm:block lg:col-span-5">
              <FlowSparkline net={net} />
            </div>
          </div>
        </div>
      </section>

      {/* Summary tiles */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryTile
          icon="layers"
          label="Total value streamed"
          value={`${IS_STELLAR_MODE ? "✦" : "◎"}${fmtUSD(totalStreamed, 4)}`}
          sub={`lifetime · ${IS_STELLAR_MODE ? "testnet" : "devnet"} demo data`}
          accent
        />
        <SummaryTile
          icon="waves"
          label="Active streams"
          value={`${activeCount}`}
          sub={`${streams.length - activeCount} paused/completed`}
          onClick={() => onGoTo("streams")}
        />
        {!IS_STELLAR_MODE && (
          <SummaryTile
            icon="sprout"
            label="Yield generated"
            value={`◎${fmtUSD(yieldEarned, 4)}`}
            sub="lifetime · yield routing roadmap"
            onClick={() => onGoTo("yield")}
          />
        )}
      </section>

      {/* Mini active streams */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Recent streams</div>
            <h3 className="mt-2 text-[20px] tracking-tight">Top 4 by flow rate.</h3>
          </div>
          <button onClick={() => onGoTo("streams")} className="text-[12.5px] text-white/55 hover:text-white flex items-center gap-1">
            See all streams <Icon name="arrow-right" size={12} />
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {[...streams].sort((a, b) => b.rate - a.rate).slice(0, 4).map((s) => (
            <MiniStreamRow key={s.id} stream={s} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryTile({ icon, label, value, sub, accent, onClick }: any) {
  return (
    <button onClick={onClick} className={`text-left rounded-2xl p-6 border transition ${accent ? "grad-border glass-strong" : "border-white/8 bg-white/[0.02] hover:border-violet-400/25"}`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? "bg-violet-400/15 text-violet-200" : "bg-white/5 text-white/70"}`}>
          <Icon name={icon} size={18} />
        </div>
        {onClick && <Icon name="arrow-up-right" size={14} className="text-white/30" />}
      </div>
      <div className="mt-5 text-[10.5px] uppercase tracking-[0.18em] text-white/40 font-mono">{label}</div>
      <div className={`mt-2 font-num num-stable ${accent ? "text-iri text-[24px] sm:text-[34px]" : "text-white text-[20px] sm:text-[28px]"} leading-none tracking-[-0.02em]`}>{value}</div>
      <div className="mt-2 text-[12px] text-white/45">{sub}</div>
    </button>
  );
}

function MiniStreamRow({ stream }: any) {
  const running = stream.status === "streaming";
  const value = useStreamingValue(stream.base, stream.rate, running);
  const isIn = stream.dir === "in";
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:p-4 flex items-center gap-3">
      <SolAvatar seed={stream.party} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-white truncate">{stream.party}</span>
          <StatusPill status={stream.status} mini />
        </div>
        <div className="text-[10.5px] font-mono text-white/40 truncate">{stream.label}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`font-num num-stable text-[14px] ${isIn ? "text-emerald-300" : "text-rose-300"}`}>
          {isIn ? "+" : "-"}${fmtUSD(value, 2)}
        </div>
        <div className="text-[10px] font-mono text-white/35">{stream.rate.toFixed(5)}/s</div>
      </div>
    </div>
  );
}

function FlowSparkline({ net }: any) {
  const points = useMemo(() => {
    // Deterministic xorshift32 seeded from net so SSR output matches client.
    let s = ((net * 1e9) | 0) ^ 0xdeadbeef;
    if (s === 0) s = 1;
    const rng = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0x100000000; };
    const N = 60;
    let v = DASHBOARD_OVERVIEW_STATS.sparklineBase + rng() * 200;
    return Array.from({ length: N }, () => {
      v += (rng() - 0.4) * 60 + (net > 0 ? 12 : -8);
      return v;
    });
  }, [net]);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 300;
    const y = 80 - ((p - min) / (max - min || 1)) * 70;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="relative h-[120px]">
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-white/40 font-mono mb-2">Balance · last 24h</div>
      <svg viewBox="0 0 300 90" className="w-full h-[90px]">
        <defs>
          <linearGradient id="spkG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(167,139,250,0.45)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0)" />
          </linearGradient>
          <linearGradient id="spkL" x1="0" x2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f0abfc" />
          </linearGradient>
        </defs>
        <path d={`${path} L 300 90 L 0 90 Z`} fill="url(#spkG)" />
        <path d={path} fill="none" stroke="url(#spkL)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

// =========================================================================
// STREAMS page
// =========================================================================
function StreamsPage({ streams, setStreams, onNewStream, walletConnected, onRequireWallet, streamsLoading, streamsError, onRefresh, onWithdraw, onPause, onResume, onCancelStream, streamActions, streamChain, onChainChange, freighter, stellarStreams }: any) {
  const [filter, setFilter] = useState("all");
  const [topUpId, setTopUpId] = useState<string | null>(null);

  const visible = streams.filter((s) => {
    if (filter === "all") return true;
    if (filter === "in") return s.dir === "in";
    if (filter === "out") return s.dir === "out";
    if (filter === "paused") return s.status === "paused";
    return true;
  });

  const toggle = (id) =>
    setStreams((arr) => arr.map((s) => (s.id === id ? { ...s, status: s.status === "streaming" ? "paused" : "streaming" } : s)));
  const cancel = (id) =>
    setStreams((arr) => arr.map((s) => (s.id === id ? { ...s, status: "completed", rate: 0 } : s)));
  const topUp = (id, amount) =>
    setStreams((arr) => arr.map((s) => (s.id === id ? { ...s, deposit: s.deposit + amount } : s)));

  const guardWallet = (message, action) => {
    if (!walletConnected) {
      onRequireWallet(message);
      return;
    }
    action();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="02 - Streams"
        title={<>Manage every drop.</>}
        sub={IS_STELLAR_MODE
          ? "Create and manage XLM streams on Stellar Testnet via Soroban. Testnet only — no real funds, no bridge."
          : "Create and manage streams on Solana Devnet and Stellar Testnet. Each chain is isolated — no bridge, no shared liquidity."}
        right={
          streamChain === "solana-devnet" ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-full border border-white/10 bg-white/[0.02]">
                {STREAM_FILTERS.map((filterOption) => {
                  const t = {
                    ...filterOption,
                    n:
                      filterOption.k === "all"
                        ? streams.length
                        : filterOption.k === "paused"
                          ? streams.filter((s) => s.status === "paused").length
                          : streams.filter((s) => s.dir === filterOption.k).length,
                  };
                  return (
                  <button
                    key={t.k}
                    onClick={() => setFilter(t.k)}
                    className={`px-3 py-1.5 rounded-full text-[12px] border transition ${filter === t.k ? "tab-active" : "border-transparent text-white/55 hover:text-white"}`}
                  >
                    {t.l} <span className="text-white/40 ml-0.5">{t.n}</span>
                  </button>
                );})}
              </div>
              <button onClick={onNewStream} className="btn-primary rounded-full px-4 py-2 text-[13px] font-medium text-white flex items-center gap-1.5">
                <Icon name="plus" size={13} /> New stream
              </button>
            </div>
          ) : null
        }
      />

      {/* Chain selector — hidden in Stellar-only mode */}
      {!IS_STELLAR_MODE && <ChainSelector chain={streamChain} onChange={onChainChange} />}

      {/* ── Stellar Testnet tab ── */}
      {(IS_STELLAR_MODE || streamChain === "stellar-testnet") && <StellarStreamPanel freighter={freighter} stellarStreams={stellarStreams} />}

      {/* ── Solana Devnet tab ── */}
      {!IS_STELLAR_MODE && streamChain === "solana-devnet" && (
        <>
          {streamsError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-4 py-3 flex items-center gap-3">
              <Icon name="triangle-alert" size={14} className="text-rose-300 shrink-0" />
              <span className="text-[12.5px] text-rose-200 flex-1 font-mono break-all">{streamsError}</span>
              <button onClick={onRefresh} className="btn-ghost rounded-full px-3 py-1.5 text-[12px] text-white/85 flex items-center gap-1.5 shrink-0">
                <Icon name="refresh-cw" size={12} /> Retry
              </button>
            </div>
          )}

          {streamsLoading && (
            <div className="flex items-center gap-2 text-[12.5px] font-mono text-violet-300/80">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              Fetching streams from chain...
            </div>
          )}

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visible.length === 0 && !streamsLoading && (
              <div className="col-span-full rounded-2xl border border-white/8 bg-white/[0.02] p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-violet-400/10 flex items-center justify-center mx-auto mb-4">
                  <Icon name="waves" size={20} className="text-violet-300/60" />
                </div>
                <div className="text-[15px] text-white/60">No real streams yet</div>
                <div className="mt-1.5 text-[12.5px] font-mono text-white/35">
                  {walletConnected ? "Create your first programmable cashflow stream." : "Connect a wallet to see your on-chain streams."}
                </div>
                {walletConnected && (
                  <button onClick={onNewStream} className="mt-5 btn-primary rounded-full px-5 py-2.5 text-[13px] font-medium text-white inline-flex items-center gap-2">
                    <Icon name="plus" size={13} /> New stream
                  </button>
                )}
              </div>
            )}
            {visible.map((s) => {
              const isMock = !s.publicKey;
              return (
                <StreamCard
                  key={s.id}
                  stream={s}
                  walletConnected={walletConnected}
                  isMock={isMock}
                  actionState={isMock ? null : (streamActions?.[s.id] ?? null)}
                  onWithdraw={() => onWithdraw?.(s)}
                  onPause={() => onPause?.(s)}
                  onResume={() => onResume?.(s)}
                  onCancelReal={() => onCancelStream?.(s)}
                  onToggle={() => guardWallet("Connect a wallet before pausing or resuming a stream.", () => toggle(s.id))}
                  onCancelMock={() => guardWallet("Connect a wallet before cancelling a stream.", () => cancel(s.id))}
                  onTopUp={() => guardWallet("Connect a wallet before topping up a stream.", () => setTopUpId(s.id))}
                />
              );
            })}
          </div>

          {topUpId && (
            <TopUpModal
              stream={streams.find(s => s.id === topUpId)}
              onClose={() => setTopUpId(null)}
              onSubmit={(amt) => guardWallet("Connect a wallet before topping up a stream.", () => { topUp(topUpId, amt); setTopUpId(null); })}
            />
          )}
        </>
      )}
    </div>
  );
}

function StreamCard({ stream, walletConnected, isMock, actionState, onWithdraw, onPause, onResume, onCancelReal, onToggle, onCancelMock, onTopUp }: any) {
  const running = stream.status === "streaming";
  const accrued = useStreamingValue(stream.base, stream.rate, running);
  const isIn = stream.dir === "in";
  const isCompleted = stream.status === "completed";
  const isPaused = stream.status === "paused";

  const pending: string | null = actionState?.pending ?? null;
  const txSig: string | null = actionState?.txSig ?? null;
  const actionError: string | null = actionState?.error ?? null;

  const valStr = fmtUSD(accrued, 6);
  const [whole, decimal] = valStr.split(".");
  const stableDec = decimal.slice(0, 2);
  const fastDec = decimal.slice(2);
  const progress = Math.min(100, (accrued / stream.deposit) * 100);
  const remaining = Math.max(0, stream.deposit - accrued);
  const secondsLeft = stream.rate > 0 ? remaining / stream.rate : 0;

  const explorerHref = stream.publicKey ? getExplorerAddressUrl(stream.publicKey) : null;

  return (
    <div className="rounded-2xl glass p-5 relative overflow-hidden hover:border-violet-400/25 transition">
      {running && <div className="absolute -top-16 -right-16 w-40 h-40 iri-orb rounded-full opacity-25" />}

      <div className="flex items-start justify-between relative">
        <div className="flex items-center gap-3 min-w-0">
          <SolAvatar seed={stream.party} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Icon name={isIn ? "arrow-down-left" : "arrow-up-right"} size={11} className={isIn ? "text-emerald-300" : "text-fuchsia-300"} />
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">{isIn ? "From" : "To"}</span>
            </div>
            <div className="text-[14px] text-white truncate">{stream.party}</div>
            <div className="text-[11px] font-mono text-white/40 truncate">{stream.label}</div>
          </div>
        </div>
        <StatusPill status={stream.status} />
      </div>

      <div className="mt-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">Accrued</div>
        <div className="mt-1 flex items-baseline gap-1 num-stable">
          <span className={`${isIn ? "text-emerald-300" : "text-rose-300"} text-[14px] font-num`}>{isIn ? "+" : "-"}</span>
          <span className="text-white/40 text-[16px] font-num">{stream.token === "SOL" ? "◎" : "$"}</span>
          <span className="text-iri text-[26px] font-num leading-none tracking-[-0.02em]">{whole}</span>
          <span className="text-iri text-[26px] font-num leading-none tracking-[-0.02em]">.</span>
          <span className="text-iri text-[26px] font-num leading-none tracking-[-0.02em]">{stableDec}</span>
          <span className="text-violet-300/90 text-[14px] font-num leading-none tracking-[-0.02em]">{fastDec}</span>
          <span className="text-white/35 text-[11px] font-mono ml-1.5">{stream.token}</span>
        </div>
        <div className="text-[11px] text-white/40 font-mono mt-1.5">
          {isCompleted ? "stream finalized" : `${stream.rate.toFixed(6)} ${stream.token}/sec · ${(stream.rate * 86400).toFixed(2)}/day`}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[10.5px] font-mono text-white/45 mb-1.5">
          <span>{progress.toFixed(1)}% of {stream.deposit.toLocaleString(undefined, { maximumFractionDigits: 4 })} deposit</span>
          {!isCompleted && stream.rate > 0 && <span>{fmtDuration(secondsLeft)} remaining</span>}
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden relative">
          {!isCompleted && (
            <div
              className={`absolute inset-y-0 left-0 ${isIn ? "bg-gradient-to-r from-emerald-400/40 to-emerald-300" : "bg-gradient-to-r from-fuchsia-400/40 to-fuchsia-300"} transition-[width] duration-300`}
              style={{ width: `${progress}%` }}
            />
          )}
          {isCompleted && <div className="absolute inset-0 bg-white/15" />}
        </div>
      </div>

      {/* Hint for receiver: show when very little has unlocked yet */}
      {!isMock && isIn && !isCompleted && !pending && !txSig && !actionError && (() => {
        const withdrawnSOL: number = stream.withdrawnAmountSol ?? 0;
        const withdrawableLamports = Math.floor((accrued - withdrawnSOL) * LAMPORTS_PER_SOL_NUM);
        return withdrawableLamports <= MIN_WITHDRAW_LAMPORTS ? (
          <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-mono text-white/45 flex items-center gap-1.5">
            <Icon name="clock" size={10} className="shrink-0 text-white/35" />
            Wait a few seconds for funds to unlock.
          </div>
        ) : null;
      })()}
      {actionError && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] px-2.5 py-1.5 text-[11px] font-mono text-rose-200 flex items-start gap-1.5">
          <Icon name="triangle-alert" size={10} className="shrink-0 mt-0.5 text-rose-300" />
          <span className="break-all">{actionError}</span>
        </div>
      )}
      {txSig && !actionError && (
        <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-2.5 py-1.5 text-[11px] font-mono text-emerald-200 flex items-center gap-1.5">
          <Icon name="check-circle-2" size={10} className="shrink-0 text-emerald-300" />
          <span>Done.</span>
          <a href={getExplorerTxUrl(txSig)} target="_blank" rel="noopener noreferrer" className="ml-auto text-violet-300 hover:text-violet-100 flex items-center gap-1 shrink-0">
            Explorer <Icon name="external-link" size={9} />
          </a>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-[10.5px] font-mono text-white/35">{stream.addr}</div>
        <div className="flex items-center gap-1">
          {/* Real stream: receiver withdraw */}
          {!isMock && isIn && !isCompleted && (
            <button
              onClick={onWithdraw}
              disabled={!!pending || !walletConnected}
              className={`btn-ghost rounded-md h-8 px-2.5 flex items-center gap-1 text-white/75 hover:text-white text-[11px] disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Withdraw unlocked funds"
            >
              {pending === "withdraw"
                ? <><span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" /> Withdrawing...</>
                : <><Icon name="download" size={11} /> Withdraw</>}
            </button>
          )}
          {/* Real stream: payer pause */}
          {!isMock && !isIn && running && (
            <button
              onClick={onPause}
              disabled={!!pending || !walletConnected}
              className="btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Pause stream"
            >
              {pending === "pause"
                ? <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                : <Icon name="pause" size={12} />}
            </button>
          )}
          {/* Real stream: payer resume */}
          {!isMock && !isIn && isPaused && (
            <button
              onClick={onResume}
              disabled={!!pending || !walletConnected}
              className="btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Resume stream"
            >
              {pending === "resume"
                ? <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                : <Icon name="play" size={12} />}
            </button>
          )}
          {/* Real stream: payer cancel */}
          {!isMock && !isIn && !isCompleted && (
            <button
              onClick={onCancelReal}
              disabled={!!pending || !walletConnected}
              className="btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:border-rose-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Cancel stream"
            >
              {pending === "cancel"
                ? <span className="inline-block w-3 h-3 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
                : <Icon name="x" size={12} />}
            </button>
          )}
          {/* Real stream: top-up disabled (coming later) */}
          {!isMock && !isCompleted && (
            <button disabled className="btn-ghost rounded-md h-8 px-2.5 flex items-center gap-1 text-white/25 text-[11px] cursor-not-allowed" title="Top up coming later">
              <Icon name="plus" size={11} /> Top up
            </button>
          )}
          {/* Mock stream visual actions */}
          {isMock && !isCompleted && (
            <button
              onClick={onTopUp}
              className={`btn-ghost rounded-md h-8 px-2.5 flex items-center gap-1 text-white/75 hover:text-white text-[11px] ${!walletConnected ? "opacity-60" : ""}`}
              title={walletConnected ? "Top up deposit" : "Connect wallet to top up"}
            >
              <Icon name="plus" size={11} /> Top up
            </button>
          )}
          {isMock && !isCompleted && (
            <button
              onClick={onToggle}
              className={`btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/70 hover:text-white ${!walletConnected ? "opacity-60" : ""}`}
              title={walletConnected ? (running ? "Pause" : "Resume") : "Connect wallet to sign"}
            >
              <Icon name={running ? "pause" : "play"} size={12} />
            </button>
          )}
          {isMock && !isCompleted && (
            <button
              onClick={onCancelMock}
              className={`btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:border-rose-400/30 ${!walletConnected ? "opacity-60" : ""}`}
              title={walletConnected ? "Cancel" : "Connect wallet to cancel"}
            >
              <Icon name="x" size={12} />
            </button>
          )}
          {explorerHref ? (
            <a href={explorerHref} target="_blank" rel="noopener noreferrer" className="btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/70 hover:text-white" title="View stream account on Explorer">
              <Icon name="arrow-up-right" size={12} />
            </a>
          ) : (
            <a href="#" className="btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/70 hover:text-white" title="View on Explorer">
              <Icon name="arrow-up-right" size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, mini }: any) {
  const map = {
    streaming: { label: "STREAMING", c: "border-emerald-400/30 text-emerald-300 bg-emerald-400/5", dot: "bg-emerald-400 pulse-dot" },
    paused:    { label: "PAUSED",    c: "border-amber-400/30 text-amber-300 bg-amber-400/5",    dot: "bg-amber-300" },
    completed: { label: "COMPLETED", c: "border-white/15 text-white/55 bg-white/5",            dot: "bg-white/40" },
  };
  const m = map[status] || map.streaming;
  return (
    <span className={`inline-flex items-center gap-1.5 ${mini ? "px-1.5 py-0" : "px-2 py-0.5"} rounded-full border text-[10px] font-mono uppercase tracking-[0.16em] ${m.c}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {!mini && m.label}
    </span>
  );
}

function TopUpModal({ stream, onClose, onSubmit }: any) {
  const [amt, setAmt] = useState(TOP_UP_DEFAULT_AMOUNT);
  return (
    <div className="fixed inset-0 z-50 fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] rounded-3xl grad-border glass-strong p-1.5">
          <div className="rounded-[20px] bg-[#0b0a1a] p-7">
            <div className="flex items-center gap-3">
              <SolAvatar seed={stream.party} size={36} />
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.18em] text-violet-300/70 font-mono">Top up stream</div>
                <div className="text-[15px] text-white">{stream.party}</div>
              </div>
            </div>
            <div className="mt-6">
              <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">Add to deposit ({stream.token})</label>
              <div className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8">
                <span className="text-white/40 text-[22px] font-num">$</span>
                <input
                  type="number"
                  value={amt}
                  onChange={(e) => setAmt(Math.max(0, Number(e.target.value) || 0))}
                  className="flex-1 bg-transparent outline-none text-[26px] font-num text-iri num-stable"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {TOP_UP_PRESETS.map((v) => (
                  <button key={v} onClick={() => setAmt(v)} className="text-[11px] font-mono px-2.5 py-1 rounded-full border border-white/10 text-white/55 hover:text-white hover:border-violet-400/30">+${v}</button>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-violet-400/20 bg-violet-400/5 p-3 text-[12px] text-white/65">
              Extends stream by <span className="text-violet-200 font-mono">{fmtDuration(amt / (stream.rate || 0.0001))}</span> at current rate.
            </div>
            <div className="mt-6 flex items-center gap-2 justify-end">
              <button onClick={onClose} className="btn-ghost rounded-full px-4 py-2 text-[13px] text-white/85">Cancel</button>
              <button onClick={() => onSubmit(amt)} className="btn-primary rounded-full px-5 py-2 text-[13px] font-medium text-white flex items-center gap-1.5">
                <Icon name="plus" size={13} /> Add ${amt.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CancelConfirmModal({ stream, onConfirm, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] rounded-3xl grad-border glass-strong p-1.5">
          <div className="rounded-[20px] bg-[#0b0a1a] p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-400/10 text-rose-300 flex items-center justify-center shrink-0">
                <Icon name="triangle-alert" size={18} />
              </div>
              <div>
                <div className="text-[15px] text-white">Cancel this stream?</div>
                <div className="text-[11.5px] font-mono text-white/40 truncate">{stream?.party}</div>
              </div>
            </div>
            <p className="text-[13px] text-white/65 leading-relaxed">
              Earned funds will be settled to the receiver and remaining escrow funds returned to the payer.
            </p>
            <div className="mt-6 flex items-center gap-2 justify-end">
              <button onClick={onClose} className="btn-ghost rounded-full px-4 py-2 text-[13px] text-white/85">Keep stream</button>
              <button
                onClick={onConfirm}
                className="rounded-full px-5 py-2 text-[13px] font-medium bg-rose-500/20 text-rose-200 border border-rose-500/30 hover:bg-rose-500/30 flex items-center gap-1.5"
              >
                <Icon name="x" size={12} /> Cancel stream
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// YIELD page
// =========================================================================
function YieldPage({ streams, walletConnected, onRequireWallet }: any) {
  const APY = YIELD_DEMO.apy;
  const ESCROW = YIELD_DEMO.escrow;
  const yieldRate = (ESCROW * (APY / 100)) / (365 * 86400);
  const lifetime = useStreamingValue(YIELD_DEMO.lifetime, yieldRate, true);
  const claimable = useStreamingValue(YIELD_DEMO.claimable, yieldRate, true);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="03  -  Capital efficiency"
        title={<>Idle escrow, working overtime.</>}
        sub={IS_STELLAR_MODE
          ? "Yield routing is a Solana-only feature and is not available on Stellar Testnet. Stream data is shown below for reference."
          : "Funds locked in your active stream contracts aren't sitting still. They're routed into Raydium concentrated liquidity vaults and re-balanced every Solana epoch."}
      />

      <section className="grad-border glass-strong rounded-3xl p-1.5 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 iri-orb rounded-full opacity-40" />
        <div className="rounded-[22px] bg-gradient-to-br from-[#100e26]/95 to-[#07060f] p-8 relative">
          <div className="grid lg:grid-cols-3 gap-6 items-end">
            <div className="lg:col-span-2">
              <div className="text-[10.5px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Lifetime yield earned</div>
              <div className="mt-3 flex items-baseline gap-1 num-stable">
                <span className="text-white/40 text-[32px] font-num">$</span>
                <span className="text-iri text-[64px] font-num leading-[0.95] tracking-[-0.025em]">{fmtUSD(lifetime, 2).split(".")[0]}</span>
                <span className="text-iri text-[64px] font-num leading-[0.95] tracking-[-0.025em]">.</span>
                <span className="text-iri text-[64px] font-num leading-[0.95] tracking-[-0.025em]">{fmtUSD(lifetime, 6).split(".")[1].slice(0, 2)}</span>
                <span className="text-violet-300/90 text-[32px] font-num leading-[0.95] tracking-[-0.025em]">{fmtUSD(lifetime, 6).split(".")[1].slice(2)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[12.5px] font-mono text-white/55">
                <span className="text-emerald-300">+ ${yieldRate.toFixed(8)}/sec</span>
                <span className="text-white/30">·</span>
                <span>auto-compounded each epoch (~2.5 days)</span>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-5">
              <div className="text-[10.5px] uppercase tracking-[0.18em] text-emerald-200/70 font-mono">Claimable now</div>
              <div className="mt-2 text-[28px] font-num text-emerald-300 num-stable">${fmtUSD(claimable, 4)}</div>
              <button
                onClick={() => onRequireWallet("Connect a wallet before harvesting yield.")}
                className={`mt-4 w-full btn-primary rounded-full px-4 py-2.5 text-[13px] font-medium flex items-center justify-center gap-2 ${!walletConnected ? "opacity-60" : ""}`}
              >
                <Icon name="sprout" size={14} /> Harvest yield
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <YieldStat icon="lock" label="Total deposits in yield" value={`◎${ESCROW.toLocaleString(undefined, { minimumFractionDigits: 4 })}`} sub={`across ${streams.filter(s => s.status === "streaming").length} active escrow contracts`} />
        <YieldStat icon="trending-up" label="Est. APY (roadmap)" value={`${APY.toFixed(2)}%`} sub="yield routing not yet live" tone="neutral" />
        <YieldStat icon="repeat" label="Compounding cadence" value="Every epoch" sub="~2.5 days · when live" />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl glass p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Pool allocation</div>
          <h3 className="mt-2 text-[18px] tracking-tight">Yield routing <span className="text-white/40 text-[14px] font-normal">(roadmap)</span></h3>
          <div className="mt-5 space-y-4">
            {YIELD_DEMO.pools.map((pool) => (
              <PoolRow key={pool.name} {...pool} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl glass p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">How it works</div>
          <h3 className="mt-2 text-[18px] tracking-tight">From dormant to deployed.</h3>
          <ol className="mt-5 space-y-4 relative">
            <span className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-400/60 via-fuchsia-400/30 to-cyan-400/40" />
            {YIELD_DEMO.lifecycle.map(([t, d], i) => (
              <li key={i} className="flex items-start gap-4 relative">
                <span className="mt-1 w-3.5 h-3.5 rounded-full bg-violet-400 border border-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.6)]" />
                <div>
                  <div className="text-[13.5px] text-white">{t}</div>
                  <div className="text-[12px] text-white/50">{d}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 pt-5 border-t border-white/5 text-[11.5px] font-mono text-white/40 flex items-center gap-2">
            <Icon name="shield-check" size={12} className="text-emerald-300" />
            Audited by Sec3 · withdraw any time, no penalty
          </div>
        </div>
      </section>
    </div>
  );
}

function YieldStat({ icon, label, value, sub, tone }: any) {
  return (
    <div className="rounded-2xl glass p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 flex items-center justify-center text-violet-200">
          <Icon name={icon} size={16} />
        </div>
      </div>
      <div className="mt-3 sm:mt-5 text-[9.5px] sm:text-[10.5px] uppercase tracking-[0.16em] text-white/40 font-mono truncate">{label}</div>
      <div className={`mt-1 font-num num-stable text-[18px] sm:text-[26px] leading-tight break-all ${tone === "up" ? "text-emerald-300" : "text-white"}`}>{value}</div>
      <div className="mt-1 text-[11px] text-white/45 truncate">{sub}</div>
    </div>
  );
}

function PoolRow({ name, share, apy, tvl }: any) {
  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-white/85">{name}</span>
        <span className="font-mono text-white/55">{share}% · {apy}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${share}%` }} />
      </div>
      <div className="mt-1 text-[10.5px] font-mono text-white/35">TVL {tvl}</div>
    </div>
  );
}

// =========================================================================
// HISTORY page
// =========================================================================
type FreighterState = ReturnType<typeof useFreighterWallet>;

function HistoryPage({ freighter: freighterProp, stellarStreams }: { freighter?: FreighterState; stellarStreams?: UseStellarStreamsReturn }) {
  const [filter, setFilter] = useState("all");

  // Stellar mode: receive wallet state from the top-level DashboardApp via prop.
  const walletAddress = freighterProp?.address ?? null;
  const walletConnected = freighterProp?.connected ?? false;

  const [stellarEvents, setStellarEvents] = useState<StellarHistoryItem[]>([]);
  const [stellarLoading, setStellarLoading] = useState(false);
  const [stellarError, setStellarError] = useState<string | null>(null);

  useEffect(() => {
    if (!IS_STELLAR_MODE || !walletAddress) {
      setStellarEvents([]);
      setStellarLoading(false);
      return;
    }
    setStellarLoading(true);
    setStellarError(null);
    fetchStellarHistory(walletAddress).then(({ items, error }) => {
      setStellarEvents(items);
      setStellarError(error);
      setStellarLoading(false);
    });
  }, [walletAddress]);

  // ── Derive history rows from tracked stream state ──────────────────────────
  // When getEvents returns no events (scan window too old, or contract doesn't
  // emit searchable events yet), synthesise one row per tracked stream using
  // the latest on-chain state from get_stream.  These rows carry source="tracked"
  // so we can distinguish them and avoid double-counting with real event rows.
  const derivedRows = useMemo<StellarHistoryItem[]>(() => {
    if (!IS_STELLAR_MODE) return [];
    const tracked = stellarStreams?.streams ?? [];
    if (tracked.length === 0) return [];

    // Build a set of stream IDs already covered by real events to avoid duplication
    const coveredIds = new Set(
      stellarEvents
        .map(e => e.streamId.replace(/^#/, ""))
        .filter(Boolean),
    );

    return tracked
      .filter(s => !coveredIds.has(s.streamId))
      .map((s): StellarHistoryItem => {
        const status = s.onChainState?.status ?? s.lastKnownStatus ?? "unknown";
        const isCompleted = status === "Completed";
        const isCancelled = status === "Cancelled";

        // Human-readable event type label
        const eventType =
          isCompleted ? "Completed stream" :
          isCancelled ? "Cancelled stream" :
          status === "Paused" ? "Paused stream" :
          status === "Active" ? "Active stream" :
          `Stream (${status})`;

        // kind drives stat card counts: "ended" = Completed, "cancelled" = Cancelled,
        // "active" is used for Active/Paused (not closed, not counted in closed stats)
        const kind: StellarHistoryItem["kind"] =
          isCompleted ? "ended" :
          isCancelled ? "cancelled" :
          "active";

        // Amount in XLM
        const amountXlm = (() => {
          try { return Number(BigInt(s.amountStroops || "0")) / 10_000_000; }
          catch { return 0; }
        })();

        const withdrawnXlm = (() => {
          try { return Number(BigInt(s.onChainState?.withdrawn || "0")) / 10_000_000; }
          catch { return 0; }
        })();

        // Use whichever is more meaningful: for closed streams show total,
        // for active show withdrawn (vested so far)
        const displayXlm = (isCompleted || isCancelled) ? amountXlm : withdrawnXlm;

        // Timestamp from registry or on-chain fields
        const rawAt = s.createdAt ?? s.lastLoadedAt ?? "";
        const atStr = rawAt
          ? (() => {
              try {
                const d = new Date(rawAt);
                return (
                  d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                  " - " +
                  d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
                );
              } catch { return rawAt; }
            })()
          : "—";

        // Explorer URL: prefer createdTxHash (exact transaction), fall back to contract
        const contractId = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID ?? "";
        const explorerUrl = s.createdTxHash
          ? `https://stellar.expert/explorer/testnet/tx/${s.createdTxHash}`
          : contractId
            ? `https://stellar.expert/explorer/testnet/contract/${contractId}`
            : "#";

        const shortReceiver = s.receiver
          ? `${s.receiver.slice(0, 6)}…${s.receiver.slice(-4)}`
          : `stream-${s.streamId}`;

        return {
          id: `tracked_${s.streamId}`,
          kind,
          eventType,
          streamId: `#${s.streamId}`,
          counterparty: shortReceiver,
          counterpartyFull: s.receiver ?? "",
          finalXlm: displayXlm,
          at: atStr,
          durationSec: 0,
          txHash: s.createdTxHash ?? "",
          explorerUrl,
        };
      });
  }, [stellarEvents, stellarStreams]);

  // Merge: real events first, then derived rows for streams not already represented
  const allStellarItems = useMemo<StellarHistoryItem[]>(() => {
    return [...stellarEvents, ...derivedRows];
  }, [stellarEvents, derivedRows]);

  // Whether derived rows are filling in for missing events
  const usingDerivedFallback = IS_STELLAR_MODE && stellarEvents.length === 0 && derivedRows.length > 0;

  // In Stellar mode use the merged list; Solana mode uses mock
  const visible = IS_STELLAR_MODE
    ? allStellarItems
    : HISTORY_DETAILED.filter(h => filter === "all" || h.kind === filter);

  const totalCount = IS_STELLAR_MODE ? allStellarItems.length : HISTORY_DETAILED.length;
  const endedCount = IS_STELLAR_MODE
    ? allStellarItems.filter(h => h.kind === "ended").length
    : HISTORY_DETAILED.filter(h => h.kind === "ended").length;
  const cancelledCount = IS_STELLAR_MODE
    ? allStellarItems.filter(h => h.kind === "cancelled").length
    : HISTORY_DETAILED.filter(h => h.kind === "cancelled").length;

  const hasLifecycleEvents = IS_STELLAR_MODE;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="04  -  Ledger"
        title={<>Every stream, on the record.</>}
        sub={IS_STELLAR_MODE
          ? "Stream lifecycle log — real Soroban events and tracked on-chain state. Each row links to Stellar Expert."
          : "A transparent, immutable log of all completed and cancelled streams. Each row links to Solscan."}
        right={
          !IS_STELLAR_MODE ? (
            <div className="flex items-center gap-1 p-1 rounded-full border border-white/10 bg-white/[0.02]">
              {HISTORY_FILTERS.map((filterOption) => {
                const t = {
                  ...filterOption,
                  n: filterOption.k === "all" ? HISTORY_DETAILED.length : HISTORY_DETAILED.filter((h) => h.kind === filterOption.k).length,
                };
                return (
                <button key={t.k} onClick={() => setFilter(t.k)} className={`px-3 py-1.5 rounded-full text-[12px] border transition ${filter === t.k ? "tab-active" : "border-transparent text-white/55 hover:text-white"}`}>
                  {t.l} <span className="text-white/40 ml-0.5">{t.n}</span>
                </button>
              );})}
            </div>
          ) : undefined
        }
      />

      {/* Loading spinner */}
      {IS_STELLAR_MODE && stellarLoading && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-3 flex items-center gap-3 text-[13px] text-white/65">
          <Icon name="loader-2" size={14} className="animate-spin text-sky-300" />
          Loading Stellar Testnet history…
        </div>
      )}

      {/* Fetch error */}
      {IS_STELLAR_MODE && stellarError && (
        <div className="rounded-xl border border-rose-400/25 bg-rose-400/5 px-5 py-3 text-[13px] text-rose-200 flex items-center gap-2">
          <Icon name="triangle-alert" size={13} className="text-rose-300 shrink-0" />
          {stellarError}
        </div>
      )}

      {/* Not connected */}
      {IS_STELLAR_MODE && !walletConnected && !stellarLoading && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4 flex items-center gap-3 text-[13px] text-white/55">
          <Icon name="fingerprint" size={14} className="text-white/35" />
          Connect Freighter to load your Stellar Testnet history.
        </div>
      )}

      {/* Derived-fallback notice */}
      {IS_STELLAR_MODE && usingDerivedFallback && (
        <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.04] px-4 py-2.5 flex items-center gap-2 text-[11.5px] font-mono text-sky-300/70">
          <Icon name="info" size={12} className="shrink-0" />
          Showing tracked on-chain stream state — recent contract events were not found in the scanned ledger window.
        </div>
      )}

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <YieldStat
          icon="layers"
          label={IS_STELLAR_MODE ? "Stream records" : "Lifetime streamed"}
          value={IS_STELLAR_MODE ? `${totalCount}` : `$${HISTORY_DETAILED.reduce((a, h) => a + h.final, 0).toFixed(2)}`}
          sub={IS_STELLAR_MODE
            ? (usingDerivedFallback ? "from tracked stream state" : "contract events in range")
            : `across ${totalCount} closed streams`}
          tone="up"
        />
        <YieldStat
          icon="check-circle-2"
          label={IS_STELLAR_MODE ? "Completed" : "Completed naturally"}
          value={`${endedCount}`}
          sub={IS_STELLAR_MODE ? "streams that ran to end" : "ran to scheduled end"}
        />
        <YieldStat
          icon="x-circle"
          label="Cancelled"
          value={`${cancelledCount}`}
          sub="terminated early"
        />
      </section>

      {/* Table */}
      <section className="rounded-2xl glass overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-2 px-6 py-3 text-[10.5px] uppercase tracking-[0.16em] text-white/40 font-mono border-b border-white/5">
          <div className="col-span-1">Status</div>
          <div className="col-span-3">{hasLifecycleEvents ? "Stream" : "Counterparty"}</div>
          <div className="col-span-2 text-right">{IS_STELLAR_MODE ? "Amount (XLM)" : "Final amount"}</div>
          <div className="col-span-2">{IS_STELLAR_MODE ? "Event type" : "Duration"}</div>
          <div className="col-span-2">{IS_STELLAR_MODE ? "Time" : "Closed"}</div>
          <div className="col-span-2 text-right">{IS_STELLAR_MODE ? "Stellar Expert" : "Solscan"}</div>
        </div>

        {/* Stellar empty states */}
        {IS_STELLAR_MODE && !stellarLoading && walletConnected && visible.length === 0 && (
          <div className="px-6 py-12 text-center space-y-2">
            <div className="w-10 h-10 rounded-full mx-auto bg-white/5 flex items-center justify-center text-white/35">
              <Icon name="inbox" size={16} />
            </div>
            {(stellarStreams?.count ?? 0) === 0 ? (
              <>
                <div className="text-[13px] text-white/55">No Stellar streams tracked yet.</div>
                <div className="text-[11.5px] font-mono text-white/30">
                  Create a new XLM stream or load an existing stream ID from the Streams page.
                </div>
              </>
            ) : (
              <>
                <div className="text-[13px] text-white/55">No history records found.</div>
                <div className="text-[11.5px] font-mono text-white/30">
                  Streams are tracked but no state could be loaded yet. Try refreshing.
                </div>
              </>
            )}
          </div>
        )}

        {IS_STELLAR_MODE
          ? visible.map((h) => <StellarHistoryRow key={h.id} h={h} />)
          : (visible as typeof HISTORY_DETAILED).map((h) => <HistoryRow key={h.id} h={h} />)
        }

        {!IS_STELLAR_MODE && visible.length === 0 && (
          <div className="px-6 py-12 text-center text-[13px] text-white/40 font-mono">No streams match this filter.</div>
        )}
      </section>
    </div>
  );
}

function StellarHistoryRow({ h }: { h: StellarHistoryItem }) {
  // Richer badge: map kind + eventType to a color/label
  const badgeCfg = (() => {
    if (h.kind === "cancelled") return { label: "Cancelled", cls: "border-amber-400/30 text-amber-300 bg-amber-400/5" };
    if (h.kind === "ended")     return { label: "Completed", cls: "border-emerald-400/30 text-emerald-300 bg-emerald-400/5" };
    if (h.eventType === "Active stream" || h.eventType === "Stream Created")
                                return { label: "Active",    cls: "border-sky-400/30 text-sky-300 bg-sky-400/5" };
    if (h.eventType === "Paused stream" || h.eventType === "Stream Paused")
                                return { label: "Paused",    cls: "border-amber-400/30 text-amber-300 bg-amber-400/5" };
    return { label: "Event", cls: "border-sky-400/30 text-sky-300 bg-sky-400/5" };
  })();
  const badge = (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-[0.12em] ${badgeCfg.cls}`}>
      {badgeCfg.label}
    </span>
  );

  // Explorer link: show tx hash if present, otherwise "Contract" label
  const hasHash = !!h.txHash;
  const shortLink = hasHash
    ? h.txHash.slice(0, 6) + "…" + h.txHash.slice(-4)
    : "Contract";

  return (
    <>
      {/* Mobile card */}
      <div className="sm:hidden px-4 py-3.5 border-b border-white/5 hover:bg-white/[0.02] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <div className="text-[13px] text-white truncate font-mono">{h.eventType}</div>
              <div className="text-[10px] font-mono text-white/35 truncate">{h.streamId}</div>
            </div>
          </div>
          {badge}
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <div className="text-white/50 font-mono">{h.at !== "—" ? h.at : "—"}</div>
          <div className="font-num text-white text-[13px]">
            {h.finalXlm > 0 ? `${h.finalXlm.toFixed(4)} XLM` : "—"}
          </div>
        </div>
        <div>
          <a
            href={h.explorerUrl !== "#" ? h.explorerUrl : undefined}
            target={h.explorerUrl !== "#" ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-sky-300/70 hover:text-white"
          >
            {shortLink} <Icon name="arrow-up-right" size={10} />
          </a>
        </div>
      </div>
      {/* Desktop grid row */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-6 py-4 text-[13px] border-b border-white/5 hover:bg-white/[0.02] items-center">
        <div className="col-span-1">{badge}</div>
        <div className="col-span-3 min-w-0">
          <div className="text-white truncate font-mono text-[12px]">{h.counterparty}</div>
          <div className="text-[10.5px] font-mono text-white/40">{h.streamId}</div>
        </div>
        <div className="col-span-2 text-right font-num text-white">
          {h.finalXlm > 0 ? `${h.finalXlm.toFixed(4)} XLM` : "—"}
        </div>
        <div className="col-span-2 text-white/65 font-mono text-[12px]">{h.eventType}</div>
        <div className="col-span-2 text-white/55 font-mono text-[12px]">{h.at}</div>
        <div className="col-span-2 text-right">
          <a
            href={h.explorerUrl !== "#" ? h.explorerUrl : undefined}
            target={h.explorerUrl !== "#" ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11.5px] text-sky-300/80 hover:text-white"
          >
            {shortLink} <Icon name="arrow-up-right" size={11} />
          </a>
        </div>
      </div>
    </>
  );
}

function HistoryRow({ h }: any) {
  const ended = h.kind === "ended";
  const badge = (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-[0.12em] ${ended ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/5" : "border-amber-400/30 text-amber-300 bg-amber-400/5"}`}>
      {ended ? "Ended" : "Cancelled"}
    </span>
  );
  return (
    <>
      {/* Mobile card */}
      <div className="sm:hidden px-4 py-3.5 border-b border-white/5 hover:bg-white/[0.02] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <SolAvatar seed={h.party} size={26} />
            <div className="min-w-0">
              <div className="text-[13px] text-white truncate">{h.party}</div>
              <div className="text-[10px] font-mono text-white/35 truncate">{h.id}</div>
            </div>
          </div>
          {badge}
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <div className="text-white/50 font-mono">{h.at} · {fmtDuration(h.duration)}</div>
          <div className="font-num text-white">
            ${fmtUSD(h.final, 2)}
          </div>
        </div>
        <div>
          <a href="#" className="inline-flex items-center gap-1 font-mono text-[11px] text-violet-300/70 hover:text-white">
            {h.tx} <Icon name="arrow-up-right" size={10} />
          </a>
        </div>
      </div>
      {/* Desktop grid row */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-6 py-4 text-[13px] border-b border-white/5 hover:bg-white/[0.02] items-center">
        <div className="col-span-1">{badge}</div>
        <div className="col-span-3 flex items-center gap-3 min-w-0">
          <SolAvatar seed={h.party} size={28} />
          <div className="min-w-0">
            <div className="text-white truncate">{h.party}</div>
            <div className="text-[10.5px] font-mono text-white/40">{h.id}</div>
          </div>
        </div>
        <div className="col-span-2 text-right font-num text-white">${fmtUSD(h.final, 2)}</div>
        <div className="col-span-2 text-white/65 font-mono text-[12px]">Streamed for {fmtDuration(h.duration)}</div>
        <div className="col-span-2 text-white/55 font-mono text-[12px]">{h.at}</div>
        <div className="col-span-2 text-right">
          <a href="#" className="inline-flex items-center gap-1 font-mono text-[11.5px] text-violet-300/80 hover:text-white">
            {h.tx} <Icon name="arrow-up-right" size={11} />
          </a>
        </div>
      </div>
    </>
  );
}

// =========================================================================
// STELLAR STREAM PANEL — moved to components/streams/StellarStreamPanel.tsx
// Import at top of file; rendered in StreamsPage → Stellar Testnet tab.
// =========================================================================


// =========================================================================
// AGENTS page
// =========================================================================
function ChainSelector({ chain, onChange }: { chain: "solana-devnet" | "stellar-testnet"; onChange: (c: "solana-devnet" | "stellar-testnet") => void }) {
  const options: { id: "solana-devnet" | "stellar-testnet"; label: string }[] = [
    { id: "solana-devnet", label: "Solana Devnet" },
    { id: "stellar-testnet", label: "Stellar Testnet" },
  ];
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
            chain === opt.id
              ? "bg-violet-500/20 text-violet-200 border border-violet-400/30"
              : "text-white/45 hover:text-white/70"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function AgentsPage({ streams = [], walletConnected = false, onNewStream, usingMockData = true, onGoToStreams }: any) {
  const [log, setLog] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);

  // Find best real agent stream: prefer policy=agent, active, outgoing
  const agentStream = useMemo(() => {
    if (usingMockData || !walletConnected) return null;
    const candidates = streams.filter(
      (s: any) => s.dir === "out" && s.status === "streaming"
    );
    // Prefer agent policy streams first
    return candidates.find((s: any) => s.policy === "agent") ?? candidates[0] ?? null;
  }, [streams, usingMockData, walletConnected]);

  const isRealStream = !!agentStream;
  const budgetSol = isRealStream ? agentStream.deposit : 0.5;
  const spentSol  = isRealStream ? agentStream.base : 0;
  const rateSol   = isRealStream ? agentStream.rate : 0.00001;
  const remaining = Math.max(0, budgetSol - spentSol);
  const isRunning = !paused;

  // Live ticking spent amount for the hero panel
  const liveSpent = useStreamingValue(spentSol, isRealStream ? rateSol : 0, isRealStream && isRunning);
  const progressPct = budgetSol > 0 ? Math.min(100, (liveSpent / budgetSol) * 100) : 0;

  const explorerUrl = isRealStream && agentStream.pda
    ? getExplorerAddressUrl(agentStream.pda, SOLANA_CLUSTER)
    : null;

  // Generate live agent micro-payments (demo simulation - not real on-chain)
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const a = AGENTS[Math.floor(Math.random() * AGENTS.length)];
      const tokens = Math.floor(AGENT_LOG_DEMO.tokenMin + Math.random() * AGENT_LOG_DEMO.tokenSpread);
      const amt = (a.rate * (tokens / 1000)).toFixed(8);
      const verb = AGENT_LOG_DEMO.verbs[Math.floor(Math.random() * AGENT_LOG_DEMO.verbs.length)];
      const target = AGENT_LOG_DEMO.targets[Math.floor(Math.random() * AGENT_LOG_DEMO.targets.length)];
      setLog((arr) => [{
        id: Math.random().toString(36).slice(2, 8),
        time: new Date().toLocaleTimeString("en-US", { hour12: false }),
        agent: a.name.split(" ")[0],
        target,
        verb,
        amt,
        tokens: (tokens / 1000).toFixed(1) + "k",
      }, ...arr].slice(0, 30));
    }, AGENT_LOG_DEMO.intervalMs);
    return () => clearInterval(id);
  }, [paused]);

  const totalRate = AGENTS.filter(a => a.status === "active").reduce((s, a) => s + a.rate, 0);
  const totalSpent = useStreamingValue(AGENT_LOG_DEMO.baseSpent, totalRate, !paused);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="05 - Agent Pay · 2026"
        title={<>The autonomous economy.</>}
        sub="Agents hire other agents and pay them per token of compute. Settlement happens at the speed of inference - sub-second, sub-cent."
        right={
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={() => setPaused(p => !p)} className="btn-ghost rounded-full px-4 py-2 text-[13px] text-white/85 flex items-center gap-2">
              <Icon name={paused ? "play" : "pause"} size={13} /> {paused ? "Resume" : "Pause"} mesh
            </button>
            <button onClick={onNewStream} className="btn-primary rounded-full px-4 py-2 text-[13px] font-medium text-white flex items-center gap-1.5">
              <Icon name="plus" size={13} /> Create agent stream
            </button>
          </div>
        }
      />

      {/* Mobile pause button */}
      <div className="sm:hidden flex items-center gap-2">
        <button onClick={() => setPaused(p => !p)} className="btn-ghost rounded-full px-4 py-2 text-[13px] text-white/85 flex items-center gap-2">
          <Icon name={paused ? "play" : "pause"} size={13} /> {paused ? "Resume" : "Pause"} mesh
        </button>
        <button onClick={onNewStream} className="btn-primary rounded-full px-4 py-2 text-[13px] font-medium text-white flex items-center gap-1.5">
          <Icon name="plus" size={13} /> New agent stream
        </button>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <YieldStat icon="bot" label="Agents" value={`${AGENTS.length}`} sub={`${AGENTS.filter(a => a.status === "active").length} active`} />
        <YieldStat icon="zap" label="Combined rate" value={`${totalRate.toFixed(7)}/s`} sub={`${IS_STELLAR_MODE ? "XLM" : "SOL"}/s mesh`} />
        <YieldStat icon="layers" label="Session spend" value={`${fmtUSD(totalSpent, 4)} ${IS_STELLAR_MODE ? "XLM" : "SOL"}`} sub="demo simulation" tone="up" />
        <YieldStat icon="activity" label="Settlements" value={`${log.length * 24 + AGENT_LOG_DEMO.baseSettlements}`} sub="last hour" />
      </section>

      {/* Streams link — create and manage from the Streams page */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-400/10 text-violet-200 flex items-center justify-center shrink-0">
          <Icon name="waves" size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-white">Create or manage streams</div>
          <div className="text-[11px] font-mono text-white/40">
            {IS_STELLAR_MODE
              ? "Stellar Testnet streams are managed from the Streams page."
              : "Solana Devnet and Stellar Testnet streams are managed from the Streams page."}
          </div>
        </div>
        <button
          onClick={onGoToStreams}
          className="shrink-0 btn-ghost rounded-full px-3.5 py-1.5 text-[12px] text-violet-200 border border-violet-400/25 hover:border-violet-400/50 flex items-center gap-1.5"
        >
          <Icon name="waves" size={12} /> Manage streams
        </button>
      </div>

      {/* Demo-mode quick-create CTA */}
      {!isRealStream && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-5 py-4 flex items-center gap-4">
          <Icon name="triangle-alert" size={16} className="text-amber-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[13px] text-amber-200">No on-chain agent stream found.</span>
            <span className="text-[12px] text-white/50 ml-2">Create an AI Compute stream to connect a real on-chain budget.</span>
          </div>
          <button onClick={onNewStream} className="shrink-0 btn-ghost rounded-full px-3.5 py-1.5 text-[12px] text-amber-200 border border-amber-400/30 hover:border-amber-400/60 flex items-center gap-1.5">
            <Icon name="plus" size={12} /> Create stream
          </button>
        </div>
      )}

      {/* Drip Research Agent hero panel */}
      <section className="rounded-2xl glass p-6 border border-violet-400/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-400/15 text-violet-200 flex items-center justify-center shrink-0">
              <Icon name="bot" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] text-white font-medium">Drip Research Agent</span>
                {isRealStream ? (
                  <span className="text-[9.5px] font-mono uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full border border-emerald-400/30 text-emerald-300 bg-emerald-400/5">live</span>
                ) : (
                  <span className="text-[9.5px] font-mono uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full border border-amber-400/30 text-amber-300 bg-amber-400/5">demo simulation</span>
                )}
              </div>
              <div className="text-[12px] text-white/45 mt-0.5">Autonomous research, summarization, and publish pipeline - paid per inference token via Drip</div>
            </div>
          </div>
          {isRealStream && (
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 font-mono">Stream ID</div>
              <div className="text-[11px] font-mono text-violet-300/80 mt-0.5">{agentStream.id?.slice(0, 12)}...</div>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg px-3 py-2.5 border border-white/8 bg-white/[0.03]">
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 font-mono">Budget</div>
            <div className="mt-1 text-[14px] font-mono text-white">{budgetSol.toFixed(4)} {IS_STELLAR_MODE ? "XLM" : "SOL"}</div>
          </div>
          <div className="rounded-lg px-3 py-2.5 border border-violet-400/20 bg-violet-400/5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-violet-300/60 font-mono">{isRealStream ? "Spent" : "Demo spend"}</div>
            <div className="mt-1 text-[14px] font-mono text-iri">{liveSpent.toFixed(6)} {IS_STELLAR_MODE ? "XLM" : "SOL"}</div>
          </div>
          <div className="rounded-lg px-3 py-2.5 border border-white/8 bg-white/[0.03]">
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 font-mono">Remaining</div>
            <div className="mt-1 text-[14px] font-mono text-emerald-300">{(isRealStream ? Math.max(0, budgetSol - liveSpent) : remaining).toFixed(4)} {IS_STELLAR_MODE ? "XLM" : "SOL"}</div>
          </div>
          <div className="rounded-lg px-3 py-2.5 border border-white/8 bg-white/[0.03]">
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 font-mono">Rate</div>
            <div className="mt-1 text-[14px] font-mono text-white">{fmtRate(rateSol)}/s</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-white/40 font-mono">Budget utilization</span>
            <span className="text-[11px] text-white/55 font-mono">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* CTA links */}
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <button onClick={onNewStream} className="btn-ghost rounded-full px-3.5 py-1.5 text-[12px] text-violet-200 border border-violet-400/25 hover:border-violet-400/50 flex items-center gap-1.5">
            <Icon name="plus" size={12} /> Create Agent Stream
          </button>
          <span className="text-[12px] text-white/30 border border-white/8 rounded-full px-3.5 py-1.5 flex items-center gap-1.5">
            <Icon name="file-text" size={12} className="text-white/25" /> View Compliance Export
          </span>
          {explorerUrl ? (
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost rounded-full px-3.5 py-1.5 text-[12px] text-cyan-300 border border-cyan-400/25 hover:border-cyan-400/50 flex items-center gap-1.5">
              <Icon name="external-link" size={12} /> Open Stream on Explorer
            </a>
          ) : (
            <span className="text-[12px] text-white/25 border border-white/5 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 cursor-not-allowed">
              <Icon name="external-link" size={12} /> Open Stream on Explorer
            </span>
          )}
        </div>
      </section>

      <section className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 rounded-2xl glass p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Connected agents</div>
          <h3 className="mt-2 text-[18px] tracking-tight">Mesh participants.</h3>
          <div className="mt-5 space-y-2">
            {AGENTS.map((a) => (
              <div key={a.id} className={`rounded-xl border p-3.5 flex items-center gap-3 ${a.status === "active" ? "border-violet-400/25 bg-violet-400/5" : "border-white/8 bg-white/[0.02]"}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.status === "active" ? "bg-violet-400/15 text-violet-200" : "bg-white/5 text-white/55"}`}>
                  <Icon name="bot" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] text-white truncate">{a.name}</span>
                    <span className={`text-[9.5px] font-mono uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full border ${a.status === "active" ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/5" : "border-white/15 text-white/55 bg-white/5"}`}>{a.status}</span>
                  </div>
                  <div className="text-[10.5px] font-mono text-white/40">{a.model}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12.5px] font-mono text-white">{a.rate.toFixed(6)}/s</div>
                  <div className="text-[10px] font-mono text-white/40">{a.calls.toLocaleString()} calls</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live terminal log - DEMO SIMULATION */}
        <div className="lg:col-span-7 rounded-2xl grad-border glass-strong p-1.5">
          <div className="rounded-[18px] bg-[#06051a] overflow-hidden h-full">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
              <span className="ml-3 font-mono text-[12px] text-white/55">drip-research-agent ~ inference log</span>
              <span className="ml-auto flex items-center gap-2 text-[10.5px] font-mono text-white/40">
                <span className={`w-1.5 h-1.5 rounded-full ${paused ? "bg-amber-400" : "bg-emerald-400 pulse-dot"}`} />
                {paused ? "PAUSED" : "TAILING"}
              </span>
            </div>
            <div className="font-mono text-[11px] p-3 sm:p-4 h-[420px] overflow-y-auto overflow-x-hidden">
              {/* Demo banner */}
              <div className="text-[9.5px] text-amber-300/60 mb-3 pb-2 border-b border-amber-400/15 break-words">
                [DEMO SIMULATION - terminal activity is not real on-chain execution]
              </div>
              {log.length === 0 && (
                <div className="text-white/40 text-[10.5px]">$ drip tail --follow ... waiting</div>
              )}
              {log.map((l, i) => (
                <div
                  key={l.id}
                  className="py-1.5 border-b border-white/[0.03]"
                  style={{ opacity: Math.max(0.25, 1 - i * 0.04) }}
                >
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-white/35 shrink-0">{l.time}</span>
                    <span className="text-violet-300 shrink-0">{l.agent}</span>
                    <span className="text-white/40 shrink-0">{l.verb}</span>
                    <span className="text-emerald-300 shrink-0">+{l.amt} {IS_STELLAR_MODE ? "XLM" : "SOL"}</span>
                    <span className="text-white/30 shrink-0">→</span>
                    <span className="text-cyan-300 truncate min-w-0">{l.target}</span>
                    <span className="ml-auto text-white/30 shrink-0">{l.tokens}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// =========================================================================
// SETTINGS page (lightweight)
// =========================================================================
function SettingsPage({ freighter }: any) {
  const stellarAddr = freighter?.connected && freighter.address
    ? `${freighter.address.slice(0, 4)}...${freighter.address.slice(-6)}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="06  -  Settings"
        title={<>Workspace preferences.</>}
        sub="Your wallet, defaults, and security posture."
      />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl glass p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Identity</div>
          <div className="mt-4 flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500" />
            {IS_STELLAR_MODE ? (
              <div>
                <div className="text-[15px] text-white">{stellarAddr ?? "Drip Stellar Wallet"}</div>
                <div className="text-[11.5px] font-mono text-white/45">
                  {freighter?.connected ? `Freighter · ${stellarAddr}` : "Freighter wallet · Not connected"}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[15px] text-white">{USER_WALLET_PROFILE.name}</div>
                <div className="text-[11.5px] font-mono text-white/45">{USER_WALLET_PROFILE.embeddedWalletLabel}</div>
              </div>
            )}
          </div>
          <div className="mt-5 space-y-2">
            {IS_STELLAR_MODE ? (
              <>
                <SettingRow label="Wallet" value="Freighter" />
                <SettingRow label="Network" value={freighter?.network ?? "Stellar Testnet"} />
                <SettingRow label="Status" value={freighter?.connected ? "Connected" : "Not connected"} tone={freighter?.connected ? "up" : undefined} />
              </>
            ) : (
              <>
                <SettingRow label="Email" value={USER_WALLET_PROFILE.email} />
                <SettingRow label="Recovery" value={USER_WALLET_PROFILE.recovery} />
                <SettingRow label="2FA" value={USER_WALLET_PROFILE.twoFactor} tone="up" />
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl glass p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Defaults</div>
          <div className="mt-4 space-y-3">
            {(IS_STELLAR_MODE ? STELLAR_SETTINGS_DEFAULTS : SETTINGS_DEFAULTS).map((setting) => (
              <SettingRow key={setting.label} {...setting} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, value, tone }: any) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0">
      <span className="text-[13px] text-white/65">{label}</span>
      <span className={`text-[13px] font-mono ${tone === "up" ? "text-emerald-300" : "text-white"}`}>{value}</span>
    </div>
  );
}

// =========================================================================
// New Stream slide-over (with Smart Rate Converter)
// =========================================================================
function NewStreamDrawer({ open, onClose, onCreate, walletConnected, onConnectWallet, txStatus = "idle", txSig, txError, prefill }: any) {
  const [recipient, setRecipient] = useState(NEW_STREAM_DEFAULTS.recipient);
  const [token, setToken] = useState("SOL");
  const [amount, setAmount] = useState(0.1);
  const [period, setPeriod] = useState(NEW_STREAM_DEFAULTS.period);
  const [periodCount, setPeriodCount] = useState(1);
  const [label, setLabel] = useState(NEW_STREAM_DEFAULTS.label);
  const [deposit, setDeposit] = useState(1.0);
  const [policy, setPolicy] = useState(NEW_STREAM_DEFAULTS.policy);
  const [budgetCap, setBudgetCap] = useState(0.5);
  const [autoRevoke, setAutoRevoke] = useState(NEW_STREAM_DEFAULTS.autoRevoke);
  const [category, setCategory] = useState("OTHER");
  const [expirationEnabled, setExpirationEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  useEffect(() => {
    if (open && prefill) {
      if (prefill.amount !== undefined) setAmount(prefill.amount);
      if (prefill.period !== undefined) setPeriod(prefill.period);
      if (prefill.deposit !== undefined) setDeposit(prefill.deposit);
      if (prefill.policy !== undefined) setPolicy(prefill.policy);
      if (prefill.budgetCap !== undefined) setBudgetCap(prefill.budgetCap);
      if (prefill.category !== undefined) setCategory(prefill.category);
      if (prefill.label !== undefined) setLabel(prefill.label);
    }
  }, [open, prefill]);

  const PERIOD_MAX: Record<string, number> = { hour: 23, day: 30, week: 4, month: 12 };
  const periodBaseSec = NEW_STREAM_DEFAULTS.periodSeconds[period] ?? 86400;
  const periodSec = periodBaseSec * periodCount;
  const perSec = amount / periodSec;
  const perDay = perSec * 86400;
  const perHour = perSec * 3600;
  const perMin = perSec * 60;

  const recipientOk = recipient.trim().length > 3;
  const flowRateLamports = Math.floor(perSec * LAMPORTS_PER_SOL_NUM);
  const depositLamportsNum = Math.floor(deposit * LAMPORTS_PER_SOL_NUM);
  const flowRateTooSmall = amount > 0 && flowRateLamports < 1;
  const depositTooSmall = deposit > 0 && depositLamportsNum < MIN_DEPOSIT_LAMPORTS;
  const formValid = recipientOk && amount > 0 && deposit > 0 && !flowRateTooSmall && !depositTooSmall;
  const txPending = txStatus === "confirming" || txStatus === "preparing";

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={txPending ? undefined : onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[520px] slide-in">
        <div className="h-full glass-strong border-l border-violet-400/20 bg-[#0b0a1a] flex flex-col">
          <div className="flex items-center justify-between px-7 py-5 border-b border-white/5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">New stream</div>
              <h3 className="mt-1 text-[20px] tracking-tight">Pay anyone, per-second.</h3>
            </div>
            <button onClick={txPending ? undefined : onClose} disabled={txPending} className="w-9 h-9 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
              <Icon name="x" size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-auto px-7 py-6 space-y-6">
            <Field label="Recipient" hint={IS_STELLAR_MODE ? "Stellar address (G...)" : "Wallet address or .sol name"}>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-violet-400/40 transition">
                <Icon name="at-sign" size={14} className="text-white/45" />
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={IS_STELLAR_MODE ? "G4AH...VKLBWQ" : NEW_STREAM_DEFAULTS.recipientPlaceholder}
                  className="flex-1 bg-transparent outline-none text-[14px] font-mono text-white placeholder-white/25"
                />
                {recipientOk && <Icon name="check-circle-2" size={14} className="text-emerald-300" />}
              </div>
              {!IS_STELLAR_MODE && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {NEW_STREAM_DEFAULTS.quickRecipients.map((s) => (
                    <button key={s} onClick={() => setRecipient(s)} className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-white/55 hover:text-white hover:border-violet-400/30">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {recipientOk && !IS_STELLAR_MODE && SOLANA_CLUSTER !== "mainnet-beta" && (
                <div className="mt-1.5 text-[11px] font-mono text-amber-200/70 flex items-center gap-1">
                  <Icon name="triangle-alert" size={11} /> Receiver should have devnet SOL to avoid rent issues. Airdrop at faucet.solana.com if needed.
                </div>
              )}
            </Field>

            <Field label="Spending Policy" hint="How this stream is governed">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPolicy("standard")} className={`text-left rounded-xl px-3.5 py-3 border transition ${policy === "standard" ? "border-violet-400/45 bg-violet-400/10" : "border-white/8 bg-white/[0.02] hover:border-white/20"}`}>
                  <div className="flex items-center gap-2">
                    <Icon name="user" size={13} className={policy === "standard" ? "text-violet-200" : "text-white/55"} />
                    <span className="text-[13px] text-white">Standard</span>
                  </div>
                  <div className="text-[11px] font-mono text-white/45 mt-1">Fixed rate streaming</div>
                </button>
                <button onClick={() => setPolicy("agent")} className={`text-left rounded-xl px-3.5 py-3 border transition ${policy === "agent" ? "border-violet-400/45 bg-violet-400/10" : "border-white/8 bg-white/[0.02] hover:border-white/20"}`}>
                  <div className="flex items-center gap-2">
                    <Icon name="bot" size={13} className={policy === "agent" ? "text-violet-200" : "text-white/55"} />
                    <span className="text-[13px] text-white">Autonomous Agent</span>
                  </div>
                  <div className="text-[11px] font-mono text-white/45 mt-1">Caps + auto-revoke</div>
                </button>
              </div>
              {policy === "agent" && (
                <div className="mt-3 rounded-xl border border-violet-400/25 bg-violet-400/[0.06] p-3.5 space-y-3">
                  <div>
                    <div className="text-[10.5px] uppercase tracking-[0.18em] text-violet-200/80 font-mono mb-1.5">Max Budget Cap ({IS_STELLAR_MODE ? "XLM" : "SOL"})</div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/30 border border-white/8">
                      <span className="text-white/40 font-num">◎</span>
                      <input type="number" min={0} step={0.01} value={budgetCap} onChange={(e) => setBudgetCap(Math.max(0, Number(e.target.value) || 0))} className="flex-1 bg-transparent outline-none font-num text-white num-stable" />
                      <span className="text-[10.5px] font-mono text-white/45">stop after this amount</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] uppercase tracking-[0.18em] text-violet-200/80 font-mono mb-1.5">Auto-Revoke Date</div>
                    <input type="date" value={autoRevoke} onChange={(e) => setAutoRevoke(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/8 outline-none font-mono text-[13px] text-white" style={{ colorScheme: "dark" }} />
                  </div>
                </div>
              )}
            </Field>

            <Field label="Token">
              <div className="flex items-center gap-2">
                {STREAM_TOKEN_OPTIONS.map((t) => (
                  <button key={t.k} onClick={() => t.k === "SOL" && setToken(t.k)} disabled={t.k !== "SOL"} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition ${token === t.k ? "border-violet-400/45 bg-violet-400/10" : "border-white/8 bg-white/[0.02] hover:border-white/20"} ${t.k !== "SOL" ? "opacity-30 cursor-not-allowed" : ""}`}>
                    <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${t.color}`} />
                    <span className="text-[13px] text-white">{t.k}</span>
                  </button>
                ))}
                <span className="ml-auto text-[11px] font-mono text-white/40">Native {IS_STELLAR_MODE ? "XLM" : "SOL"} only</span>
              </div>
            </Field>

            {/* Smart Rate Converter */}
            <Field label="Smart rate converter" hint="SOL amount per period.">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-violet-400/40 transition">
                <span className="text-white/40 text-[20px] font-num">◎</span>
                <input
                  type="number"
                  min={0}
                  step={0.001}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="flex-1 bg-transparent outline-none text-[22px] font-num text-iri num-stable"
                />
              </div>
              <div className="mt-2 flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/8">
                {[
                  { k: "hour",  label: "/ Hour" },
                  { k: "day",   label: "/ Day" },
                  { k: "week",  label: "/ Week" },
                  { k: "month", label: "/ Month" },
                ].map((p) => (
                  <button
                    key={p.k}
                    onClick={() => { setPeriod(p.k); setPeriodCount(1); }}
                    className={`flex-1 py-1.5 text-[11.5px] font-mono rounded-lg transition ${period === p.k ? "bg-violet-400/15 text-violet-200" : "text-white/55 hover:text-white"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {/* Count selector */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <button
                  onClick={() => setPeriodCount(c => Math.max(1, c - 1))}
                  className="w-7 h-7 rounded-lg border border-white/10 text-white/55 hover:text-white hover:border-violet-400/30 flex items-center justify-center text-[14px] font-mono shrink-0"
                >−</button>
                <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                  {Array.from({ length: PERIOD_MAX[period] }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPeriodCount(n)}
                      className={`shrink-0 min-w-[26px] h-7 rounded-lg text-[11px] font-mono transition border ${periodCount === n ? "bg-violet-400/20 border-violet-400/40 text-violet-200" : "border-transparent text-white/40 hover:text-white hover:border-white/15"}`}
                    >{n}</button>
                  ))}
                </div>
                <button
                  onClick={() => setPeriodCount(c => Math.min(PERIOD_MAX[period], c + 1))}
                  className="w-7 h-7 rounded-lg border border-white/10 text-white/55 hover:text-white hover:border-violet-400/30 flex items-center justify-center text-[14px] font-mono shrink-0"
                >+</button>
              </div>
              <div className="mt-1 text-[11px] font-mono text-white/35">
                = {periodCount} {period}{periodCount > 1 ? "s" : ""} per cycle
              </div>
            </Field>

            <div className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4">
              <div className="text-[10.5px] uppercase tracking-[0.18em] text-violet-200/80 font-mono">Auto-converted flow rate</div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <BreakdownCell label="/sec"  value={perSec.toFixed(7)} accent />
                <BreakdownCell label="/min"  value={perMin.toFixed(4)} />
                <BreakdownCell label="/hr"   value={perHour.toFixed(2)} />
                <BreakdownCell label="/day"  value={perDay.toFixed(2)} />
              </div>
              <div className="mt-3 text-[11.5px] font-mono text-white/45">
                {IS_STELLAR_MODE
                  ? <>Settles on Stellar Testnet via Soroban · receiver can withdraw mid-stream</>
                  : <>Settles every <span className="text-violet-200">{PROTOCOL_STATS.blockTime}</span> on Solana · receiver can withdraw mid-stream</>}
              </div>
              {!IS_STELLAR_MODE && (
                <div className={`mt-2 text-[11px] font-mono ${flowRateTooSmall ? "text-rose-300" : "text-white/35"}`}>
                  = {flowRateLamports.toLocaleString()} lamports/sec
                  {flowRateTooSmall && <span className="ml-2 font-bold">— rounds to 0, increase amount or shorten period</span>}
                </div>
              )}
            </div>

            <Field label={`Initial deposit (${IS_STELLAR_MODE ? "XLM" : "SOL"})`} hint={`How much ${IS_STELLAR_MODE ? "XLM" : "SOL"} to lock in escrow`}>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-violet-400/40 transition">
                <span className="text-white/40 text-[18px] font-num">◎</span>
                <input
                  type="number"
                  min={0}
                  step={0.001}
                  value={deposit}
                  onChange={(e) => setDeposit(Math.max(0, Number(e.target.value) || 0))}
                  className="flex-1 bg-transparent outline-none text-[18px] font-num text-white num-stable"
                />
                <span className="text-[11px] font-mono text-white/45">covers {fmtDuration(deposit / (perSec || 0.0001))}</span>
              </div>
              {depositTooSmall && (
                <div className="mt-1.5 text-[11px] font-mono text-rose-300 flex items-center gap-1">
                  <Icon name="triangle-alert" size={11} /> Deposit is too small for rent reserve. Minimum: ◎{MIN_DEPOSIT_SOL.toFixed(4)}
                </div>
              )}
            </Field>

            <Field label="Memo" hint="Optional · visible on-chain">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. April retainer"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus:border-violet-400/40 outline-none text-[13.5px] text-white placeholder-white/25"
              />
            </Field>

            <Field label="Category" hint="For compliance reporting">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0b0a1a] border border-white/8 focus:border-violet-400/40 outline-none text-[13.5px] text-white"
                style={{ colorScheme: "dark" }}
              >
                {!IS_STELLAR_MODE && <option value="AI_COMPUTE">AI Compute</option>}
                <option value="API_COSTS">API Costs</option>
                <option value="HUMAN_PAYROLL">Human Payroll</option>
                <option value="B2B_SUBSCRIPTION">B2B Subscription</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>

            {policy === "standard" && (
              <Field label="Expiration" hint="Optional - caps accrual time">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => setExpirationEnabled((v) => !v)}
                    className={`w-10 h-6 rounded-full p-0.5 transition ${expirationEnabled ? "bg-violet-500" : "bg-white/15"}`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${expirationEnabled ? "translate-x-4" : ""}`} />
                  </button>
                  <span className="text-[12px] text-white/55 font-mono">{expirationEnabled ? "Enabled" : "Disabled"}</span>
                </div>
                {expirationEnabled && (
                  <input
                    type="datetime-local"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/8 focus:border-violet-400/40 outline-none font-mono text-[13px] text-white"
                    style={{ colorScheme: "dark" }}
                  />
                )}
              </Field>
            )}

            {!IS_STELLAR_MODE && (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-violet-400/20 flex items-center justify-center text-emerald-300">
                  <Icon name="sprout" size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] text-white">Route idle escrow to Raydium</div>
                  <div className="text-[11.5px] font-mono text-white/40 mt-0.5">+{PROTOCOL_STATS.yieldApy.toFixed(2)}% APY · withdrawn alongside stream</div>
                </div>
                <Toggle defaultOn />
              </div>
            )}
          </div>

          <div className="px-7 py-5 border-t border-white/5 space-y-3">
            {txStatus === "error" && txError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[12px] font-mono text-rose-200 flex items-start gap-2">
                <Icon name="triangle-alert" size={12} className="shrink-0 mt-0.5 text-rose-300" />
                <span className="break-all">{txError}</span>
              </div>
            )}
            {txStatus === "success" && txSig && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[12px] font-mono text-emerald-200 flex items-center gap-2">
                <Icon name="check-circle-2" size={12} className="shrink-0 text-emerald-300" />
                <span>Stream created on-chain.</span>
                <a href={getExplorerTxUrl(txSig)} target="_blank" rel="noopener noreferrer" className="ml-auto text-violet-300 hover:text-violet-100 flex items-center gap-1 shrink-0">
                  Explorer <Icon name="external-link" size={10} />
                </a>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1 text-[11px] font-mono text-white/40">
                {txPending ? (
                  <span className="text-violet-300 flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                    Waiting for confirmation...
                  </span>
                ) : (
                  <><span className="text-white/65">Network fee:</span> ~{NEW_STREAM_DEFAULTS.networkFee}</>
                )}
              </div>
              <button onClick={txPending ? undefined : onClose} disabled={txPending} className="btn-ghost rounded-full px-4 py-2.5 text-[13px] text-white/85 disabled:opacity-40 disabled:cursor-not-allowed">Cancel</button>
              <button
                disabled={txPending || (walletConnected && !formValid)}
                onClick={() => {
                  if (!walletConnected) { onConnectWallet?.(); return; }
                  if (!txPending && formValid) {
                    onCreate({ recipient, token, amount, period, label, perSec, deposit, policy, budgetCap, autoRevoke, category, expirationEnabled, expirationDate });
                  }
                }}
                className={`btn-primary rounded-full px-5 py-2.5 text-[13px] font-medium text-white flex items-center gap-2 ${txPending || (walletConnected && !formValid) ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {txPending
                  ? <><span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> Signing...</>
                  : <><Icon name="zap" size={13} /> {walletConnected ? "Start streaming" : "Connect wallet"}</>
                }
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/[0.04]">
              {IS_STELLAR_MODE ? (
                <span className="text-[10px] font-mono text-white/25">
                  Stellar Testnet · Soroban · Freighter required
                </span>
              ) : (
                <>
                  {!DRIP_PROGRAM_ID_CONFIGURED && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-amber-300/80">
                      <Icon name="triangle-alert" size={10} /> program ID not set
                    </span>
                  )}
                  {DRIP_PROGRAM_ID_CONFIGURED && (
                    <span className="text-[10px] font-mono text-white/25">
                      {SOLANA_CLUSTER}
                      <span className="text-white/15 mx-1">·</span>
                      {DRIP_PROGRAM_ID.toBase58().slice(0, 6)}...{DRIP_PROGRAM_ID.toBase58().slice(-4)}
                      <span className="text-white/15 mx-1">·</span>
                      {(() => { try { return new URL(SOLANA_RPC_URL).hostname; } catch { return SOLANA_RPC_URL; } })()}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: any) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">{label}</label>
        {hint && <span className="text-[11px] text-white/35">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function BreakdownCell({ label, value, accent }: any) {
  // Strip leading ◎ symbol so we render it as a separate span with proper fallback font
  const numStr = typeof value === "string" ? value.replace(/^[◎©◉⊙○●]/u, "") : value;
  return (
    <div className={`rounded-lg px-2.5 py-2 border overflow-hidden ${accent ? "border-violet-400/40 bg-violet-400/10" : "border-white/8 bg-white/[0.03]"}`}>
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-white/40 font-mono">{label}</div>
      <div className={`mt-1 font-num num-stable break-all leading-tight ${accent ? "text-iri text-[12px]" : "text-white/85 text-[11.5px]"}`}>
        <span className="text-white/50 not-italic">◎</span>{numStr}
      </div>
    </div>
  );
}

function Toggle({ defaultOn = false }: any) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button onClick={() => setOn((v) => !v)} className={`w-10 h-6 rounded-full p-0.5 transition ${on ? "bg-violet-500" : "bg-white/15"}`}>
      <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}

// =========================================================================
// App with route transitions
// =========================================================================
function RouteTransition({ k, children }: any) {
  return <div key={k} className="route-fade">{children}</div>;
}

export default function DashboardApp() {
  const { streams, setStreams, loading: streamsLoading, error: streamsError, refresh: refreshStreams, usingMockData } = useDripStreams();
  const [drawer, setDrawer] = useState(false);
  const [route, setRoute] = useState("dashboard");
  const [walletPrompt, setWalletPrompt] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle"|"preparing"|"confirming"|"success"|"error">("idle");
  const [txSig, setTxSig] = useState<string|null>(null);
  const [txError, setTxError] = useState<string|null>(null);
  const [streamActions, setStreamActions] = useState<Record<string, { pending: string | null; txSig: string | null; error: string | null }>>({});
  const inFlightRef = useRef<Set<string>>(new Set());
  const [cancelConfirm, setCancelConfirm] = useState<any | null>(null);
  const [streamChain, setStreamChain] = useState<"solana-devnet" | "stellar-testnet">(IS_STELLAR_MODE ? "stellar-testnet" : "solana-devnet");
  const freighter = useFreighterWallet();
  const stellarStreams = useStellarStreams(IS_STELLAR_MODE ? freighter.address : null);
  const solanaWalletState = useDripWallet();
  // In Stellar mode we never use the Solana wallet — stub out to safe defaults.
  const { connected, connect, wallet, publicKey, error: walletError } = IS_STELLAR_MODE
    ? { connected: false, connect: null, wallet: null, publicKey: null, error: null }
    : solanaWalletState;

  useEffect(() => {
    if (connected) setWalletPrompt(null);
  }, [connected]);

  const requireWallet = useCallback(
    (message = "Connect a wallet before signing this transaction.") => {
      if (IS_STELLAR_MODE) return false;
      if (connected) return true;
      setWalletPrompt(message);
      void connect?.();
      return false;
    },
    [connected, connect],
  );

  const connectWallet = useCallback(() => {
    requireWallet("Connect a wallet to sign Drip transactions.");
  }, [requireWallet]);

  const [drawerPrefill, setDrawerPrefill] = useState<any>(null);

  const openNewStream = useCallback(() => {
    // In Stellar mode (or when Stellar tab is active) navigate to Streams/Stellar panel
    if (IS_STELLAR_MODE || streamChain === "stellar-testnet") {
      setRoute("streams");
      return;
    }
    if (!requireWallet("Connect a wallet before creating a stream.")) return;
    setDrawerPrefill(null);
    setTxStatus("idle");
    setTxSig(null);
    setTxError(null);
    setDrawer(true);
  }, [streamChain, requireWallet]);

  const openAgentStream = useCallback(() => {
    if (!requireWallet("Connect a wallet to create an agent stream.")) return;
    setDrawerPrefill({
      amount: 0.01,
      period: "hour",
      deposit: 0.5,
      policy: "agent",
      budgetCap: 0.25,
      category: "AI_COMPUTE",
      label: "Drip Research Agent",
    });
    setTxStatus("idle");
    setTxSig(null);
    setTxError(null);
    setDrawer(true);
  }, [requireWallet]);

  const handleRouteChange = (nextRoute) => {
    if (IS_STELLAR_MODE && nextRoute === "yield") { setRoute("dashboard"); return; }
    if (IS_STELLAR_MODE && nextRoute === "agents") { setRoute("streams"); return; }
    setRoute(nextRoute);
  };

  const handleCreate = async (data) => {
    if (!requireWallet("Connect a wallet before creating a stream.")) return;
    if (!wallet) return;

    if (!DRIP_PROGRAM_ID_CONFIGURED) {
      setTxStatus("error");
      setTxError("DRIP program ID is not configured. Set NEXT_PUBLIC_DRIP_PROGRAM_ID in Vercel dashboard (or .env.local for local dev), then redeploy.");
      return;
    }

    // Validate recipient is a valid Solana base58 public key.
    let receiverPubkey: any;
    try {
      receiverPubkey = new PublicKey(data.recipient.trim());
    } catch {
      setTxStatus("error");
      setTxError("Invalid recipient. Enter a valid Solana base58 address (e.g. 9Abc...XYZ).");
      return;
    }
    if (publicKey && receiverPubkey.equals(publicKey)) {
      setTxStatus("error");
      setTxError("Receiver cannot be the same as your wallet address.");
      return;
    }

    const L = LAMPORTS_PER_SOL_NUM;

    const flowRateLamports = Math.floor(data.perSec * L);
    if (flowRateLamports < 1) {
      setTxStatus("error");
      setTxError("Flow rate is too small. Increase the amount or choose a shorter period.");
      return;
    }

    const depositLamports = new BN(Math.floor(data.deposit * L));
    if (depositLamports.ltn(MIN_DEPOSIT_LAMPORTS)) {
      setTxStatus("error");
      setTxError(`Deposit is too small for rent reserve and stream funding. Minimum deposit is ${MIN_DEPOSIT_SOL.toFixed(4)} SOL.`);
      return;
    }

    const flowRate = new BN(flowRateLamports);
    const maxBudget = data.policy === "agent" && data.budgetCap > 0
      ? new BN(Math.floor(data.budgetCap * L))
      : new BN(0);

    if (maxBudget.gtn(0)) {
      if (maxBudget.lt(flowRate)) {
        setTxStatus("error");
        setTxError("Budget cap must be at least the per-second flow rate.");
        return;
      }
      if (maxBudget.gt(depositLamports)) {
        setTxStatus("error");
        setTxError("Budget cap cannot exceed the deposit amount.");
        return;
      }
    }

    let expirationTime = 0;
    const revokeSrc = data.policy === "agent"
      ? data.autoRevoke
      : data.expirationEnabled ? data.expirationDate : "";
    if (revokeSrc) {
      const ts = Math.floor(new Date(revokeSrc).getTime() / 1000);
      if (ts > Math.floor(Date.now() / 1000)) expirationTime = ts;
    }

    const streamId = generateStreamId();
    setTxStatus("confirming");
    setTxSig(null);
    setTxError(null);

    try {
      const result = await createSolanaStream({
        wallet,
        receiver: receiverPubkey,
        streamId,
        depositedAmountLamports: depositLamports,
        flowRateLamportsPerSecond: flowRate,
        maxBudgetLamports: maxBudget,
        expirationTime,
      });

      setTxSig(result.signature);
      setTxStatus("success");

      const short = (s: string) => s.length > 10 ? `${s.slice(0,4)}...${s.slice(-4)}` : s;
      setStreams((arr) => [
        {
          id: "str_" + (Date.now() % 1_000_000).toString(),
          dir: "out",
          party: data.recipient,
          addr: short(data.recipient),
          token: "SOL",
          rate: data.perSec,
          status: "streaming",
          started: Date.now(),
          base: 0,
          label: data.label || "New stream",
          deposit: data.deposit,
          totalDuration: data.deposit / (data.perSec || 0.0001),
          policy: data.policy,
          budgetCap: data.policy === "agent" ? data.budgetCap : undefined,
          autoRevoke: data.policy === "agent" ? data.autoRevoke : undefined,
          category: data.category,
        },
        ...arr,
      ]);
      setRoute("streams");

      setTimeout(() => {
        setDrawer(false);
        setTxStatus("idle");
        setTxSig(null);
        void refreshStreams();
      }, 2500);
    } catch (err: any) {
      setTxStatus("error");
      const msg: string = err?.message ?? String(err);
      if (msg.includes("Attempt to load a program that does not exist")) {
        setTxError(
          "The DRIP program is not deployed on this cluster. Check NEXT_PUBLIC_DRIP_PROGRAM_ID and NEXT_PUBLIC_SOLANA_RPC_URL in .env.local.",
        );
      } else {
        setTxError(msg.length > 250 ? msg.slice(0, 250) + "..." : msg);
      }
    }
  };

  const doStreamAction = useCallback(async (
    stream: any,
    action: string,
    fn: () => Promise<{ signature: string }>,
  ) => {
    if (!requireWallet()) return;
    if (!DRIP_PROGRAM_ID_CONFIGURED) {
      setStreamActions((prev) => ({ ...prev, [stream.id]: { pending: null, txSig: null, error: "DRIP program ID is not configured. Set NEXT_PUBLIC_DRIP_PROGRAM_ID in Vercel dashboard (or .env.local for local dev), then redeploy." } }));
      return;
    }
    // Guard: synchronously block re-entry for the same stream using a ref
    if (inFlightRef.current.has(stream.id)) return;
    inFlightRef.current.add(stream.id);
    setStreamActions((prev) => ({ ...prev, [stream.id]: { pending: action, txSig: null, error: null } }));
    try {
      const { signature } = await fn();
      setStreamActions((prev) => ({ ...prev, [stream.id]: { pending: null, txSig: signature, error: null } }));
      void refreshStreams();
    } catch (err: any) {
      const mapped = mapStreamError(err);
      setStreamActions((prev) => ({ ...prev, [stream.id]: { pending: null, txSig: null, error: mapped } }));
      if ((err?.message ?? "").includes("already been processed")) void refreshStreams();
    } finally {
      inFlightRef.current.delete(stream.id);
    }
  }, [requireWallet, refreshStreams]);

  const handleWithdraw = useCallback((stream: any) => {
    if (!wallet) return;
    const withdrawnSOL: number = stream.withdrawnAmountSol ?? 0;
    const withdrawableLamports = Math.floor((stream.base - withdrawnSOL) * LAMPORTS_PER_SOL_NUM);
    if (withdrawableLamports <= 0) {
      setStreamActions((prev) => ({ ...prev, [stream.id]: { pending: null, txSig: null, error: "No unlocked funds available yet." } }));
      return;
    }
    if (withdrawableLamports < MIN_WITHDRAW_LAMPORTS) {
      setStreamActions((prev) => ({ ...prev, [stream.id]: { pending: null, txSig: null, error: "Unlocked amount is too small to withdraw yet. Wait a few more seconds." } }));
      return;
    }
    void doStreamAction(stream, "withdraw", () =>
      withdrawFromStream({ wallet, streamPublicKey: new PublicKey(stream.publicKey) }),
    );
  }, [wallet, doStreamAction]);

  const handlePause = useCallback((stream: any) => {
    if (!wallet) return;
    void doStreamAction(stream, "pause", () =>
      pauseStream({ wallet, streamPublicKey: new PublicKey(stream.publicKey) }),
    );
  }, [wallet, doStreamAction]);

  const handleResume = useCallback((stream: any) => {
    if (!wallet) return;
    void doStreamAction(stream, "resume", () =>
      resumeStream({ wallet, streamPublicKey: new PublicKey(stream.publicKey) }),
    );
  }, [wallet, doStreamAction]);

  const handleCancelStream = useCallback((stream: any) => {
    if (!requireWallet()) return;
    setCancelConfirm(stream);
  }, [requireWallet]);

  const handleCancelConfirmed = useCallback(() => {
    const stream = cancelConfirm;
    setCancelConfirm(null);
    if (!stream || !wallet) return;
    void doStreamAction(stream, "cancel", () =>
      cancelStream({
        wallet,
        streamPublicKey: new PublicKey(stream.publicKey),
        receiverPublicKey: new PublicKey(stream.receiverPublicKey),
      }),
    );
  }, [cancelConfirm, wallet, doStreamAction]);

  return (
    <div className="min-h-screen relative flex">
      <Backdrop />
      <Sidebar active={route} onChange={handleRouteChange} streams={streams} stellarStreamCount={IS_STELLAR_MODE ? stellarStreams.count : undefined} />
      <div className="flex-1 min-w-0">
        <Topbar route={route} onNewStream={openNewStream} streamChain={streamChain} freighter={freighter} />
        <MobileBottomNav active={route} onChange={handleRouteChange} />
        <main className="px-4 py-5 sm:px-8 sm:py-7 w-full pb-24 lg:pb-10">
          {walletPrompt && !connected && (
            <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[12.5px] text-amber-100/90 flex items-center gap-2">
              <Icon name="triangle-alert" size={14} className="text-amber-200" />
              <span>{walletPrompt}</span>
              {walletError ? <span className="text-rose-300">{walletError}</span> : null}
            </div>
          )}
          {!usingMockData && streamsLoading && (
            <div className="mb-4 flex items-center gap-2 text-[12px] font-mono text-violet-300/70">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              Syncing streams from chain...
            </div>
          )}
          {usingMockData && connected && (
            <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] px-4 py-2.5 text-[12px] font-mono text-amber-200/70 flex items-center gap-2">
              <Icon name="triangle-alert" size={12} className="text-amber-300" />
              Showing demo data. Fetching your on-chain streams...
            </div>
          )}
          <RouteTransition k={route}>
            {route === "dashboard" && <DashboardPage streams={streams} onNewStream={openNewStream} onGoTo={setRoute} walletConnected={IS_STELLAR_MODE ? freighter.connected : connected} walletError={walletError} onConnectWallet={IS_STELLAR_MODE ? (freighter.connect ?? connectWallet) : connectWallet} onRequireWallet={requireWallet} stellarStreams={IS_STELLAR_MODE ? stellarStreams : undefined} />}
            {route === "streams"   && <StreamsPage   streams={streams} setStreams={setStreams} onNewStream={openNewStream} walletConnected={connected} onRequireWallet={requireWallet} streamsLoading={streamsLoading} streamsError={streamsError} onRefresh={refreshStreams} onWithdraw={handleWithdraw} onPause={handlePause} onResume={handleResume} onCancelStream={handleCancelStream} streamActions={streamActions} streamChain={streamChain} onChainChange={setStreamChain} freighter={freighter} stellarStreams={IS_STELLAR_MODE ? stellarStreams : undefined} />}
            {route === "yield" && !IS_STELLAR_MODE && <YieldPage streams={streams} walletConnected={connected} onRequireWallet={requireWallet} />}
            {route === "history"   && <HistoryPage freighter={IS_STELLAR_MODE ? freighter : undefined} stellarStreams={IS_STELLAR_MODE ? stellarStreams : undefined} />}
            {route === "agents" && !IS_STELLAR_MODE && <AgentsPage streams={streams} walletConnected={connected} onNewStream={openAgentStream} usingMockData={usingMockData} onGoToStreams={() => setRoute("streams")} />}
            {IS_STELLAR_MODE && (route === "yield" || route === "agents") && <StreamsPage streams={streams} setStreams={setStreams} onNewStream={openNewStream} walletConnected={connected} onRequireWallet={requireWallet} streamsLoading={streamsLoading} streamsError={streamsError} onRefresh={refreshStreams} onWithdraw={handleWithdraw} onPause={handlePause} onResume={handleResume} onCancelStream={handleCancelStream} streamActions={streamActions} streamChain={streamChain} onChainChange={setStreamChain} freighter={freighter} stellarStreams={stellarStreams} />}
            {route === "reports"   && <CompliancePage stellarAddress={IS_STELLAR_MODE ? freighter.address : null} stellarStreams={IS_STELLAR_MODE ? stellarStreams : undefined} />}
            {route === "settings"  && <SettingsPage freighter={freighter} />}
          </RouteTransition>
          <div className="text-center text-[11px] font-mono text-white/30 pt-12 pb-12">
            Drip · {IS_STELLAR_MODE ? "Stellar Testnet" : PROTOCOL_STATS.clusterLabel} · {PROTOCOL_STATS.version} · made with love for the streaming economy
          </div>
        </main>
      </div>
      {cancelConfirm && (
        <CancelConfirmModal
          stream={cancelConfirm}
          onConfirm={handleCancelConfirmed}
          onClose={() => setCancelConfirm(null)}
        />
      )}
      <NewStreamDrawer
        open={drawer}
        onClose={() => { setDrawer(false); setTxStatus("idle"); setTxSig(null); setTxError(null); setDrawerPrefill(null); }}
        onCreate={handleCreate}
        walletConnected={connected}
        onConnectWallet={connectWallet}
        txStatus={txStatus}
        txSig={txSig}
        txError={txError}
        prefill={drawerPrefill}
      />
    </div>
  );
}







