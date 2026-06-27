// Inline XLM mark — the Stellar logo sized and baseline-aligned to sit like a
// currency glyph inside a number (replaces the old ✦ placeholder).
export function XlmGlyph({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/stellar-logo.png"
      alt="XLM"
      className={`inline-block object-contain opacity-80 align-[-0.12em] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
