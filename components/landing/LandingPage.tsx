"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
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
  SUBSCRIPTION_DEMO,
  WORKFORCE_DEMO,
} from "@/lib/mock-data";

// Drip â€” Streaming payments on Solana
// Single-file React app rendered into #root.

// --- Tiny utilities --------------------------------------------------------
const fmtUSD = (n, frac = 6) => {
  const [w, d = ""] = n.toFixed(frac).split(".");
  return w.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac ? "." + d : "");
};
const truncAddr = (a) => `${a.slice(0, 4)}â€¦${a.slice(-4)}`;

// --- Live counter hook -----------------------------------------------------
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

// =========================================================================
// Atmospheric background
// =========================================================================
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="absolute inset-0 bg-noise" />
      {/* Top hero glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] glow-orb opacity-80" />
      <div className="absolute top-[8%] right-[10%] w-[420px] h-[420px] iri-orb rounded-full opacity-50 drift-slow" />
      <div className="absolute top-[40%] left-[-6%] w-[360px] h-[360px] iri-orb rounded-full opacity-30 drift-med" />
      {/* Bottom subtle */}
      <div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[400px] glow-orb opacity-30" />
      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 50% 0%, transparent 40%, rgba(0,0,0,0.7) 100%)" }} />
    </div>
  );
}

// =========================================================================
// Nav
// =========================================================================
function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-[1240px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <a href="#" className="flex items-center gap-2.5 group">
            <DripMark />
            <span className="font-medium tracking-tight text-[17px]">Drip</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300/70 ml-1 px-1.5 py-0.5 rounded border border-violet-400/20">{PROTOCOL_STATS.version} Â· devnet</span>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            {LANDING_NAV_LINKS.map((l) => (
              <a key={l} href="#" className="text-[13.5px] text-white/60 hover:text-white px-3 py-1.5 rounded-md transition">
                {l}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a href="#" className="hidden md:flex items-center gap-2 text-[13px] text-white/60 hover:text-white px-3 py-2">
            <Icon name="github" size={15} /> GitHub
          </a>
          <button className="btn-ghost rounded-full px-4 py-2 text-[13px] text-white/85 hover:text-white">
            Sign in
          </button>
          <a href="/dashboard" className="btn-primary rounded-full px-4 py-2 text-[13px] font-medium text-white flex items-center gap-1.5">
            Launch app <Icon name="arrow-up-right" size={14} />
          </a>
        </div>
      </div>
    </header>
  );
}

function DripMark({ size = 28 }: any) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(167,139,250,0.7), transparent 70%)", filter: "blur(6px)" }} />
      <svg viewBox="0 0 32 32" width={size} height={size} className="relative">
        <defs>
          <linearGradient id="dripGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0abfc" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
        </defs>
        <path d="M16 3 C 22 12, 26 17, 26 22 a 10 10 0 1 1 -20 0 C 6 17, 10 12, 16 3 Z" fill="url(#dripGrad)" />
        <path d="M13 18 C 13 22, 19 22, 19 18" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// =========================================================================
// Hero
// =========================================================================
function Hero() {
  return (
    <section className="relative pt-16 pb-28">
      <div className="max-w-[1240px] mx-auto px-6 grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 pt-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/5 px-3 py-1.5 text-[12px] text-violet-200/90 mb-7">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-violet-300 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-300" />
            </span>
            <span className="font-mono uppercase tracking-[0.16em]">Now live on Solana devnet</span>
            <span className="text-white/30">Â·</span>
            <span>2026 cohort</span>
          </div>

          <h1 className="text-[68px] leading-[1.02] font-medium tracking-[-0.025em] text-iri">
            Programmable Cashflow<br />for AI Agents.
          </h1>
          <p className="mt-7 text-[18.5px] text-white/65 leading-[1.55] max-w-[580px]">
            Drip is the first streaming payment protocol built for the autonomous agent economy. Set spending policies, stream funds per-second, and automate compliance on Solana.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="/dashboard" className="btn-primary rounded-full px-5 py-3 text-[14px] font-medium text-white flex items-center gap-2">
              <Icon name="zap" size={15} /> Launch App
            </a>
            <button className="btn-ghost rounded-full px-5 py-3 text-[14px] text-white/90 flex items-center gap-2">
              <Icon name="terminal" size={15} /> Build on Drip
            </button>
            <a href="#calc" className="text-[13.5px] text-white/55 hover:text-white px-2 py-2 flex items-center gap-1.5">
              View whitepaper <Icon name="arrow-right" size={13} />
            </a>
          </div>

          {/* Stats strip */}
          <div className="mt-14 grid grid-cols-3 gap-6 max-w-[520px]">
            {LANDING_PROTOCOL_STATS.map((stat) => (
              <Stat key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 lg:pl-4">
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
      <div className="mt-1.5 text-[22px] font-num text-white">{value}</div>
      <div className="text-[11px] text-white/40 mt-0.5">{hint}</div>
    </div>
  );
}

// =========================================================================
// Streaming Card â€” the WOW component
// =========================================================================
function StreamingCard() {
  const [running, setRunning] = useState(true);
  const RATE = LANDING_STREAMING_CARD.rate;
  const value = useStreamingValue(LANDING_STREAMING_CARD.initialValue, RATE, running);

  const startedAt = useMemo(() => Date.now() - LANDING_STREAMING_CARD.startedOffsetMs, []);
  const elapsedSec = Math.floor((Date.now() - startedAt) / 1000) + Math.floor((value - LANDING_STREAMING_CARD.initialValue) / RATE);
  const fmtElapsed = (s) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m`;
  };

  const valStr = fmtUSD(value, 6);
  const [whole, decimal] = valStr.split(".");
  const stableDec = decimal.slice(0, 2);
  const fastDec = decimal.slice(2);

  return (
    <div className="grad-border rounded-3xl glass-strong p-1.5 shadow-[0_30px_120px_-30px_rgba(139,92,246,0.5)]">
      <div className="rounded-[20px] bg-gradient-to-b from-[#100e26]/90 to-[#07060f]/95 p-6 relative overflow-hidden">
        {/* corner glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 iri-orb rounded-full opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 glow-orb opacity-30" />

        {/* Header */}
        <div className="flex items-start justify-between relative">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-white/45">
              <Icon name="waves" size={13} /> Active stream Â· {LANDING_STREAMING_CARD.activeStreamId}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[12.5px] text-emerald-300/90 font-mono">STREAMING</span>
              <span className="text-white/25">Â·</span>
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
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40 font-mono">Received Â· {LANDING_STREAMING_CARD.token}</div>
          <div className="mt-3 flex items-baseline gap-1 num-stable">
            <span className="text-white/40 text-[34px] font-num">$</span>
            <span className="text-iri text-[58px] font-num leading-none tracking-[-0.02em]">{whole}</span>
            <span className="text-iri text-[58px] font-num leading-none tracking-[-0.02em]">.</span>
            <span className="text-iri text-[58px] font-num leading-none tracking-[-0.02em]">{stableDec}</span>
            <span className="text-violet-300/90 text-[34px] font-num leading-none tracking-[-0.02em]">{fastDec}</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-white/40 font-mono">
            <Icon name="trending-up" size={12} className="text-emerald-300/80" />
            <span className="text-emerald-300/80">+{(RATE).toFixed(3)} USDC/sec</span>
            <span>Â·</span>
            <span>= ${(RATE * 86400).toFixed(2)}/day</span>
          </div>
        </div>

        {/* Flow visualization */}
        <div className="mt-7">
          <FlowGraphic />
        </div>

        {/* Routing details */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-[12px]">
          <DetailRow label="From">
            <span className="font-num text-white/85">{truncAddr(LANDING_STREAMING_CARD.fromAddress)}</span>
            <span className="ml-1.5 text-white/35">({LANDING_STREAMING_CARD.fromLabel})</span>
          </DetailRow>
          <DetailRow label="To">
            <span className="font-num text-white/85">{truncAddr(LANDING_STREAMING_CARD.toAddress)}</span>
            <span className="ml-1.5 text-white/35">({LANDING_STREAMING_CARD.toLabel})</span>
          </DetailRow>
          <DetailRow label="Token">
            <span className="text-white/85">{LANDING_STREAMING_CARD.token}</span>
            <span className="ml-1.5 text-white/35">{LANDING_STREAMING_CARD.tokenKind}</span>
          </DetailRow>
          <DetailRow label="Yield (Raydium)">
            <span className="text-emerald-300/90">+{PROTOCOL_STATS.yieldApy.toFixed(2)}% APY</span>
          </DetailRow>
        </div>

        <div className="mt-5 flex items-center gap-2 pt-4 border-t border-white/5 text-[11px] text-white/40 font-mono">
          <Icon name="shield-check" size={12} className="text-violet-300" />
          <span>Settled on-chain Â· slot {PROTOCOL_STATS.slot}</span>
          <span className="ml-auto">tx {truncAddr(LANDING_STREAMING_CARD.txHash)}</span>
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
  return (
    <section className="border-y border-white/5 py-7 mt-2">
      <div className="max-w-[1240px] mx-auto px-6 flex items-center gap-10 flex-wrap">
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/35 font-mono">Built with</div>
        <div className="flex items-center gap-9 flex-wrap">
          {LANDING_PARTNERS.map((it) => (
            <span key={it} className="text-white/45 hover:text-white/80 transition text-[15px] font-medium tracking-tight">
              {it}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// =========================================================================
// Why Drip â€” old vs new + 3 pillars
// =========================================================================
function WhyDrip() {
  return (
    <section className="relative py-28">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHeader
          eyebrow="01 â€” Why Drip"
          title={<>Salary is paid monthly.<br /><span className="text-white/40">Value is created by the second.</span></>}
          sub="The lump-sum payment model is a relic of paper checks. Drip fixes the temporal mismatch between work and money."
        />

        <div className="mt-14 grid lg:grid-cols-2 gap-5">
          {DRIP_COMPARE_PANELS.map((panel) => (
            <ComparePanel key={panel.kind} {...panel} />
          ))}
        </div>

        {/* 3 Pillars */}
        <div className="mt-20">
          <div className="flex items-end justify-between mb-7">
            <h3 className="text-[28px] tracking-tight font-medium">Three pillars holding it up.</h3>
            <a href="#" className="text-[13px] text-white/55 hover:text-white flex items-center gap-1">Read the litepaper <Icon name="arrow-up-right" size={13} /></a>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {DRIP_PILLARS.map((pillar) => (
              <Pillar key={pillar.title} {...pillar} />
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
    <div className={`relative rounded-2xl p-6 ${highlight ? "grad-border glass-strong" : "glass"} hover:translate-y-[-2px] transition-transform duration-300`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${highlight ? "bg-violet-400/15 text-violet-200" : "bg-white/5 text-white/70"}`}>
          <Icon name={icon} size={18} />
        </div>
        <span className="font-serif italic text-white/30 text-[28px] leading-none">{n}</span>
      </div>
      <h4 className="mt-5 text-[20px] font-medium tracking-tight">{title}</h4>
      <p className="mt-2.5 text-[14px] text-white/60 leading-[1.55]">{body}</p>
      <div className="mt-6 pt-4 border-t border-white/5 text-[11px] uppercase tracking-[0.16em] text-white/40 font-mono">
        {meta}
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, sub }: any) {
  return (
    <div className="max-w-[760px]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300/70 font-mono">{eyebrow}</div>
      <h2 className="mt-4 text-[46px] leading-[1.05] font-medium tracking-[-0.02em] text-iri">{title}</h2>
      {sub && <p className="mt-5 text-[16px] text-white/55 leading-[1.6] max-w-[640px]">{sub}</p>}
    </div>
  );
}

// =========================================================================
// Use cases â€” tabbed
// =========================================================================
function UseCases() {
  const [active, setActive] = useState(0);
  const c = LANDING_USE_CASES[active];

  return (
    <section className="relative py-28">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHeader
          eyebrow="02 â€” Use cases"
          title={<>Three economies. <span className="text-white/40">One protocol.</span></>}
          sub="Drip is a primitive â€” anywhere money should match the cadence of work, attention, or compute, it fits."
        />

        {/* Tabs */}
        <div className="mt-12 grid md:grid-cols-3 gap-3">
          {LANDING_USE_CASES.map((cc, i) => (
            <button
              key={cc.key}
              onClick={() => setActive(i)}
              className={`text-left rounded-2xl px-5 py-5 border transition ${active === i ? "tab-active" : "border-white/8 hover:border-white/20 bg-white/[0.02]"}`}
            >
              <div className="flex items-center justify-between">
                <span className="tab-num font-mono text-[11px] tracking-[0.2em] text-white/40 uppercase">{String(i + 1).padStart(2, "0")} Â· {cc.tag}</span>
                <Icon name={cc.icon} size={16} className={active === i ? "text-violet-200" : "text-white/40"} />
              </div>
              <div className={`mt-3 text-[19px] tracking-tight ${active === i ? "text-white" : "text-white/70"}`}>{cc.title}</div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="mt-6 grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-3xl glass p-8">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-violet-300/70">{c.tag}</div>
            <h3 className="mt-3 text-[34px] leading-[1.1] font-medium tracking-[-0.02em] text-iri">{c.title}</h3>
            <p className="mt-5 text-[15.5px] text-white/65 leading-[1.6]">{c.lede}</p>
            <ul className="mt-7 space-y-4">
              {c.bullets.map((b, i) => (
                <li key={i} className="flex gap-3 text-[14px] text-white/75 leading-[1.55]">
                  <span className="mt-1 w-4 h-4 rounded-full grad-border bg-white/[0.03] flex items-center justify-center text-[10px] text-violet-200 font-mono">â†’</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <button className="mt-9 btn-ghost rounded-full px-4 py-2.5 text-[13px] text-white/85 flex items-center gap-2">
              See architecture <Icon name="arrow-right" size={13} />
            </button>
          </div>

          <div className="lg:col-span-7 rounded-3xl grad-border glass-strong p-1.5 min-h-[420px]">
            <div className="rounded-[20px] bg-gradient-to-b from-[#100e26]/95 to-[#07060f] p-7 h-full relative overflow-hidden">
              {c.demo === "workforce" && <DemoWorkforce />}
              {c.demo === "subs" && <DemoSubs />}
              {c.demo === "agents" && <DemoAgents />}
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
  const earned = useStreamingValue(WORKFORCE_DEMO.initialEarned, WORKFORCE_DEMO.ratePerSec, !paused);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500" />
          <div>
            <div className="text-[14px] text-white">{WORKFORCE_DEMO.workerName}</div>
            <div className="text-[11.5px] font-mono text-white/40">{WORKFORCE_DEMO.workerHandle}</div>
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
        <div className="mt-2 text-[11.5px] font-mono text-white/45">{WORKFORCE_DEMO.hourlyLabel}</div>
      </div>

      <div className="mt-5 flex-1">
        <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40 font-mono mb-3">Active task queue</div>
        <div className="space-y-2">
          {WORKFORCE_DEMO.tasks.map((t, i) => (
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
            <span>{playing ? `STREAMING Â· ${SUBSCRIPTION_DEMO.ratePerSec.toFixed(6)} USDC/s` : "PAUSED Â· 0.000000 USDC/s"}</span>
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
        Stream auto-cancels when tab closes Â· No subscription forgotten
      </div>
    </div>
  );
}

function DemoAgents() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1400);
    return () => clearInterval(id);
  }, []);
  const events = LANDING_AGENT_DEMO.events;
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px] text-white">{LANDING_AGENT_DEMO.sessionName}</div>
          <div className="text-[11.5px] font-mono text-white/40">{LANDING_AGENT_DEMO.sessionMeta}</div>
        </div>
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border border-fuchsia-400/30 text-fuchsia-300 bg-fuchsia-400/5">
          Autonomous
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-3 flex-1 overflow-hidden">
        <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/40 font-mono px-2 py-1.5">Live settlement log</div>
        <div className="space-y-1.5 codeblock">
          {events.map((e, i) => {
            const active = i === tick % events.length;
            return (
              <div key={i} className={`px-3 py-2.5 rounded-lg border flex items-center gap-3 transition ${active ? "border-violet-400/30 bg-violet-400/5" : "border-transparent"}`}>
                <span className="font-mono text-[11px] text-white/40 w-14">t+{(i * 0.4).toFixed(1)}s</span>
                <span className="font-mono text-[12px] text-violet-200">{e.from}</span>
                <Icon name="arrow-right" size={12} className="text-white/30" />
                <span className="font-mono text-[12px] text-cyan-200">{e.to}</span>
                <span className="ml-auto font-mono text-[12px] text-emerald-300">+{e.amt} USDC</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 px-2 text-[11px] font-mono text-white/35">{LANDING_AGENT_DEMO.streamId} Â· {tick + 1} settlements ledgered</div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-[12px]">
        <MiniStat label="Total settled" value={LANDING_AGENT_DEMO.totalSettled} />
        <MiniStat label="Avg latency" value={LANDING_AGENT_DEMO.avgLatency} />
        <MiniStat label="Settlements" value={`${tick * events.length + LANDING_AGENT_DEMO.baseSettlements}`} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">{label}</div>
      <div className="mt-1 text-[16px] font-num text-white num-stable">{value}</div>
    </div>
  );
}

// =========================================================================
// Developer experience + Calculator
// =========================================================================
function Developers() {
  return (
    <section id="calc" className="relative py-28">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHeader
          eyebrow="03 â€” Developer experience"
          title={<>Three lines to a live stream.</>}
          sub="The drip-sol SDK abstracts PDAs, escrow accounts and time-math so you can focus on product. Typed, tree-shakable, devnet-ready."
        />

        <div className="mt-12 grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <CodeBlock />
          </div>
          <div className="lg:col-span-5">
            <Calculator />
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {DEV_FEATURES.map((feature) => (
            <DevFeature key={feature.title} {...feature} />
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
          <span className="ml-3 font-mono text-[12px] text-white/45">stream.ts</span>
          <span className="ml-auto flex items-center gap-3 text-[11.5px] font-mono text-white/35">
            <span>TypeScript</span>
            <span>Â·</span>
            <button className="hover:text-white/70 flex items-center gap-1"><Icon name="copy" size={12} /> Copy</button>
          </span>
        </div>
        <CodeBlockHL html={DEV_CODE_SAMPLE} />
      </div>
    </div>
  );
}

// HACK: render highlighted code via dangerouslySetInnerHTML inside CodeBlock
// Replace the pre/code block with one that allows HTML
function CodeBlockHL({ html }: any) { return <pre className="codeblock p-6 m-0 text-white/85 overflow-auto" dangerouslySetInnerHTML={{ __html: html }} />; }

function DevFeature({ icon, title, desc }: any) {
  return (
    <div className="rounded-2xl glass p-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-violet-200"><Icon name={icon} size={16} /></div>
        <div className="text-[14.5px] text-white">{title}</div>
      </div>
      <div className="mt-3 text-[13px] text-white/55 leading-[1.55]">{desc}</div>
    </div>
  );
}

// --- Stream Calculator -----------------------------------------------------
function Calculator() {
  const [monthly, setMonthly] = useState(CALCULATOR_DEMO.defaultMonthly);
  const perSec = monthly / (30 * 24 * 60 * 60);
  const perMin = perSec * 60;
  const perHour = perSec * 3600;
  const perDay = perSec * 86400;

  // ticking demo
  const [running, setRunning] = useState(true);
  const [base, setBase] = useState(0);
  useEffect(() => { setBase(0); }, [monthly]);
  const earned = useStreamingValue(0, perSec, running);

  return (
    <div className="rounded-3xl glass-strong p-7 h-full relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-52 h-52 iri-orb rounded-full opacity-40" />
      <div className="flex items-center justify-between relative">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Stream calculator</div>
          <div className="mt-1.5 text-[20px] tracking-tight text-white">Per second math.</div>
        </div>
        <Icon name="calculator" size={18} className="text-violet-200" />
      </div>

      <div className="mt-6">
        <label className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-mono">Total amount per month (USDC)</label>
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

      <div className="mt-6 grid grid-cols-2 gap-2.5 text-[13px]">
        <CalcRow label="per second" value={`$${perSec.toFixed(7)}`} accent />
        <CalcRow label="per minute" value={`$${perMin.toFixed(4)}`} />
        <CalcRow label="per hour"   value={`$${perHour.toFixed(2)}`} />
        <CalcRow label="per day"    value={`$${perDay.toFixed(2)}`} />
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
    <div className={`rounded-xl px-4 py-3 border ${accent ? "border-violet-400/30 bg-violet-400/5" : "border-white/5 bg-white/[0.02]"}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-mono">{label}</div>
      <div className={`mt-1 font-num num-stable ${accent ? "text-iri text-[18px]" : "text-white/85 text-[15px]"}`}>{value}</div>
    </div>
  );
}

// =========================================================================
// Ecosystem strip
// =========================================================================
function Ecosystem() {
  return (
    <section className="relative py-24">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHeader
          eyebrow="04 â€” Trust & ecosystem"
          title={<>The pipes underneath.</>}
          sub="Drip composes with the best of Solana â€” payment, custody, on-ramp and yield, each handled by a specialist."
        />
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ECOSYSTEM_PARTNERS.map((p) => (
            <div key={p.name} className="rounded-2xl glass p-6 group hover:border-violet-400/30 transition">
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
  return (
    <section className="relative py-24">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="relative rounded-[32px] grad-border glass-strong p-1.5 overflow-hidden">
          <div className="rounded-[28px] bg-gradient-to-br from-[#0e0c25] to-[#07060f] p-14 relative overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] glow-orb opacity-50" />
            <div className="relative max-w-[640px] mx-auto text-center">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300/70 font-mono">Start streaming</div>
              <h2 className="mt-4 text-[52px] leading-[1.05] font-medium tracking-[-0.025em] text-iri">
                Make money flow at the<br />speed of the network.
              </h2>
              <p className="mt-5 text-[15.5px] text-white/55 leading-[1.6]">
                Join the public devnet today. Mainnet beta opens Q3 2026 to teams already streaming.
              </p>
              <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
                <a href="/dashboard" className="btn-primary rounded-full px-5 py-3 text-[14px] font-medium text-white flex items-center gap-2">
                  <Icon name="zap" size={15} /> Open Drip App
                </a>
                <button className="btn-ghost rounded-full px-5 py-3 text-[14px] text-white/90 flex items-center gap-2">
                  <Icon name="book-open" size={15} /> Read the docs
                </button>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-[11.5px] font-mono text-white/35">
                {FINAL_CTA_STATS.map((stat, index) => (
                  <>
                    {index > 0 && <span>Â·</span>}
                    <span key={stat}>{stat}</span>
                  </>
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
      <div className="max-w-[1240px] mx-auto px-6 py-14 grid md:grid-cols-12 gap-8">
        <div className="md:col-span-4">
          <div className="flex items-center gap-2.5">
            <DripMark size={26} />
            <span className="font-medium tracking-tight text-[16px]">Drip</span>
          </div>
          <p className="mt-4 text-[13px] text-white/50 leading-[1.6] max-w-[320px]">
            The streaming payments layer for Solana. Built by an open collective of designers and Anchor devs in 2026.
          </p>
          <div className="mt-6 flex items-center gap-2">
            {FOOTER_SOCIALS.map((i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-white/55 hover:text-white">
                <Icon name={i} size={14} />
              </a>
            ))}
          </div>
        </div>

        {FOOTER_LINK_GROUPS.map((group) => (
          <FooterCol key={group.title} title={group.title} links={group.links} />
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-[1240px] mx-auto px-6 py-5 flex items-center justify-between text-[11.5px] font-mono text-white/35">
          <span>Â© 2026 Drip Labs Â· Open-source MIT</span>
          <span>{PROTOCOL_STATS.version} Â· {PROTOCOL_STATS.clusterLabel} Â· last block {PROTOCOL_STATS.slot}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: any) {
  return (
    <div className="md:col-span-2">
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
      <Footer />
    </div>
  );
}



