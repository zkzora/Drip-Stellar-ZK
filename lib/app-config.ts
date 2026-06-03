// Read at build time by Next.js (NEXT_PUBLIC_ prefix).
// IS_STELLAR_MODE is true when NEXT_PUBLIC_APP_CHAIN=stellar.
export const APP_CHAIN = process.env.NEXT_PUBLIC_APP_CHAIN ?? "";
export const IS_STELLAR_MODE = APP_CHAIN === "stellar";
