// Inline XLM mark — the Stellar logo sized and optically centered to sit like a
// currency glyph inside a number (replaces the old ✦ placeholder).
//
// By default the mark scales with the surrounding font (em units) so it tracks
// the digits next to it instead of floating small. Pass an explicit `size` (px)
// to pin it — used in the dense ledger rows. Vertical alignment lands the mark
// on the optical middle of the cap-height digits rather than the text baseline.
export function XlmGlyph({ size, className = "" }: { size?: number; className?: string }) {
  const dims =
    size != null
      ? { width: size, height: size }
      : { width: "0.82em", height: "0.82em" };
  return (
    <img
      src="/stellar-logo.png"
      alt="XLM"
      className={`inline-block object-contain opacity-80 ${className}`}
      style={{ ...dims, verticalAlign: "-0.06em", marginRight: "0.08em" }}
    />
  );
}
