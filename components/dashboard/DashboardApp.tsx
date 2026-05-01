"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDripWallet } from "@/lib/solana/useDripWallet";
import { useDripStreams } from "@/lib/solana/useDripStreams";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { createStream as createSolanaStream } from "@/lib/solana/stream";
import { generateStreamId } from "@/lib/solana/pda";
import { LAMPORTS_PER_SOL_NUM, SOLANA_CLUSTER, SOLANA_RPC_URL, DRIP_PROGRAM_ID, DRIP_PROGRAM_ID_CONFIGURED } from "@/lib/solana/constants";
import { getExplorerTxUrl } from "@/lib/solana/explorer";
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
  STREAM_FILTERS,
  STREAM_TOKEN_OPTIONS,
  TOP_UP_DEFAULT_AMOUNT,
  TOP_UP_PRESETS,
  USER_WALLET_PROFILE,
  YIELD_DEMO,
  createSeedStreams,
} from "@/lib/mock-data";

// Drip Dashboard â€” single-file React app with full routing
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

// Smooth ticker â€” runs on rAF, accumulates from a base + rate*elapsed.
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

// Solana avatar â€” deterministic pixel-blob from seed
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
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute -top-40 left-[40%] w-[900px] h-[600px] glow-orb opacity-50" />
      <div className="absolute top-[30%] right-[-10%] w-[400px] h-[400px] iri-orb rounded-full opacity-30 drift-slow" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 50% 0%, transparent 40%, rgba(0,0,0,0.7) 100%)" }} />
    </div>
  );
}

function DripMark({ size = 26 }: any) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(167,139,250,0.7), transparent 70%)", filter: "blur(6px)" }} />
      <svg viewBox="0 0 32 32" width={size} height={size} className="relative">
        <defs>
          <linearGradient id="dmg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0abfc" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
        </defs>
        <path d="M16 3 C 22 12, 26 17, 26 22 a 10 10 0 1 1 -20 0 C 6 17, 10 12, 16 3 Z" fill="url(#dmg)" />
        <path d="M13 18 C 13 22, 19 22, 19 18" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Sidebar({ active, onChange, streams }: any) {
  const items = DASHBOARD_NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.hasStreamBadge ? streams.filter((s) => s.status === "streaming").length : undefined,
  }));
  return (
    <aside className="hidden lg:flex flex-col w-[240px] shrink-0 border-r border-white/5 px-4 py-5 sticky top-0 h-screen">
      <a href="#" className="flex items-center gap-2.5 px-2 py-1">
        <DripMark />
        <span className="font-medium tracking-tight text-[16px]">Drip</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-violet-300/70 ml-1 px-1.5 py-0.5 rounded border border-violet-400/20">devnet</span>
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
        <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200/80 font-mono">Need fiat?</div>
          <div className="mt-1.5 text-[13px] text-white/85">Top up via MoonPay â€” card to USDC in 12s.</div>
          <button className="mt-3 w-full text-[12px] btn-ghost rounded-md py-1.5 hover:bg-violet-400/10 flex items-center justify-center gap-1.5">
            <Icon name="credit-card" size={12} /> On-ramp
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 px-2 text-[11px] font-mono text-white/35">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
          <span>{PROTOCOL_STATS.rpcStatus} Â· slot {PROTOCOL_STATS.rpcSlotShort}</span>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ route, onNewStream }: any) {
  const { connected, connecting, publicKeyString, connect, disconnect, providerName } = useDripWallet();
  const walletLabel = connected ? shortWalletAddress(publicKeyString) : connecting ? "Connecting..." : "Connect Wallet";
  const walletMeta = connected ? providerName ?? "Solana wallet" : "Solana signer";

  const handleWalletClick = () => {
    if (connected) {
      void disconnect?.();
      return;
    }

    void connect?.();
  };

  return (
    <div className="sticky top-0 z-30 backdrop-blur-md border-b border-white/5 bg-[#070612]/70">
      <div className="flex items-center gap-3 px-8 py-3.5">
        <div className="flex items-center gap-2.5 text-[13px] text-white/45 font-mono">
          <span>Drip</span>
          <Icon name="chevron-right" size={12} />
          <span className="text-white/85">{DASHBOARD_ROUTE_LABELS[route]}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-[12.5px] text-white/55 w-[260px]">
            <Icon name="search" size={13} />
            <span className="flex-1">Search streams, addresses, txnsâ€¦</span>
            <span className="font-mono text-[10px] text-white/35 px-1.5 rounded border border-white/10">âŒ˜K</span>
          </div>
          <button className="btn-ghost rounded-full w-9 h-9 flex items-center justify-center text-white/60 hover:text-white">
            <Icon name="bell" size={14} />
          </button>
          <button onClick={onNewStream} className="btn-primary rounded-full px-4 py-2 text-[13px] font-medium text-white flex items-center gap-1.5">
            <Icon name="plus" size={14} /> New stream
          </button>
          <button onClick={handleWalletClick} className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full border border-white/10 hover:border-violet-400/30 transition">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500" />
            <div className="text-left leading-tight">
              <div className="text-[12px] text-white">{walletLabel}</div>
              <div className="text-[10px] font-mono text-white/45">{walletMeta}</div>
            </div>
            <Icon name="chevron-down" size={12} className="text-white/40 ml-1" />
          </button>
        </div>
      </div>
    </div>
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
        <h1 className="mt-2 text-[34px] leading-[1.05] tracking-[-0.02em] font-medium text-iri">{title}</h1>
        {sub && <p className="mt-2 text-[14px] text-white/55 max-w-[600px] leading-[1.55]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function WalletDemoNotice({ error, onConnect }: any) {
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
function DashboardPage({ streams, onNewStream, onGoTo, walletConnected, walletError, onConnectWallet, onRequireWallet }: any) {
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
        eyebrow="01 â€” Overview"
        title={<>Your money, in motion.</>}
        sub="The Net Flow Engine settles your incoming and outgoing streams every Solana block. Everything below ticks live."
        right={
          <button onClick={onNewStream} className="btn-primary rounded-full px-5 py-3 text-[13.5px] font-medium text-white flex items-center gap-2">
            <Icon name="zap" size={14} /> Create new stream
          </button>
        }
      />

      {!walletConnected && <WalletDemoNotice error={walletError} onConnect={onConnectWallet} />}

      {/* Net Flow Engine */}
      <section className="grad-border glass-strong rounded-3xl p-1.5 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 iri-orb rounded-full opacity-50" />
        <div className="absolute -bottom-32 -left-24 w-72 h-72 glow-orb opacity-30" />
        <div className="rounded-[22px] bg-gradient-to-br from-[#100e26]/95 to-[#07060f] p-8 relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-violet-300/80">
                <Icon name="waves" size={13} /> Net flow engine Â· live
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[12.5px] text-emerald-300/90 font-mono">{PROTOCOL_STATS.finalityLabel}</span>
                <span className="text-white/25">Â·</span>
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
              <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40 font-mono">Streaming balance Â· USDC</div>
              <div className="mt-3 flex items-baseline gap-1 num-stable">
                <span className="text-white/40 text-[36px] font-num">$</span>
                <span className="text-iri text-[72px] font-num leading-[0.95] tracking-[-0.025em]">{whole}</span>
                <span className="text-iri text-[72px] font-num leading-[0.95] tracking-[-0.025em]">.</span>
                <span className="text-iri text-[72px] font-num leading-[0.95] tracking-[-0.025em]">{stableDec}</span>
                <span className="text-violet-300/90 text-[36px] font-num leading-[0.95] tracking-[-0.025em]">{fastDec}</span>
              </div>

              {/* Pulse indicator */}
              <div className="mt-5 flex items-center flex-wrap gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/10 text-emerald-300 text-[12.5px] font-mono">
                  <Icon name="arrow-down-left" size={12} />
                  + ${(inSum).toFixed(6)} / sec <span className="text-emerald-300/60 ml-1">incoming</span>
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-400/10 text-rose-300 text-[12.5px] font-mono">
                  <Icon name="arrow-up-right" size={12} />
                  âˆ’ ${(outSum).toFixed(6)} / sec <span className="text-rose-300/60 ml-1">outgoing</span>
                </span>
                <span className={`px-3 py-1.5 rounded-full text-[12.5px] font-mono border ${positive ? "border-emerald-400/30 text-emerald-300" : "border-rose-400/30 text-rose-300"}`}>
                  Net: {positive ? "+" : ""}{net.toFixed(6)} USDC/sec â‰ˆ {positive ? "+" : ""}${(net * 86400).toFixed(2)}/day
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
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
          value={`$${fmtUSD(totalStreamed, 6)}`}
          sub="lifetime Â· all directions"
          accent
        />
        <SummaryTile
          icon="waves"
          label="Active streams"
          value={`${activeCount}`}
          sub={`${streams.length - activeCount} paused/completed`}
          onClick={() => onGoTo("streams")}
        />
        <SummaryTile
          icon="sprout"
          label="Yield generated"
          value={`$${fmtUSD(yieldEarned, 6)}`}
          sub={`lifetime Â· Raydium ${PROTOCOL_STATS.yieldApy.toFixed(2)}% APY`}
          onClick={() => onGoTo("yield")}
        />
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
      <div className={`mt-2 font-num num-stable ${accent ? "text-iri text-[34px]" : "text-white text-[28px]"} leading-none tracking-[-0.02em]`}>{value}</div>
      <div className="mt-2 text-[12px] text-white/45">{sub}</div>
    </button>
  );
}

function MiniStreamRow({ stream }: any) {
  const running = stream.status === "streaming";
  // stream.base is already the current accumulated amount (pre-computed in createSeedStreams
  // or set to unlocked-at-refresh in useDripStreams). Passing it directly avoids
  // computing Date.now() during render, which caused SSR/client hydration mismatches.
  const value = useStreamingValue(stream.base, stream.rate, running);
  const isIn = stream.dir === "in";
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-4">
      <SolAvatar seed={stream.party} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] text-white truncate">{stream.party}</span>
          <StatusPill status={stream.status} mini />
        </div>
        <div className="text-[11px] font-mono text-white/40 truncate">{stream.label}</div>
      </div>
      <div className="text-right">
        <div className={`font-num num-stable text-[16px] ${isIn ? "text-emerald-300" : "text-rose-300"}`}>
          {isIn ? "+" : "âˆ’"}${fmtUSD(value, 4)}
        </div>
        <div className="text-[10.5px] font-mono text-white/40">{stream.rate.toFixed(6)} {stream.token}/s</div>
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
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-white/40 font-mono mb-2">Balance Â· last 24h</div>
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
function StreamsPage({ streams, setStreams, onNewStream, walletConnected, onRequireWallet, streamsLoading, streamsError, onRefresh }: any) {
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
        eyebrow="02 â€” Streams"
        title={<>Manage every drop.</>}
        sub="Pause, resume, cancel or top up any active stream. Counters tick in real time, settled every Solana block."
        right={
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
        }
      />

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
            <div className="text-[15px] text-white/60">No streams found</div>
            <div className="mt-1.5 text-[12.5px] font-mono text-white/35">
              {walletConnected ? "Create your first stream to get started." : "Connect a wallet to see your on-chain streams."}
            </div>
            {walletConnected && (
              <button onClick={onNewStream} className="mt-5 btn-primary rounded-full px-5 py-2.5 text-[13px] font-medium text-white inline-flex items-center gap-2">
                <Icon name="plus" size={13} /> New stream
              </button>
            )}
          </div>
        )}
        {visible.map((s) => (
          <StreamCard
            key={s.id}
            stream={s}
            walletConnected={walletConnected}
            onToggle={() => guardWallet("Connect a wallet before pausing or resuming a stream.", () => toggle(s.id))}
            onCancel={() => guardWallet("Connect a wallet before cancelling a stream.", () => cancel(s.id))}
            onTopUp={() => guardWallet("Connect a wallet before topping up a stream.", () => setTopUpId(s.id))}
          />
        ))}
      </div>

      {topUpId && (
        <TopUpModal
          stream={streams.find(s => s.id === topUpId)}
          onClose={() => setTopUpId(null)}
          onSubmit={(amt) => guardWallet("Connect a wallet before topping up a stream.", () => { topUp(topUpId, amt); setTopUpId(null); })}
        />
      )}
    </div>
  );
}

function StreamCard({ stream, walletConnected, onToggle, onCancel, onTopUp }: any) {
  const running = stream.status === "streaming";
  const accrued = useStreamingValue(stream.base, stream.rate, running);

  const isIn = stream.dir === "in";
  const isCompleted = stream.status === "completed";

  const valStr = fmtUSD(accrued, 6);
  const [whole, decimal] = valStr.split(".");
  const stableDec = decimal.slice(0, 2);
  const fastDec = decimal.slice(2);

  // progress = accrued / deposit
  const progress = Math.min(100, (accrued / stream.deposit) * 100);
  const remaining = Math.max(0, stream.deposit - accrued);
  const secondsLeft = stream.rate > 0 ? remaining / stream.rate : 0;

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
          <span className={`${isIn ? "text-emerald-300" : "text-rose-300"} text-[14px] font-num`}>{isIn ? "+" : "âˆ’"}</span>
          <span className="text-white/40 text-[16px] font-num">$</span>
          <span className="text-iri text-[26px] font-num leading-none tracking-[-0.02em]">{whole}</span>
          <span className="text-iri text-[26px] font-num leading-none tracking-[-0.02em]">.</span>
          <span className="text-iri text-[26px] font-num leading-none tracking-[-0.02em]">{stableDec}</span>
          <span className="text-violet-300/90 text-[14px] font-num leading-none tracking-[-0.02em]">{fastDec}</span>
          <span className="text-white/35 text-[11px] font-mono ml-1.5">{stream.token}</span>
        </div>
        <div className="text-[11px] text-white/40 font-mono mt-1.5">
          {isCompleted ? "stream finalized" : `${stream.rate.toFixed(6)} ${stream.token}/sec Â· $${(stream.rate * 86400).toFixed(2)}/day`}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10.5px] font-mono text-white/45 mb-1.5">
          <span>{progress.toFixed(1)}% of ${stream.deposit.toLocaleString()} deposit</span>
          {!isCompleted && stream.rate > 0 && (
            <span>{fmtDuration(secondsLeft)} remaining</span>
          )}
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

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-[10.5px] font-mono text-white/35">{stream.addr}</div>
        <div className="flex items-center gap-1">
          {!isCompleted && (
            <button
              onClick={onTopUp}
              className={`btn-ghost rounded-md h-8 px-2.5 flex items-center gap-1 text-white/75 hover:text-white text-[11px] ${!walletConnected ? "opacity-60" : ""}`}
              title={walletConnected ? "Top up deposit" : "Connect wallet to top up"}
            >
              <Icon name="plus" size={11} /> Top up
            </button>
          )}
          {!isCompleted && (
            <button
              onClick={onToggle}
              className={`btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/70 hover:text-white ${!walletConnected ? "opacity-60" : ""}`}
              title={walletConnected ? (running ? "Pause" : "Resume") : "Connect wallet to sign"}
            >
              <Icon name={running ? "pause" : "play"} size={12} />
            </button>
          )}
          {!isCompleted && (
            <button
              onClick={onCancel}
              className={`btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:border-rose-400/30 ${!walletConnected ? "opacity-60" : ""}`}
              title={walletConnected ? "Cancel" : "Connect wallet to cancel"}
            >
              <Icon name="x" size={12} />
            </button>
          )}
          <a href="#" className="btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/70 hover:text-white" title="View on Solscan">
            <Icon name="arrow-up-right" size={12} />
          </a>
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
        eyebrow="03 â€” Capital efficiency"
        title={<>Idle escrow, working overtime.</>}
        sub="Funds locked in your active stream contracts aren't sitting still. They're routed into Raydium concentrated liquidity vaults and re-balanced every Solana epoch."
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
                <span className="text-white/30">Â·</span>
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
        <YieldStat icon="lock" label="Total deposits in yield" value={`$${ESCROW.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} sub={`across ${streams.filter(s => s.status === "streaming").length} active escrow contracts`} />
        <YieldStat icon="trending-up" label="Current APY (avg)" value={`${APY.toFixed(2)}%`} sub="weighted across 3 pools" tone="up" />
        <YieldStat icon="repeat" label="Compounding cadence" value="Every epoch" sub="~2.5 days Â· zero downtime" />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl glass p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Pool allocation</div>
          <h3 className="mt-2 text-[18px] tracking-tight">Where your idle USDC lives.</h3>
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
            Audited by Sec3 Â· withdraw any time, no penalty
          </div>
        </div>
      </section>
    </div>
  );
}

function YieldStat({ icon, label, value, sub, tone }: any) {
  return (
    <div className="rounded-2xl glass p-6">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-violet-200">
          <Icon name={icon} size={17} />
        </div>
      </div>
      <div className="mt-5 text-[10.5px] uppercase tracking-[0.18em] text-white/40 font-mono">{label}</div>
      <div className={`mt-1.5 font-num num-stable text-[26px] leading-tight ${tone === "up" ? "text-emerald-300" : "text-white"}`}>{value}</div>
      <div className="mt-1 text-[12px] text-white/45">{sub}</div>
    </div>
  );
}

function PoolRow({ name, share, apy, tvl }: any) {
  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-white/85">{name}</span>
        <span className="font-mono text-white/55">{share}% Â· {apy}</span>
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
function HistoryPage() {
  const [filter, setFilter] = useState("all");
  const visible = HISTORY_DETAILED.filter(h => filter === "all" || h.kind === filter);
  const totalStreamed = HISTORY_DETAILED.reduce((a, h) => a + h.final, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="04 â€” Ledger"
        title={<>Every stream, on the record.</>}
        sub="A transparent, immutable log of all completed and cancelled streams. Each row links to Solscan."
        right={
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
        }
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <YieldStat icon="layers" label="Lifetime streamed" value={`$${totalStreamed.toFixed(2)}`} sub={`across ${HISTORY_DETAILED.length} closed streams`} tone="up" />
        <YieldStat icon="check-circle-2" label="Completed naturally" value={`${HISTORY_DETAILED.filter(h => h.kind === "ended").length}`} sub="ran to scheduled end" />
        <YieldStat icon="x-circle" label="Cancelled early" value={`${HISTORY_DETAILED.filter(h => h.kind === "cancelled").length}`} sub="terminated mid-stream" />
      </section>

      <section className="rounded-2xl glass overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-6 py-3 text-[10.5px] uppercase tracking-[0.16em] text-white/40 font-mono border-b border-white/5">
          <div className="col-span-1">Status</div>
          <div className="col-span-3">Counterparty</div>
          <div className="col-span-2 text-right">Final amount</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-2">Closed</div>
          <div className="col-span-2 text-right">Solscan</div>
        </div>
        {visible.map((h) => (
          <HistoryRow key={h.id} h={h} />
        ))}
        {visible.length === 0 && (
          <div className="px-6 py-12 text-center text-[13px] text-white/40 font-mono">No streams match this filter.</div>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ h }: any) {
  const ended = h.kind === "ended";
  return (
    <div className="grid grid-cols-12 gap-2 px-6 py-4 text-[13px] border-b border-white/5 hover:bg-white/[0.02] items-center">
      <div className="col-span-1">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-[0.16em] ${ended ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/5" : "border-amber-400/30 text-amber-300 bg-amber-400/5"}`}>
          {ended ? "Ended" : "Cancelled"}
        </span>
      </div>
      <div className="col-span-3 flex items-center gap-3 min-w-0">
        <SolAvatar seed={h.party} size={28} />
        <div className="min-w-0">
          <div className="text-white truncate">{h.party}</div>
          <div className="text-[10.5px] font-mono text-white/40">{h.id}</div>
        </div>
      </div>
      <div className="col-span-2 text-right font-num text-white">${fmtUSD(h.final, 2)} <span className="text-white/40 text-[11px]">{h.token}</span></div>
      <div className="col-span-2 text-white/65 font-mono text-[12px]">Streamed for {fmtDuration(h.duration)}</div>
      <div className="col-span-2 text-white/55 font-mono text-[12px]">{h.at}</div>
      <div className="col-span-2 text-right">
        <a href="#" className="inline-flex items-center gap-1 font-mono text-[11.5px] text-violet-300/80 hover:text-white">
          {h.tx} <Icon name="arrow-up-right" size={11} />
        </a>
      </div>
    </div>
  );
}

// =========================================================================
// AGENTS page
// =========================================================================
function AgentsPage() {
  const [log, setLog] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);

  // Generate live agent micro-payments
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
        eyebrow="05 â€” Agent Pay Â· 2026"
        title={<>The autonomous economy.</>}
        sub="Agents hire other agents and pay them per token of compute. Settlement happens at the speed of inference â€” sub-second, sub-cent."
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => setPaused(p => !p)} className="btn-ghost rounded-full px-4 py-2 text-[13px] text-white/85 flex items-center gap-2">
              <Icon name={paused ? "play" : "pause"} size={13} /> {paused ? "Resume" : "Pause"} mesh
            </button>
            <button className="btn-primary rounded-full px-4 py-2 text-[13px] font-medium text-white flex items-center gap-1.5">
              <Icon name="plus" size={13} /> Connect agent
            </button>
          </div>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <YieldStat icon="bot" label="Connected agents" value={`${AGENTS.length}`} sub={`${AGENTS.filter(a => a.status === "active").length} active`} />
        <YieldStat icon="zap" label="Combined rate" value={`${totalRate.toFixed(6)}/s`} sub="USDC across mesh" />
        <YieldStat icon="layers" label="Spent this session" value={`$${fmtUSD(totalSpent, 6)}`} sub="ticks live" tone="up" />
        <YieldStat icon="activity" label="Settlements" value={`${log.length * 24 + AGENT_LOG_DEMO.baseSettlements}`} sub="last hour" />
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

        {/* Live terminal log */}
        <div className="lg:col-span-7 rounded-2xl grad-border glass-strong p-1.5">
          <div className="rounded-[18px] bg-[#06051a] overflow-hidden h-full">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
              <span className="ml-3 font-mono text-[12px] text-white/55">drip-mesh@eli ~ live settlement log</span>
              <span className="ml-auto flex items-center gap-2 text-[10.5px] font-mono text-white/40">
                <span className={`w-1.5 h-1.5 rounded-full ${paused ? "bg-amber-400" : "bg-emerald-400 pulse-dot"}`} />
                {paused ? "PAUSED" : "TAILING"}
              </span>
            </div>
            <div className="font-mono text-[12px] p-4 h-[420px] overflow-hidden">
              {log.length === 0 && (
                <div className="text-white/40 text-[11.5px]">$ drip mesh tail --follow Â·Â·Â· waiting for settlements</div>
              )}
              {log.map((l, i) => (
                <div
                  key={l.id}
                  className="flex items-baseline gap-2 py-1 border-b border-white/[0.03]"
                  style={{ opacity: Math.max(0.25, 1 - i * 0.04) }}
                >
                  <span className="text-white/35">{l.time}</span>
                  <span className="text-violet-300">{l.agent}</span>
                  <span className="text-white/40">{l.verb}</span>
                  <span className="text-emerald-300">+{l.amt} USDC</span>
                  <span className="text-white/40">â†’</span>
                  <span className="text-cyan-300">{l.target}</span>
                  <span className="ml-auto text-white/35">{l.tokens} tok</span>
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
function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="06 â€” Settings"
        title={<>Workspace preferences.</>}
        sub="Your wallet, defaults, and security posture."
      />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl glass p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Identity</div>
          <div className="mt-4 flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500" />
            <div>
              <div className="text-[15px] text-white">{USER_WALLET_PROFILE.name}</div>
              <div className="text-[11.5px] font-mono text-white/45">{USER_WALLET_PROFILE.embeddedWalletLabel}</div>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <SettingRow label="Email" value={USER_WALLET_PROFILE.email} />
            <SettingRow label="Recovery" value={USER_WALLET_PROFILE.recovery} />
            <SettingRow label="2FA" value={USER_WALLET_PROFILE.twoFactor} tone="up" />
          </div>
        </div>

        <div className="rounded-2xl glass p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Defaults</div>
          <div className="mt-4 space-y-3">
            {SETTINGS_DEFAULTS.map((setting) => (
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
function NewStreamDrawer({ open, onClose, onCreate, walletConnected, onConnectWallet, txStatus = "idle", txSig, txError }: any) {
  const [recipient, setRecipient] = useState(NEW_STREAM_DEFAULTS.recipient);
  const [token, setToken] = useState("SOL");
  const [amount, setAmount] = useState(0.1);
  const [period, setPeriod] = useState(NEW_STREAM_DEFAULTS.period);
  const [label, setLabel] = useState(NEW_STREAM_DEFAULTS.label);
  const [deposit, setDeposit] = useState(1.0);
  const [policy, setPolicy] = useState(NEW_STREAM_DEFAULTS.policy);
  const [budgetCap, setBudgetCap] = useState(0.5);
  const [autoRevoke, setAutoRevoke] = useState(NEW_STREAM_DEFAULTS.autoRevoke);
  const [category, setCategory] = useState("OTHER");
  const [expirationEnabled, setExpirationEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  const periodSec = NEW_STREAM_DEFAULTS.periodSeconds[period] ?? 86400;
  const perSec = amount / periodSec;
  const perDay = perSec * 86400;
  const perHour = perSec * 3600;
  const perMin = perSec * 60;

  const recipientOk = recipient.trim().length > 3;
  const formValid = recipientOk && amount > 0 && deposit > 0;
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
            <Field label="Recipient" hint="Wallet address or .sol name">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-violet-400/40 transition">
                <Icon name="at-sign" size={14} className="text-white/45" />
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={NEW_STREAM_DEFAULTS.recipientPlaceholder}
                  className="flex-1 bg-transparent outline-none text-[14px] font-mono text-white placeholder-white/25"
                />
                {recipientOk && <Icon name="check-circle-2" size={14} className="text-emerald-300" />}
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {NEW_STREAM_DEFAULTS.quickRecipients.map((s) => (
                  <button key={s} onClick={() => setRecipient(s)} className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-white/55 hover:text-white hover:border-violet-400/30">
                    {s}
                  </button>
                ))}
              </div>
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
                    <div className="text-[10.5px] uppercase tracking-[0.18em] text-violet-200/80 font-mono mb-1.5">Max Budget Cap (SOL)</div>
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
                <span className="ml-auto text-[11px] font-mono text-white/40">Native SOL only</span>
              </div>
            </Field>

            {/* Smart Rate Converter */}
            <Field label="Smart rate converter" hint="SOL amount per period.">
              <div className="flex items-stretch gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-violet-400/40 transition">
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
                <div className="flex items-center px-1 rounded-xl bg-white/[0.03] border border-white/8">
                  {["hour", "day", "week", "month"].map((p) => (
                    <button key={p} onClick={() => setPeriod(p)} className={`px-2.5 py-1.5 text-[11.5px] font-mono uppercase rounded-lg transition ${period === p ? "bg-violet-400/15 text-violet-200" : "text-white/55 hover:text-white"}`}>
                      / {p.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <div className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4">
              <div className="text-[10.5px] uppercase tracking-[0.18em] text-violet-200/80 font-mono">Auto-converted flow rate</div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <BreakdownCell label="/sec"  value={`◎${perSec.toFixed(7)}`} accent />
                <BreakdownCell label="/min"  value={`◎${perMin.toFixed(4)}`} />
                <BreakdownCell label="/hr"   value={`◎${perHour.toFixed(2)}`} />
                <BreakdownCell label="/day"  value={`◎${perDay.toFixed(2)}`} />
              </div>
              <div className="mt-3 text-[11.5px] font-mono text-white/45">
                Settles every <span className="text-violet-200">{PROTOCOL_STATS.blockTime}</span> on Solana Â· receiver can withdraw mid-stream
              </div>
            </div>

            <Field label="Initial deposit (SOL)" hint="How much SOL to lock in escrow">
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
            </Field>

            <Field label="Memo" hint="Optional Â· visible on-chain">
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
                <option value="AI_COMPUTE">AI Compute</option>
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

            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-violet-400/20 flex items-center justify-center text-emerald-300">
                <Icon name="sprout" size={16} />
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] text-white">Route idle escrow to Raydium</div>
                <div className="text-[11.5px] font-mono text-white/40 mt-0.5">+{PROTOCOL_STATS.yieldApy.toFixed(2)}% APY Â· withdrawn alongside stream</div>
              </div>
              <Toggle defaultOn />
            </div>
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
  return (
    <div className={`rounded-lg px-3 py-2 border ${accent ? "border-violet-400/40 bg-violet-400/10" : "border-white/8 bg-white/[0.03]"}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-mono">{label}</div>
      <div className={`mt-1 font-num num-stable ${accent ? "text-iri text-[14px]" : "text-white/85 text-[13px]"}`}>{value}</div>
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
  const { connected, connect, wallet, publicKey, error: walletError } = useDripWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) setWalletPrompt(null);
  }, [connected]);

  const requireWallet = useCallback(
    (message = "Connect a wallet before signing this transaction.") => {
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

  const openNewStream = useCallback(() => {
    if (!requireWallet("Connect a wallet before creating a stream.")) return;
    setTxStatus("idle");
    setTxSig(null);
    setTxError(null);
    setDrawer(true);
  }, [requireWallet]);

  const handleRouteChange = (nextRoute) => {
    if (nextRoute === "reports") {
      router.push("/compliance");
      return;
    }
    setRoute(nextRoute);
  };

  const handleCreate = async (data) => {
    if (!requireWallet("Connect a wallet before creating a stream.")) return;
    if (!wallet) return;

    if (!DRIP_PROGRAM_ID_CONFIGURED) {
      setTxStatus("error");
      setTxError("DRIP program ID is not configured. Set NEXT_PUBLIC_DRIP_PROGRAM_ID in .env.local.");
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
    const depositLamports = new BN(Math.floor(data.deposit * L));
    const flowRate = new BN(Math.max(1, Math.floor(data.perSec * L)));
    const maxBudget = data.policy === "agent" && data.budgetCap > 0
      ? new BN(Math.floor(data.budgetCap * L))
      : new BN(0);

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

  return (
    <div className="min-h-screen relative flex">
      <Backdrop />
      <Sidebar active={route} onChange={handleRouteChange} streams={streams} />
      <div className="flex-1 min-w-0">
        <Topbar route={route} onNewStream={openNewStream} />
        <main className="px-8 py-7 max-w-[1480px]">
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
            {route === "dashboard" && <DashboardPage streams={streams} onNewStream={openNewStream} onGoTo={setRoute} walletConnected={connected} walletError={walletError} onConnectWallet={connectWallet} onRequireWallet={requireWallet} />}
            {route === "streams"   && <StreamsPage   streams={streams} setStreams={setStreams} onNewStream={openNewStream} walletConnected={connected} onRequireWallet={requireWallet} streamsLoading={streamsLoading} streamsError={streamsError} onRefresh={refreshStreams} />}
            {route === "yield"     && <YieldPage     streams={streams} walletConnected={connected} onRequireWallet={requireWallet} />}
            {route === "history"   && <HistoryPage />}
            {route === "agents"    && <AgentsPage />}
            
            {route === "settings"  && <SettingsPage />}
          </RouteTransition>
          <div className="text-center text-[11px] font-mono text-white/30 pt-12 pb-12">
            Drip Â· {PROTOCOL_STATS.clusterLabel} Â· {PROTOCOL_STATS.version} Â· made with â—‡ for the streaming economy
          </div>
        </main>
      </div>
      <NewStreamDrawer
        open={drawer}
        onClose={() => { setDrawer(false); setTxStatus("idle"); setTxSig(null); setTxError(null); }}
        onCreate={handleCreate}
        walletConnected={connected}
        onConnectWallet={connectWallet}
        txStatus={txStatus}
        txSig={txSig}
        txError={txError}
      />
    </div>
  );
}







