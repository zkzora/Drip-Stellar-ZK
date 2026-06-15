"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GlowCard } from "@/components/ui/spotlight-card";
import { Icon } from "@/components/ui/Icon";
import Waitlist from "@/components/landing/Waitlist";
import { AnimatedGridBackground } from "@/components/ui/backgrounds";
import {
  CALCULATOR_DEMO,
  DEV_CODE_SAMPLE,
  DEV_FEATURES,
  DRIP_COMPARE_PANELS,
  DRIP_PILLARS,
  ECOSYSTEM_PARTNERS,
  FINAL_CTA_STATS,
  FOOTER_LINK_GROUPS,
  FOOTER_SOCIALS,
  LANDING_AGENT_DEMO,
  LANDING_NAV_LINKS,
  LANDING_PARTNERS,
  LANDING_PROTOCOL_STATS,
  LANDING_STREAMING_CARD,
  LANDING_USE_CASES,
  PROTOCOL_STATS,
  STELLAR_DEV_CODE_SAMPLE,
  STELLAR_DEV_FEATURES,
  STELLAR_DRIP_COMPARE_PANELS,
  STELLAR_DRIP_PILLARS,
  STELLAR_ECOSYSTEM_PARTNERS,
  STELLAR_FINAL_CTA_STATS,
  STELLAR_LANDING_AGENT_DEMO,
  STELLAR_LANDING_PARTNERS,
  STELLAR_LANDING_PROTOCOL_STATS,
  STELLAR_LANDING_STREAMING_CARD,
  STELLAR_LANDING_USE_CASES,
  STELLAR_PROTOCOL_STATS,
  STELLAR_WORKFORCE_DEMO,
  SUBSCRIPTION_DEMO,
  WORKFORCE_DEMO,
} from "@/lib/mock-data";
import { IS_STELLAR_MODE } from "@/lib/app-config";

// Drip  -  Streaming payments on Solana
// Single-file React app rendered into #root.

// --- Tiny utilities --------------------------------------------------------
const fmtUSD = (n, frac = 6) => {
  const [w, d = ""] = n.toFixed(frac).split(".");
  return w.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac ? "." + d : "");
};
const truncAddr = (a) => `${a.slice(0, 4)}...${a.slice(-4)}`;

// --- Live counter hook -----------------------------------------------------
// Throttled to 150ms intervals (not rAF) to avoid overheating mobile CPUs.
// Also pauses when the page is hidden (visibilitychange).
function useStreamingValue(initial, ratePerSec, running = true) {
  const [v, setV] = useState(initial);
  const startRef = useRef({ t: performance.now(), base: initial });
  useEffect(() => {
    startRef.current = { t: performance.now(), base: v };
    // eslint-disable-next-line
  }, [ratePerSec, running]);
  useEffect(() => {
    if (!running) return;
    let id: ReturnType<typeof setInterval>;
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      const elapsed = (performance.now() - startRef.current.t) / 1000;
      setV(startRef.current.base + elapsed * ratePerSec);
    };
    id = setInterval(tick, 150);
    return () => clearInterval(id);
  }, [ratePerSec, running]);
  return v;
}

// ── useInView hook ────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Particles (8 only, no boxShadow, GPU-composited) ──────────────────────
const PARTICLES = [
  { l: "7%", t: "11%", s: 1.5, d: "7s", e: "0s", c: "#A07FF8" },
  { l: "37%", t: "6%", s: 2, d: "8s", e: "0.5s", c: "#22D3EE" },
  { l: "68%", t: "33%", s: 1, d: "9s", e: "0.8s", c: "#22D3EE" },
  { l: "83%", t: "13%", s: 2, d: "14s", e: "1.8s", c: "#A07FF8" },
  { l: "29%", t: "74%", s: 1, d: "7s", e: "2.5s", c: "#22D3EE" },
  { l: "63%", t: "69%", s: 1, d: "13s", e: "4.0s", c: "#A07FF8" },
  { l: "90%", t: "44%", s: 1, d: "15s", e: "5.0s", c: "#A07FF8" },
  { l: "17%", t: "43%", s: 1, d: "8s", e: "0.2s", c: "#22D3EE" },
];

function BackdropParticles() {
  return (
    <>
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.l, top: p.t,
            width: `${p.s}px`, height: `${p.s}px`,
            background: p.c,
            willChange: "transform, opacity",
            animation: `twinkle ${p.d} ease-in-out infinite ${p.e}`,
          }}
        />
      ))}
    </>
  );
}

function BackdropStreaks() {
  return (
    <>
      {[
        { top: "19%", w: "190px", h: "1.5px", col: "rgba(160,127,248,0.7)", dur: "10s", del: "0s" },
        { top: "71%", w: "95px", h: "0.8px", col: "rgba(182,154,255,0.4)", dur: "23s", del: "9s" },
      ].map((s, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: s.top, left: 0,
            width: s.w, height: s.h,
            background: `linear-gradient(90deg, transparent, ${s.col}, transparent)`,
            willChange: "transform",
            animation: `lightStreak ${s.dur} linear infinite ${s.del}`,
          }}
        />
      ))}
    </>
  );
}

function BackdropStreamLines() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 w-full h-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <linearGradient id="sgA" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#8144EE" stopOpacity="0" />
          <stop offset="30%" stopColor="#A07FF8" stopOpacity="0.32" />
          <stop offset="70%" stopColor="#B69AFF" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sgB" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0" />
          <stop offset="45%" stopColor="#22D3EE" stopOpacity="0.18" />
          <stop offset="90%" stopColor="#A07FF8" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#8144EE" stopOpacity="0" />
        </linearGradient>
        <filter id="sfg">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Primary stream — sweeps through hero zone */}
      <path
        d="M -200 280 C 200 220, 480 360, 780 270 S 1160 140, 1700 290"
        stroke="url(#sgA)" strokeWidth="1.5" strokeDasharray="10 20"
        filter="url(#sfg)"
        style={{ animation: "streamFlow 16s linear infinite" }}
      />
      {/* Mid stream */}
      <path
        d="M -100 500 C 300 430, 600 560, 960 470 S 1320 360, 1750 480"
        stroke="url(#sgB)" strokeWidth="1" strokeDasharray="6 24"
        style={{ animation: "streamFlow 24s linear infinite reverse" }}
      />
      {/* Lower accent */}
      <path
        d="M 300 720 C 580 670, 860 750, 1160 690 S 1460 630, 1700 710"
        stroke="url(#sgA)" strokeWidth="0.7" strokeDasharray="4 30"
        opacity="0.4"
        style={{ animation: "streamFlow 32s linear infinite" }}
      />
    </svg>
  );
}

// =========================================================================
// Atmospheric background - Enhanced with 21st.dev inspiration
// =========================================================================
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Enhanced grid with multiple gradients */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(167,139,250,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(167,139,250,0.08) 1px, transparent 1px),
            radial-gradient(circle 900px at 100% 200px, rgba(213,197,255,0.15), transparent),
            radial-gradient(circle 700px at 0% 400px, rgba(167,139,250,0.12), transparent),
            radial-gradient(circle 800px at 50% 100%, rgba(103,232,249,0.10), transparent)
          `,
          backgroundSize: "96px 64px, 96px 64px, 100% 100%, 100% 100%, 100% 100%",
        }}
      />

      {/* Complex multiplier pattern overlay */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, rgba(167,139,250,0.04) 0, rgba(167,139,250,0.04) 1px, transparent 1px, transparent 20px),
            repeating-linear-gradient(-45deg, rgba(217,70,239,0.04) 0, rgba(217,70,239,0.04) 1px, transparent 1px, transparent 30px)
          `,
          backgroundSize: "40px 40px, 60px 60px",
        }}
      />

      <div className="absolute inset-0 bg-noise" />

      {/* Aurora orbs — pure CSS animation, no JS scroll listener */}
      <div className="absolute -top-40 left-1/2 w-[1100px] h-[700px] glow-orb opacity-75 aurora-1" style={{ willChange: "transform" }} />
      <div className="absolute top-[8%] right-[10%] w-[480px] h-[480px] iri-orb rounded-full opacity-40 aurora-2" style={{ willChange: "transform" }} />
      <div className="absolute top-[40%] left-[-6%] w-[400px] h-[400px] iri-orb rounded-full opacity-24 aurora-3" style={{ willChange: "transform" }} />
      <div className="absolute bottom-[-80px] right-[18%] w-[320px] h-[320px] glow-orb opacity-[0.16] aurora-2" style={{ willChange: "transform" }} />
      <div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[400px] glow-orb opacity-25" />

      {/* Flowing stream lines */}
      <BackdropStreamLines />

      {/* Diagonal light streaks */}
      <BackdropStreaks />

      {/* Sparse floating particles */}
      <BackdropParticles />

      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 50% 0%, transparent 40%, rgba(0,0,0,0.7) 100%)" }} />
    </div>
  );
}

// =========================================================================
// Nav
// =========================================================================
const NAV_LINKS = [
  { label: "Protocol", href: "#why-drip" },
  { label: "Use cases", href: "#use-cases" },
  { label: "Developers", href: "#developers" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Docs", href: "/docs" },
];

function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-[1240px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <a href="#" className="flex items-center gap-2.5 group">
            <DripMark />
            <span className="font-medium tracking-tight text-[17px]">Drip</span>
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300/70 ml-1 px-1.5 py-0.5 rounded border border-violet-400/20">
              {PROTOCOL_STATS.version} · {IS_STELLAR_MODE ? "testnet" : "devnet"}
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="text-[13.5px] text-white/60 hover:text-white px-3 py-1.5 rounded-md transition">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a href="/dashboard" className="hidden md:flex btn-ghost rounded-full px-4 py-2 text-[13px] text-white/85 hover:text-white items-center">
            Sign in
          </a>
          <a href="/dashboard" className="btn-primary rounded-full px-4 py-2 text-[13px] font-medium text-white flex items-center gap-1.5">
            Launch app <Icon name="arrow-up-right" size={14} />
          </a>
          <button
            className="md:hidden w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <Icon name={mobileOpen ? "x" : "menu"} size={16} />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#07060f]/95 backdrop-blur-md px-6 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-[14px] text-white/70 hover:text-white py-2.5 border-b border-white/5 last:border-0"
            >
              {link.label}
            </a>
          ))}
          <a href="/dashboard" className="flex items-center gap-2 text-[14px] text-white/70 hover:text-white py-2.5">
            <Icon name="arrow-up-right" size={15} /> Sign in to app
          </a>
        </div>
      )}
    </header>
  );
}

function DripMark({ size = 28 }: any) {
  return <img src="/logo.png" width={size} height={size} alt="Drip" style={{ display: "inline-block" }} />;
}

// =========================================================================
// Hero
// =========================================================================
function Hero() {
  return (
    <section className={`relative ${IS_STELLAR_MODE ? "pt-24 pb-44" : "pt-16 pb-28"}`}>
      <div className="max-w-[1240px] mx-auto px-6 grid lg:grid-cols-12 gap-10 items-start">
        <div className={`lg:col-span-7 ${IS_STELLAR_MODE ? "pt-14" : "pt-8"}`}>

          {/* Badge */}
          <div className="anim-fade-down delay-0 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/5 px-3 py-1.5 text-[12px] text-violet-200/90 mb-7">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-violet-300 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-300" />
            </span>
            <span className="font-mono uppercase tracking-[0.16em]">
              {IS_STELLAR_MODE ? "Now live on Stellar Testnet · Stellar Hacks 2026" : "Now live on Solana devnet · 2026 cohort"}
            </span>
          </div>

          {/* Headline */}
          <h1 className={`anim-fade-up delay-80 ${IS_STELLAR_MODE ? "text-[42px] sm:text-[58px] lg:text-[76px]" : "text-[38px] sm:text-[52px] lg:text-[68px]"} leading-[1.02] font-medium tracking-[-0.025em] text-iri-anim`}>
            {IS_STELLAR_MODE ? (
              <>Programmable<br />XLM Payment<br />Streams.</>
            ) : (
              <>Programmable Cashflow<br />for AI Agents.</>
            )}
          </h1>

          {/* Subtitle */}
          <p className="anim-fade-up delay-160 mt-6 text-[15px] sm:text-[18.5px] text-white/65 leading-[1.55] max-w-[580px]">
            {IS_STELLAR_MODE
              ? "Create, pause, resume, withdraw, and cancel XLM streams on Stellar Testnet using Soroban and Freighter. Trustless, per-second, no bridge required."
              : "Drip is the first streaming payment protocol built for the autonomous agent economy. Set spending policies, stream funds per-second, and automate compliance on Solana."}
          </p>

          {/* CTAs */}
          <div className="anim-fade-up delay-240 mt-9 flex flex-wrap items-center gap-3">
            <a href="/dashboard" className="btn-primary rounded-full px-5 py-3 text-[14px] font-medium text-white flex items-center gap-2">
              <Icon name="zap" size={15} /> {IS_STELLAR_MODE ? "Launch Stellar Testnet App" : "Launch App"}
            </a>
            {IS_STELLAR_MODE ? (
              <a href="/docs" className="btn-ghost rounded-full px-5 py-3 text-[14px] text-white/90 flex items-center gap-2">
                <Icon name="book-open" size={15} /> Read the docs
              </a>
            ) : (
              <button className="btn-ghost rounded-full px-5 py-3 text-[14px] text-white/90 flex items-center gap-2">
                <Icon name="terminal" size={15} /> Build on Drip
              </button>
            )}
            <a href="#why-drip" className="text-[13.5px] text-white/55 hover:text-white px-2 py-2 flex items-center gap-1.5">
              Learn more <Icon name="arrow-right" size={13} />
            </a>
          </div>

          {/* Stats strip */}
          <div className="anim-fade-up delay-320 mt-10 grid grid-cols-3 gap-4 sm:gap-6 max-w-[520px]">
            {(IS_STELLAR_MODE ? STELLAR_LANDING_PROTOCOL_STATS : LANDING_PROTOCOL_STATS).map((stat) => (
              <Stat key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
            ))}
          </div>
        </div>

        {/* Streaming card */}
        <div className="hidden lg:block lg:col-span-5 lg:pl-4 anim-fade-left delay-400">
          <StreamingCard />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: any) {
  return (
    <div className="border-l border-violet-400/20 pl-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-mono">{label}</div>
      <div className="mt-1.5 text-[18px] sm:text-[22px] font-num text-white">{value}</div>
      <div className="text-[11px] text-white/40 mt-0.5">{hint}</div>
    </div>
  );
}

// =========================================================================
// Streaming Card  -  the WOW component
// =========================================================================
function StreamingCard() {
  const [running, setRunning] = useState(true);
  const CARD = IS_STELLAR_MODE ? STELLAR_LANDING_STREAMING_CARD : LANDING_STREAMING_CARD;
  const RATE = CARD.rate;
  const value = useStreamingValue(CARD.initialValue, RATE, running);

  const startedAt = useMemo(() => Date.now() - CARD.startedOffsetMs, []);
  const elapsedSec = Math.floor((Date.now() - startedAt) / 1000) + Math.floor((value - CARD.initialValue) / RATE);
  const fmtElapsed = (s) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  };

  const valStr = fmtUSD(value, 6);
  const [whole, decimal] = valStr.split(".");
  const stableDec = decimal.slice(0, 2);
  const fastDec = decimal.slice(2);

  return (
    <div className="grad-border rounded-3xl glass-strong p-1.5 shadow-[0_30px_120px_-30px_rgba(139,92,246,0.5)]">
      <div className={`rounded-[20px] bg-gradient-to-b from-[#100e26]/90 to-[#07060f]/95 ${IS_STELLAR_MODE ? "p-8" : "p-6"} relative overflow-hidden`}>
        {/* corner glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 iri-orb rounded-full opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 glow-orb opacity-30" />

        {/* Header */}
        <div className="flex items-start justify-between relative">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-white/45">
              <Icon name="waves" size={13} /> Active stream · {CARD.activeStreamId}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[12.5px] text-emerald-300/90 font-mono">STREAMING</span>
              <span className="text-white/25">·</span>
              <span className="text-[12.5px] text-white/55 font-num">{fmtElapsed(elapsedSec)}</span>
            </div>
          </div>
          <button
            onClick={() => setRunning((r) => !r)}
            className="w-8 h-8 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-white/60 hover:text-white transition"
            title={running ? "Pause" : "Resume"}
          >
            <Icon name={running ? "pause" : "play"} size={13} />
          </button>
        </div>

        {/* Counter */}
        <div className="mt-7">
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40 font-mono">Received · {CARD.token}</div>
          <div className="mt-3 flex items-baseline gap-1 num-stable">
            {IS_STELLAR_MODE
              ? <img src="/stellar-logo.png" alt="XLM" className="w-8 h-8 opacity-50 self-center mb-1" />
              : <span className="text-white/40 text-[34px] font-num">◎</span>
            }
            <span className="text-iri text-[58px] font-num leading-none tracking-[-0.02em]">{whole}</span>
            <span className="text-iri text-[58px] font-num leading-none tracking-[-0.02em]">.</span>
            <span className="text-iri text-[58px] font-num leading-none tracking-[-0.02em]">{stableDec}</span>
            <span className="text-violet-300/90 text-[34px] font-num leading-none tracking-[-0.02em]">{fastDec}</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-white/40 font-mono">
            <Icon name="trending-up" size={12} className="text-emerald-300/80" />
            <span className="text-emerald-300/80">+{(RATE).toFixed(6)} {CARD.token}/sec (demo)</span>
            <span>·</span>
            <span>= {(RATE * 86400).toFixed(4)} {CARD.token}/day</span>
          </div>
        </div>

        {/* Flow visualization */}
        <div className="mt-7">
          <FlowGraphic />
        </div>

        {/* Routing details */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-[12px]">
          <DetailRow label="From">
            <span className="font-num text-white/85">{truncAddr(CARD.fromAddress)}</span>
            <span className="ml-1.5 text-white/35">({CARD.fromLabel})</span>
          </DetailRow>
          <DetailRow label="To">
            <span className="font-num text-white/85">{truncAddr(CARD.toAddress)}</span>
            <span className="ml-1.5 text-white/35">({CARD.toLabel})</span>
          </DetailRow>
          <DetailRow label="Token">
            <span className="text-white/85">{CARD.token}</span>
            <span className="ml-1.5 text-white/35">{CARD.tokenKind}</span>
          </DetailRow>
          {IS_STELLAR_MODE ? (
            <DetailRow label="ZK Privacy">
              <span className="text-white/85">Drip Private</span>
              <span className="ml-1.5 text-violet-300/60 text-[9.5px] font-mono uppercase tracking-[0.14em]">UltraHonk</span>
            </DetailRow>
          ) : (
            <DetailRow label="Yield (roadmap)">
              <span className="text-white/35 line-through">{PROTOCOL_STATS.yieldApy.toFixed(2)}% APY</span>
              <span className="ml-2 text-[9.5px] font-mono text-amber-300/60 uppercase tracking-[0.14em]">coming soon</span>
            </DetailRow>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2 pt-4 border-t border-white/5 text-[11px] text-white/40 font-mono">
          <Icon name="shield-check" size={12} className="text-violet-300" />
          <span>
            {IS_STELLAR_MODE
              ? "Testnet only · native XLM · Soroban contract · Freighter required"
              : "Vision preview · Native SOL MVP on devnet"}
          </span>
          <span className="ml-auto">tx {truncAddr(CARD.txHash)}</span>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: any) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/35 font-mono">{label}</div>
      <div className="mt-1 text-[13px] flex items-center">{children}</div>
    </div>
  );
}

function FlowGraphic() {
  return (
    <svg viewBox="0 0 360 56" className="w-full h-14">
      <defs>
        <linearGradient id="flowG" x1="0" x2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#67e8f9" />
        </linearGradient>
        <radialGradient id="nodeG">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#5b21b6" />
        </radialGradient>
      </defs>
      {/* nodes */}
      <circle cx="22" cy="28" r="14" fill="url(#nodeG)" stroke="rgba(255,255,255,0.2)" />
      <text x="22" y="32" fontSize="12" textAnchor="middle" fill="white" fontFamily="JetBrains Mono">P</text>
      <circle cx="338" cy="28" r="14" fill="url(#nodeG)" stroke="rgba(255,255,255,0.2)" />
      <text x="338" y="32" fontSize="12" textAnchor="middle" fill="white" fontFamily="JetBrains Mono">R</text>
      {/* base line */}
      <line x1="40" y1="28" x2="320" y2="28" stroke="rgba(167,139,250,0.15)" strokeWidth="1" />
      {/* animated flow */}
      <line x1="40" y1="28" x2="320" y2="28" stroke="url(#flowG)" strokeWidth="2" className="flow-dash" />
      {/* moving particles */}
      <circle r="3" fill="#f0abfc">
        <animateMotion dur="3s" repeatCount="indefinite" path="M 40 28 L 320 28" />
      </circle>
      <circle r="2" fill="#67e8f9">
        <animateMotion dur="3s" begin="1s" repeatCount="indefinite" path="M 40 28 L 320 28" />
      </circle>
      <circle r="2.5" fill="#a78bfa">
        <animateMotion dur="3s" begin="2s" repeatCount="indefinite" path="M 40 28 L 320 28" />
      </circle>
    </svg>
  );
}

// =========================================================================
// Marquee / Logos strip
// =========================================================================
function PartnersStrip() {
  const { ref, visible } = useInView(0.1);
  return (
    <section ref={ref} className="border-y border-white/5 py-7 mt-2">
      <div className={`max-w-[1240px] mx-auto px-6 flex items-center gap-10 flex-wrap reveal ${visible ? "in-view" : ""}`}>
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/35 font-mono">Built with</div>
        <div className={`flex items-center gap-9 flex-wrap stagger-children ${visible ? "in-view" : ""}`}>
          {(IS_STELLAR_MODE ? STELLAR_LANDING_PARTNERS : LANDING_PARTNERS).map((it) => (
            <span key={it} className="reveal text-white/45 hover:text-white/80 transition text-[15px] font-medium tracking-tight">
              {it}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// =========================================================================
// Why Drip  -  old vs new + 3 pillars
// =========================================================================
function WhyDrip() {
  const header = useInView(0.1);
  const panels = useInView(0.1);
  const pillars = useInView(0.1);
  return (
    <section id="why-drip" className="relative py-16 sm:py-28">
      {/* Subtle data-grid ornament */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.022]" style={{ backgroundSize: "28px 28px" }} />
      </div>
      <div className="max-w-[1240px] mx-auto px-6">
        <div ref={header.ref} className={`reveal ${header.visible ? "in-view" : ""}`}>
          <SectionHeader
            eyebrow="01  -  Why Drip"
            title={<>Salary is paid monthly.<br /><span className="text-white/40">Value is created by the second.</span></>}
            sub={IS_STELLAR_MODE
              ? "The lump-sum payment model is a relic of paper checks. Drip fixes the temporal mismatch between work and XLM on Stellar Testnet."
              : "The lump-sum payment model is a relic of paper checks. Drip fixes the temporal mismatch between work and money."}
          />
        </div>

        <div ref={panels.ref} className={`mt-14 grid lg:grid-cols-2 gap-5 stagger-children ${panels.visible ? "in-view" : ""}`}>
          {(IS_STELLAR_MODE ? STELLAR_DRIP_COMPARE_PANELS : DRIP_COMPARE_PANELS).map((panel) => (
            <div key={panel.kind} className="reveal">
              <ComparePanel {...panel} />
            </div>
          ))}
        </div>

        {/* 3 Pillars */}
        <div className="mt-20">
          <div ref={pillars.ref} className={`flex items-end justify-between mb-7 reveal ${pillars.visible ? "in-view" : ""}`}>
            <h3 className="text-[28px] tracking-tight font-medium">Three pillars holding it up.</h3>
            <a href="#" className="text-[13px] text-white/55 hover:text-white flex items-center gap-1">Read the litepaper <Icon name="arrow-up-right" size={13} /></a>
          </div>
          <div className={`grid md:grid-cols-3 gap-5 stagger-children ${pillars.visible ? "in-view" : ""}`}>
            {(IS_STELLAR_MODE ? STELLAR_DRIP_PILLARS : DRIP_PILLARS).map((pillar) => (
              <div key={pillar.title} className="reveal">
                <Pillar {...pillar} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparePanel({ kind, title, label, timeline, footer }: any) {
  const isNew = kind === "new";
  return (
    <div className={`relative rounded-3xl p-7 overflow-hidden ${isNew ? "grad-border glass-strong" : "glass border-white/5"}`}>
      {isNew && <div className="absolute -top-20 -right-20 w-60 h-60 iri-orb rounded-full opacity-50" />}
      <div className="flex items-center justify-between relative">
        <div>
          <div className={`text-[10.5px] font-mono uppercase tracking-[0.2em] ${isNew ? "text-violet-200/80" : "text-white/35"}`}>{label}</div>
          <div className={`mt-2 text-[26px] font-medium tracking-tight ${isNew ? "text-iri" : "text-white/85"}`}>{title}</div>
        </div>
        <div className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${isNew ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/5" : "border-white/10 text-white/45"}`}>
          {isNew ? "ACTIVE" : "LEGACY"}
        </div>
      </div>

      <ol className="mt-7 space-y-3.5 relative">
        <span className={`absolute left-[7px] top-2 bottom-2 w-px ${isNew ? "bg-gradient-to-b from-violet-400/60 via-fuchsia-400/30 to-cyan-400/40" : "bg-white/10"}`} />
        {timeline.map((row, i) => (
          <li key={i} className="flex items-start gap-4 relative">
            <span className={`mt-1.5 w-3.5 h-3.5 rounded-full border ${isNew ? "bg-violet-400 border-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.6)]" : "bg-ink-700 border-white/15"}`} />
            <div className="flex-1 flex items-baseline gap-3">
              <span className={`font-mono text-[12px] ${isNew ? "text-violet-200/90" : "text-white/40"} w-[100px]`}>{row.d}</span>
              <span className={`text-[13.5px] ${isNew ? "text-white/85" : "text-white/55"}`}>{row.e}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className={`mt-7 pt-5 border-t ${isNew ? "border-violet-400/15" : "border-white/5"} text-[12px] font-mono uppercase tracking-[0.16em] ${isNew ? "text-violet-200/70" : "text-white/40"}`}>
        {footer}
      </div>
    </div>
  );
}

function Pillar({ n, title, body, icon, meta, highlight }: any) {
  return (
    <GlowCard
      glowColor={highlight ? "purple" : "blue"}
      customSize
      className={`p-6 hover:translate-y-[-2px] transition-transform duration-300 w-full h-full ${highlight ? "glass-strong" : "glass"}`}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${highlight ? "bg-violet-400/15 text-violet-200" : "bg-white/5 text-white/70"}`}>
            <Icon name={icon} size={18} />
          </div>
          <span className="font-serif italic text-white/30 text-[28px] leading-none">{n}</span>
        </div>
        <h4 className="mt-5 text-[20px] font-medium tracking-tight">{title}</h4>
        <p className="mt-2.5 text-[14px] text-white/60 leading-[1.55]">{body}</p>
        <div className="mt-auto pt-6 border-t border-white/5 text-[11px] uppercase tracking-[0.16em] text-white/40 font-mono">
          {meta}
        </div>
      </div>
    </GlowCard>
  );
}

function SectionHeader({ eyebrow, title, sub }: any) {
  return (
    <div className="max-w-[760px]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300/70 font-mono">{eyebrow}</div>
      <h2 className="mt-4 text-[28px] sm:text-[36px] lg:text-[46px] leading-[1.05] font-medium tracking-[-0.02em] text-iri">{title}</h2>
      {sub && <p className="mt-5 text-[15px] sm:text-[16px] text-white/55 leading-[1.6]">{sub}</p>}
    </div>
  );
}

// =========================================================================
// Use cases  -  tabbed
// =========================================================================
function UseCases() {
  const USE_CASES = IS_STELLAR_MODE ? STELLAR_LANDING_USE_CASES : LANDING_USE_CASES;
  const [active, setActive] = useState(0);
  const c = USE_CASES[active];
  const header = useInView(0.1);
  const tabs = useInView(0.1);
  const detail = useInView(0.1);
  const useCaseCount = USE_CASES.length;

  return (
    <section id="use-cases" className="relative py-16 sm:py-28">
      <div className="max-w-[1240px] mx-auto px-6">
        <div ref={header.ref} className={`reveal ${header.visible ? "in-view" : ""}`}>
          <SectionHeader
            eyebrow="02  -  Use cases"
            title={useCaseCount === 2
              ? <>Two ways to <span className="text-white/40">stream value.</span></>
              : <>Three economies. <span className="text-white/40">One protocol.</span></>}
            sub={IS_STELLAR_MODE
              ? "Stream XLM on Stellar Testnet for work, services, and controlled fund movement."
              : "Drip is a primitive  -  anywhere money should match the cadence of work, attention, or compute, it fits."}
          />
        </div>

        {/* Tabs */}
        <div ref={tabs.ref} className={`mt-12 grid ${useCaseCount <= 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-3 stagger-children ${tabs.visible ? "in-view" : ""}`}>
          {USE_CASES.map((cc, i) => (
            <button
              key={cc.key}
              onClick={() => setActive(i)}
              className={`reveal text-left rounded-2xl px-5 py-5 border transition ${active === i ? "tab-active" : "border-white/8 hover:border-white/20 bg-white/[0.02]"}`}
            >
              <div className="flex items-center justify-between">
                <span className="tab-num font-mono text-[11px] tracking-[0.2em] text-white/40 uppercase">{String(i + 1).padStart(2, "0")} · {cc.tag}</span>
                <Icon name={cc.icon} size={16} className={active === i ? "text-violet-200" : "text-white/40"} />
              </div>
              <div className={`mt-3 text-[19px] tracking-tight ${active === i ? "text-white" : "text-white/70"}`}>{cc.title}</div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div ref={detail.ref} className={`mt-4 grid lg:grid-cols-12 gap-4 reveal ${detail.visible ? "in-view" : ""}`}>
          {/* Description — always visible */}
          <div className="lg:col-span-5 rounded-2xl glass p-4 sm:p-8">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-300/70">{c.tag}</div>
            <h3 className="mt-2 text-[22px] sm:text-[34px] leading-[1.1] font-medium tracking-[-0.02em] text-iri">{c.title}</h3>
            <p className="mt-2 sm:mt-4 text-[13px] sm:text-[15.5px] text-white/65 leading-[1.55]">{c.lede}</p>
            <ul className="mt-3 sm:mt-6 space-y-2 sm:space-y-4">
              {c.bullets.map((b, i) => (
                <li key={i} className="flex gap-2.5 text-[12.5px] sm:text-[14px] text-white/75 leading-[1.5]">
                  <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full grad-border bg-white/[0.03] flex items-center justify-center text-[9px] text-violet-200 font-mono">→</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Demo panel — hidden on mobile, visible on lg+ */}
          <div className="hidden lg:block lg:col-span-7 rounded-2xl grad-border glass-strong p-1.5">
            <div className="rounded-[14px] bg-gradient-to-b from-[#100e26]/95 to-[#07060f] p-7 relative overflow-hidden">
              {c.demo === "workforce" && <DemoWorkforce />}
              {c.demo === "subs" && <DemoSubs />}
              {c.demo === "agents" && <DemoAgents />}
              {c.demo === "protocols" && <DemoProtocols />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Use case demos --------------------------------------------------------
function DemoWorkforce() {
  const [paused, setPaused] = useState(false);
  const WD = IS_STELLAR_MODE ? STELLAR_WORKFORCE_DEMO : WORKFORCE_DEMO;
  const earned = useStreamingValue(WD.initialEarned, WD.ratePerSec, !paused);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500" />
          <div>
            <div className="text-[14px] text-white">{WD.workerName}</div>
            <div className="text-[11.5px] font-mono text-white/40">{WD.workerHandle}</div>
          </div>
        </div>
        <div className={`text-[11px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border ${paused ? "border-amber-400/30 text-amber-300 bg-amber-400/5" : "border-emerald-400/30 text-emerald-300 bg-emerald-400/5"}`}>
          {paused ? "Paused" : "Working"}
        </div>
      </div>

      <div className="mt-7 rounded-2xl bg-white/[0.02] border border-white/5 p-5">
        <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40 font-mono">Earned this session</div>
        <div className="mt-2 flex items-baseline gap-1 num-stable">
          <span className="text-white/40 text-[20px] font-num">$</span>
          <span className="text-iri text-[40px] font-num leading-none tracking-[-0.02em]">{fmtUSD(earned, 4)}</span>
        </div>
        <div className="mt-2 text-[11.5px] font-mono text-white/45">{WD.hourlyLabel}</div>
      </div>

      <div className="mt-5 flex-1">
        <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40 font-mono mb-3">Active task queue</div>
        <div className="space-y-2">
          {WD.tasks.map((t, i) => (
            <div key={i} className={`rounded-xl border px-4 py-3 flex items-center justify-between text-[13px] ${t.state === "active" ? "border-violet-400/30 bg-violet-400/5" : "border-white/5 bg-white/[0.02]"}`}>
              <div className="flex items-center gap-3">
                {t.state === "active" ? <span className="pulse-dot w-2 h-2 rounded-full bg-emerald-400" /> : <span className="w-2 h-2 rounded-full bg-white/20" />}
                <span className={t.state === "active" ? "text-white" : "text-white/50"}>{t.name}</span>
              </div>
              <span className="font-mono text-[12px] text-white/45">{t.rate}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button onClick={() => setPaused((p) => !p)} className="btn-primary rounded-full px-4 py-2 text-[12.5px] flex items-center gap-2">
          <Icon name={paused ? "play" : "pause"} size={13} /> {paused ? "Resume work" : "Pause work"}
        </button>
        <button className="btn-ghost rounded-full px-4 py-2 text-[12.5px] flex items-center gap-2">
          <Icon name="download" size={13} /> Withdraw
        </button>
      </div>
    </div>
  );
}

function DemoSubs() {
  const [playing, setPlaying] = useState(true);
  const cost = useStreamingValue(SUBSCRIPTION_DEMO.initialCost, SUBSCRIPTION_DEMO.ratePerSec, playing);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500" />
        <div>
          <div className="text-[14px] text-white">{SUBSCRIPTION_DEMO.provider}</div>
          <div className="text-[11.5px] font-mono text-white/40">{SUBSCRIPTION_DEMO.content}</div>
        </div>
        <div className="ml-auto text-[11px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border border-cyan-400/30 text-cyan-300 bg-cyan-400/5">
          Pay-per-second
        </div>
      </div>

      {/* fake video shell */}
      <div className="mt-5 relative rounded-xl overflow-hidden aspect-[16/9] bg-gradient-to-br from-violet-900/40 via-fuchsia-900/30 to-cyan-900/30 border border-white/5">
        <div className="absolute inset-0" style={{ background: "radial-gradient(60% 70% at 50% 50%, rgba(167,139,250,0.4), transparent 70%)" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <button onClick={() => setPlaying((p) => !p)} className="w-14 h-14 rounded-full grad-border bg-white/10 backdrop-blur flex items-center justify-center text-white">
            <Icon name={playing ? "pause" : "play"} size={20} />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
          <div className="h-1 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${SUBSCRIPTION_DEMO.progressPercent}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10.5px] font-mono text-white/55">
            <span>{SUBSCRIPTION_DEMO.progressLabel}</span>
            <span>{playing ? `STREAMING · ${SUBSCRIPTION_DEMO.ratePerSec.toFixed(6)} ${IS_STELLAR_MODE ? "XLM" : "SOL"}/s (demo)` : `PAUSED · 0.000000 ${IS_STELLAR_MODE ? "XLM" : "SOL"}/s`}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40 font-mono">This session</div>
          <div className="mt-2 text-[24px] font-num text-iri num-stable">${fmtUSD(cost, 4)}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40 font-mono">Vs {SUBSCRIPTION_DEMO.monthlyPrice} monthly</div>
          <div className="mt-2 text-[24px] font-num text-emerald-300">{SUBSCRIPTION_DEMO.savingsLabel}</div>
        </div>
      </div>

      <div className="mt-auto pt-5 text-[11.5px] text-white/40 font-mono">
        Stream auto-cancels when tab closes · No subscription forgotten
      </div>
    </div>
  );
}

function DemoAgents() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "hidden") setTick((t) => t + 1);
    }, 1400);
    return () => clearInterval(id);
  }, []);
  const AGENT_DEMO = IS_STELLAR_MODE ? STELLAR_LANDING_AGENT_DEMO : LANDING_AGENT_DEMO;
  const events = AGENT_DEMO.events;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] sm:text-[14px] text-white">{AGENT_DEMO.sessionName}</div>
          <div className="text-[10px] sm:text-[11.5px] font-mono text-white/40 leading-tight">{AGENT_DEMO.sessionMeta}</div>
        </div>
        <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.14em] px-2 py-1 rounded-full border border-fuchsia-400/30 text-fuchsia-300 bg-fuchsia-400/5 shrink-0">
          Autonomous
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 scanlines">
        <div className="flex items-center justify-between px-1.5 pb-1.5">
          <span className="text-[9.5px] uppercase tracking-[0.2em] text-white/40 font-mono">Settlement log</span>
          <span className="text-[9px] font-mono text-amber-300/60 uppercase tracking-[0.12em]">demo</span>
        </div>
        <div className="space-y-1 codeblock">
          {events.map((e, i) => {
            const active = i === tick % events.length;
            return (
              <div key={i} className={`px-2 py-1.5 rounded-lg border flex items-center gap-1.5 min-w-0 transition ${active ? "border-violet-400/30 bg-violet-400/5" : "border-transparent"}`}>
                <span className="font-mono text-[9.5px] text-white/40 shrink-0 w-10">t+{(i * 0.4).toFixed(1)}s</span>
                <span className="font-mono text-[9.5px] sm:text-[11px] text-violet-200 truncate">{e.from}</span>
                <Icon name="arrow-right" size={9} className="text-white/30 shrink-0" />
                <span className="font-mono text-[9.5px] sm:text-[11px] text-cyan-200 truncate">{e.to}</span>
                <span className="ml-auto font-mono text-[9.5px] sm:text-[11px] text-emerald-300 shrink-0 whitespace-nowrap">+{e.amt}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 px-1.5 text-[9.5px] font-mono text-white/30 flex items-center gap-1 min-w-0">
          <span className="truncate">{AGENT_DEMO.streamId} · {tick + 1} settlements</span>
          <span className="cursor-blink text-violet-400/70 ml-0.5 shrink-0">▮</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Settled" value={AGENT_DEMO.totalSettled} />
        <MiniStat label="Latency" value={AGENT_DEMO.avgLatency} />
        <MiniStat label="Count" value={`${tick * events.length + AGENT_DEMO.baseSettlements}`} />
      </div>
    </div>
  );
}

function DemoProtocols() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500" />
          <div>
            <div className="text-[14px] text-white">Streamed withdrawal</div>
            <div className="text-[11.5px] font-mono text-white/40">Native XLM · Soroban · Freighter signed</div>
          </div>
        </div>
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border border-sky-400/30 text-sky-300 bg-sky-400/5">
          Testnet
        </div>
      </div>

      {/* Event log */}
      <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-1.5 flex-1">
        <div className="text-[9.5px] uppercase tracking-[0.2em] text-white/40 font-mono mb-2">Event log</div>
        {[
          ["withdrawal.requested", "stream.created"],
          ["stream.active",        "vested.amount"],
          ["stream.paused",        "review.started"],
          ["stream.cancelled",     "unvested.protected"],
        ].map(([from, to]) => (
          <div key={from + to} className="px-2 py-1.5 rounded-lg border border-transparent flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[10.5px] text-emerald-300 truncate">{from}</span>
            <Icon name="arrow-right" size={9} className="text-white/30 shrink-0" />
            <span className="font-mono text-[10.5px] text-sky-300 truncate">{to}</span>
          </div>
        ))}
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[9px] uppercase tracking-[0.14em] text-white/40 font-mono">Streamed</div>
          <div className="mt-0.5 text-[15px] font-num text-emerald-300 num-stable">5.0000 XLM</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[9px] uppercase tracking-[0.14em] text-white/40 font-mono">Withdrawn</div>
          <div className="mt-0.5 text-[15px] font-num text-sky-300 num-stable">1.2500 XLM</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[9px] uppercase tracking-[0.14em] text-white/40 font-mono">Remaining</div>
          <div className="mt-0.5 text-[15px] font-num text-white num-stable">3.7500 XLM</div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3">
      <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-white/40 font-mono truncate">{label}</div>
      <div className="mt-0.5 text-[13px] sm:text-[16px] font-num text-white num-stable">{value}</div>
    </div>
  );
}

// =========================================================================
// Developer experience + Calculator
// =========================================================================
function Developers() {
  const header = useInView(0.1);
  const code = useInView(0.1);
  const features = useInView(0.1);

  return (
    <section id="developers" className="relative py-16 sm:py-28">
      {/* Data-grid ornament */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.018]" style={{ backgroundSize: "32px 32px" }} />
      </div>
      <div className="max-w-[1240px] mx-auto px-6">
        <div ref={header.ref} className={`reveal ${header.visible ? "in-view" : ""}`}>
          <SectionHeader
            eyebrow="03  -  Developer experience"
            title={<>Three lines to a live stream.</>}
            sub={IS_STELLAR_MODE
              ? "The Drip Soroban contract is live on Stellar Testnet. Call it directly with the Stellar SDK today, or wait for the planned drip-stellar SDK."
              : "The Drip Anchor program is live on devnet. Interact directly with the IDL today, or wait for the planned drip-sol SDK."}
          />
        </div>

        <div ref={code.ref} className={`mt-12 grid lg:grid-cols-12 gap-6 reveal ${code.visible ? "in-view" : ""}`}>
          <div className="lg:col-span-7 min-w-0 overflow-hidden">
            <CodeBlock />
          </div>
          <div className="lg:col-span-5 min-w-0">
            <Calculator />
          </div>
        </div>

        <div ref={features.ref} className={`mt-6 grid md:grid-cols-3 gap-4 stagger-children ${features.visible ? "in-view" : ""}`}>
          {(IS_STELLAR_MODE ? STELLAR_DEV_FEATURES : DEV_FEATURES).map((feature) => (
            <div key={feature.title} className="reveal">
              <DevFeature {...feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeBlock() {
  return (
    <div className="rounded-3xl grad-border glass-strong p-1.5 h-full">
      <div className="rounded-[20px] bg-[#08071a] overflow-hidden h-full">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
          <span className="ml-3 font-mono text-[12px] text-white/45">{IS_STELLAR_MODE ? "stellar-stream.ts" : "stream.ts"}</span>
          <span className="ml-auto flex items-center gap-3 text-[11.5px] font-mono text-white/35">
            <span>TypeScript</span>
            <span>·</span>
            <button className="hover:text-white/70 flex items-center gap-1"><Icon name="copy" size={12} /> Copy</button>
          </span>
        </div>
        <CodeBlockHL html={IS_STELLAR_MODE ? STELLAR_DEV_CODE_SAMPLE : DEV_CODE_SAMPLE} />
      </div>
    </div>
  );
}

// HACK: render highlighted code via dangerouslySetInnerHTML inside CodeBlock
// Replace the pre/code block with one that allows HTML
function CodeBlockHL({ html }: any) { return <pre className="codeblock p-6 m-0 text-white/85 overflow-auto" dangerouslySetInnerHTML={{ __html: html }} />; }

function DevFeature({ icon, title, desc }: any) {
  return (
    <GlowCard customSize glowColor="purple" className="p-5 glass w-full h-full hover:translate-y-[-2px] transition-transform duration-300">
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-violet-200"><Icon name={icon} size={16} /></div>
          <div className="text-[14.5px] text-white">{title}</div>
        </div>
        <div className="mt-3 text-[13px] text-white/55 leading-[1.55]">{desc}</div>
      </div>
    </GlowCard>
  );
}

// --- Stream Calculator -----------------------------------------------------
function Calculator() {
  const [monthly, setMonthly] = useState(CALCULATOR_DEMO.defaultMonthly);
  const perSec = monthly / (30 * 24 * 60 * 60);
  const perMin = perSec * 60;
  const perHour = perSec * 3600;
  const perDay = perSec * 86400;

  // ticking demo — only runs when section is visible
  const { ref: calcRef, visible: calcVisible } = useInView(0.1);
  const [running, setRunning] = useState(true);
  const [base, setBase] = useState(0);
  useEffect(() => { setBase(0); }, [monthly]);
  const earned = useStreamingValue(0, perSec, running && calcVisible);

  return (
    <div ref={calcRef} className="rounded-3xl glass-strong p-5 sm:p-7 h-full relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-52 h-52 iri-orb rounded-full opacity-40" />
      <div className="flex items-center justify-between relative">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Stream calculator</div>
          <div className="mt-1.5 text-[20px] tracking-tight text-white">Per second math.</div>
        </div>
        <Icon name="calculator" size={18} className="text-violet-200" />
      </div>

      <div className="mt-6">
        <label className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-mono">Total amount per month ({IS_STELLAR_MODE ? "XLM" : "SOL"})</label>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-white/50 text-[26px] font-num">$</span>
          <input
            type="number"
            min={0}
            value={monthly}
            onChange={(e) => setMonthly(Math.max(0, Number(e.target.value) || 0))}
            className="bg-transparent w-full text-[34px] font-num text-iri outline-none num-stable"
          />
        </div>
        <input
          type="range"
          min={CALCULATOR_DEMO.minMonthly}
          max={CALCULATOR_DEMO.maxMonthly}
          step={CALCULATOR_DEMO.step}
          value={Math.min(CALCULATOR_DEMO.maxMonthly, monthly)}
          onChange={(e) => setMonthly(Number(e.target.value))}
          className="mt-3 w-full accent-violet-400"
        />
        <div className="flex items-center justify-between text-[10.5px] font-mono text-white/30 mt-1">
          <span>${CALCULATOR_DEMO.minMonthly.toLocaleString()}</span><span>${CALCULATOR_DEMO.maxMonthly.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 text-[13px]">
        <CalcRow label="per second" value={`${perSec.toFixed(7)}`} accent />
        <CalcRow label="per minute" value={`${perMin.toFixed(4)}`} />
        <CalcRow label="per hour" value={`${perHour.toFixed(2)}`} />
        <CalcRow label="per day" value={`${perDay.toFixed(2)}`} />
      </div>

      <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 font-mono">Live preview</span>
          <button onClick={() => setRunning((r) => !r)} className="text-[11px] font-mono text-white/55 hover:text-white flex items-center gap-1">
            <Icon name={running ? "pause" : "play"} size={11} /> {running ? "Pause" : "Resume"}
          </button>
        </div>
        <div className="mt-2 text-[28px] font-num text-iri num-stable">${fmtUSD(earned, 6)}</div>
        <div className="text-[11px] font-mono text-white/40 mt-1">earned since you opened this calculator</div>
      </div>
    </div>
  );
}

function CalcRow({ label, value, accent }: any) {
  return (
    <div className={`rounded-xl px-3 py-3 border overflow-hidden ${accent ? "border-violet-400/30 bg-violet-400/5" : "border-white/5 bg-white/[0.02]"}`}>
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-white/40 font-mono truncate">{label}</div>
      <div className={`mt-1 font-num num-stable break-all ${accent ? "text-iri text-[15px] sm:text-[18px]" : "text-white/85 text-[13px] sm:text-[15px]"}`}>{value}</div>
    </div>
  );
}

// =========================================================================
// Ecosystem strip
// =========================================================================
function EcosystemCard({ p }: any) {
  return (
    <GlowCard customSize glowColor="blue" className="p-6 glass w-full h-full group hover:translate-y-[-2px] transition-transform duration-300">
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 border border-violet-400/20 flex items-center justify-center text-violet-200">
            <Icon name={p.icon} size={18} />
          </div>
          <span className="text-[10.5px] uppercase tracking-[0.18em] text-white/35 font-mono">Partner</span>
        </div>
        <div className="mt-5 text-[20px] tracking-tight text-white">{p.name}</div>
        <div className="text-[12.5px] text-white/45 font-mono mt-0.5">{p.role}</div>
        <div className="mt-5 pt-4 border-t border-white/5 text-[12px] text-white/55">{p.note}</div>
      </div>
    </GlowCard>
  );
}

function Ecosystem() {
  const header = useInView(0.1);
  const cards = useInView(0.1);

  return (
    <section id="ecosystem" className="relative py-24">
      <div className="max-w-[1240px] mx-auto px-6">
        <div ref={header.ref} className={`reveal ${header.visible ? "in-view" : ""}`}>
          <SectionHeader
            eyebrow="04  -  Trust & ecosystem"
            title={<>The pipes underneath.</>}
            sub={IS_STELLAR_MODE
              ? "Drip is built on Stellar Testnet — Soroban contracts, Freighter custody, and Horizon RPC. Testnet only, no real funds."
              : "Drip composes with the best of Solana  -  payment, custody, and on-ramp. Yield routing via Raydium is on the roadmap."}
          />
        </div>
        <div ref={cards.ref} className={`mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children ${cards.visible ? "in-view" : ""}`}>
          {(IS_STELLAR_MODE ? STELLAR_ECOSYSTEM_PARTNERS : ECOSYSTEM_PARTNERS).map((p) => (
            <div key={p.name} className="reveal">
              <EcosystemCard p={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


// =========================================================================
// CTA + Footer
// =========================================================================
function FinalCTA() {
  const { ref, visible } = useInView(0.1);
  return (
    <section className="relative py-24">
      <div ref={ref} className={`max-w-[1240px] mx-auto px-6 reveal ${visible ? "in-view" : ""}`}>
        <div className="relative rounded-[32px] grad-border glass-strong p-1.5 overflow-hidden">
          <div className="rounded-[28px] bg-gradient-to-br from-[#0e0c25] to-[#07060f] px-6 py-12 sm:p-14 relative overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] glow-orb opacity-50" />
            <div className="relative max-w-[640px] mx-auto text-center">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300/70 font-mono">Start streaming</div>
              <h2 className="mt-4 text-[32px] sm:text-[42px] lg:text-[52px] leading-[1.05] font-medium tracking-[-0.025em] text-iri">
                {IS_STELLAR_MODE
                  ? <>Make XLM flow at the<br />speed of the network.</>
                  : <>Make money flow at the<br />speed of the network.</>}
              </h2>
              <p className="mt-5 text-[15.5px] text-white/55 leading-[1.6]">
                {IS_STELLAR_MODE
                  ? "Try the Stellar Testnet app today."
                  : "Join the public devnet today. Mainnet beta opens Q3 2026 to teams already streaming."}
              </p>
              <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
                <a href="/dashboard" className="btn-primary rounded-full px-5 py-3 text-[14px] font-medium text-white flex items-center gap-2">
                  <Icon name="zap" size={15} /> {IS_STELLAR_MODE ? "Open Stellar Testnet App" : "Open Drip App"}
                </a>
                <a href="/docs" className="btn-ghost rounded-full px-5 py-3 text-[14px] text-white/90 flex items-center gap-2">
                  <Icon name="book-open" size={15} /> Read the docs
                </a>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-[11.5px] font-mono text-white/35">
                {(IS_STELLAR_MODE ? STELLAR_FINAL_CTA_STATS : FINAL_CTA_STATS).map((stat, index) => (
                  <React.Fragment key={stat}>
                    {index > 0 && <span>·</span>}
                    <span>{stat}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 mt-12">
      <div className="max-w-[1240px] mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-12 gap-8">
        <div className="col-span-2 md:col-span-4">
          <div className="flex items-center gap-2.5">
            <DripMark size={26} />
            <span className="font-medium tracking-tight text-[16px]">Drip</span>
          </div>
          <p className="mt-4 text-[13px] text-white/50 leading-[1.6] max-w-[320px]">
            {IS_STELLAR_MODE
              ? "Programmable XLM payment streams on Stellar."
              : "The streaming payments layer for Solana."}
          </p>
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            {FOOTER_SOCIALS.map((i) => (
              <a key={i.icon} href={i.href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-white/55 hover:text-white">
                <Icon name={i.icon} size={14} />
              </a>
            ))}
            <a href="https://youtu.be/AiHgYlBylVo" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-white/10 hover:border-rose-500/40 hover:text-rose-400 flex items-center justify-center text-white/55 hover:text-white transition" title="Watch demo on YouTube">
              <Icon name="youtube" size={14} />
            </a>
            <a href="/docs/faq" className="h-9 px-3 rounded-full border border-white/10 hover:border-white/30 flex items-center gap-1.5 text-white/55 hover:text-white text-[12px] font-mono transition">
              <Icon name="help-circle" size={14} /> FAQ
            </a>
            <a href="/docs" className="h-9 px-3 rounded-full border border-white/10 hover:border-white/30 flex items-center gap-1.5 text-white/55 hover:text-white text-[12px] font-mono transition">
              <Icon name="book-open" size={14} /> Docs
            </a>
          </div>
        </div>

        {FOOTER_LINK_GROUPS.map((group) => (
          <FooterCol key={group.title} title={group.title} links={group.links} />
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-[1240px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11.5px] font-mono text-white/35">
          <span>© 2026 Drip Labs · Open-source MIT</span>
          <span>{PROTOCOL_STATS.version} · {IS_STELLAR_MODE ? STELLAR_PROTOCOL_STATS.clusterLabel : PROTOCOL_STATS.clusterLabel} · last block {IS_STELLAR_MODE ? STELLAR_PROTOCOL_STATS.slot : PROTOCOL_STATS.slot}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: any) {
  return (
    <div className="col-span-1 md:col-span-2">
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono">{title}</div>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l}><a href="#" className="text-[13px] text-white/65 hover:text-white">{l}</a></li>
        ))}
      </ul>
    </div>
  );
}

// =========================================================================
// App
// =========================================================================
export default function LandingPage() {
  return (
    <div className="min-h-screen relative">
      <Backdrop />
      <Nav />
      <Hero />
      <PartnersStrip />
      <WhyDrip />
      <UseCases />
      <Developers />
      <Ecosystem />
      <FinalCTA />
      <Waitlist />
      <Footer />
    </div>
  );
}



