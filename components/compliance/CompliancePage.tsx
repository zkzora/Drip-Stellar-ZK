"use client";

import { useCallback, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { XlmGlyph } from "@/components/ui/XlmGlyph";
import { PageHeader } from "@/components/ui/PageHeader";
import { MinimalGridBackground } from "@/components/ui/backgrounds";
import {
  COMPLIANCE_CATEGORY_FILTERS,
  COMPLIANCE_CATEGORY_ICON,
  COMPLIANCE_CATEGORY_LABELS,
  COMPLIANCE_DEFAULT_RANGE,
  COMPLIANCE_EXPORT,
  COMPLIANCE_PRESETS,
  PROTOCOL_STATS,
  REPORT_LEDGER,
  STELLAR_COMPLIANCE_EXPORT,
} from "@/lib/mock-data";
import { useDripStreams } from "@/lib/solana/useDripStreams";
import { useDripWallet } from "@/lib/solana/useDripWallet";
import { mapUiStreamToComplianceRecord } from "@/lib/compliance/records";
import { recordsToCsv, downloadCsv, getCsvFilename } from "@/lib/compliance/csv";
import { SOLANA_CLUSTER } from "@/lib/solana/constants";
import { IS_STELLAR_MODE } from "@/lib/app-config";
import type { ComplianceStreamRecord } from "@/lib/compliance/records";

// =========================================================================
// Mock ledger - derived seed data
// =========================================================================
const CATEGORY_LABELS = COMPLIANCE_CATEGORY_LABELS;
const CATEGORY_ICON = COMPLIANCE_CATEGORY_ICON;

// Stellar-specific status-based category filters (replaces Solana categories in Stellar mode)
const STELLAR_CATEGORY_FILTERS = [
  { k: "all",       label: "All",       icon: "layers"          },
  { k: "active",    label: "Active",    icon: "waves"           },
  { k: "completed", label: "Completed", icon: "check-circle-2"  },
  { k: "cancelled", label: "Cancelled", icon: "x-circle"        },
];
const STELLAR_CATEGORY_LABELS: Record<string, string> = {
  all:       "All streams",
  active:    "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

const fmtDur = (sec: number) => {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  if (d > 0) return `${d}d${h ? ` ${h}h` : ""}`;
  if (h > 0) return `${h}h`;
  return `${Math.floor(sec / 60)}m`;
};
const fmtUSD2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSol4 = (n: number) => n.toFixed(4);

// =========================================================================
// Date range picker (presets + custom)
// =========================================================================
function DateRangeControl({ range, setRange }: any) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-3">
        <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono flex items-center gap-2">
          <Icon name="calendar-range" size={12} /> Reporting period
        </label>
        <span className="text-[10.5px] font-mono text-white/35">UTC · ISO 8601</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {COMPLIANCE_PRESETS.map((p: any) => (
          <button
            key={p.k}
            onClick={() => setRange({ ...range, preset: p.k })}
            className={`px-3 py-1.5 rounded-full text-[12px] border transition ${range.preset === p.k ? "tab-active" : "border-white/10 text-white/55 hover:text-white"}`}
          >{p.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-violet-400/40 transition">
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-mono">From</span>
          <input
            type="date"
            value={range.from}
            onChange={e => setRange({ ...range, from: e.target.value, preset: "custom" })}
            className="flex-1 bg-transparent outline-none text-[13px] font-mono text-white"
            style={{ colorScheme: "dark" }}
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8 focus-within:border-violet-400/40 transition">
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-mono">To</span>
          <input
            type="date"
            value={range.to}
            onChange={e => setRange({ ...range, to: e.target.value, preset: "custom" })}
            className="flex-1 bg-transparent outline-none text-[13px] font-mono text-white"
            style={{ colorScheme: "dark" }}
          />
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Category filter
// =========================================================================
function CategoryFilter({ value, onChange, counts, filters }: any) {
  const activeFilters = filters ?? COMPLIANCE_CATEGORY_FILTERS;
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-3">
        <label className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono flex items-center gap-2">
          <Icon name="filter" size={12} /> Stream category
        </label>
        <span className="text-[10.5px] font-mono text-white/35">{counts[value] ?? 0} streams in scope</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {activeFilters.map((o: any) => (
          <button
            key={o.k}
            onClick={() => onChange(o.k)}
            className={`text-left rounded-xl px-3 py-2.5 border transition flex items-center gap-2.5 ${value === o.k ? "border-violet-400/45 bg-violet-400/10" : "border-white/8 bg-white/[0.02] hover:border-white/20"}`}
          >
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${value === o.k ? "bg-violet-400/15 text-violet-200" : "bg-white/5 text-white/55"}`}>
              <Icon name={o.icon} size={13} />
            </span>
            <div className="min-w-0">
              <div className="text-[12.5px] text-white truncate">{o.label}</div>
              <div className="text-[10px] font-mono text-white/40">{counts[o.k] ?? 0} streams</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// Executive summary tile
// =========================================================================
function SummaryMetric({ icon, label, value, sub, tone = "neutral", emphasize = false }: any) {
  const toneCls = {
    up: "text-emerald-300",
    down: "text-rose-300",
    neutral: "text-white",
    accent: "text-iri",
  }[tone as string] ?? "text-white";
  return (
    <div className={`rounded-2xl p-5 border ${emphasize ? "grad-border glass-strong" : "border-white/8 bg-white/[0.02]"}`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${emphasize ? "bg-violet-400/15 text-violet-200" : "bg-white/5 text-white/65"}`}>
          <Icon name={icon} size={15} />
        </div>
        {emphasize && <span className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-violet-200/80 px-2 py-0.5 rounded-full border border-violet-400/30">Estimate</span>}
      </div>
      <div className="mt-4 text-[10.5px] uppercase tracking-[0.18em] text-white/40 font-mono">{label}</div>
      <div className={`mt-1.5 font-num num-stable text-[26px] leading-tight tracking-[-0.02em] ${toneCls}`}>{value}</div>
      <div className="mt-1.5 text-[11.5px] text-white/45">{sub}</div>
    </div>
  );
}

// =========================================================================
// Reports page
// =========================================================================
export default function CompliancePage({ stellarAddress, stellarStreams }: { stellarAddress?: string | null; stellarStreams?: any }) {
  const EXPORT_CONFIG = IS_STELLAR_MODE ? STELLAR_COMPLIANCE_EXPORT : COMPLIANCE_EXPORT;
  const [range, setRange] = useState(COMPLIANCE_DEFAULT_RANGE);
  const [category, setCategory] = useState("all");
  const [generating, setGenerating] = useState<string | null>(null);
  const [toast, setToast] = useState<any>(null);
  const [pdfToast, setPdfToast] = useState(false);
  const [page, setPage] = useState(0);

  // ── Solana path ──────────────────────────────────────────────────────────
  const { streams, loading: streamsLoading, error: streamsError, refresh, usingMockData: solanaUsingMock } = useDripStreams();
  const { connected, publicKey } = useDripWallet();
  const stellarConnected = IS_STELLAR_MODE && !!stellarAddress;
  const usingMockData = IS_STELLAR_MODE ? true : solanaUsingMock;

  const realRecords = useMemo((): ComplianceStreamRecord[] => {
    if (IS_STELLAR_MODE) return [];
    if (!connected || !publicKey) return [];
    return streams
      .filter((s) => !!s.publicKey)
      .map((s) => mapUiStreamToComplianceRecord(s, SOLANA_CLUSTER));
  }, [streams, connected, publicKey]);

  // ── Stellar path: derive a typed ledger row per tracked stream ────────────
  type StellarLedgerRow = {
    streamId:    string;
    status:      string;
    payer:       string;
    receiver:    string;
    amountXlm:   number;
    withdrawnXlm: number;
    createdAt:   string;
    updatedAt:   string;
    txHash:      string;
    explorerUrl: string;
  };

  const stellarLedgerRows = useMemo((): StellarLedgerRow[] => {
    if (!IS_STELLAR_MODE) return [];
    const tracked: any[] = stellarStreams?.streams ?? [];
    return tracked
      .filter((s) => !s.isLoading)      // skip rows still loading
      .map((s): StellarLedgerRow => {
        const status  = s.onChainState?.status ?? s.lastKnownStatus ?? "unknown";
        const amtXlm  = (() => { try { return Number(BigInt(s.amountStroops || "0")) / 10_000_000; } catch { return 0; } })();
        const wdnXlm  = (() => { try { return Number(BigInt(s.onChainState?.withdrawn || "0")) / 10_000_000; } catch { return 0; } })();
        const contractId = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID ?? "";
        const explorerUrl = s.createdTxHash
          ? `https://stellar.expert/explorer/testnet/tx/${s.createdTxHash}`
          : contractId
            ? `https://stellar.expert/explorer/testnet/contract/${contractId}`
            : "";
        return {
          streamId:     s.streamId,
          status,
          payer:        s.payer       ?? "",
          receiver:     s.receiver    ?? "",
          amountXlm:   amtXlm,
          withdrawnXlm: wdnXlm,
          createdAt:   s.createdAt    ?? "",
          updatedAt:   s.lastLoadedAt ?? "",
          txHash:      s.createdTxHash ?? "",
          explorerUrl,
        };
      });
  }, [stellarStreams]);

  // Filter Stellar rows by the status-based category selector
  const filteredStellarRows = useMemo((): StellarLedgerRow[] => {
    if (category === "all") return stellarLedgerRows;
    return stellarLedgerRows.filter((r) => r.status.toLowerCase() === category);
  }, [stellarLedgerRows, category]);

  // ── Stellar category counts ───────────────────────────────────────────────
  const stellarCounts = useMemo(() => {
    const rows = stellarLedgerRows;
    return {
      all:       rows.length,
      active:    rows.filter(r => r.status === "Active").length,
      completed: rows.filter(r => r.status === "Completed").length,
      cancelled: rows.filter(r => r.status === "Cancelled").length,
    };
  }, [stellarLedgerRows]);

  // ── Stellar executive summary ─────────────────────────────────────────────
  // Direction: payer = streamed out; receiver = incoming.
  // If walletAddress matches payer → outgoing; matches receiver → incoming.
  const stellarSummary = useMemo(() => {
    if (!IS_STELLAR_MODE || stellarLedgerRows.length === 0) return null;
    const wa = stellarAddress ?? "";
    let totalOut = 0, totalIn = 0;
    for (const r of stellarLedgerRows) {
      if (r.payer === wa)    totalOut += r.amountXlm;
      if (r.receiver === wa) totalIn  += r.withdrawnXlm;
    }
    return { totalOut, totalIn, net: totalIn - totalOut };
  }, [stellarLedgerRows, stellarAddress]);

  // ── Solana mock ledger (Solana mode only) ────────────────────────────────
  const filtered = useMemo(() => {
    if (IS_STELLAR_MODE) return [];
    return REPORT_LEDGER.filter((r: any) => {
      if (category !== "all" && r.category !== category) return false;
      if (range.from && r.date < range.from) return false;
      if (range.to   && r.date > range.to)   return false;
      return true;
    });
  }, [range, category]);

  const counts = useMemo(() => {
    if (IS_STELLAR_MODE) return stellarCounts;
    const inDate = REPORT_LEDGER.filter(
      (r: any) => (!range.from || r.date >= range.from) && (!range.to || r.date <= range.to),
    );
    return {
      all:          inDate.length,
      payroll:      inDate.filter((r: any) => r.category === "payroll").length,
      "ai-compute": inDate.filter((r: any) => r.category === "ai-compute").length,
      subs:         inDate.filter((r: any) => r.category === "subs").length,
    };
  }, [range, stellarCounts]);

  // ── Solana executive summary ──────────────────────────────────────────────
  const summaryData = useMemo(() => {
    if (!usingMockData && realRecords.length > 0) {
      const totalOut = realRecords.filter(r => r.direction === "out").reduce((a, r) => a + r.withdrawnAmountSol, 0);
      const totalIn  = realRecords.filter(r => r.direction === "in" ).reduce((a, r) => a + r.withdrawnAmountSol, 0);
      return { totalOut, totalIn, net: totalIn - totalOut };
    }
    return null;
  }, [usingMockData, realRecords]);

  // ── Unified totals ────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (IS_STELLAR_MODE && stellarSummary) {
      return {
        out:    stellarSummary.totalOut,
        in:     stellarSummary.totalIn,
        tax:    stellarSummary.totalOut * EXPORT_CONFIG.taxRate,
        net:    stellarSummary.net,
        isReal: true,
      };
    }
    if (!IS_STELLAR_MODE && summaryData) {
      return {
        out:    summaryData.totalOut,
        in:     summaryData.totalIn,
        tax:    summaryData.totalOut * EXPORT_CONFIG.taxRate,
        net:    summaryData.net,
        isReal: true,
      };
    }
    const out = filtered.filter((r: any) => r.type === "out").reduce((a: number, r: any) => a + r.amount, 0);
    const inn = filtered.filter((r: any) => r.type === "in" ).reduce((a: number, r: any) => a + r.amount, 0);
    return { out, in: inn, tax: out * EXPORT_CONFIG.taxRate, net: inn - out, isReal: false };
  }, [filtered, summaryData, stellarSummary]);

  // ── CSV export ────────────────────────────────────────────────────────────
  // Build Stellar CSV from tracked rows (no old Solana records dependency)
  const buildStellarCsv = useCallback((rows: StellarLedgerRow[]): string => {
    const today = new Date().toISOString().slice(0, 10);
    const headers = [
      "stream_id", "status", "payer", "receiver",
      "amount_xlm", "withdrawn_xlm",
      "created_at", "updated_at", "tx_hash", "explorer_url", "source",
    ];
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      headers.join(","),
      ...rows.map(r => [
        escape(`#${r.streamId}`),
        escape(r.status),
        escape(r.payer),
        escape(r.receiver),
        r.amountXlm.toFixed(7),
        r.withdrawnXlm.toFixed(7),
        escape(r.createdAt),
        escape(r.updatedAt),
        escape(r.txHash),
        escape(r.explorerUrl),
        escape("stellar-testnet:local-registry"),
      ].join(",")),
    ];
    return lines.join("\n");
  }, []);

  const handleStellarCsvExport = useCallback(() => {
    if (filteredStellarRows.length === 0) {
      setToast({ kind: "csv-empty" });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const csv = buildStellarCsv(filteredStellarRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `drip-stellar-ledger-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast({ kind: "csv", count: filteredStellarRows.length, filename: `drip-stellar-ledger-${today}.csv` });
    setTimeout(() => setToast(null), 4000);
  }, [filteredStellarRows, buildStellarCsv]);

  const handleCsvExport = useCallback(() => {
    if (IS_STELLAR_MODE) { handleStellarCsvExport(); return; }
    const records = !usingMockData ? realRecords : [];
    if (records.length === 0) {
      setToast({ kind: "csv-empty" });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    const csv = recordsToCsv(records);
    downloadCsv(csv, getCsvFilename());
    setToast({ kind: "csv", count: records.length });
    setTimeout(() => setToast(null), 4000);
  }, [usingMockData, realRecords, handleStellarCsvExport]);

  const handlePdfExport = useCallback(() => {
    setPdfToast(true);
    setTimeout(() => setPdfToast(false), 4000);
  }, []);

  const handleMockExport = (kind: string) => {
    setGenerating(kind);
    setTimeout(() => {
      setGenerating(null);
      setToast({ kind, count: filtered.length });
      setTimeout(() => setToast(null), 4000);
    }, 1600);
  };

  // ── Pagination (Solana mock only) ─────────────────────────────────────────
  const PAGE_SIZE  = EXPORT_CONFIG.pageSize;
  const visible    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Row count for PDF metadata line
  const csvRowCount = IS_STELLAR_MODE
    ? filteredStellarRows.length
    : (!usingMockData ? realRecords.length : filtered.length);

  // CSV button enabled state
  const csvEnabled = IS_STELLAR_MODE
    ? filteredStellarRows.length > 0
    : (!usingMockData ? realRecords.length > 0 : filtered.length > 0);

  // Active category label (Stellar uses its own labels)
  const activeCategoryLabel = IS_STELLAR_MODE
    ? (STELLAR_CATEGORY_LABELS[category] ?? "All streams")
    : (CATEGORY_LABELS[category] ?? "All");

  return (
    <div className="space-y-7 relative">
      <MinimalGridBackground />
      <PageHeader
        eyebrow="07 - Reports & Compliance"
        title={<>Audit-ready, in three clicks.</>}
        sub={IS_STELLAR_MODE
          ? "Export tracked Stellar stream records as CSV. Accounting sync integrations are planned."
          : "CSV export is live - download accountant-ready records straight from on-chain stream data. Every row is verifiable on Solscan. PDF export coming next."}
        right={
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full border border-emerald-400/30 bg-emerald-400/5 text-[12px] font-mono">
            <Icon name="shield-check" size={12} className="text-emerald-300" />
            <span className="text-emerald-300">Data verified on-chain</span>
            <span className="text-emerald-300/50">·</span>
            <span className="text-emerald-200/70">{IS_STELLAR_MODE ? "Stellar Testnet" : EXPORT_CONFIG.networkLabel}</span>
          </div>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-[11.5px] font-mono">
        <StepPill n="1" label="Filter" active />
        <Icon name="chevron-right" size={11} className="text-white/30" />
        <StepPill n="2" label="Review" active />
        <Icon name="chevron-right" size={11} className="text-white/30" />
        <StepPill n="3" label="Export" />
      </div>

      {/* Stream loading / error / empty states — Solana mode only */}
      {!IS_STELLAR_MODE && connected && streamsLoading && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-3 flex items-center gap-3 text-[13px] text-white/65">
          <Icon name="loader-2" size={14} className="animate-spin text-violet-300" />
          Loading stream records...
        </div>
      )}
      {!IS_STELLAR_MODE && connected && streamsError && (
        <div className="rounded-xl border border-rose-400/25 bg-rose-400/5 px-5 py-3 flex items-center gap-3 text-[13px] text-rose-200">
          <Icon name="triangle-alert" size={14} className="text-rose-300 shrink-0" />
          <span>Error loading streams: {streamsError}</span>
          <button onClick={refresh} className="ml-auto text-[12px] font-mono text-white/65 hover:text-white border border-white/15 rounded-full px-3 py-1">
            Retry
          </button>
        </div>
      )}
      {!IS_STELLAR_MODE && !usingMockData && realRecords.length === 0 && !streamsLoading && connected && !streamsError && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4 flex items-center gap-3 text-[13px] text-white/55">
          <Icon name="inbox" size={14} className="text-white/35" />
          No stream records yet. Create a stream to generate compliance records.
        </div>
      )}
      {IS_STELLAR_MODE && !stellarConnected && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4 flex items-center gap-3 text-[13px] text-white/55">
          <Icon name="fingerprint" size={14} className="text-white/35" />
          Connect Freighter to view on-chain compliance records.
        </div>
      )}

      {/* === ZONE 1: PARAMETER CONTROLS === */}
      <section className="space-y-3">
        <SectionLabel num="01" title="Filter engine" desc="Define what to include in the report." />
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Date range only shown in Solana mode; Stellar streams don't have reliable dates for filtering */}
          {!IS_STELLAR_MODE && <DateRangeControl range={range} setRange={setRange} />}
          <CategoryFilter
            value={category}
            onChange={setCategory}
            counts={counts}
            filters={IS_STELLAR_MODE ? STELLAR_CATEGORY_FILTERS : undefined}
          />
        </div>
        {/* Active filter summary */}
        <div className="flex items-center flex-wrap gap-2 text-[12px] text-white/55 px-1">
          <Icon name="info" size={12} />
          <span>Showing</span>
          <span className="text-white font-mono">
            {IS_STELLAR_MODE ? filteredStellarRows.length : (usingMockData ? filtered.length : realRecords.length)}
          </span>
          <span>streams</span>
          {!IS_STELLAR_MODE && usingMockData && (
            <>
              <span>from</span><span className="text-white font-mono">{range.from}</span>
              <span>to</span><span className="text-white font-mono">{range.to}</span>
            </>
          )}
          <span>·</span>
          <span className="text-violet-300">{activeCategoryLabel}</span>
          {IS_STELLAR_MODE && (
            <span className="ml-1 text-[10.5px] font-mono px-2 py-0.5 rounded-full border border-sky-400/30 text-sky-300 bg-sky-400/5">
              {stellarConnected ? "Stellar Testnet" : "wallet not connected"}
            </span>
          )}
          {!IS_STELLAR_MODE && !usingMockData && (
            <span className="ml-1 text-[10.5px] font-mono px-2 py-0.5 rounded-full border border-emerald-400/30 text-emerald-300 bg-emerald-400/5">on-chain</span>
          )}
          {!IS_STELLAR_MODE && usingMockData && (
            <span className="ml-1 text-[10.5px] font-mono px-2 py-0.5 rounded-full border border-amber-400/30 text-amber-300 bg-amber-400/5">demo data</span>
          )}
          {!IS_STELLAR_MODE && (category !== "all" || range.preset !== "month") && usingMockData && (
            <button onClick={() => { setCategory("all"); setRange(COMPLIANCE_DEFAULT_RANGE); }} className="ml-auto text-[11.5px] font-mono text-white/55 hover:text-white flex items-center gap-1">
              <Icon name="rotate-ccw" size={11} /> Reset filters
            </button>
          )}
        </div>
      </section>

      {/* === ZONE 2: EXECUTIVE SUMMARY === */}
      <section className="space-y-3">
        <SectionLabel num="02" title="Executive summary" desc="High-level totals for the selected scope." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {totals.isReal ? (
            <>
              <SummaryMetric
                icon="arrow-up-right"
                label="Total streamed (out)"
                value={`${fmtSol4(totals.out)} ${IS_STELLAR_MODE ? "XLM" : "SOL"}`}
                sub={IS_STELLAR_MODE
                  ? `${stellarLedgerRows.filter(r => r.payer === stellarAddress).length} outgoing streams`
                  : `${realRecords.filter(r => r.direction === "out").length} outgoing streams`}
                tone="down"
              />
              <SummaryMetric
                icon="arrow-down-left"
                label="Total received (in)"
                value={`${fmtSol4(totals.in)} ${IS_STELLAR_MODE ? "XLM" : "SOL"}`}
                sub={IS_STELLAR_MODE
                  ? `${stellarLedgerRows.filter(r => r.receiver === stellarAddress).length} incoming streams`
                  : `${realRecords.filter(r => r.direction === "in").length} incoming streams`}
                tone="up"
              />
              <SummaryMetric
                icon="scale"
                label="Net position"
                value={`${totals.net >= 0 ? "+" : "-"}${fmtSol4(Math.abs(totals.net))} ${IS_STELLAR_MODE ? "XLM" : "SOL"}`}
                sub="received - streamed"
                tone={totals.net >= 0 ? "up" : "down"}
              />
              <SummaryMetric
                icon="landmark"
                label={IS_STELLAR_MODE ? "Est. tax (testnet)" : "Est. tax liability"}
                value={`${fmtSol4(totals.tax)} ${IS_STELLAR_MODE ? "XLM" : "SOL"}`}
                sub={IS_STELLAR_MODE ? "10% flat · testnet estimate only" : "10% flat · indicative only"}
                tone="accent"
                emphasize
              />
            </>
          ) : (
            <>
              <SummaryMetric icon="arrow-up-right" label="Total streamed (out)" value={<>{IS_STELLAR_MODE ? <XlmGlyph /> : "◎"}{fmtSol4(totals.out)}</>} sub={`${filtered.filter((r: any) => r.type === "out").length} outgoing streams`} tone="down" />
              <SummaryMetric icon="arrow-down-left" label="Total received (in)"  value={<>{IS_STELLAR_MODE ? <XlmGlyph /> : "◎"}{fmtSol4(totals.in)}</>}  sub={`${filtered.filter((r: any) => r.type === "in").length} incoming streams`}  tone="up" />
              <SummaryMetric icon="scale"           label="Net position"         value={<>{totals.net >= 0 ? "+" : "-"}{IS_STELLAR_MODE ? <XlmGlyph /> : "◎"}{fmtSol4(Math.abs(totals.net))}</>} sub="received - streamed" tone={totals.net >= 0 ? "up" : "down"} />
              <SummaryMetric icon="landmark"        label="Estimated tax"        value={<>{IS_STELLAR_MODE ? <XlmGlyph /> : "◎"}{fmtSol4(totals.tax)}</>} sub="10% flat - indicative only" tone="accent" emphasize />
            </>
          )}
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3.5 flex items-start gap-3">
          <Icon name="triangle-alert" size={14} className="text-amber-300 mt-0.5 shrink-0" />
          <div className="text-[12px] text-amber-100/85 leading-relaxed">
            <span className="text-amber-200">Disclaimer:</span>{" "}
            {IS_STELLAR_MODE
              ? "This is a testnet app — no real funds. Tax estimates are illustrative only."
              : "Tax liability is a flat-rate estimate for planning purposes. Drip is not a tax advisor - consult a CPA for filing."}
          </div>
        </div>
      </section>

      {/* === ZONE 3: ACTION CENTER === */}
      <section className="space-y-3">
        <SectionLabel num="03" title="Export" desc="Generate audit-ready artifacts." />

        {pdfToast && (
          <div className="rounded-xl border border-violet-400/25 bg-violet-400/5 px-5 py-3 flex items-center gap-3 text-[13px] text-violet-200">
            <Icon name="info" size={14} className="text-violet-300 shrink-0" />
            <span>PDF export is coming in a future release. Use CSV export for now.</span>
            <button onClick={() => setPdfToast(false)} className="ml-auto text-white/40 hover:text-white"><Icon name="x" size={13} /></button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Primary — PDF */}
          <div className="lg:col-span-2 grad-border glass-strong rounded-2xl p-1.5 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 iri-orb rounded-full opacity-40 pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 glow-orb opacity-25 pointer-events-none" />
            <div className="rounded-[18px] bg-gradient-to-br from-[#100e26]/95 to-[#07060f] p-6 relative">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-violet-400/15 border border-violet-400/30 flex items-center justify-center shrink-0">
                  <Icon name="file-text" size={22} className="text-violet-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[20px] tracking-tight text-white">Audit-ready PDF</h3>
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border border-emerald-400/30 text-emerald-300 bg-emerald-400/5">Recommended</span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-white/60 leading-relaxed max-w-[440px]">
                    Single signed document with executive summary, full ledger, on-chain proofs, and tax estimate. IRS Form 8949 and EU DAC8 formatting planned for future release.
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-[11px] font-mono text-white/45 flex-wrap">
                    <span className="flex items-center gap-1"><Icon name="file" size={11} /> {csvRowCount} rows · ~{Math.ceil(csvRowCount / 22) + 2} pages</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Icon name="lock" size={11} /> SHA-256 receipt hash</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Icon name="languages" size={11} /> EN / DE / ES</span>
                  </div>
                  <button onClick={handlePdfExport} className="mt-5 btn-primary rounded-full px-6 py-3 text-[14px] font-medium text-white inline-flex items-center gap-2">
                    <Icon name="download" size={15} /> Download Audit-Ready PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary — CSV */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Icon name="table-2" size={18} className="text-cyan-300" />
            </div>
            <h3 className="mt-4 text-[16px] tracking-tight text-white">Export CSV</h3>
            <p className="mt-1.5 text-[12.5px] text-white/55 leading-relaxed">
              {IS_STELLAR_MODE
                ? "Download your tracked Stellar stream records as a CSV file."
                : <>Format targets <span className="text-white">Xero</span>, <span className="text-white">QuickBooks</span>, and <span className="text-white">Wave</span> chart-of-accounts.</>}
            </p>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {IS_STELLAR_MODE ? (
                <>
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full border border-sky-400/20 text-sky-300/70">CSV download live</span>
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-white/40">Xero sync planned</span>
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-white/40">QuickBooks planned</span>
                </>
              ) : (
                EXPORT_CONFIG.integrations.map((s: string) => (
                  <span key={s} className="text-[10.5px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-white/65">{s}</span>
                ))
              )}
            </div>
            {IS_STELLAR_MODE && csvRowCount > 0 && (
              <div className="mt-3 text-[11px] font-mono text-emerald-300/80 flex items-center gap-1">
                <Icon name="shield-check" size={11} />
                {csvRowCount} stream record{csvRowCount !== 1 ? "s" : ""} ready to export
              </div>
            )}
            {!IS_STELLAR_MODE && !usingMockData && (
              <div className="mt-3 text-[11px] font-mono text-emerald-300/80 flex items-center gap-1">
                <Icon name="shield-check" size={11} />
                {realRecords.length} on-chain record{realRecords.length !== 1 ? "s" : ""} ready
              </div>
            )}
            <div className="mt-auto pt-5">
              <button
                onClick={IS_STELLAR_MODE ? handleStellarCsvExport : (usingMockData ? () => handleMockExport("csv") : handleCsvExport)}
                disabled={generating !== null || !csvEnabled}
                className="btn-ghost rounded-full px-5 py-2.5 text-[13px] text-white inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating === "csv" ? (
                  <><Icon name="loader-2" size={14} className="animate-spin" /> Building CSV...</>
                ) : (
                  <><Icon name="download" size={14} /> Export CSV</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Supplementary actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {EXPORT_CONFIG.secondaryActions.map((action: any, index: number) => (
            <SecondaryAction key={`${action.label}-${index}`} {...action} />
          ))}
        </div>
      </section>

      {/* === ZONE 4: ON-CHAIN LEDGER PREVIEW === */}
      <section className="space-y-3">
        <SectionLabel num="04" title="On-chain ledger preview" desc="Exact rows that will appear in your export." />
        <div className="rounded-2xl glass overflow-hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 text-[11.5px] font-mono flex-wrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot shrink-0" />
              <span className="text-emerald-300">100% On-Chain Verified</span>
              <span className="text-emerald-300/50">·</span>
              <span className="text-emerald-200/80">{IS_STELLAR_MODE ? "Stellar Testnet" : EXPORT_CONFIG.ledgerNetworkLabel}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/55">
                {IS_STELLAR_MODE ? filteredStellarRows.length : (usingMockData ? filtered.length : realRecords.length)} rows
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11.5px] font-mono text-white/45">
              <Icon name="hash" size={11} />
              <span>{IS_STELLAR_MODE ? "Stellar Testnet" : `Solana slot ${PROTOCOL_STATS.complianceSlot}`}</span>
            </div>
          </div>

          {/* Solana real records */}
          {!IS_STELLAR_MODE && !usingMockData && realRecords.length > 0 && (
            <>
              <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-white/40 font-mono border-b border-white/5">
                <div className="col-span-2">Stream account</div>
                <div className="col-span-1">Dir</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">Duration</div>
                <div className="col-span-2 text-right">Deposited (SOL)</div>
                <div className="col-span-2 text-right">Explorer</div>
              </div>
              {realRecords.map((r, i) => (<RealLedgerRow key={`${r.streamAccount}-${i}`} record={r} />))}
            </>
          )}

          {/* Stellar tracked streams */}
          {IS_STELLAR_MODE && (() => {
            if (filteredStellarRows.length === 0) {
              return (
                <div className="px-6 py-16 text-center">
                  <div className="w-12 h-12 rounded-full mx-auto bg-white/5 flex items-center justify-center text-white/40">
                    <Icon name="inbox" size={18} />
                  </div>
                  <div className="mt-3 text-[14px] text-white/65">
                    {stellarLedgerRows.length > 0
                      ? "No streams match this filter."
                      : "No on-chain ledger records yet."}
                  </div>
                  <div className="mt-1 text-[12px] text-white/40">
                    {stellarLedgerRows.length > 0
                      ? "Try selecting a different category."
                      : "Create a Stellar stream to generate compliance records."}
                  </div>
                </div>
              );
            }
            return (
              <>
                <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-white/40 font-mono border-b border-white/5">
                  <div className="col-span-2">Stream</div>
                  <div className="col-span-3">Receiver</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Amount (XLM)</div>
                  <div className="col-span-2 text-right">Withdrawn (XLM)</div>
                  <div className="col-span-1 text-right">Explorer</div>
                </div>
                {filteredStellarRows.map((r) => {
                  const status = r.status;
                  const statusCls = status === "Active" ? "text-emerald-300" : status === "Paused" ? "text-amber-300" : "text-white/40";
                  const shortRec = r.receiver ? `${r.receiver.slice(0, 6)}…${r.receiver.slice(-4)}` : "—";
                  return (
                    <div key={r.streamId} className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3.5 text-[12.5px] border-b border-white/[0.04] hover:bg-white/[0.02] items-center">
                      <div className="col-span-2 font-mono text-sky-300">#{r.streamId}</div>
                      <div className="col-span-3 font-mono text-white/65 truncate" title={r.receiver}>{shortRec}</div>
                      <div className={`col-span-2 font-mono text-[11.5px] ${statusCls}`}>{status}</div>
                      <div className="col-span-2 text-right font-num text-white">{r.amountXlm.toFixed(4)}</div>
                      <div className="col-span-2 text-right font-num text-emerald-300">{r.withdrawnXlm.toFixed(4)}</div>
                      <div className="col-span-1 text-right">
                        {r.explorerUrl ? (
                          <a href={r.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-violet-300/70 hover:text-white">
                            <Icon name="arrow-up-right" size={11} />
                          </a>
                        ) : <span className="text-white/20">—</span>}
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}

          {/* Solana mock / demo records */}
          {usingMockData && !IS_STELLAR_MODE && (
            <>
              <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-white/40 font-mono border-b border-white/5">
                <div className="col-span-1">Date</div>
                <div className="col-span-1">Type</div>
                <div className="col-span-3">Counterparty · address</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-1 text-right">Duration</div>
                <div className="col-span-2 text-right">Amount (SOL)</div>
                <div className="col-span-2 text-right">Tx hash</div>
              </div>
              {visible.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <div className="w-12 h-12 rounded-full mx-auto bg-white/5 flex items-center justify-center text-white/40">
                    <Icon name="search-x" size={18} />
                  </div>
                  <div className="mt-3 text-[14px] text-white/65">No streams match these filters.</div>
                  <div className="mt-1 text-[12px] text-white/40">Try widening the date range or selecting "All categories".</div>
                </div>
              )}
              {visible.map((r: any, i: number) => (<LedgerRow key={r.tx + i} row={r} />))}
            </>
          )}

          {/* Pagination — Solana mock only */}
          {!IS_STELLAR_MODE && usingMockData && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 bg-white/[0.02] text-[12px] font-mono">
              <span className="text-white/45">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-7 h-7 rounded-md border border-white/10 text-white/65 hover:text-white hover:border-white/30 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"><Icon name="chevron-left" size={12} /></button>
                <span className="text-white/65 px-2">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-7 h-7 rounded-md border border-white/10 text-white/65 hover:text-white hover:border-white/30 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"><Icon name="chevron-right" size={12} /></button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 fade-in">
          <div className="grad-border rounded-2xl p-1">
            <div className="rounded-[14px] bg-[#0b0a1a] px-5 py-4 flex items-center gap-3 min-w-[300px]">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${toast.kind === "csv-empty" ? "bg-amber-400/15 border-amber-400/30 text-amber-300" : "bg-emerald-400/15 border-emerald-400/30 text-emerald-300"}`}>
                <Icon name={toast.kind === "csv-empty" ? "triangle-alert" : "check"} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                {toast.kind === "csv-empty" ? (
                  <>
                    <div className="text-[13px] text-white">No records to export</div>
                    <div className="text-[11px] font-mono text-white/45">
                      {IS_STELLAR_MODE ? "Create or load a Stellar stream first" : "Connect wallet and create streams first"}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[13px] text-white">{toast.kind === "pdf" ? "Audit PDF" : "CSV"} ready</div>
                    <div className="text-[11px] font-mono text-white/45">
                      {toast.count} rows · {toast.filename ?? `drip-report-${toast.kind === "pdf" ? `${EXPORT_CONFIG.fileStem}.pdf` : `${EXPORT_CONFIG.fileStem}.csv`}`}
                    </div>
                  </>
                )}
              </div>
              <button onClick={() => setToast(null)} className="text-white/40 hover:text-white"><Icon name="x" size={14} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ num, title, desc }: any) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-violet-300/70">{num}</span>
      <h2 className="text-[18px] tracking-tight text-white">{title}</h2>
      <span className="text-[12.5px] text-white/45">{desc}</span>
    </div>
  );
}

function StepPill({ n, label, active }: any) {
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${active ? "border-violet-400/35 bg-violet-400/10 text-white" : "border-white/10 bg-white/[0.02] text-white/45"}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono ${active ? "bg-violet-400 text-[#0b0a1a]" : "bg-white/10 text-white/55"}`}>{n}</span>
      {label}
    </span>
  );
}

function SecondaryAction({ icon, label, sub }: any) {
  return (
    <button className="text-left rounded-xl border border-white/8 bg-white/[0.02] p-3.5 flex items-center gap-3 hover:border-violet-400/25 transition group">
      <span className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/65 group-hover:text-violet-200 transition">
        <Icon name={icon} size={15} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-white">{label}</div>
        <div className="text-[11px] font-mono text-white/40">{sub}</div>
      </div>
      <Icon name="arrow-up-right" size={13} className="text-white/30 group-hover:text-white/65 transition" />
    </button>
  );
}

function LedgerRow({ row }: any) {
  const isIn = row.type === "in";
  const badge = (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono uppercase tracking-[0.14em] ${isIn ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
      <Icon name={isIn ? "arrow-down-left" : "arrow-up-right"} size={10} />
      {isIn ? "In" : "Out"}
    </span>
  );
  return (
    <>
      {/* Mobile card */}
      <div className="sm:hidden px-4 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {badge}
            <span className="text-[12.5px] text-white truncate">{row.counterparty}</span>
          </div>
          <span className={`font-num text-[13px] shrink-0 ${isIn ? "text-emerald-300" : "text-white"}`}>
            {isIn ? "+" : "−"}{IS_STELLAR_MODE ? <XlmGlyph size={12} /> : "◎"}{fmtSol4(row.amount)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-white/45">
          <div className="flex items-center gap-2">
            <span>{row.date.slice(5)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Icon name={CATEGORY_ICON[row.category]} size={10} />
              {CATEGORY_LABELS[row.category] || row.category}
            </span>
            <span>·</span>
            <span>{fmtDur(row.duration)}</span>
          </div>
          <a href="#" className="inline-flex items-center gap-0.5 text-violet-300/70 hover:text-white">
            {row.tx.slice(0, 5)}… <Icon name="arrow-up-right" size={9} />
          </a>
        </div>
      </div>
      {/* Desktop grid row */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3.5 text-[12.5px] border-b border-white/[0.04] hover:bg-white/[0.02] items-center">
        <div className="col-span-1 font-mono text-white/65">{row.date.slice(5)}</div>
        <div className="col-span-1">{badge}</div>
        <div className="col-span-3 min-w-0">
          <div className="text-white truncate">{row.counterparty}</div>
          <div className="text-[10.5px] font-mono text-white/40 truncate">{row.addr.slice(0, 6)}...{row.addr.slice(-6)}</div>
        </div>
        <div className="col-span-2">
          <span className="inline-flex items-center gap-1.5 text-white/65 text-[11.5px]">
            <Icon name={CATEGORY_ICON[row.category]} size={11} className="text-white/45" />
            {CATEGORY_LABELS[row.category] || row.category}
          </span>
        </div>
        <div className="col-span-1 text-right font-mono text-white/65">{fmtDur(row.duration)}</div>
        <div className="col-span-2 text-right">
          <span className={`font-num text-[14px] ${isIn ? "text-emerald-300" : "text-white"}`}>{isIn ? "+" : "-"}{IS_STELLAR_MODE ? <XlmGlyph size={13} /> : "◎"}{fmtSol4(row.amount)}</span>
        </div>
        <div className="col-span-2 text-right">
          <a href="#" className="inline-flex items-center gap-1 font-mono text-[11px] text-violet-300/80 hover:text-white">
            {row.tx.slice(0, 6)}...{row.tx.slice(-3)}
            <Icon name="arrow-up-right" size={10} />
          </a>
        </div>
      </div>
    </>
  );
}

function RealLedgerRow({ record }: { record: ComplianceStreamRecord }) {
  const isIn = record.direction === "in";
  const shortAccount = record.streamAccount
    ? `${record.streamAccount.slice(0, 6)}...${record.streamAccount.slice(-4)}`
    : "-";
  const dirBadge = (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono uppercase tracking-[0.14em] ${isIn ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
      <Icon name={isIn ? "arrow-down-left" : "arrow-up-right"} size={10} />
      {isIn ? "In" : "Out"}
    </span>
  );
  const statusCls = record.status === "streaming" ? "bg-emerald-400/10 text-emerald-300"
    : record.status === "paused" ? "bg-amber-400/10 text-amber-300"
    : "bg-white/5 text-white/55";
  return (
    <>
      {/* Mobile card */}
      <div className="sm:hidden px-4 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {dirBadge}
            <span className="font-mono text-[11.5px] text-white/65 truncate">{shortAccount}</span>
          </div>
          <span className={`font-num text-[13px] shrink-0 ${isIn ? "text-emerald-300" : "text-white"}`}>
            {isIn ? "+" : "−"}{fmtSol4(record.depositedAmountSol)} {IS_STELLAR_MODE ? "XLM" : "SOL"}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-white/45">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded-full text-[9.5px] ${statusCls}`}>{record.status}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Icon name={record.category === "AI_COMPUTE" ? "cpu" : "layers"} size={10} />
              {record.category}
            </span>
            {record.durationSeconds > 0 && <><span>·</span><span>{fmtDur(record.durationSeconds)}</span></>}
          </div>
          {record.explorerUrl ? (
            <a href={record.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-violet-300/70 hover:text-white">
              {IS_STELLAR_MODE ? "Stellar Expert" : "Solscan"} <Icon name="arrow-up-right" size={9} />
            </a>
          ) : <span>-</span>}
        </div>
      </div>
      {/* Desktop grid row */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3.5 text-[12.5px] border-b border-white/[0.04] hover:bg-white/[0.02] items-center">
        <div className="col-span-2 font-mono text-white/65 truncate" title={record.streamAccount}>{shortAccount}</div>
        <div className="col-span-1">{dirBadge}</div>
        <div className="col-span-2">
          <span className="inline-flex items-center gap-1.5 text-white/65 text-[11.5px]">
            <Icon name={record.category === "AI_COMPUTE" ? "cpu" : "layers"} size={11} className="text-white/45" />
            {record.category}
          </span>
        </div>
        <div className="col-span-2">
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${statusCls}`}>{record.status}</span>
        </div>
        <div className="col-span-1 text-right font-mono text-white/65">
          {record.durationSeconds > 0 ? fmtDur(record.durationSeconds) : "-"}
        </div>
        <div className="col-span-2 text-right">
          <span className={`font-num text-[14px] ${isIn ? "text-emerald-300" : "text-white"}`}>
            {isIn ? "+" : "-"}{fmtSol4(record.depositedAmountSol)} {IS_STELLAR_MODE ? "XLM" : "SOL"}
          </span>
        </div>
        <div className="col-span-2 text-right">
          {record.explorerUrl ? (
            <a href={record.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-violet-300/80 hover:text-white">
              {shortAccount} <Icon name="arrow-up-right" size={10} />
            </a>
          ) : (
            <span className="text-white/30 font-mono text-[11px]">-</span>
          )}
        </div>
      </div>
    </>
  );
}
