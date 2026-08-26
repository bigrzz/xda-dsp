import { useEffect, useState } from "react";
import type { RgbState } from "@/lib/dsp/types";
import { rgbCss } from "@/lib/utils";

export function AmpBadge({ rgb, label }: { rgb: RgbState; label: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (rgb.mode !== "cycle" && rgb.mode !== "breathe") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 40);
    return () => window.clearInterval(id);
  }, [rgb.mode]);

  let hue = rgb.hue;
  let brightness = rgb.brightness;
  if (rgb.mode === "cycle") {
    hue = (rgb.hue + tick * rgb.speed * 0.6) % 360;
  } else if (rgb.mode === "breathe") {
    const wave = (Math.sin(tick * 0.06 * rgb.speed) + 1) / 2;
    brightness = 18 + wave * rgb.brightness;
  }

  const off = rgb.mode === "off";
  const color = off
    ? "var(--color-border)"
    : rgbCss(hue, rgb.sat, off ? 18 : 42 + brightness * 0.2);
  const glow = off ? "transparent" : rgbCss(hue, rgb.sat, 55);

  return (
    <div
      className="relative flex h-16 w-full items-center justify-center rounded-xl border border-border bg-raised"
      style={{ boxShadow: off ? "none" : `0 0 24px ${glow}` }}
    >
      <span
        className="font-display text-2xl tracking-[0.22em]"
        style={{ color: off ? "var(--color-muted)" : color }}
      >
        {label}
      </span>
      <span
        className="absolute inset-x-8 bottom-2 h-0.5 rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}
