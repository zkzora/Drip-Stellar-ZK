"use client";

import dynamic from "next/dynamic";

const DashboardApp = dynamic(() => import("./DashboardApp"), { ssr: false });

export default function DashboardAppClient() {
  return <DashboardApp />;
}
