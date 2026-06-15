"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { useFreighterWallet } from "@/lib/stellar/useFreighterWallet";
import { signStellarTx } from "@/lib/stellar/wallet";
import {
  buildCreateStream,
  buildPauseStream,
  buildResumeStream,
  buildWithdraw,
  buildCancelStream,
  submitSignedTx as submitStellarTx,
  getStreamState,
  EXPLORER_TX_URL,
  EXPLORER_ACCOUNT_URL,
  type BuildResult as StellarBuildResult,
  type StreamState as StellarStreamState,
} from "@/lib/stellar/transactions";
import type { UseStellarStreamsReturn, TrackedStream } from "@/lib/stellar/useStellarStreams";
import { PrivateStreamModal } from "@/components/streams/PrivateStreamModal";
import { GenerateProofButton } from "@/components/streams/GenerateProofButton";
import { getCommitment, isZkConfigured } from "@/lib/stellar/zkVerifier";

// =========================================================================
// HELPERS (top-level so sub-components can use them)
// =========================================================================
const shortAddr = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-6)}` : "—";

const stroopsToXlmNum = (stroops: string): number => {
  try {
    return Number(BigInt(stroops || "0")) / 10_000_000;
  } catch {
    return 0;
  }
};

const stroopsToXlmStr = (stroops: string): string => {
  const n = stroopsToXlmNum(stroops);
  if (isNaN(n)) return "? XLM";
  return n.toFixed(7).replace(/\.?0+$/, "") + " XLM";
};

// =========================================================================
// STELLAR AVATAR — sky/cyan gradient circle (mirrors SolAvatar)
// =========================================================================
function StellarAvatar({ addr = "x", size = 36 }: { addr?: string; size?: number }) {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = ((h << 5) - h) + addr.charCodeAt(i);
  // Lock to sky-cyan hue band (170–210°)
  const hue1 = (Math.abs(h) % 40) + 175;
  const hue2 = (hue1 + 35) % 360;
  return (
    <span
      className="relative inline-block rounded-full overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 30%, hsl(${hue1}, 80%, 65%), hsl(${hue2}, 75%, 45%) 70%, hsl(${(hue1 + 180) % 360}, 70%, 30%))`,
        }}
      />
      <span
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(${Math.abs(h) % 180}deg, transparent 0 4px, rgba(255,255,255,0.08) 4px 5px)`,
        }}
      />
    </span>
  );
}

// =========================================================================
// STELLAR STATUS PILL — matches Solana StatusPill shape
// =========================================================================
function StellarStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; c: string }> = {
    Active:    { label: "ACTIVE",    c: "border-emerald-400/30 text-emerald-300 bg-emerald-400/5" },
    Paused:    { label: "PAUSED",    c: "border-amber-400/30  text-amber-300  bg-amber-400/5"    },
    Cancelled: { label: "CANCELLED", c: "border-white/15      text-white/55   bg-white/5"         },
    Completed: { label: "COMPLETED", c: "border-white/15      text-white/55   bg-white/5"         },
  };
  const m = map[status] ?? map["Active"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-[0.16em] ${m.c}`}>
      {m.label}
    </span>
  );
}

// =========================================================================
// STELLAR STREAM CARD — matches StreamCard layout, sky/cyan palette
// =========================================================================
type TxPhase = "idle" | "building" | "preview" | "signing" | "submitting" | "done" | "error";
type PreviewInfo = {
  actionLabel: string;
  streamId?: string;
  receiver?: string;
  amountXlm?: string;
  amountStroops?: string;
  duration?: string;
};

function StellarStreamCard({
  stream,
  streamId,
  txPhase,
  txError,
  txResult,
  previewInfo,
  onPause,
  onResume,
  onWithdraw,
  onCancel,
  onSign,
  onReset,
  actionEnabled,
  isPrivate = false,
  proofButton = null,
}: {
  stream: StellarStreamState;
  streamId: string;
  txPhase: TxPhase;
  txError: string | null;
  txResult: { txHash?: string; returnValue?: unknown } | null;
  previewInfo: PreviewInfo | null;
  onPause: () => void;
  onResume: () => void;
  onWithdraw: () => void;
  onCancel: () => void;
  onSign: () => void;
  onReset: () => void;
  actionEnabled: (action: "pause" | "resume" | "withdraw" | "cancel") => boolean;
  isPrivate?: boolean;
  proofButton?: React.ReactNode;
}) {
  const isActive = stream.status === "Active";
  const isBusy = txPhase === "building" || txPhase === "signing" || txPhase === "submitting";

  // Large number display for withdrawn amount
  const withdrawnXlm = stroopsToXlmNum(stream.withdrawn);
  const totalXlm     = stroopsToXlmNum(stream.amount);
  const progress     = totalXlm > 0 ? Math.min(100, (withdrawnXlm / totalXlm) * 100) : 0;

  const withdrawnStr   = withdrawnXlm.toFixed(6);
  const [whole = "0", decimal = "000000"] = withdrawnStr.split(".");
  const stableDec = decimal.slice(0, 2);
  const fastDec   = decimal.slice(2);

  return (
    <div className="rounded-2xl glass p-5 relative overflow-hidden hover:border-sky-400/25 transition">
      {/* Sky glow orb when Active */}
      {isActive && (
        <div
          className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.6) 0%, transparent 70%)" }}
        />
      )}

      {/* ── Top row: avatar + from/to + status pill ── */}
      <div className="flex items-start justify-between relative">
        <div className="flex items-center gap-3 min-w-0">
          <StellarAvatar addr={stream.payer} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Icon name="arrow-up-right" size={11} className="text-sky-300" />
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">From</span>
            </div>
            <div className="text-[14px] text-white truncate font-mono">{shortAddr(stream.payer)}</div>
            <div className="text-[11px] font-mono text-white/40 truncate">XLM Stream · Stellar Testnet</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isPrivate && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-violet-400/30 text-violet-200 bg-violet-400/10 text-[10px] font-mono uppercase tracking-[0.16em]">
              Private
            </span>
          )}
          <StellarStatusPill status={stream.status} />
        </div>
      </div>

      {/* ── Withdrawn amount — DRIP large number ── */}
      <div className="mt-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">Withdrawn</div>
        <div className="mt-1 flex items-baseline gap-0.5 num-stable">
          <span className="text-sky-400/60 text-[14px] font-mono mr-0.5">XLM</span>
          <span className="text-sky-200 text-[26px] font-num leading-none tracking-[-0.02em]">{whole}</span>
          <span className="text-sky-200 text-[26px] font-num leading-none tracking-[-0.02em]">.</span>
          <span className="text-sky-200 text-[26px] font-num leading-none tracking-[-0.02em]">{stableDec}</span>
          <span className="text-sky-300/70 text-[14px] font-num leading-none tracking-[-0.02em]">{fastDec}</span>
        </div>
        <div className="text-[11px] text-white/40 font-mono mt-1.5">
          {isPrivate ? (
            <span className="text-violet-200/70 inline-flex items-center gap-1"><Icon name="shield-check" size={10} className="text-violet-300/70" /> Private Proof Enabled</span>
          ) : (
            <>total {stroopsToXlmStr(stream.amount)}</>
          )}{" "}
          · stream #{streamId}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10.5px] font-mono text-white/45 mb-1.5">
          <span>{progress.toFixed(1)}% withdrawn{isPrivate ? "" : ` of ${stroopsToXlmStr(stream.amount)}`}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden relative">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400/40 to-sky-300 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Tx state overlays (building / preview / signing / done / error) ── */}
      {txPhase === "building" && (
        <div className="mt-3 rounded-lg border border-sky-400/15 bg-sky-400/5 px-3 py-2.5 flex items-center gap-2.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-sky-300 border-t-transparent animate-spin shrink-0" />
          <div>
            <p className="text-[12px] text-sky-200 font-medium">Simulating transaction…</p>
            <p className="text-[10.5px] text-white/35 mt-0.5">Preparing via Soroban RPC.</p>
          </div>
        </div>
      )}

      {(txPhase === "signing" || txPhase === "submitting") && (
        <div className="mt-3 rounded-lg border border-sky-400/15 bg-sky-400/5 px-3 py-2.5 flex items-center gap-2.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-sky-300 border-t-transparent animate-spin shrink-0" />
          <p className="text-[12px] text-sky-200 font-medium">
            {txPhase === "signing" ? "Waiting for Freighter…" : "Submitting to Stellar Testnet…"}
          </p>
        </div>
      )}

      {txPhase === "preview" && previewInfo && (
        <div className="mt-3 rounded-lg border border-sky-400/20 bg-sky-400/5 p-3.5 space-y-2.5">
          <span className="text-[9.5px] uppercase tracking-[0.16em] text-sky-300/65 font-mono block">Transaction Preview</span>
          <div className="space-y-1">
            {[
              ["Action", previewInfo.actionLabel],
              ["Network", "Stellar Testnet"],
              ["Stream ID", previewInfo.streamId],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[11px] font-mono">
                <span className="text-white/30 w-16 shrink-0">{k}</span>
                <span className="text-white/70">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-amber-200/55">Testnet only · no real funds · Freighter approval required.</p>
          <div className="flex items-center gap-2">
            <button onClick={onReset} className="flex-1 btn-ghost rounded-full py-1.5 text-[11.5px] text-white/45">
              Cancel
            </button>
            <button
              onClick={onSign}
              className="flex-1 rounded-full py-1.5 text-[12px] font-medium border border-sky-400/40 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30 transition flex items-center justify-center gap-1.5"
            >
              <Icon name="fingerprint" size={12} /> Sign in Freighter
            </button>
          </div>
        </div>
      )}

      {txPhase === "done" && txResult && (
        <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Icon name="check-circle-2" size={11} className="text-emerald-300 shrink-0" />
            <span className="text-[11.5px] text-emerald-300 font-medium">Transaction confirmed</span>
          </div>
          {txResult.txHash && (
            <div className="flex items-center gap-2 text-[11px] font-mono flex-wrap">
              <span className="text-white/30">TX</span>
              <span className="text-white/55">{txResult.txHash.slice(0, 10)}…{txResult.txHash.slice(-6)}</span>
              <a
                href={`${EXPLORER_TX_URL}${txResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400/70 hover:text-sky-300 flex items-center gap-0.5 underline underline-offset-2"
              >
                Explorer <Icon name="arrow-up-right" size={10} />
              </a>
            </div>
          )}
          <button onClick={onReset} className="text-[11px] btn-ghost rounded-full px-3 py-0.5 text-white/40">
            Close
          </button>
        </div>
      )}

      {txPhase === "error" && txError && (
        <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2.5 flex items-start gap-2">
          <Icon name="triangle-alert" size={11} className="text-rose-300 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[11px] text-rose-200 break-all">{txError}</span>
            <button onClick={onReset} className="ml-2 text-[11px] text-white/40 hover:text-white/70 underline">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom row: receiver address + action buttons ── */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-[10.5px] font-mono text-white/35 truncate min-w-0">
          {shortAddr(stream.receiver)}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Income proof — only for private streams */}
          {proofButton}
          {/* Pause — only when Active */}
          {actionEnabled("pause") && (
            <button
              onClick={onPause}
              disabled={isBusy}
              title="Pause stream"
              className="btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-amber-300/70 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isBusy
                ? <span className="inline-block w-3 h-3 rounded-full border-2 border-amber-300 border-t-transparent animate-spin" />
                : <Icon name="pause" size={12} />}
            </button>
          )}
          {/* Resume — only when Paused */}
          {actionEnabled("resume") && (
            <button
              onClick={onResume}
              disabled={isBusy}
              title="Resume stream"
              className="btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-emerald-300/70 hover:text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="play" size={12} />
            </button>
          )}
          {/* Withdraw — Active streams (receiver action) */}
          {actionEnabled("withdraw") && (
            <button
              onClick={onWithdraw}
              disabled={isBusy}
              title="Withdraw"
              className="btn-ghost rounded-md h-8 px-2.5 flex items-center gap-1 text-sky-300/70 hover:text-sky-200 text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="download" size={11} /> Withdraw
            </button>
          )}
          {/* Cancel — not Cancelled/Completed */}
          {actionEnabled("cancel") && (
            <button
              onClick={onCancel}
              disabled={isBusy}
              title="Cancel stream"
              className="btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/50 hover:text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="x" size={12} />
            </button>
          )}
          {/* Explorer — tx link if available, else payer account */}
          <a
            href={txResult?.txHash ? `${EXPLORER_TX_URL}${txResult.txHash}` : `${EXPLORER_ACCOUNT_URL}${stream.payer}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View on Stellar Explorer"
            className="btn-ghost rounded-md w-8 h-8 flex items-center justify-center text-white/50 hover:text-sky-300"
          >
            <Icon name="arrow-up-right" size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// STELLAR STATUS STRIP — slim single-row header
// =========================================================================
function StellarStatusStrip({
  freighter,
  isTestnet,
}: {
  freighter: ReturnType<typeof useFreighterWallet>;
  isTestnet: boolean;
}) {
  return (
    <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.03] px-4 py-2.5 flex items-center gap-3 flex-wrap">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-white font-medium">Stellar Testnet</span>
      </div>

      {/* Wallet / connect */}
      <div className="ml-auto flex items-center gap-2">
        {freighter.connected ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[11px] font-mono text-white/55">
              {freighter.address ? `${freighter.address.slice(0, 6)}...${freighter.address.slice(-4)}` : ""}
            </span>
            {!isTestnet && (
              <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded-full border border-rose-400/30 text-rose-300 bg-rose-400/5">
                Wrong network
              </span>
            )}
            <button
              onClick={freighter.disconnect}
              className="text-[11px] font-mono text-white/30 hover:text-white/60 transition px-2.5 py-1 rounded-full border border-white/8 hover:border-white/15"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={freighter.connect}
            disabled={freighter.connecting || !freighter.available}
            className={`btn-primary rounded-full px-3 py-1.5 text-[12px] font-medium text-white flex items-center gap-1.5 ${
              freighter.connecting || !freighter.available ? "opacity-55 cursor-not-allowed" : ""
            }`}
          >
            {freighter.connecting ? (
              <>
                <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Icon name="fingerprint" size={12} /> Connect Freighter
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// STELLAR NEW STREAM DRAWER — right slide-over, matches Solana NewStreamDrawer
// =========================================================================
function StellarNewStreamDrawer({
  onClose,
  freighter,
  // form
  createReceiver, setCreateReceiver,
  createAmount,   setCreateAmount,
  createDurationHours, setCreateDurationHours,
  privateMode, setPrivateMode,
  createFormValid,
  amountStroops,
  durationValid,
  isValidGAddr,
  // tx
  txPhase,
  txError,
  txResult,
  previewInfo,
  onPreview,
  onSign,
  onReset,
}: {
  onClose: () => void;
  freighter: ReturnType<typeof useFreighterWallet>;
  createReceiver: string; setCreateReceiver: (v: string) => void;
  createAmount: string;   setCreateAmount: (v: string) => void;
  createDurationHours: string; setCreateDurationHours: (v: string) => void;
  privateMode: boolean; setPrivateMode: (v: boolean) => void;
  createFormValid: boolean;
  amountStroops: bigint | null;
  durationValid: boolean;
  isValidGAddr: (addr: string) => boolean;
  txPhase: TxPhase;
  txError: string | null;
  txResult: { txHash?: string; returnValue?: unknown } | null;
  previewInfo: PreviewInfo | null;
  onPreview: () => void;
  onSign: () => void;
  onReset: () => void;
}) {
  const isBusy   = txPhase === "building" || txPhase === "signing" || txPhase === "submitting";
  const isDone   = txPhase === "done";
  const showForm = txPhase === "idle" || txPhase === "error";

  return (
    <div className="fixed inset-0 z-50 fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isBusy ? undefined : onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[520px] slide-in">
        <div className="h-full glass-strong border-l border-sky-400/20 bg-[#0b0a1a] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-white/5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-sky-300/70 font-mono">
                New XLM stream · Stellar Testnet
              </div>
              <h3 className="mt-1 text-[20px] tracking-tight">Stream native XLM.</h3>
            </div>
            <button
              onClick={isBusy ? undefined : onClose}
              disabled={isBusy}
              className="w-9 h-9 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="x" size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto px-7 py-6 space-y-6">

            {/* ── Building ── */}
            {txPhase === "building" && (
              <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 px-5 py-4 flex items-center gap-3">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-sky-300 border-t-transparent animate-spin shrink-0" />
                <div>
                  <p className="text-[13px] text-sky-200 font-medium">Simulating transaction</p>
                  <p className="text-[11px] text-white/35 mt-0.5">Preparing via Soroban RPC — no signature requested yet.</p>
                </div>
              </div>
            )}

            {/* ── Preview ── */}
            {txPhase === "preview" && previewInfo && (
              <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-5 space-y-4">
                <span className="text-[10px] uppercase tracking-[0.16em] text-sky-300/65 font-mono">Transaction Preview</span>
                <div className="rounded-lg border border-white/8 bg-black/20 p-3.5 space-y-2">
                  {(
                    [
                      ["Action",   previewInfo.actionLabel],
                      ["Network",  "Stellar Testnet"],
                      ["Contract", shortAddr(process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID ?? "not configured")],
                      ["Signer",   shortAddr(freighter.address ?? "")],
                      previewInfo.receiver  ? ["Receiver", shortAddr(previewInfo.receiver)]  : null,
                      previewInfo.amountXlm ? ["Amount",   previewInfo.amountXlm]            : null,
                      previewInfo.duration  ? ["Duration", previewInfo.duration]              : null,
                      ["Token",    "Native XLM"],
                    ] as ([string, string] | null)[]
                  ).filter(Boolean).map((row) => (
                    <div key={row![0]} className="flex items-start gap-3">
                      <span className="text-[10.5px] text-white/30 font-mono w-20 shrink-0 pt-0.5">{row![0]}</span>
                      <span className="text-[11.5px] text-white/70 font-mono break-all">{row![1]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10.5px] text-amber-200/55">
                  Testnet only · no real funds · Freighter will show you the full transaction before you approve.
                </p>
              </div>
            )}

            {/* ── Signing / Submitting ── */}
            {(txPhase === "signing" || txPhase === "submitting") && (
              <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 px-5 py-4 flex items-center gap-3">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-sky-300 border-t-transparent animate-spin shrink-0" />
                <div>
                  <p className="text-[13px] text-sky-200 font-medium">
                    {txPhase === "signing" ? "Waiting for Freighter…" : "Submitting to Stellar Testnet…"}
                  </p>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    {txPhase === "signing"
                      ? "Review and approve the transaction in Freighter."
                      : "Broadcasting and polling for confirmation."}
                  </p>
                </div>
              </div>
            )}

            {/* ── Done ── */}
            {txPhase === "done" && txResult && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[13px] text-emerald-300 font-medium">Transaction confirmed</span>
                </div>
                {txResult.txHash && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10.5px] text-white/30 font-mono">TX</span>
                    <span className="text-[11px] text-white/60 font-mono">
                      {txResult.txHash.slice(0, 12)}…{txResult.txHash.slice(-8)}
                    </span>
                    <a
                      href={`${EXPLORER_TX_URL}${txResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10.5px] text-sky-400/70 hover:text-sky-300 underline underline-offset-2 flex items-center gap-1"
                    >
                      View on explorer <Icon name="arrow-up-right" size={10} />
                    </a>
                  </div>
                )}
                {txResult.returnValue !== undefined && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10.5px] text-white/30 font-mono">Stream ID</span>
                    <span className="text-[12px] text-sky-300 font-mono font-medium">{String(txResult.returnValue)}</span>
                    <span className="text-[10px] text-white/25">— paste this into Load Stream to manage it</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Error ── */}
            {txPhase === "error" && txError && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 flex items-start gap-2">
                <Icon name="triangle-alert" size={13} className="text-rose-300 shrink-0 mt-0.5" />
                <span className="text-[12px] text-rose-200 break-all">{txError}</span>
              </div>
            )}

            {/* ── Form ── */}
            {showForm && (
              <>
                {/* Receiver */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">
                      Receiver address
                    </label>
                    <span className="text-[11px] text-white/35">Stellar G… address</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-sky-400/40 transition">
                    <Icon name="at-sign" size={14} className="text-white/45" />
                    <input
                      type="text"
                      value={createReceiver}
                      onChange={(e) => setCreateReceiver(e.target.value.trim())}
                      placeholder="GXXXXXXX... (56-char Stellar address)"
                      className="flex-1 bg-transparent outline-none text-[13px] font-mono text-white placeholder-white/25"
                    />
                    {createReceiver && isValidGAddr(createReceiver) && (
                      <Icon name="check-circle-2" size={14} className="text-emerald-300 shrink-0" />
                    )}
                  </div>
                  {createReceiver && !isValidGAddr(createReceiver) && (
                    <p className="text-[11px] text-rose-300/80 mt-1.5 flex items-center gap-1">
                      <Icon name="triangle-alert" size={11} />
                      Must be a valid Stellar G... address (56 chars)
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">Amount</label>
                    <span className="text-[11px] text-white/35">Native XLM · Soroban</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-sky-400/40 transition">
                    <span className="text-sky-400/60 text-[13px] font-mono shrink-0">XLM</span>
                    <input
                      type="number"
                      min="0.0000001"
                      step="0.1"
                      value={createAmount}
                      onChange={(e) => setCreateAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-transparent outline-none text-[22px] font-num text-sky-200 num-stable [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                  {createAmount && amountStroops === null && (
                    <p className="text-[11px] text-rose-300/80 mt-1.5">Amount must be greater than 0</p>
                  )}
                  {amountStroops !== null && (
                    <p className="text-[10.5px] text-white/25 font-mono mt-1">{amountStroops.toString()} stroops</p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">Duration</label>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-sky-400/40 transition">
                    <Icon name="clock" size={14} className="text-white/45" />
                    <input
                      type="number"
                      min="0.016"
                      step="1"
                      value={createDurationHours}
                      onChange={(e) => setCreateDurationHours(e.target.value)}
                      placeholder="24"
                      className="flex-1 bg-transparent outline-none text-[18px] font-num text-white num-stable"
                    />
                    <span className="text-[11px] font-mono text-white/25">hours</span>
                  </div>
                  {createDurationHours && !durationValid && (
                    <p className="text-[11px] text-rose-300/80 mt-1.5">Duration must be greater than 0</p>
                  )}
                  {durationValid && (
                    <p className="text-[10.5px] text-white/25 font-mono mt-1">
                      ends in{" "}
                      {parseFloat(createDurationHours) >= 24
                        ? `${(parseFloat(createDurationHours) / 24).toFixed(1)} days`
                        : `${createDurationHours} hours`}
                    </p>
                  )}
                </div>

                {/* Private Mode toggle (Drip Private) */}
                <button
                  type="button"
                  onClick={() => setPrivateMode(!privateMode)}
                  className={`w-full rounded-xl border p-3.5 flex items-center gap-3 text-left transition ${
                    privateMode
                      ? "border-violet-400/35 bg-violet-500/[0.06]"
                      : "border-white/8 bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                      privateMode
                        ? "bg-violet-500/20 border-violet-400/40 text-violet-200"
                        : "bg-white/5 border-white/10 text-white/40"
                    }`}
                  >
                    <Icon name="lock" size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] text-white">Private Mode</span>
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.16em] text-violet-300/70">
                        Drip Private
                      </span>
                    </span>
                    <span className="block text-[11px] text-white/45 mt-0.5">
                      Hide the amount on-chain with a ZK commitment. After creating, you&apos;ll register the
                      commitment and save a salt for income proofs.
                    </span>
                  </span>
                  <span
                    className={`relative w-9 h-5 rounded-full shrink-0 transition ${
                      privateMode ? "bg-violet-500/60" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        privateMode ? "left-[1.15rem]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>

                {/* Safety note */}
                <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.03] p-3.5 text-[11.5px] font-mono text-white/40 leading-relaxed">
                  Testnet only · native XLM · Freighter signature required · no private keys stored · chain-isolated from Solana
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-7 py-5 border-t border-white/5">
            <div className="flex items-center gap-3">
              <button
                onClick={isBusy ? undefined : (isDone ? onReset : onClose)}
                disabled={isBusy}
                className="btn-ghost rounded-full px-4 py-2.5 text-[13px] text-white/85 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDone ? "Create another" : "Cancel"}
              </button>

              {/* Sign button when preview ready */}
              {txPhase === "preview" && (
                <button
                  onClick={onSign}
                  disabled={isBusy}
                  className="flex-1 rounded-full py-2.5 text-[13px] font-medium border border-sky-400/40 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Icon name="fingerprint" size={13} /> Sign in Freighter
                </button>
              )}

              {/* Preview button when idle or error */}
              {(txPhase === "idle" || txPhase === "error") && (
                <button
                  onClick={onPreview}
                  disabled={!createFormValid}
                  className={`flex-1 rounded-full py-2.5 text-[13px] font-medium text-white transition ${
                    createFormValid
                      ? "bg-sky-500/20 border border-sky-400/35 hover:bg-sky-500/30 hover:border-sky-400/55"
                      : "opacity-40 cursor-not-allowed bg-white/5 border border-white/8"
                  }`}
                >
                  Preview transaction
                </button>
              )}

              {/* Done state — show Close */}
              {isDone && (
                <button
                  onClick={onClose}
                  className="flex-1 rounded-full py-2.5 text-[13px] font-medium border border-white/15 text-white/70 hover:border-white/30 hover:text-white transition"
                >
                  Close
                </button>
              )}
            </div>

            {/* Chain info footnote */}
            <div className="mt-3 pt-3 border-t border-white/[0.04] text-[10px] font-mono text-white/25">
              Stellar Testnet · Soroban · native XLM · no bridge · chain-isolated from Solana
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// STELLAR TRACKED STREAM CARD
// Self-contained card that manages its own tx phase state, enabling
// multiple independent stream cards to coexist.
// =========================================================================
function StellarTrackedStreamCard({
  stream,
  freighter,
  onRemove,
}: {
  stream: TrackedStream;
  freighter: ReturnType<typeof useFreighterWallet>;
  onRemove?: (streamId: string) => void;
}) {
  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [pendingXdr, setPendingXdr] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo | null>(null);
  const [txResult, setTxResult] = useState<{ txHash?: string; returnValue?: unknown } | null>(null);
  // Local mirror of on-chain state — refreshed after each tx
  const [localState, setLocalState] = useState<StellarStreamState | null>(stream.onChainState);
  // Whether this stream has a registered ZK commitment (Drip Private).
  const [isPrivate, setIsPrivate] = useState(false);
  // Whether we arrived via a shared proof link targeting this stream — if so we
  // auto-open the proof drawer once we know the stream is private.
  const [proofLinkMatch, setProofLinkMatch] = useState(false);

  useEffect(() => {
    setLocalState(stream.onChainState);
  }, [stream.onChainState]);

  // Detect a shared proof link (?proof_stream=<id>) on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("proof_stream") === stream.streamId) setProofLinkMatch(true);
    } catch {
      /* URL access failed — ignore */
    }
  }, [stream.streamId]);

  // Detect a registered commitment to show the Private badge + proof button.
  useEffect(() => {
    let cancelled = false;
    if (!isZkConfigured() || !freighter.address) return;
    (async () => {
      const r = await getCommitment({
        sourceAddress: freighter.address!,
        streamId: BigInt(stream.streamId),
      });
      if (!cancelled && r.ok) setIsPrivate(!!r.commitmentHex);
    })();
    return () => {
      cancelled = true;
    };
  }, [freighter.address, stream.streamId]);

  const resetTx = useCallback(() => {
    setTxPhase("idle");
    setTxError(null);
    setPendingXdr(null);
    setPreviewInfo(null);
    setTxResult(null);
  }, []);

  const handleBuild = useCallback(
    async (buildFn: () => Promise<StellarBuildResult>, preview: PreviewInfo) => {
      setTxPhase("building");
      setTxError(null);
      const result = await buildFn();
      if (!result.ok || !result.txXdr) {
        setTxPhase("error");
        setTxError(result.error ?? "Failed to build transaction.");
        return;
      }
      setPendingXdr(result.txXdr);
      setPreviewInfo(preview);
      setTxPhase("preview");
    },
    [],
  );

  const handleSign = useCallback(async () => {
    if (!pendingXdr || !freighter.networkPassphrase) return;
    setTxPhase("signing");
    const signResult = await signStellarTx(pendingXdr, freighter.networkPassphrase);
    if (!signResult.ok || !signResult.signedTxXdr) {
      setTxPhase("error");
      setTxError(signResult.error ?? "Signing cancelled or failed.");
      return;
    }
    setTxPhase("submitting");
    const submitResult = await submitStellarTx(signResult.signedTxXdr);
    if (!submitResult.ok) {
      setTxPhase("error");
      setTxError(submitResult.error ?? "Submission failed.");
      return;
    }
    setTxResult({ txHash: submitResult.txHash, returnValue: submitResult.returnValue });
    setTxPhase("done");
    // Refresh on-chain state — poll twice since Stellar testnet block time is ~5-6s
    const refreshState = async () => {
      try {
        const r = await getStreamState(BigInt(stream.streamId));
        if (r.ok && r.stream) setLocalState(r.stream);
      } catch { /* ignore */ }
    };
    setTimeout(refreshState, 6000);
    setTimeout(refreshState, 12000);
  }, [pendingXdr, freighter.networkPassphrase, stream.streamId]);

  const handleAction = useCallback(
    async (action: "pause" | "resume" | "withdraw" | "cancel") => {
      if (!freighter.address) return;
      const streamId = BigInt(stream.streamId);
      const buildFns: Record<string, () => Promise<StellarBuildResult>> = {
        pause:    () => buildPauseStream(  { callerAddress: freighter.address!, streamId }),
        resume:   () => buildResumeStream( { callerAddress: freighter.address!, streamId }),
        withdraw: () => buildWithdraw(     { callerAddress: freighter.address!, streamId }),
        cancel:   () => buildCancelStream( { callerAddress: freighter.address!, streamId }),
      };
      const labels: Record<string, string> = {
        pause: "Pause Stream", resume: "Resume Stream", withdraw: "Withdraw", cancel: "Cancel Stream",
      };
      await handleBuild(buildFns[action], { actionLabel: labels[action], streamId: stream.streamId });
    },
    [freighter.address, stream.streamId, handleBuild],
  );

  const actionEnabled = (action: "pause" | "resume" | "withdraw" | "cancel"): boolean => {
    const s = localState?.status;
    if (!s) return false;
    const wallet = freighter.address ?? "";
    const payer    = localState?.payer    || stream.payer    || "";
    const receiver = localState?.receiver || stream.receiver || "";
    const isPayer    = wallet === payer;
    const isReceiver = wallet === receiver;
    if (action === "pause")    return s === "Active"  && isPayer;
    if (action === "resume")   return s === "Paused"  && isPayer;
    if (action === "withdraw") return s === "Active"  && isReceiver;
    if (action === "cancel")   return s !== "Cancelled" && s !== "Completed" && isPayer;
    return true;
  };

  // Loading skeleton
  if (stream.isLoading && !localState) {
    return (
      <div className="rounded-2xl glass p-5 space-y-3 animate-pulse">
        <div className="h-3 bg-white/5 rounded w-1/3" />
        <div className="h-7 bg-white/5 rounded w-1/2" />
        <div className="h-2 bg-white/5 rounded w-full" />
      </div>
    );
  }

  // Error / not found state
  if (!localState) {
    return (
      <div className="rounded-2xl glass p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-mono text-white/55">Stream #{stream.streamId}</div>
          <div className="mt-1 text-[11.5px] text-rose-300/70 flex items-center gap-1.5">
            <Icon name="triangle-alert" size={11} className="shrink-0" />
            <span className="truncate">{stream.loadError ?? "State unavailable — ledger entry may have expired."}</span>
          </div>
          <div className="mt-1.5 text-[10.5px] font-mono text-white/30">Last known: {stream.lastKnownStatus}</div>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(stream.streamId)}
            className="shrink-0 text-white/25 hover:text-rose-300 transition"
            title="Remove from local list"
          >
            <Icon name="x" size={13} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative group">
      <StellarStreamCard
        stream={localState}
        streamId={stream.streamId}
        txPhase={txPhase}
        txError={txError}
        txResult={txResult}
        previewInfo={previewInfo}
        onPause={() => handleAction("pause")}
        onResume={() => handleAction("resume")}
        onWithdraw={() => handleAction("withdraw")}
        onCancel={() => handleAction("cancel")}
        onSign={handleSign}
        onReset={resetTx}
        actionEnabled={actionEnabled}
        isPrivate={isPrivate}
        proofButton={(() => {
          const receiver = localState?.receiver || stream.receiver || "";
          const isReceiver = !!freighter.address && freighter.address === receiver;
          return isPrivate && isReceiver ? (
            <GenerateProofButton
              streamId={stream.streamId}
              sourceAddress={freighter.address ?? null}
              defaultAmountXlm={(() => {
                const stroops = localState?.amount ?? stream.amountStroops;
                return stroops ? (Number(BigInt(stroops)) / 10_000_000).toString() : undefined;
              })()}
              autoOpen={proofLinkMatch && isPrivate}
              compact
            />
          ) : null;
        })()}
      />
      {onRemove && (
        <div className="mt-3 pt-3 border-t border-white/5 flex justify-end opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onRemove(stream.streamId)}
            className="flex items-center gap-1 text-[10.5px] text-white/25 hover:text-rose-300 transition"
          >
            Remove from list
          </button>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// STELLAR STREAM PANEL — main export
// Rendered in StreamsPage → Stellar Testnet tab.
// =========================================================================
export function StellarStreamPanel({
  freighter,
  stellarStreams,
}: {
  freighter: ReturnType<typeof useFreighterWallet>;
  stellarStreams?: UseStellarStreamsReturn;
}) {
  const contractConfigured = !!(
    process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID &&
    process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID !== "REPLACE_WITH_STELLAR_TESTNET_CONTRACT_ID"
  );
  const isTestnet =
    !freighter.network ||
    freighter.network.toLowerCase().includes("test") ||
    freighter.network.toLowerCase().includes("testnet");
  const wrongNetwork = freighter.connected && !isTestnet;
  const canInteract  = freighter.connected && isTestnet && contractConfigured;

  // ── Drawer ───────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Drip Private ───────────────────────────────────────────────────────────
  const [privateMode, setPrivateMode] = useState(false);
  const [privateModal, setPrivateModal] = useState<{ streamId: string; amountStroops: bigint } | null>(
    null,
  );

  // ── Create stream form ───────────────────────────────────────────────────
  const [createReceiver,      setCreateReceiver]      = useState("");
  const [createAmount,        setCreateAmount]        = useState("");
  const [createDurationHours, setCreateDurationHours] = useState("24");

  // ── Manage stream ────────────────────────────────────────────────────────
  const [manageId,        setManageId]        = useState("");
  const [loadedStream,    setLoadedStream]    = useState<StellarStreamState | null>(null);
  const [streamLoading,   setStreamLoading]   = useState(false);
  const [streamLoadError, setStreamLoadError] = useState<string | null>(null);

  // ── Transaction flow ─────────────────────────────────────────────────────
  const [txPhase,      setTxPhase]      = useState<TxPhase>("idle");
  const [txError,      setTxError]      = useState<string | null>(null);
  const [pendingXdr,   setPendingXdr]   = useState<string | null>(null);
  const [previewInfo,  setPreviewInfo]  = useState<PreviewInfo | null>(null);
  const [txResult,     setTxResult]     = useState<{ txHash?: string; returnValue?: unknown } | null>(null);

  // Refs to carry create-stream context into handleSign (cannot use state
  // because handleSign closes over stale values if set asynchronously).
  const pendingStroopsRef  = useRef<string>("0");
  const pendingReceiverRef = useRef<string>("");

  // ── Validation ───────────────────────────────────────────────────────────
  const isValidGAddr = (addr: string) => /^G[A-Z2-7]{55}$/.test(addr);

  const amountStroops = useMemo<bigint | null>(() => {
    const n = parseFloat(createAmount);
    if (isNaN(n) || n <= 0) return null;
    return BigInt(Math.round(n * 10_000_000));
  }, [createAmount]);

  const durationValid = useMemo(
    () => parseFloat(createDurationHours) > 0 && !isNaN(parseFloat(createDurationHours)),
    [createDurationHours],
  );

  const createFormValid = isValidGAddr(createReceiver) && amountStroops !== null && durationValid;
  const manageIdValid   = /^\d+$/.test(manageId.trim()) && parseInt(manageId.trim()) > 0;

  // ── Tx helpers ───────────────────────────────────────────────────────────
  const resetTx = useCallback(() => {
    setTxPhase("idle");
    setTxError(null);
    setPendingXdr(null);
    setPreviewInfo(null);
    setTxResult(null);
  }, []);

  const handleBuild = useCallback(
    async (buildFn: () => Promise<StellarBuildResult>, preview: PreviewInfo) => {
      setTxPhase("building");
      setTxError(null);
      const result = await buildFn();
      if (!result.ok || !result.txXdr) {
        setTxPhase("error");
        setTxError(result.error ?? "Failed to build transaction.");
        return;
      }
      setPendingXdr(result.txXdr);
      setPreviewInfo(preview);
      setTxPhase("preview");
    },
    [],
  );

  const handleSign = useCallback(async () => {
    if (!pendingXdr || !freighter.networkPassphrase) return;
    setTxPhase("signing");
    const signResult = await signStellarTx(pendingXdr, freighter.networkPassphrase);
    if (!signResult.ok || !signResult.signedTxXdr) {
      setTxPhase("error");
      setTxError(signResult.error ?? "Signing cancelled or failed.");
      return;
    }
    setTxPhase("submitting");
    const submitResult = await submitStellarTx(signResult.signedTxXdr);
    if (!submitResult.ok) {
      setTxPhase("error");
      setTxError(submitResult.error ?? "Submission failed.");
      return;
    }
    setTxResult({ txHash: submitResult.txHash, returnValue: submitResult.returnValue });
    setTxPhase("done");

    // ── Save new stream to registry ────────────────────────────────────────
    // Only applies to create_stream (previewInfo.actionLabel === "Create Stream").
    // The contract returns the new stream ID as returnValue when successful.
    const isCreate = previewInfo?.actionLabel === "Create Stream";
    if (isCreate && freighter.address && stellarStreams && submitResult.returnValue !== undefined) {
      const rawId = String(submitResult.returnValue);
      if (/^\d+$/.test(rawId)) {
        stellarStreams.addStream({
          streamId: rawId,
          payer: freighter.address,
          receiver: pendingReceiverRef.current,
          amountStroops: pendingStroopsRef.current,
          createdTxHash: submitResult.txHash,
          createdAt: new Date().toISOString(),
          lastKnownStatus: "Active",
          lastLoadedAt: new Date().toISOString(),
        });
        // Drip Private: after creation, open the commitment-registration modal.
        if (privateMode) {
          setPrivateModal({ streamId: rawId, amountStroops: BigInt(pendingStroopsRef.current) });
        }
      }
    }

    // Auto-refresh state for manage-stream actions — poll twice for Stellar testnet ~5-6s block time
    if (!isCreate && manageId && manageIdValid) {
      const refreshManage = async () => {
        try {
          const r = await getStreamState(BigInt(manageId.trim()));
          if (r.ok && r.stream) setLoadedStream(r.stream);
        } catch { /* ignore */ }
      };
      setTimeout(refreshManage, 6000);
      setTimeout(refreshManage, 12000);
    }
  }, [pendingXdr, freighter.networkPassphrase, previewInfo, freighter.address, stellarStreams, manageId, manageIdValid, privateMode]);

  const handleCreateStream = useCallback(async () => {
    if (!freighter.address || !amountStroops) return;
    // Capture context for the registry save that happens in handleSign
    pendingReceiverRef.current = createReceiver;
    pendingStroopsRef.current  = amountStroops.toString();
    const nowSecs     = Math.floor(Date.now() / 1000);
    const durationSecs = Math.round(parseFloat(createDurationHours) * 3600);
    const endTime     = nowSecs + durationSecs;
    const durationLabel =
      parseFloat(createDurationHours) >= 24
        ? `${(parseFloat(createDurationHours) / 24).toFixed(1)}d`
        : `${createDurationHours}h`;
    await handleBuild(
      () =>
        buildCreateStream({
          payerAddress:    freighter.address!,
          receiverAddress: createReceiver,
          amountStroops,
          startTime: nowSecs,
          endTime,
        }),
      {
        actionLabel:  "Create Stream",
        receiver:     createReceiver,
        amountXlm:    parseFloat(createAmount).toFixed(7).replace(/\.?0+$/, "") + " XLM",
        amountStroops: amountStroops.toString() + " stroops",
        duration:     durationLabel,
      },
    );
  }, [freighter.address, createReceiver, createAmount, createDurationHours, amountStroops, handleBuild]);

  const handleAction = useCallback(
    async (action: "pause" | "resume" | "withdraw" | "cancel") => {
      if (!freighter.address || !manageIdValid) return;
      const streamId = BigInt(manageId.trim());
      const buildFns: Record<string, () => Promise<StellarBuildResult>> = {
        pause:    () => buildPauseStream(  { callerAddress: freighter.address!, streamId }),
        resume:   () => buildResumeStream( { callerAddress: freighter.address!, streamId }),
        withdraw: () => buildWithdraw(     { callerAddress: freighter.address!, streamId }),
        cancel:   () => buildCancelStream( { callerAddress: freighter.address!, streamId }),
      };
      const labels: Record<string, string> = {
        pause:    "Pause Stream",
        resume:   "Resume Stream",
        withdraw: "Withdraw",
        cancel:   "Cancel Stream",
      };
      await handleBuild(buildFns[action], { actionLabel: labels[action], streamId: manageId });
    },
    [freighter.address, manageId, manageIdValid, handleBuild],
  );

  const handleLoadStream = useCallback(async () => {
    if (!manageIdValid) return;
    setStreamLoading(true);
    setStreamLoadError(null);
    resetTx();
    const r = await getStreamState(BigInt(manageId.trim()));
    setStreamLoading(false);
    if (r.ok && r.stream) {
      setLoadedStream(r.stream);
      // Save to registry if payer or receiver matches connected wallet
      const matches =
        freighter.address &&
        (r.stream.payer === freighter.address || r.stream.receiver === freighter.address);
      if (matches && freighter.address && stellarStreams) {
        stellarStreams.addStream({
          streamId: manageId.trim(),
          payer: r.stream.payer,
          receiver: r.stream.receiver,
          amountStroops: r.stream.amount,
          lastKnownStatus: r.stream.status,
          lastLoadedAt: new Date().toISOString(),
        });
      } else if (freighter.address && !matches) {
        setStreamLoadError(`Stream #${manageId.trim()} loaded but not saved — your wallet is not payer or receiver.`);
      }
    } else {
      setStreamLoadError(r.error ?? "Failed to load stream.");
      setLoadedStream(null);
    }
  }, [manageId, manageIdValid, resetTx, freighter.address, stellarStreams]);

  const actionEnabled = (action: "pause" | "resume" | "withdraw" | "cancel"): boolean => {
    if (!loadedStream) return true; // allow; contract enforces auth & status
    const s = loadedStream.status;
    if (action === "pause")    return s === "Active";
    if (action === "resume")   return s === "Paused";
    if (action === "withdraw") return s === "Active";
    if (action === "cancel")   return s !== "Cancelled" && s !== "Completed";
    return true;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Slim status strip */}
      <StellarStatusStrip
        freighter={freighter}
        isTestnet={isTestnet}
      />

      {/* Freighter not installed */}
      {!freighter.available && !freighter.connecting && (
        <p className="text-[12px] text-amber-200/65 px-1">
          Install the{" "}
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-amber-100"
          >
            Freighter extension
          </a>{" "}
          to use Stellar streams.
        </p>
      )}

      {/* Wrong network banner */}
      {wrongNetwork && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3">
          <Icon name="triangle-alert" size={13} className="text-rose-300 shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-rose-200/80">
            Freighter is on <span className="font-mono">{freighter.network}</span>.{" "}
            Switch to <strong>Testnet</strong> in Freighter settings.
          </p>
        </div>
      )}

      {/* Contract not configured */}
      {!contractConfigured && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
          <p className="text-[11.5px] text-white/40 leading-relaxed">
            Set{" "}
            <code className="text-white/55 bg-white/8 px-1 rounded">NEXT_PUBLIC_STELLAR_CONTRACT_ID</code>
            {" "}and{" "}
            <code className="text-white/55 bg-white/8 px-1 rounded">NEXT_PUBLIC_STELLAR_RPC_URL</code>
            {" "}in <code className="text-white/55 bg-white/8 px-1 rounded">.env.local</code> to enable stream actions.
          </p>
        </div>
      )}

      {/* Connection error */}
      {freighter.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3">
          <Icon name="triangle-alert" size={13} className="text-rose-300 shrink-0 mt-0.5" />
          <span className="text-[12px] text-rose-200/80 break-all">{freighter.error}</span>
        </div>
      )}

      {/* ── Interactive area (wallet connected + testnet + configured) ── */}
      {canInteract && (
        <>
          {/* Action bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* + New XLM stream */}
            <button
              onClick={() => { resetTx(); setDrawerOpen(true); }}
              className="btn-primary rounded-full px-4 py-2 text-[13px] font-medium text-white flex items-center gap-1.5"
            >
              <Icon name="plus" size={13} /> New XLM stream
            </button>

            {/* Find stream by ID */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[340px]">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 bg-white/[0.02] flex-1 focus-within:border-sky-400/30 transition">
                <Icon name="search" size={12} className="text-white/35 shrink-0" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={manageId}
                  onChange={(e) => {
                    setManageId(e.target.value.trim());
                    setLoadedStream(null);
                    setStreamLoadError(null);
                    resetTx();
                  }}
                  onKeyDown={(e) => e.key === "Enter" && manageIdValid && !streamLoading && handleLoadStream()}
                  placeholder="Stream ID"
                  className="flex-1 bg-transparent outline-none text-[12.5px] font-mono text-white/85 placeholder-white/25 min-w-0"
                />
              </div>
              <button
                onClick={handleLoadStream}
                disabled={!manageIdValid || streamLoading}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-medium transition border ${
                  manageIdValid && !streamLoading
                    ? "border-sky-400/30 text-sky-200 hover:border-sky-400/55 hover:bg-sky-500/10"
                    : "border-white/8 text-white/25 cursor-not-allowed"
                }`}
              >
                {streamLoading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-sky-300 border-t-transparent animate-spin" />
                    Loading
                  </span>
                ) : "Load"}
              </button>
            </div>
          </div>

          {/* Validation: non-numeric input */}
          {manageId && !manageIdValid && (
            <p className="text-[11.5px] font-mono text-white/40 px-1">
              Only numeric Stellar stream IDs are supported for now.
            </p>
          )}

          {/* Load error / info */}
          {streamLoadError && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5">
              <Icon name="info" size={12} className="text-amber-300 shrink-0" />
              <p className="text-[12px] text-amber-200/80">{streamLoadError}</p>
            </div>
          )}

          {/* ── My Stellar Streams ── */}
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-mono">My Stellar Streams</span>
                {stellarStreams && stellarStreams.count > 0 && (
                  <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-full bg-sky-400/10 text-sky-300">
                    {stellarStreams.count}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {stellarStreams && !stellarStreams.loading && !stellarStreams.discovering && (
                  <button
                    onClick={() => void stellarStreams.discover()}
                    className="text-[11px] font-mono text-white/30 hover:text-violet-300 flex items-center gap-1 transition"
                    title="Scan chain for all streams involving your wallet"
                  >
                    <Icon name="search" size={11} /> Scan
                  </button>
                )}
                {stellarStreams && !stellarStreams.loading && !stellarStreams.discovering && (
                  <button
                    onClick={() => void stellarStreams.refresh()}
                    className="text-[11px] font-mono text-white/30 hover:text-white/60 flex items-center gap-1 transition"
                    title="Refresh all streams"
                  >
                    <Icon name="rotate-ccw" size={11} /> Refresh
                  </button>
                )}
                {stellarStreams && stellarStreams.count > 0 && (
                  <button
                    onClick={stellarStreams.clearAll}
                    className="text-[11px] font-mono text-white/25 hover:text-rose-300 transition"
                    title="Clear local tracked stream list"
                  >
                    Clear local list
                  </button>
                )}
              </div>
            </div>

            {/* Discovery state */}
            {stellarStreams?.discovering && (
              <div className="flex items-center gap-2 text-[12px] text-white/45 font-mono px-1">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-300 border-t-transparent animate-spin" />
                Scanning chain for your streams…
              </div>
            )}

            {/* Loading state */}
            {stellarStreams?.loading && !stellarStreams.discovering && (
              <div className="flex items-center gap-2 text-[12px] text-white/45 font-mono px-1">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-sky-300 border-t-transparent animate-spin" />
                Loading stream states…
              </div>
            )}

            {/* Tracked stream cards */}
            {stellarStreams && !stellarStreams.loading && stellarStreams.streams.length > 0 && (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {stellarStreams.streams.map((stream) => (
                  <StellarTrackedStreamCard
                    key={stream.streamId}
                    stream={stream}
                    freighter={freighter}
                    onRemove={stellarStreams.removeStream}
                  />
                ))}
              </div>
            )}

            {/* Empty state — no tracked streams */}
            {stellarStreams && !stellarStreams.loading && !stellarStreams.discovering && stellarStreams.streams.length === 0 && (
              <div className="rounded-2xl glass p-8 text-center space-y-2">
                <div className="text-[14px] text-white/50">No streams found for this wallet.</div>
                <div className="text-[12px] font-mono text-white/30">
                  Create a new XLM stream, or scan the chain to find streams sent to you.
                </div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={() => { resetTx(); setDrawerOpen(true); }}
                    className="btn-primary rounded-full px-4 py-2 text-[12.5px] font-medium text-white inline-flex items-center gap-1.5"
                  >
                    <Icon name="plus" size={12} /> New stream
                  </button>
                  <button
                    onClick={() => void stellarStreams.discover()}
                    className="rounded-full px-4 py-2 text-[12.5px] font-medium border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition inline-flex items-center gap-1.5"
                  >
                    <Icon name="search" size={12} /> Scan for streams
                  </button>
                </div>
              </div>
            )}

            {/* Fallback when no registry prop — old single-stream view */}
            {!stellarStreams && (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loadedStream ? (
                  <StellarStreamCard
                    stream={loadedStream}
                    streamId={manageId}
                    txPhase={txPhase}
                    txError={txError}
                    txResult={txResult}
                    previewInfo={previewInfo}
                    onPause={() => handleAction("pause")}
                    onResume={() => handleAction("resume")}
                    onWithdraw={() => handleAction("withdraw")}
                    onCancel={() => handleAction("cancel")}
                    onSign={handleSign}
                    onReset={resetTx}
                    actionEnabled={actionEnabled}
                  />
                ) : (
                  <div className="col-span-full py-8 px-4 text-[14px] text-white/50">
                    Enter a stream ID above to load it.
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── New Stream slide-over drawer ── */}
      {drawerOpen && (
        <StellarNewStreamDrawer
          onClose={() => {
            setDrawerOpen(false);
            resetTx();
            // Reset form fields when closing after a successful create
            if (txPhase === "done") {
              setCreateReceiver("");
              setCreateAmount("");
              setCreateDurationHours("24");
            }
          }}
          freighter={freighter}
          createReceiver={createReceiver}
          setCreateReceiver={setCreateReceiver}
          createAmount={createAmount}
          setCreateAmount={setCreateAmount}
          createDurationHours={createDurationHours}
          setCreateDurationHours={setCreateDurationHours}
          privateMode={privateMode}
          setPrivateMode={setPrivateMode}
          createFormValid={createFormValid}
          amountStroops={amountStroops}
          durationValid={durationValid}
          isValidGAddr={isValidGAddr}
          txPhase={txPhase}
          txError={txError}
          txResult={txResult}
          previewInfo={previewInfo}
          onPreview={handleCreateStream}
          onSign={handleSign}
          onReset={resetTx}
        />
      )}

      {/* ── Drip Private: register commitment after a private stream is created ── */}
      {privateModal && freighter.address && (
        <PrivateStreamModal
          streamId={privateModal.streamId}
          payerAddress={freighter.address}
          amountStroops={privateModal.amountStroops}
          freighter={freighter}
          onClose={() => setPrivateModal(null)}
          onRegistered={() => {
            void stellarStreams?.refresh();
          }}
        />
      )}
    </div>
  );
}
