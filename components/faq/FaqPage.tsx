"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { DocsBackground } from "@/components/ui/backgrounds";
import { IS_STELLAR_MODE } from "@/lib/app-config";

const CATEGORIES = [
  { id: "general",   label: "General",      icon: "layers" },
  { id: "streams",   label: "Streams",      icon: "waves" },
  { id: "wallet",    label: IS_STELLAR_MODE ? "Wallet & XLM" : "Wallet & SOL", icon: "wallet" },
  { id: "agents",    label: "Agents",       icon: "bot" },
  { id: "technical", label: "Technical",    icon: "code-2" },
  { id: "roadmap",   label: "Roadmap",      icon: "map" },
];

const FAQ: Record<string, { q: string; a: string | React.ReactNode }[]> = {
  general: [
    {
      q: "What is Drip?",
      a: "Drip is a programmable cashflow protocol built on Solana. It lets any wallet stream SOL by the second — from human payroll to AI agent budgets — with rules enforced on-chain by an Anchor program. No custodians, no trust required.",
    },
    {
      q: "Who is Drip for?",
      a: "Anyone who moves money at a fixed cadence: teams doing crypto payroll, freelancers billing by the hour, developers metering API usage, and AI systems that need a per-second budget instead of a lump-sum wallet drain.",
    },
    {
      q: "Is Drip open source?",
      a: "Yes. The Anchor program and the Next.js frontend are both MIT-licensed. The on-chain program source lives in programs/drip/src/lib.rs.",
    },
    {
      q: "Is there a fee to use Drip?",
      a: "No protocol fee on devnet. The only costs are the standard Solana transaction fee (~0.000005 SOL per tx) and the rent-exempt reserve for on-chain accounts, which you get back when the stream is cancelled.",
    },
    {
      q: "Is Drip audited?",
      a: "Not yet. The current build is a hackathon MVP on devnet. A third-party security audit is planned before mainnet launch.",
    },
  ],
  streams: [
    {
      q: "How does a stream work?",
      a: "When you create a stream, SOL is locked into an escrow account. The Anchor program releases funds at your configured rate (SOL/sec) every block. The receiver can withdraw their earned balance at any time — no waiting for the stream to end.",
    },
    {
      q: "What is the minimum stream deposit?",
      a: "~0.00214 SOL per stream. This covers rent for the StreamState PDA (~0.00204 SOL) and a small funding buffer. The rent is returned to the payer when the stream is cancelled and accounts are closed.",
    },
    {
      q: "Can I pause or cancel a stream?",
      a: "Yes — the payer can pause (freezes accumulation), resume, or cancel at any time. On cancel, earned-but-unwithdrawn SOL is settled to the receiver and the remaining escrow is returned to the payer.",
    },
    {
      q: "How does a receiver withdraw funds?",
      a: "The receiver clicks Withdraw in the dashboard. The program computes unlocked balance since the last withdrawal, validates the receiver signature, and transfers SOL atomically. No need to wait for the stream to finish.",
    },
    {
      q: "What happens when a stream's deposit runs out?",
      a: "No new funds accumulate once the deposit is exhausted. The receiver can still withdraw any remaining unlocked balance. The stream moves to a completed state and the StreamState account can be closed.",
    },
    {
      q: "Can I set an expiry date on a stream?",
      a: "Yes. You set an expiry Unix timestamp at creation. After that timestamp, no new funds accumulate regardless of remaining deposit. The receiver can still withdraw any earned-but-unwithdrawn balance after expiry.",
    },
    {
      q: "Can I top up an existing stream?",
      a: "Top-up is on the roadmap. In the current MVP you would cancel and recreate the stream with a larger deposit. The UI includes a placeholder Top up button that will be wired in a future release.",
    },
  ],
  wallet: [
    {
      q: "Which wallets are supported?",
      a: "Any Solana wallet compatible with the Jupiter Unified Wallet Kit: Phantom, Backpack, Solflare, and most other popular wallets. More will be added as the adapter library grows.",
    },
    {
      q: "How do I get devnet SOL for testing?",
      a: (
        <>
          Visit <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-white underline underline-offset-2">faucet.solana.com</a> or run{" "}
          <code className="font-mono text-[12px] bg-white/[0.06] border border-white/10 rounded px-1.5 py-0.5 text-violet-200">
            solana airdrop 2 {"<YOUR_ADDRESS>"} --url devnet
          </code>{" "}
          from the CLI. Make sure your wallet is set to Devnet before connecting.
        </>
      ),
    },
    {
      q: "My wallet shows a warning about an unverified program. Is that normal?",
      a: "Yes — on devnet, Solana wallets often flag unverified programs because the program has not been through the on-chain verification registry. The program ID D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6 is safe to interact with on devnet for testing.",
    },
    {
      q: "Why does the dashboard show demo data even after I connect?",
      a: "The demo streams are shown as a visual baseline so the UI is never empty. Your real on-chain streams (if any) appear alongside them. The demo rows are labelled with '(demo)' in the stream label.",
    },
  ],
  agents: [
    {
      q: "What is the Agent demo on the dashboard?",
      a: "The Agents page shows a live inference log and a real-time spend counter. The terminal activity is a demo simulation — it is not executing real on-chain transactions. The budget panel at the top is wired to a real on-chain Drip stream when a wallet is connected.",
    },
    {
      q: "How does Drip help with AI agent budgets?",
      a: "Instead of giving an AI agent a lump-sum wallet, you create a stream to its address. The agent earns SOL per second up to your configured cap. You can pause or cancel mid-execution if the agent misbehaves — the remaining budget is never fully at risk.",
    },
    {
      q: "Can an agent withdraw its own earnings autonomously?",
      a: "That is the Agent Autopilot feature planned for Phase 1. Today the receiver must sign the withdrawal transaction manually. Autopilot will let the agent's keypair trigger withdrawals programmatically without human involvement.",
    },
    {
      q: "Is multi-agent (agent-to-agent) streaming supported?",
      a: "Any wallet can be a payer or receiver, including agent wallets. So yes — an AI agent can stream SOL to another agent's address. The demo on the Agents page illustrates what this looks like at runtime.",
    },
  ],
  technical: [
    {
      q: "What is the program ID?",
      a: (
        <>
          <code className="font-mono text-[12.5px] bg-white/[0.06] border border-white/10 rounded px-1.5 py-0.5 text-violet-200 break-all">
            D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6
          </code>{" "}
          — deployed on Solana Devnet. Verifiable on{" "}
          <a
            href="https://explorer.solana.com/address/D5u3CiH3drPiQfiXctrFe6yDCsFsqHcWQ5aAnC9pkKM6?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-300 hover:text-white underline underline-offset-2"
          >
            Solana Explorer
          </a>.
        </>
      ),
    },
    {
      q: "How is the unlocked balance calculated?",
      a: "The program stores last_withdraw_at (Unix timestamp). On withdraw, it computes: unlocked = rate_lamports_per_sec × (now − last_withdraw_at). The result is clamped to remaining escrow and the configured max_amount cap.",
    },
    {
      q: "What on-chain accounts does a stream create?",
      a: "Two accounts: a StreamState PDA (derived from payer + receiver + stream ID, stores all metadata) and an escrow system account (holds the SOL). Both are closed and rent refunded when the stream is cancelled.",
    },
    {
      q: "How is the StreamState PDA derived?",
      a: (
        <>
          Seeds:{" "}
          <code className="font-mono text-[12px] bg-white/[0.06] border border-white/10 rounded px-1.5 py-0.5 text-violet-200">
            [b"stream", payer, receiver, stream_id.to_le_bytes()]
          </code>
          . The stream ID is a unique BN generated per payer-receiver pair using a deterministic hash in{" "}
          <code className="font-mono text-[12px] bg-white/[0.06] border border-white/10 rounded px-1.5 py-0.5 text-violet-200">
            lib/solana/pda.ts
          </code>.
        </>
      ),
    },
    {
      q: "What framework is the on-chain program written in?",
      a: "Anchor 0.30.1 on Rust. The program has 19/19 tests passing against a local Solana validator.",
    },
    {
      q: "Can I integrate Drip into my own app?",
      a: "Yes — import the helpers directly from lib/solana/ in this repo. A standalone drip-sol npm package is planned for Phase 1 so you won't need to fork the whole dashboard.",
    },
  ],
  roadmap: [
    {
      q: "When is mainnet launching?",
      a: "Mainnet beta is planned for Q3 2026, after a third-party security audit. Teams streaming on devnet today will get early access.",
    },
    {
      q: "Will USDC and other SPL tokens be supported?",
      a: "Yes — the on-chain program is already parameterised for SPL tokens. UI wiring is the next milestone after the native SOL MVP stabilises.",
    },
    {
      q: "What is the drip-sol SDK?",
      a: "A lightweight TypeScript npm package that wraps the Anchor IDL so you can integrate Drip streams into any app without forking the dashboard. Planned for Phase 1.",
    },
    {
      q: "What is yield routing?",
      a: "Idle SOL locked in stream escrow accounts will be routed into Raydium concentrated liquidity vaults and auto-compounded each Solana epoch. The yield page in the dashboard shows the planned UI — it is not live yet.",
    },
    {
      q: "How can I follow the roadmap?",
      a: (
        <>
          Watch the GitHub repo and follow{" "}
          <a href="https://x.com/Drip_agents" target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-white underline underline-offset-2">
            @Drip_agents
          </a>{" "}
          on X for release announcements.
        </>
      ),
    },
  ],
};

function AccordionItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string | React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`border-b border-white/5 last:border-0 transition-colors ${open ? "bg-violet-400/[0.03]" : ""}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className={`text-[14.5px] leading-snug transition-colors ${open ? "text-white" : "text-white/75"}`}>
          {q}
        </span>
        <span
          className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 ${
            open
              ? "border-violet-400/40 bg-violet-400/10 text-violet-300 rotate-45"
              : "border-white/10 text-white/40"
          }`}
        >
          <Icon name="plus" size={12} />
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-[13.5px] text-white/55 leading-[1.75]">
          {a}
        </div>
      )}
    </div>
  );
}

const STELLAR_FAQ_NOTICE = IS_STELLAR_MODE
  ? "This FAQ covers the Stellar Testnet version of Drip. Streams use native XLM via Soroban smart contracts and Freighter wallet. Testnet only — no real funds."
  : null;

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState("general");
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const items = FAQ[activeCategory] ?? [];

  const handleCategory = (id: string) => {
    setActiveCategory(id);
    setOpenIdx(0);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#070612] relative">
      {/* Backdrop */}
      <DocsBackground />

      {/* Top nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5 bg-[#070612]/75">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" width={22} height={22} alt="Drip" />
            <span className="font-medium tracking-tight text-[15px]">Drip</span>
          </a>
          <span className="text-white/20 hidden sm:inline">/</span>
          <span className="text-[13px] text-white/55 hidden sm:inline">FAQ</span>
          <div className="ml-auto flex items-center gap-2">
            <a href="/docs" className="hidden sm:flex btn-ghost rounded-full px-3.5 py-1.5 text-[12.5px] text-white/75 items-center gap-1.5">
              <Icon name="book-open" size={13} /> Docs
            </a>
            <a href="/dashboard" className="btn-primary rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-white flex items-center gap-1.5">
              Launch app <Icon name="arrow-up-right" size={13} />
            </a>
            <button
              className="lg:hidden w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/60"
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              <Icon name={mobileNavOpen ? "x" : "menu"} size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto flex">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col w-[220px] shrink-0 py-8 px-4 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-mono px-2 mb-3">Categories</div>
          <nav className="space-y-0.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCategory(c.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition text-left ${
                  activeCategory === c.id
                    ? "bg-violet-400/10 text-violet-200 border border-violet-400/20"
                    : "text-white/50 hover:text-white hover:bg-white/[0.02] border border-transparent"
                }`}
              >
                <Icon name={c.icon} size={13} className={activeCategory === c.id ? "text-violet-300" : ""} />
                {c.label}
                <span className="ml-auto text-[10px] font-mono text-white/25">
                  {FAQ[c.id]?.length}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 space-y-1">
            <a href="/docs" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-white/40 hover:text-white transition">
              <Icon name="book-open" size={12} /> Full docs
            </a>
            <a href="https://x.com/Drip_agents" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-white/40 hover:text-white transition">
              <Icon name="twitter" size={12} /> @Drip_agents
            </a>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileNavOpen && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          >
            <div
              className="absolute top-[57px] left-0 w-[240px] h-full bg-[#0b0a1a] border-r border-white/5 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="space-y-0.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCategory(c.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] transition text-left ${
                      activeCategory === c.id
                        ? "bg-violet-400/10 text-violet-200"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Icon name={c.icon} size={14} />
                    {c.label}
                    <span className="ml-auto text-[10px] font-mono text-white/30">{FAQ[c.id]?.length}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-10 pb-24">
          {/* Hero */}
          <div className="mb-10">
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-violet-300/70 font-mono">
              Frequently asked questions
            </div>
            <h1 className="mt-2 text-[28px] sm:text-[38px] leading-[1.1] tracking-[-0.02em] font-medium text-iri">
              How can we help?
            </h1>
            <p className="mt-2.5 text-[14px] text-white/50 leading-[1.6] max-w-[540px]">
              Everything you need to know about streaming on Drip. Can't find what you're looking for?{" "}
              <a href="/docs" className="text-violet-300 hover:text-white transition">
                Read the full docs.
              </a>
            </p>
          </div>

          {/* Mobile breadcrumb */}
          <div className="lg:hidden flex items-center gap-1.5 flex-wrap mb-5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCategory(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition ${
                  activeCategory === c.id
                    ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
                    : "border-white/10 text-white/45 hover:text-white"
                }`}
              >
                <Icon name={c.icon} size={11} />
                {c.label}
              </button>
            ))}
          </div>

          {/* Accordion */}
          <div className="rounded-2xl glass overflow-hidden">
            {/* Category header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <Icon
                name={CATEGORIES.find((c) => c.id === activeCategory)?.icon ?? "layers"}
                size={14}
                className="text-violet-300"
              />
              <span className="text-[13px] font-medium text-white">
                {CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </span>
              <span className="ml-auto text-[11px] font-mono text-white/30">
                {items.length} questions
              </span>
            </div>

            {STELLAR_FAQ_NOTICE && (
              <div className="rounded-xl border border-sky-400/25 bg-sky-400/[0.06] px-4 py-3 flex items-start gap-3 mb-2">
                <Icon name="shield-check" size={14} className="text-sky-300 shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-sky-100/80 leading-relaxed">{STELLAR_FAQ_NOTICE}</p>
              </div>
            )}

            {items.map((item, i) => (
              <AccordionItem
                key={i}
                q={item.q}
                a={item.a}
                open={openIdx === i}
                onToggle={() => setOpenIdx((prev) => (prev === i ? null : i))}
              />
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-10 rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-400/10 text-violet-200 flex items-center justify-center shrink-0">
              <Icon name="message-circle" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] text-white font-medium">Still have questions?</div>
              <div className="text-[12.5px] text-white/50 mt-0.5">
                Open an issue on GitHub or reach out on X — we respond to every message.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://x.com/Drip_agents"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost rounded-full px-4 py-2 text-[12.5px] text-white/80 flex items-center gap-1.5"
              >
                <Icon name="twitter" size={13} /> @Drip_agents
              </a>
              <a
                href="/docs"
                className="btn-primary rounded-full px-4 py-2 text-[12.5px] font-medium text-white flex items-center gap-1.5"
              >
                <Icon name="book-open" size={13} /> Read docs
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
