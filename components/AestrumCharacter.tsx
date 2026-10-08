"use client";

import { useEffect, useRef } from "react";

export type AestrumMode = "ready" | "listening" | "working" | "speaking" | "complete";

const labels: Record<AestrumMode, string> = {
  ready: "Aestrum is ready",
  listening: "Aestrum is listening",
  working: "Aestrum is working",
  speaking: "Aestrum is speaking",
  complete: "Aestrum completed the request",
};

export function AestrumCharacter({
  mode = "ready",
  compact = false,
}: {
  mode?: AestrumMode;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let started = performance.now();

    const tick = (now: number) => {
      const time = (now - started) / 1000;
      const energy = reducedMotion.matches
        ? 0
        : mode === "speaking"
          ? (Math.sin(time * 8.6) + 1) / 2
          : mode === "listening"
            ? (Math.sin(time * 3.4) + 1) / 2
            : (Math.sin(time * 1.25) + 1) / 2;
      element.style.setProperty("--aestrum-demo-level", energy.toFixed(3));
      frame = requestAnimationFrame(tick);
    };

    const pointer = (event: PointerEvent) => {
      if (reducedMotion.matches) return;
      const rect = element.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2) / (rect.width * .55)));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / (rect.height * .55)));
      element.style.setProperty("--aestrum-look-x", `${(x * 8).toFixed(2)}px`);
      element.style.setProperty("--aestrum-look-y", `${(y * 5).toFixed(2)}px`);
    };
    const reset = () => {
      element.style.setProperty("--aestrum-look-x", "0px");
      element.style.setProperty("--aestrum-look-y", "0px");
    };

    started = performance.now();
    frame = requestAnimationFrame(tick);
    window.addEventListener("pointermove", pointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", pointer);
      document.documentElement.removeEventListener("pointerleave", reset);
    };
  }, [mode]);

  return (
    <div
      ref={ref}
      className={`aestrum-demo-character ${compact ? "aestrum-demo-compact" : ""}`}
      data-mode={mode}
      role="img"
      aria-label={labels[mode]}
    >
      <svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="aestrum-demo-ink" x1="18%" y1="8%" x2="78%" y2="92%">
            <stop offset="0" stopColor="#292D38" />
            <stop offset=".44" stopColor="#0B0D12" />
            <stop offset="1" stopColor="#030408" />
          </linearGradient>
        </defs>
        <g className="aestrum-demo-orbit">
          <path d="M79 251c-9-106 63-198 166-211" />
          <path d="M321 132c31 85-7 178-82 220" />
        </g>
        <g className="aestrum-demo-rig">
          <path className="aestrum-demo-body" fill="url(#aestrum-demo-ink)" d="M81 250C52 170 79 75 155 42c67-30 148 5 179 78 33 81 10 178-63 224-72 46-160 12-190-94Z" />
          <g className="aestrum-demo-eyes">
            <rect x="145" y="127" width="42" height="108" rx="21" transform="rotate(-7 166 181)" />
            <rect className="aestrum-demo-eye-right" x="239" y="145" width="39" height="75" rx="19.5" transform="rotate(5 258 182)" />
          </g>
          <path className="aestrum-demo-signal" d="M291 297c17-6 34 4 38 20 4 17-7 33-24 36-17 2-31-10-32-27-1-13 6-24 18-29Z" />
          <path className="aestrum-demo-wink" d="M235 183c15-13 31-12 47 1" />
        </g>
      </svg>
    </div>
  );
}
