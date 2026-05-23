import DocsPage from "@/components/docs/DocsPage";
import { getDocPage } from "@/lib/docs-content";

export const metadata = {
  title: "What is DRIP? - Docs",
  description:
    "Public DRIP documentation for Solana-native streaming escrow, payment-aware access, private alpha, and safety.",
};

export default function Page() {
  return <DocsPage page={getDocPage("overview")!} />;
}
