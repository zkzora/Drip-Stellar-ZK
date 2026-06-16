"use client";

// Drip Private — public proof verification page.
//
// Anyone (a landlord, grant committee, client) can paste a share code from a
// stream receiver and confirm on-chain that the receiver's income meets a
// threshold — without ever learning the actual amount. No wallet required: the
// page runs a read-only `verify_income_proof` simulation using a throwaway
// Friendbot-funded account.

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { DocsBackground } from "@/components/ui/backgrounds";
import { decodeProofPackage, getSimulationSource, clearSimulationSource, type DecodedProof } from "@/lib/stellar/proofShare";
import { verifyIncomeProof, isZkConfigured } from "@/lib/stellar/zkVerifier";

const STROOPS_PER_XLM = 10_000_000;

type Phase = "input" | "verifying" | "verified" | "rejected" | "error";

function stroopsToXlm(stroops: bigint): string {
  const xlm = Number(stroops) / STROOPS_PER_XLM;
  return xlm.toLocaleString(undefined, { maximumFractionDigits: 7 });
}

function looksLikeAccountMissing(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes("not found") || m.includes("notfound") || m.includes("404") || m.includes("account");
}

export default function VerifyPage() {
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<DecodedProof | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const configured = useMemo(() => isZkConfigured(), []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCode(String(reader.result ?? ""));
    reader.readAsText(file);
  }, []);

  const runVerify = useCallback(async () => {
    setError(null);

    let pkg: DecodedProof;
    try {
      pkg = decodeProofPackage(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read share code.");
      setPhase("error");
      return;
    }
    setDecoded(pkg);
    setPhase("verifying");

    const attempt = async (forceNew: boolean) => {
      const source = await getSimulationSource(forceNew);
      return verifyIncomeProof({
        sourceAddress: source,
        streamId: BigInt(pkg.streamId),
        threshold: pkg.thresholdStroops,
        proof: pkg.proof,
      });
    };

    try {
      let res = await attempt(false);
      // If the cached simulation account was reaped by a testnet reset, mint a
      // fresh one and retry once.
      if (!res.ok && res.error && looksLikeAccountMissing(res.error)) {
        clearSimulationSource();
        res = await attempt(true);
      }
      if (!res.ok) {
        setError(res.error ?? "Verification call failed.");
        setPhase("error");
        return;
      }
      setPhase(res.verified ? "verified" : "rejected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
      setPhase("error");
    }
  }, [code]);

  const reset = useCallback(() => {
    setPhase("input");
    setError(null);
    setDecoded(null);
  }, []);

  const busy = phase === "verifying";

  return (
    <div className="relative min-h-screen text-white">
      <DocsBackground />
      <div className="relative z-10 max-w-[640px] mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" width={26} height={26} alt="Drip" />
            <span className="font-medium tracking-tight text-[16px]">Drip</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-[12.5px] text-white/55 hover:text-white flex items-center gap-1.5 transition"
          >
            Open app <Icon name="arrow-up-right" size={13} />
          </Link>
        </div>

        {/* Title */}
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-violet-300/70 font-mono mb-1.5">Drip Private</div>
          <h1 className="text-[26px] tracking-tight font-medium">Verify Income Proof</h1>
        </div>
        <p className="text-[13.5px] text-white/55 leading-relaxed mb-8 max-w-[520px]">
          Paste a share code from a stream receiver to confirm — on-chain — that their income meets a
          threshold. The actual amount stays private. No wallet needed.
        </p>

        {!configured && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 mb-6 text-[12px] text-amber-200/80">
            Verifier contract is not configured in this deployment.
          </div>
        )}

        {/* Input phase */}
        {(phase === "input" || phase === "error") && (
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">Share code</label>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-[11px] text-violet-300/70 hover:text-violet-200 flex items-center gap-1 transition"
                >
                  <Icon name="upload" size={12} /> Upload .json
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste the share code the receiver sent you…"
                rows={6}
                className="w-full bg-white/[0.03] border border-white/8 focus:border-violet-400/40 rounded-xl px-4 py-3 text-[12px] font-mono text-white/80 placeholder-white/25 outline-none transition resize-none break-all"
              />
            </div>

            {phase === "error" && error && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 flex items-start gap-2">
                <Icon name="triangle-alert" size={13} className="text-rose-300 shrink-0 mt-0.5" />
                <span className="text-[11.5px] text-rose-200/85 break-all">{error}</span>
              </div>
            )}

            <button
              onClick={runVerify}
              disabled={!code.trim() || !configured}
              className={`w-full rounded-full py-3 text-[13px] font-medium flex items-center justify-center gap-2 transition border ${
                code.trim() && configured
                  ? "border-violet-400/40 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30"
                  : "border-white/8 bg-white/5 text-white/35 cursor-not-allowed"
              }`}
            >
              <Icon name="fingerprint" size={14} /> Verify on Stellar
            </button>
          </div>
        )}

        {/* Verifying */}
        {busy && (
          <div className="rounded-xl border border-violet-400/15 bg-violet-400/5 px-5 py-5 flex items-center gap-3">
            <span className="inline-block w-5 h-5 rounded-full border-2 border-violet-300 border-t-transparent animate-spin shrink-0" />
            <div>
              <p className="text-[13px] text-violet-200 font-medium">Verifying proof on Stellar…</p>
              <p className="text-[11px] text-white/35 mt-0.5">Running a read-only check against the verifier contract.</p>
            </div>
          </div>
        )}

        {/* Result: verified */}
        {phase === "verified" && decoded && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] px-6 py-7 text-center">
              <span className="inline-flex w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 items-center justify-center mb-3">
                <Icon name="check-circle-2" size={26} className="text-emerald-300" />
              </span>
              <h2 className="text-[20px] font-medium text-emerald-200">Income Verified</h2>
              <p className="text-[13px] text-emerald-200/75 mt-1.5">
                Stream #{decoded.streamId} pays at least{" "}
                <span className="font-num">{stroopsToXlm(decoded.thresholdStroops)} XLM</span> — proven on-chain.
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[12px] text-white/50 leading-relaxed">
              <Icon name="lock" size={12} className="inline text-violet-300/70 mr-1.5 -mt-0.5" />
              The receiver's actual income was never revealed. Only the threshold claim was checked against the
              stream's registered commitment.
            </div>
            <button onClick={reset} className="text-[12.5px] text-white/45 hover:text-white/80 flex items-center gap-1.5 mx-auto transition">
              <Icon name="arrow-left" size={13} /> Verify another
            </button>
          </div>
        )}

        {/* Result: rejected */}
        {phase === "rejected" && decoded && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.06] px-6 py-7 text-center">
              <span className="inline-flex w-14 h-14 rounded-full bg-rose-500/15 border border-rose-400/30 items-center justify-center mb-3">
                <Icon name="x-circle" size={26} className="text-rose-300" />
              </span>
              <h2 className="text-[20px] font-medium text-rose-200">Not Verified</h2>
              <p className="text-[13px] text-rose-200/75 mt-1.5">
                This proof does not satisfy a ≥ {stroopsToXlm(decoded.thresholdStroops)} XLM claim for stream #
                {decoded.streamId}.
              </p>
            </div>
            <button onClick={reset} className="text-[12.5px] text-white/45 hover:text-white/80 flex items-center gap-1.5 mx-auto transition">
              <Icon name="arrow-left" size={13} /> Try another code
            </button>
          </div>
        )}

        {/* How it works */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-mono mb-3">How this works</div>
          <ol className="space-y-2.5 text-[12.5px] text-white/55 leading-relaxed">
            <li className="flex gap-3">
              <span className="font-mono text-violet-300/60 shrink-0">01</span>
              The receiver generates a zero-knowledge proof in their browser — the amount never leaves their device.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-violet-300/60 shrink-0">02</span>
              They send you a share code containing the proof, stream id, and threshold (but not the amount or salt).
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-violet-300/60 shrink-0">03</span>
              This page checks the proof against the stream's on-chain commitment via Stellar's BN254 host functions.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
