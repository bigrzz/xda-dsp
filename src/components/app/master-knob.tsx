import { useCallback, useRef, type PointerEvent } from "react";
import { MASTER_MAX } from "@/lib/dsp/models";
import { clamp, vibrate } from "@/lib/utils";

const START = 135;
const SWEEP = 270;
const CX = 100;
const CY = 100;

function valueToAngle(value: number) {
  return START + (value / MASTER_MAX) * SWEEP;
}

function angleToValue(angle: number) {
  let a = angle;
  if (a < 0) a += 360;
  let rel = a - START;
  if (rel < 0) rel += 360;
  if (rel > SWEEP) {
    rel = rel > 180 + SWEEP / 2 ? 0 : SWEEP;
  }
  return clamp((rel / SWEEP) * MASTER_MAX, 0, MASTER_MAX);
}

function pointerAngle(el: HTMLElement, clientX: number, clientY: number) {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
}

function polar(deg: number, radius: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + Math.cos(rad) * radius, y: CY + Math.sin(rad) * radius };
}

export function MasterKnob({
  value,
  muted,
  onChange,
}: {
  value: number;
  muted?: boolean;
  onChange: (v: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef(value);

  const applyFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = rootRef.current;
      if (!el) return;
      const next = Math.round(angleToValue(pointerAngle(el, clientX, clientY)));
      if (next !== lastRef.current) {
        lastRef.current = next;
        if (next % 2 === 0) vibrate(6);
        onChange(next);
      }
    },
    [onChange],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    applyFromPointer(e.clientX, e.clientY);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    applyFromPointer(e.clientX, e.clientY);
  };

  const angle = valueToAngle(value);
  const needle = polar(angle, 52);
  const ticks = Array.from({ length: 29 }, (_, i) => i);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={rootRef}
        role="slider"
        aria-label="Master level"
        aria-valuemin={0}
        aria-valuemax={MASTER_MAX}
        aria-valuenow={value}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className="relative size-44 select-none touch-none"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(clamp(value + 1, 0, MASTER_MAX));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(clamp(value - 1, 0, MASTER_MAX));
          }
        }}
      >
        <svg viewBox="0 0 200 200" className="size-full">
          <circle cx={CX} cy={CY} r={96} fill="var(--color-surface)" stroke="var(--color-border)" />
          <circle cx={CX} cy={CY} r={78} fill="var(--color-raised)" stroke="var(--color-border)" />
          {ticks.map((i) => {
            const a = START + (i / (ticks.length - 1)) * SWEEP;
            const on = (i / (ticks.length - 1)) * MASTER_MAX <= value + 0.01;
            const p1 = polar(a, 90);
            const p2 = polar(a, on ? 78 : 82);
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={on ? "var(--color-primary)" : "var(--color-border)"}
                strokeWidth={on ? 2.4 : 1.6}
                strokeLinecap="round"
              />
            );
          })}
          <circle cx={CX} cy={CY} r={62} fill="var(--color-bg)" />
          <line
            x1={CX}
            y1={CY}
            x2={needle.x}
            y2={needle.y}
            stroke="var(--color-primary)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r={5} fill="var(--color-primary)" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl tabular-nums leading-none tracking-tight">
            {muted ? "0" : value}
          </span>
          <span className="mt-1 text-2xs uppercase tracking-[0.18em] text-muted">
            {muted ? "Muted" : "Master"}
          </span>
        </div>
      </div>
    </div>
  );
}
