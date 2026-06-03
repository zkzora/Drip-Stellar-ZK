"use client";

import type { ReactNode } from "react";
import { JupiterWalletProvider } from "./JupiterWalletProvider";
import { IS_STELLAR_MODE } from "@/lib/app-config";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  // In Stellar mode skip the Jupiter/Solana wallet provider entirely so no
  // Phantom/Solana wallet modal can be triggered from anywhere in the app.
  if (IS_STELLAR_MODE) return <>{children}</>;
  return <JupiterWalletProvider>{children}</JupiterWalletProvider>;
}

