"use client";

import React, { useEffect, useRef, ReactNode } from "react";

interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange";
  size?: "sm" | "md" | "lg";
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const glowColorMap = {
  blue:   { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green:  { base: 120, spread: 200 },
  red:    { base:   0, spread: 200 },
  orange: { base:  30, spread: 200 },
};

const sizeMap = {
  sm: "w-48 h-64",
  md: "w-64 h-80",
  lg: "w-80 h-96",
};

const STYLES = `
  [data-glow]::before,
  [data-glow]::after {
    pointer-events: none;
    content: "";
    position: absolute;
    inset: calc(var(--border-size) * -1);
    border: var(--border-size) solid transparent;
    border-radius: calc(var(--radius) * 1px);
    background-attachment: fixed;
    background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
    background-repeat: no-repeat;
    background-position: 50% 50%;
    mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
    mask-clip: padding-box, border-box;
    mask-composite: intersect;
  }
  [data-glow]::before {
    background-image: radial-gradient(
      calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
      calc(var(--x, 0) * 1px) calc(var(--y, 0) * 1px),
      hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 50) * 1%) / var(--border-spot-opacity, 1)),
      transparent 100%
    );
    filter: brightness(2);
  }
  [data-glow]::after {
    background-image: radial-gradient(
      calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
      calc(var(--x, 0) * 1px) calc(var(--y, 0) * 1px),
      hsl(0 100% 100% / var(--border-light-opacity, 1)),
      transparent 100%
    );
  }
  [data-glow] [data-glow] {
    position: absolute;
    inset: 0;
    will-change: filter;
    opacity: var(--outer, 1);
    border-radius: calc(var(--radius) * 1px);
    border-width: calc(var(--border-size) * 20);
    filter: blur(calc(var(--border-size) * 10));
    background: none;
    pointer-events: none;
    border: none;
  }
  [data-glow] > [data-glow]::before {
    inset: -10px;
    border-width: 10px;
  }
`;

// Unique phase per card so they don't all glow in sync
let cardCount = 0;

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = "",
  glowColor = "purple",
  size = "md",
  width,
  height,
  customSize = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef((cardCount++ % 8) * (Math.PI / 4)); // spread phases evenly

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const phase = phaseRef.current;
    // Slow orbit: ~20s per revolution — imperceptible CPU cost
    const SPEED = (2 * Math.PI) / 20000; // rad/ms
    let startTime = performance.now();
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mouseX: number | null = null;
    let mouseY: number | null = null;

    const setPos = (x: number, y: number) => {
      card.style.setProperty("--x", x.toFixed(1));
      card.style.setProperty("--xp", (x / window.innerWidth).toFixed(3));
      card.style.setProperty("--y", y.toFixed(1));
      card.style.setProperty("--yp", (y / window.innerHeight).toFixed(3));
    };

    // Cache rect — only recompute on resize (not every tick)
    let rect = card.getBoundingClientRect();
    const onResize = () => { rect = card.getBoundingClientRect(); };
    window.addEventListener("resize", onResize, { passive: true });

    // Tick at 10fps — smooth enough for slow ambient glow, very low CPU
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      if (mouseX !== null && mouseY !== null) {
        setPos(mouseX, mouseY);
        return;
      }
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = rect.width * 0.46;
      const ry = rect.height * 0.38;
      const t = (performance.now() - startTime) * SPEED + phase;
      setPos(cx + Math.cos(t) * rx, cy + Math.sin(t * 0.7) * ry);
    };

    // Start immediately, loop forever
    intervalId = setInterval(tick, 100);

    // Mouse only (no touch — keeps scroll working)
    const onMouseMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    const onMouseLeave = () => { mouseX = null; mouseY = null; };
    document.addEventListener("mousemove", onMouseMove);
    card.addEventListener("mouseleave", onMouseLeave);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousemove", onMouseMove);
      card.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  const { base, spread } = glowColorMap[glowColor];

  const inlineStyle: React.CSSProperties & Record<string, string | number> = {
    "--base": base,
    "--spread": spread,
    "--radius": "16",
    "--border": "2",
    "--backdrop": "hsl(0 0% 60% / 0.06)",
    "--backup-border": "var(--backdrop)",
    "--size": "220",
    "--outer": "1",
    "--border-size": "calc(var(--border, 2) * 1px)",
    "--spotlight-size": "calc(var(--size, 150) * 1px)",
    "--hue": "calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))",
    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--x, 0) * 1px) calc(var(--y, 0) * 1px),
      hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.08)),
      transparent
    )`,
    backgroundColor: "var(--backdrop, transparent)",
    backgroundSize: "calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))",
    backgroundPosition: "50% 50%",
    backgroundAttachment: "fixed",
    border: "var(--border-size) solid var(--backup-border)",
    position: "relative",
  };

  if (width !== undefined)  inlineStyle.width  = typeof width  === "number" ? `${width}px`  : width;
  if (height !== undefined) inlineStyle.height = typeof height === "number" ? `${height}px` : height;

  const sizeClass = customSize ? "" : sizeMap[size];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        ref={cardRef}
        data-glow
        style={inlineStyle}
        className={`${sizeClass} rounded-2xl relative grid shadow-[0_1rem_2rem_-1rem_black] backdrop-blur-[5px] ${className}`}
      >
        <div data-glow />
        {children}
      </div>
    </>
  );
};

export { GlowCard };
