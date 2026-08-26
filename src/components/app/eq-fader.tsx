import { useCallback, useRef } from "react";
import { EQ_GAIN_MAX, EQ_GAIN_MIN } from "@/lib/dsp/models";
import { clamp, formatHz, vibrate } from "@/lib/utils";

export function EqFader({
  freq,
  gain,
  onChange,
  compact,
}: {
  freq: number;
  gain: number;
  onChange: (g: number) => void;
  compact?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const apply = useCallback(
    (clientY: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const t = clamp((r.bottom - clientY) / r.height, 0, 1);
      const next =
        Math.round((EQ_GAIN_MIN + t * (EQ_GAIN_MAX - EQ_GAIN_MIN)) * 2) / 2;
      vibrate(5);
      onChange(next);
    },
    [onChange],
  );

  const pct = ((gain - EQ_GAIN_MIN) / (EQ_GAIN_MAX - EQ_GAIN_MIN)) * 100;
  const zeroPct =
    ((0 - EQ_GAIN_MIN) / (EQ_GAIN_MAX - EQ_GAIN_MIN)) * 100;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span className="text-2xs tabular-nums text-fg">
        {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
      </span>
      <div
        ref={trackRef}
        role="slider"
        aria-label={`${formatHz(freq)} Hz`}
        aria-valuemin={EQ_GAIN_MIN}
        aria-valuemax={EQ_GAIN_MAX}
        aria-valuenow={gain}
        tabIndex={0}
        className={
          compact
            ? "relative h-36 w-8 cursor-pointer touch-none"
            : "relative h-44 w-11 cursor-pointer touch-none"
        }
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          apply(e.clientY);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          apply(e.clientY);
        }}
        onDoubleClick={() => onChange(0)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            onChange(clamp(gain + 0.5, EQ_GAIN_MIN, EQ_GAIN_MAX));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onChange(clamp(gain - 0.5, EQ_GAIN_MIN, EQ_GAIN_MAX));
          }
        }}
      >
        <div className="absolute inset-x-1/2 top-0 bottom-0 w-1 -translate-x-1/2 rounded-full bg-raised" />
        <div
          className="absolute inset-x-0 h-px bg-border"
          style={{ bottom: `${zeroPct}%` }}
        />
        <div
          className="absolute inset-x-1/2 w-1 -translate-x-1/2 rounded-full bg-primary"
          style={{
            bottom: `${Math.min(pct, zeroPct)}%`,
            height: `${Math.abs(pct - zeroPct)}%`,
          }}
        />
        <div
          className="absolute left-1/2 size-4 -translate-x-1/2 rounded-full border border-border bg-fg"
          style={{ bottom: `calc(${pct}% - 8px)` }}
        />
      </div>
      <span className="text-2xs uppercase tracking-wide text-muted">
        {formatHz(freq)}
      </span>
    </div>
  );
}
