import DocsPage from "@/components/docs/DocsPage";
import { getDocPage } from "@/lib/docs-content";
import { IS_STELLAR_MODE } from "@/lib/app-config";

export const metadata = {
  title: "What is DRIP? - Docs",
  description: IS_STELLAR_MODE
    ? "DRIP documentation for Stellar Testnet — native XLM streaming escrow via Soroban and Freighter."
    : "Public DRIP documentation for Solana-native streaming escrow, payment-aware access, private alpha, and safety.",
};

export default function Page() {
  return <DocsPage page={getDocPage("overview")!} />;
}
