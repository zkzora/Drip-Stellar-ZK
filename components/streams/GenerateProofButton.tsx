"use client";

// Drip Private — receiver-side button + drawer to generate an income proof and
// verify it on Stellar. Proves "I earn at least <threshold>/month from this
// stream" without revealing the actual amount.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { generateIncomeProof, proofToHex } from "@/lib/zk/zkProof";
import { verifyIncomeProof, isZkConfigured } from "@/lib/stellar/zkVerifier";

const STROOPS_PER_XLM = 10_000_000;

function xlmToStroops(xlm: string): bigint | null {
  const n = parseFloat(xlm);
  if (isNaN(n) || n <= 0) return null;
  return BigInt(Math.round(n * STROOPS_PER_XLM));
}

type Phase = "form" | "proving" | "proved" | "verifying" | "verified" | "rejected" | "error";

export function GenerateProofButton({
  streamId,
  sourceAddress,
  defaultAmountXlm,
  compact = false,
  autoOpen = false,
}: {
  streamId: string;
  /** A funded account used as the source for the read-only verify simulation. */
  sourceAddress: string | null;
  /** Optional prefill for the stream amount (XLM). */
  defaultAmountXlm?: string;
  compact?: boolean;
  /** Open the drawer immediately on mount (e.g. arriving via a shared proof link). */
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen ?? false);
  const [phase, setPhase] = useState<Phase>("form");
  const [amount, setAmount] = useState(defaultAmountXlm ?? "");
  const [amountLocked] = useState(!!defaultAmountXlm);
  const [salt, setSalt] = useState("");
  const [saltAutoFilled, setSaltAutoFilled] = useState(false);
  const [threshold, setThreshold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [proofHex, setProofHex] = useState<string>("");
  const [proofBytes, setProofBytes] = useState<Uint8Array | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-fill the salt from a shared proof link (URL params) or, failing that,
  // from localStorage saved when the payer registered the commitment. This lets
  // the receiver skip the manual salt copy-paste step entirely.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("proof_stream") === streamId) {
        const linkSalt = params.get("proof_salt");
        if (linkSalt) {
          setSalt(linkSalt);
          setSaltAutoFilled(true);
          // Strip the salt from the URL bar so it doesn't linger or get shared.
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
      }
      const stored = window.localStorage.getItem(`drip:proof-salt:${streamId}`);
      if (stored) {
        setSalt(stored);
        setSaltAutoFilled(true);
      }
    } catch {
      /* URL / storage access failed — fall back to manual entry */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amountStroops = useMemo(() => xlmToStroops(amount), [amount]);
  const thresholdStroops = useMemo(() => xlmToStroops(threshold), [threshold]);
  const saltValid = useMemo(() => /^\d+$/.test(salt.trim()) && salt.trim().length > 0, [salt]);
  const formValid = amountStroops !== null && thresholdStroops !== null && saltValid;

  const reset = useCallback(() => {
    setPhase("form");
    setError(null);
    setProofHex("");
    setProofBytes(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!amountStroops || !thresholdStroops || !saltValid) return;
    setError(null);
    setPhase("proving");
    try {
      const result = await generateIncomeProof({
        amount: amountStroops,
        salt: BigInt(salt.trim()),
        threshold: thresholdStroops,
      });
      setProofBytes(result.proof);
      setProofHex(proofToHex(result.proof));
      setPhase("proved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Proof generation failed.");
      setPhase("error");
    }
  }, [amountStroops, thresholdStroops, saltValid, salt]);

  const handleVerify = useCallback(async () => {
    if (!proofBytes || !thresholdStroops) return;
    if (!sourceAddress) {
      setError("Connect a wallet to verify on Stellar.");
      setPhase("error");
      return;
    }
    setError(null);
    setPhase("verifying");
    const res = await verifyIncomeProof({
      sourceAddress,
      streamId: BigInt(streamId),
      threshold: thresholdStroops,
      proof: proofBytes,
    });
    if (!res.ok) {
      setError(res.error ?? "Verification call failed.");
      setPhase("error");
      return;
    }
    setPhase(res.verified ? "verified" : "rejected");
  }, [proofBytes, thresholdStroops, sourceAddress, streamId]);

  const copyProof = useCallback(() => {
    void navigator.clipboard?.writeText(proofHex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [proofHex]);

  const busy = phase === "proving" || phase === "verifying";

  return (
    <>
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        title="Generate income proof"
        className={
          compact
            ? "btn-ghost rounded-md h-8 px-2.5 flex items-center gap-1 text-violet-300/80 hover:text-violet-200 text-[11px]"
            : "rounded-full px-3.5 py-2 text-[12px] font-medium border border-violet-400/30 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 transition flex items-center gap-1.5"
        }
      >
        <Icon name="shield-check" size={compact ? 12 : 13} /> Income Proof
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] fade-in">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={busy ? undefined : () => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-[480px] slide-in">
            <div className="h-full glass-strong border-l border-violet-400/20 bg-[#0b0a1a] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-violet-500/15 border border-violet-400/30 flex items-center justify-center">
                    <Icon name="shield-check" size={14} className="text-violet-300" />
                  </span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">
                      Drip Private · Stream #{streamId}
                    </div>
                    <h3 className="text-[17px] tracking-tight">Generate Income Proof</h3>
                  </div>
                </div>
                <button
                  onClick={busy ? undefined : () => setOpen(false)}
                  disabled={busy}
                  className="w-8 h-8 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-40"
                >
                  <Icon name="x" size={13} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
                <p className="text-[12px] text-white/55 leading-relaxed">
                  Prove your income from this stream is at least the threshold — without revealing the actual
                  amount. The proof is generated locally in your browser.
                </p>

                {!isZkConfigured() && (
                  <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 text-[11.5px] text-amber-200/80">
                    Set <code className="bg-white/10 px-1 rounded">NEXT_PUBLIC_STELLAR_ZK_CONTRACT_ID</code> to
                    verify proofs on Stellar.
                  </div>
                )}

                {/* Threshold */}
                <Field label="Threshold amount" hint="e.g. prove you earn ≥ 100 XLM/month">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-violet-400/40 transition">
                    <span className="text-violet-300/60 text-[12px] font-mono shrink-0">XLM</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      placeholder="100"
                      className="flex-1 bg-transparent outline-none text-[18px] font-num text-violet-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </Field>

                {/* Amount (private) — locked when pre-filled from stream data */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">
                      Stream amount (private)
                    </label>
                    {amountLocked ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-300/60 normal-case tracking-normal">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" /> auto-filled
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-white/30">stays on your device</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 transition">
                    <span className="text-white/40 text-[12px] font-mono shrink-0">XLM</span>
                    <input
                      type="number"
                      min="0"
                      step="0.0000001"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      readOnly={amountLocked}
                      disabled={amountLocked}
                      placeholder="500"
                      className="flex-1 bg-transparent outline-none text-[16px] font-num text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-default"
                    />
                    <Icon name="lock" size={12} className={amountLocked ? "text-emerald-300/50" : "text-white/30"} />
                  </div>
                </div>

                {/* Salt */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono flex items-center gap-2">
                      Your salt
                      {saltAutoFilled && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-300/70 normal-case tracking-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> auto-filled
                        </span>
                      )}
                    </label>
                    {saltAutoFilled ? (
                      <button
                        onClick={() => {
                          setSalt("");
                          setSaltAutoFilled(false);
                        }}
                        className="text-[10.5px] text-white/30 hover:text-white/60 transition-colors"
                      >
                        Clear
                      </button>
                    ) : (
                      <span className="text-[10.5px] text-white/30">The value saved when the stream was created</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-violet-400/40 transition">
                    <Icon name="hash" size={13} className="text-white/40" />
                    <input
                      type="text"
                      value={salt}
                      onChange={(e) => setSalt(e.target.value.trim())}
                      readOnly={saltAutoFilled}
                      disabled={saltAutoFilled}
                      placeholder="Paste your salt"
                      className="flex-1 bg-transparent outline-none text-[12.5px] font-mono text-white placeholder-white/25 disabled:cursor-default"
                    />
                    {saltValid && <Icon name="check-circle-2" size={13} className="text-emerald-300 shrink-0" />}
                  </div>
                </div>

                {/* Proving */}
                {phase === "proving" && (
                  <div className="rounded-xl border border-violet-400/15 bg-violet-400/5 px-4 py-3.5 flex items-center gap-3">
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-violet-300 border-t-transparent animate-spin shrink-0" />
                    <div>
                      <p className="text-[12.5px] text-violet-200 font-medium">Generating zero-knowledge proof…</p>
                      <p className="text-[10.5px] text-white/35 mt-0.5">This runs locally and takes ~5–10 seconds.</p>
                    </div>
                  </div>
                )}

                {/* Proof ready */}
                {(phase === "proved" || phase === "verifying" || phase === "verified" || phase === "rejected") &&
                  proofHex && (
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-white/45 font-mono">
                          Proof ({proofBytes?.length ?? 0} bytes)
                        </span>
                        <button onClick={copyProof} className="text-[10.5px] text-white/45 hover:text-white/80 flex items-center gap-1">
                          <Icon name="copy" size={11} /> {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <code className="block text-[10.5px] font-mono text-white/55 break-all max-h-20 overflow-auto">
                        {proofHex.slice(0, 220)}…
                      </code>
                    </div>
                  )}

                {phase === "verified" && (
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-3.5">
                    <div className="flex items-center gap-2 text-[14px] text-emerald-300 font-medium">
                      <Icon name="check-circle-2" size={16} /> Income Verified
                    </div>
                    <p className="text-[12px] text-emerald-200/75 mt-1">
                      Stream pays ≥ {threshold} XLM/month · verified on Stellar
                    </p>
                  </div>
                )}

                {phase === "rejected" && (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 flex items-start gap-2">
                    <Icon name="x-circle" size={14} className="text-rose-300 shrink-0 mt-0.5" />
                    <span className="text-[12px] text-rose-200/85">
                      Proof did not verify. Check the amount, salt, and threshold match the registered commitment.
                    </span>
                  </div>
                )}

                {phase === "error" && error && (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 flex items-start gap-2">
                    <Icon name="triangle-alert" size={13} className="text-rose-300 shrink-0 mt-0.5" />
                    <span className="text-[11.5px] text-rose-200/85 break-all">{error}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3">
                <button
                  onClick={busy ? undefined : () => setOpen(false)}
                  disabled={busy}
                  className="btn-ghost rounded-full px-4 py-2 text-[12.5px] text-white/80 disabled:opacity-40"
                >
                  Close
                </button>
                {(phase === "form" || phase === "error") && (
                  <button
                    onClick={handleGenerate}
                    disabled={!formValid || busy}
                    className={`flex-1 rounded-full py-2 text-[12.5px] font-medium flex items-center justify-center gap-2 transition border ${
                      formValid && !busy
                        ? "border-violet-400/40 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30"
                        : "border-white/8 bg-white/5 text-white/35 cursor-not-allowed"
                    }`}
                  >
                    <Icon name="shield-check" size={13} /> Generate Proof
                  </button>
                )}
                {(phase === "proved" || phase === "rejected" || phase === "verifying") && (
                  <button
                    onClick={handleVerify}
                    disabled={busy || !isZkConfigured()}
                    className={`flex-1 rounded-full py-2 text-[12.5px] font-medium flex items-center justify-center gap-2 transition border ${
                      !busy && isZkConfigured()
                        ? "border-violet-400/40 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30"
                        : "border-white/8 bg-white/5 text-white/35 cursor-not-allowed"
                    }`}
                  >
                    {phase === "verifying" ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-violet-200 border-t-transparent animate-spin" />
                        Verifying on Stellar…
                      </>
                    ) : (
                      <>
                        <Icon name="fingerprint" size={13} /> Verify on Stellar
                      </>
                    )}
                  </button>
                )}
                {phase === "verified" && (
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full py-2 text-[12.5px] font-medium border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 transition"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">{label}</label>
        {hint && <span className="text-[10.5px] text-white/30">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
