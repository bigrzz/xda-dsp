import { useRef } from "react";
import { AmpBadge } from "@/components/app/amp-badge";
import { Segmented } from "@/components/app/segmented";
import { Slider } from "@/components/ui/slider";
import type { AmpSession, RgbMode } from "@/lib/dsp/types";
import { rgbCss } from "@/lib/utils";

const SWATCHES = [
  { h: 8, s: 86, label: "Jensen" },
  { h: 0, s: 80, label: "Red" },
  { h: 28, s: 90, label: "Amber" },
  { h: 120, s: 70, label: "Green" },
  { h: 190, s: 80, label: "Ice" },
  { h: 220, s: 75, label: "Blue" },
  { h: 280, s: 60, label: "Violet" },
  { h: 0, s: 0, label: "White" },
];

function hueFromPoint(el: HTMLElement, clientX: number, clientY: number) {
  const r = el.getBoundingClientRect();
  const dx = clientX - (r.left + r.width / 2);
  const dy = clientY - (r.top + r.height / 2);
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  return Math.round(deg) % 360;
}

export function RgbView({
  session,
  onRgb,
}: {
  session: AmpSession;
  onRgb: (patch: Partial<AmpSession["rgb"]>) => void;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const rgb = session.rgb;
  const preview = rgbCss(rgb.hue, rgb.sat, 48);

  const applyHue = (clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    onRgb({ hue: hueFromPoint(el, clientX, clientY), mode: rgb.mode === "off" ? "solid" : rgb.mode });
  };

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-2">
      <div>
        <h2 className="text-lg font-medium">RGB illumination</h2>
        <p className="text-sm text-muted">Badge color, cycle, and breathe on the amp plate.</p>
      </div>

      <AmpBadge rgb={rgb} label="XDA" />

      <Segmented
        ariaLabel="Light mode"
        value={rgb.mode}
        onChange={(mode) => onRgb({ mode: mode as RgbMode })}
        options={[
          { id: "off", label: "Off" },
          { id: "solid", label: "Solid" },
          { id: "cycle", label: "Cycle" },
          { id: "breathe", label: "Breathe" },
        ]}
      />

      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-5">
        <div
          ref={wheelRef}
          className="hue-wheel relative size-48 rounded-full"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            applyHue(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            applyHue(e.clientX, e.clientY);
          }}
          role="slider"
          aria-label="Hue"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={rgb.hue}
        >
          <div className="absolute inset-10 rounded-full bg-surface" />
          <div
            className="absolute inset-14 rounded-full"
            style={{ background: preview }}
          />
        </div>

        <div className="grid w-full grid-cols-8 gap-2">
          {SWATCHES.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-label={s.label}
              onClick={() => onRgb({ hue: s.h, sat: s.s, mode: "solid" })}
              className="pressable size-8 justify-self-center rounded-full border border-border"
              style={{ background: rgbCss(s.h, s.s, 50) }}
            />
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-end justify-between">
          <p className="text-sm text-muted">Saturation</p>
          <p className="tabular-nums text-sm">{rgb.sat}%</p>
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[rgb.sat]}
          onValueChange={([v]) => onRgb({ sat: v ?? 0 })}
        />

        <div className="mt-3 flex items-end justify-between">
          <p className="text-sm text-muted">Brightness</p>
          <p className="tabular-nums text-sm">{rgb.brightness}%</p>
        </div>
        <Slider
          min={5}
          max={100}
          step={1}
          value={[rgb.brightness]}
          onValueChange={([v]) => onRgb({ brightness: v ?? 5 })}
        />

        {rgb.mode === "cycle" || rgb.mode === "breathe" ? (
          <>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-sm text-muted">Speed</p>
              <p className="tabular-nums text-sm">{rgb.speed}</p>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[rgb.speed]}
              onValueChange={([v]) => onRgb({ speed: v ?? 1 })}
            />
          </>
        ) : null}
      </section>
    </div>
  );
}
