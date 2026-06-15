"use client";

import dynamic from "next/dynamic";

const DashboardApp = dynamic(() => import("./DashboardApp"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="inline-block w-5 h-5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
        <span className="text-white/25 text-[12px] font-mono tracking-widest">DRIP</span>
      </div>
    </div>
  ),
});

export default function DashboardAppClient() {
  return <DashboardApp />;
}
