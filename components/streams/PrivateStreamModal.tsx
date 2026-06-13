"use client";

// Drip Private — modal shown after creating a stream with Private Mode on.
// Generates a salt, computes the Pedersen commitment to the stream amount, and
// registers it on the drip_zk_verifier contract (payer-signed).

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { signStellarTx } from "@/lib/stellar/wallet";
import { submitSignedTx, EXPLORER_TX_URL } from "@/lib/stellar/transactions";
import { buildRegisterCommitment, isZkConfigured } from "@/lib/stellar/zkVerifier";
import { computeCommitment, generateSalt } from "@/lib/zk/zkProof";
import type { useFreighterWallet } from "@/lib/stellar/useFreighterWallet";

type Phase = "computing" | "ready" | "signing" | "submitting" | "done" | "error";

const shortHex = (h: string) => (h.length > 18 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h);

export function PrivateStreamModal({
  streamId,
  payerAddress,
  amountStroops,
  freighter,
  onClose,
  onRegistered,
}: {
  streamId: string;
  payerAddress: string;
  amountStroops: bigint;
  freighter: ReturnType<typeof useFreighterWallet>;
  onClose: () => void;
  onRegistered?: (streamId: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("computing");
  const [salt, setSalt] = useState<bigint | null>(null);
  const [commitment, setCommitment] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState<"salt" | "commitment" | "link" | null>(null);

  // Generate salt + commitment once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = generateSalt();
        const c = await computeCommitment(amountStroops, s);
        if (cancelled) return;
        setSalt(s);
        setCommitment(c);
        setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to compute commitment.");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [amountStroops]);

  const copy = useCallback((text: string, which: "salt" | "commitment") => {
    void navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const handleRegister = useCallback(async () => {
    if (!commitment || !freighter.networkPassphrase) return;
    setError(null);
    setPhase("signing");
    const build = await buildRegisterCommitment({
      payerAddress,
      streamId: BigInt(streamId),
      commitmentHex: commitment,
    });
    if (!build.ok || !build.txXdr) {
      setPhase("error");
      setError(build.error ?? "Failed to build registration transaction.");
      return;
    }
    const signed = await signStellarTx(build.txXdr, freighter.networkPassphrase);
    if (!signed.ok || !signed.signedTxXdr) {
      setPhase("error");
      setError(signed.error ?? "Signing cancelled.");
      return;
    }
    setPhase("submitting");
    const submit = await submitSignedTx(signed.signedTxXdr);
    if (!submit.ok) {
      setPhase("error");
      setError(submit.error ?? "Submission failed.");
      return;
    }
    setTxHash(submit.txHash ?? null);
    setPhase("done");
    // Save the salt locally so the proof form can auto-fill it later, and so a
    // shareable proof link can be generated for the receiver.
    if (typeof window !== "undefined" && salt !== null) {
      try {
        window.localStorage.setItem(`drip:proof-salt:${streamId}`, salt.toString());
      } catch {
        /* localStorage unavailable — non-fatal */
      }
    }
    onRegistered?.(streamId);
  }, [commitment, freighter.networkPassphrase, payerAddress, streamId, salt, onRegistered]);

  const copyProofLink = useCallback(() => {
    if (typeof window === "undefined" || salt === null) return;
    const link = `${window.location.origin}/dashboard?proof_stream=${streamId}&proof_salt=${salt.toString()}`;
    void navigator.clipboard?.writeText(link);
    setCopied("link");
    setTimeout(() => setCopied(null), 1500);
  }, [salt, streamId]);

  const busy = phase === "computing" || phase === "signing" || phase === "submitting";

  return (
    <div className="fixed inset-0 z-[60] fade-in">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[520px]">
        <div className="glass-strong border border-violet-400/25 bg-[#0b0a1a] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-violet-500/15 border border-violet-400/30 flex items-center justify-center">
                <Icon name="lock" size={14} className="text-violet-300" />
              </span>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-violet-300/70 font-mono">Drip Private</div>
                <h3 className="text-[16px] tracking-tight">Hide stream amount on-chain</h3>
              </div>
            </div>
            <button
              onClick={busy ? undefined : onClose}
              disabled={busy}
              className="w-8 h-8 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-40"
            >
              <Icon name="x" size={13} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-[12.5px] text-white/55 leading-relaxed">
              Your stream amount will be hidden behind a cryptographic{" "}
              <span className="text-violet-200">Pedersen commitment</span>. Register it on-chain so the
              receiver can later prove their income is above a threshold — without ever revealing the exact
              amount.
            </p>

            {!isZkConfigured() && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 text-[11.5px] text-amber-200/80">
                Set <code className="bg-white/10 px-1 rounded">NEXT_PUBLIC_STELLAR_ZK_CONTRACT_ID</code> in
                .env.local to enable on-chain registration.
              </div>
            )}

            {phase === "computing" && (
              <div className="flex items-center gap-2.5 text-[12.5px] text-violet-200/80 py-4">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-violet-300 border-t-transparent animate-spin" />
                Generating salt &amp; computing commitment…
              </div>
            )}

            {salt !== null && (
              <>
                {/* Salt — must be saved */}
                <div className="rounded-xl border border-rose-400/25 bg-rose-400/[0.04] p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-rose-300/80 font-mono flex items-center gap-1.5">
                      <Icon name="triangle-alert" size={11} /> Save this salt
                    </span>
                    <button
                      onClick={() => copy(salt.toString(), "salt")}
                      className="text-[10.5px] text-white/45 hover:text-white/80 flex items-center gap-1"
                    >
                      <Icon name="copy" size={11} /> {copied === "salt" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code className="block text-[11px] font-mono text-rose-100/90 break-all leading-relaxed">
                    {salt.toString()}
                  </code>
                  <p className="text-[10.5px] text-white/40 mt-1.5">
                    The receiver needs this exact value to generate income proofs. It is shown only once.
                  </p>
                </div>

                {/* Commitment */}
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-white/45 font-mono">
                      Commitment (registered on-chain)
                    </span>
                    <button
                      onClick={() => copy(commitment, "commitment")}
                      className="text-[10.5px] text-white/45 hover:text-white/80 flex items-center gap-1"
                    >
                      <Icon name="copy" size={11} /> {copied === "commitment" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code className="block text-[11px] font-mono text-violet-200/90 break-all">{shortHex(commitment)}</code>
                </div>
              </>
            )}

            {phase === "done" && (
              <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3.5 py-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[12.5px] text-violet-200 font-medium">
                  <Icon name="lock" size={13} className="text-violet-300" /> Commitment registered — stream is now private
                </div>
                <p className="text-[11px] text-white/45 leading-relaxed">
                  Share a link with the receiver — it auto-fills their proof form, no manual salt copy needed.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={copyProofLink}
                    className="text-[10.5px] text-violet-300/70 hover:text-violet-200 inline-flex items-center gap-1 transition-colors"
                  >
                    <Icon name="link" size={10} /> {copied === "link" ? "Copied!" : "Copy Proof Link"}
                  </button>
                  {txHash && (
                    <a
                      href={`${EXPLORER_TX_URL}${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10.5px] text-violet-300/60 hover:text-violet-200 inline-flex items-center gap-1 transition-colors"
                    >
                      View on explorer <Icon name="arrow-up-right" size={10} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {phase === "error" && error && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-3.5 py-2.5 flex items-start gap-2">
                <Icon name="triangle-alert" size={12} className="text-rose-300 shrink-0 mt-0.5" />
                <span className="text-[11.5px] text-rose-200/85 break-all">{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3">
            <button
              onClick={busy ? undefined : onClose}
              disabled={busy}
              className="btn-ghost rounded-full px-4 py-2 text-[12.5px] text-white/80 disabled:opacity-40"
            >
              {phase === "done" ? "Close" : "Skip"}
            </button>
            {phase !== "done" && (
              <button
                onClick={handleRegister}
                disabled={busy || phase !== "ready" || !isZkConfigured()}
                className={`flex-1 rounded-full py-2 text-[12.5px] font-medium flex items-center justify-center gap-2 transition border ${
                  !busy && phase === "ready" && isZkConfigured()
                    ? "border-violet-400/40 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30"
                    : "border-white/8 bg-white/5 text-white/35 cursor-not-allowed"
                }`}
              >
                {phase === "signing" || phase === "submitting" ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-violet-200 border-t-transparent animate-spin" />
                    {phase === "signing" ? "Waiting for Freighter…" : "Registering…"}
                  </>
                ) : (
                  <>
                    <Icon name="lock" size={13} /> Register Commitment
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
