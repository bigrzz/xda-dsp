import { useEffect, useRef, type PointerEvent } from "react";
import {
  computeCurve,
  DB_MAX,
  DB_MIN,
  FREQ_MAX,
  FREQ_MIN,
} from "@/lib/dsp/response";
import type { AmpSession, ChannelGroupState, PeqBand } from "@/lib/dsp/types";
import { formatHz } from "@/lib/utils";

const LABELS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

export function xOfFreq(f: number, w: number) {
  const a = Math.log(FREQ_MIN);
  const b = Math.log(FREQ_MAX);
  return ((Math.log(Math.min(FREQ_MAX, Math.max(FREQ_MIN, f))) - a) / (b - a)) * w;
}

export function yOfDb(db: number, h: number) {
  return ((DB_MAX - db) / (DB_MAX - DB_MIN)) * h;
}

export function ResponseCurve({
  session,
  group,
  selectedId,
  onSelect,
  className,
}: {
  session: AmpSession;
  group: ChannelGroupState;
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const parent = canvas.parentElement;

    const draw = () => {
      const w = parent?.clientWidth ?? 320;
      const h = parent?.clientHeight ?? 160;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const padX = 8;
      const padY = 14;
      const iw = w - padX * 2;
      const ih = h - padY * 2;

      ctx.save();
      ctx.translate(padX, padY);

      ctx.strokeStyle = "rgba(243,240,234,0.06)";
      ctx.lineWidth = 1;
      for (const f of LABELS) {
        const x = xOfFreq(f, iw);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ih);
        ctx.stroke();
      }
      for (const db of [-18, -12, -6, 0, 6, 12]) {
        const y = yOfDb(db, ih);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(iw, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(243,240,234,0.18)";
      ctx.beginPath();
      ctx.moveTo(0, yOfDb(0, ih));
      ctx.lineTo(iw, yOfDb(0, ih));
      ctx.stroke();

      const curve = computeCurve(session, group);

      ctx.beginPath();
      curve.forEach((pt, i) => {
        const x = xOfFreq(pt.f, iw);
        const y = yOfDb(Math.max(DB_MIN, Math.min(DB_MAX, pt.db)), ih);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(iw, ih);
      ctx.lineTo(0, ih);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, ih);
      grad.addColorStop(0, "rgba(214,39,44,0.28)");
      grad.addColorStop(1, "rgba(214,39,44,0.02)");
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      curve.forEach((pt, i) => {
        const x = xOfFreq(pt.f, iw);
        const y = yOfDb(Math.max(DB_MIN, Math.min(DB_MAX, pt.db)), ih);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#d6272c";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (onSelect) {
        for (const band of session.peq ?? []) {
          if (!band.enabled) continue;
          const x = xOfFreq(band.freq, iw);
          const y = yOfDb(
            Math.max(DB_MIN, Math.min(DB_MAX, nodeGain(band))),
            ih,
          );
          const active = band.id === selectedId;
          ctx.beginPath();
          ctx.arc(x, y, active ? 6 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = active ? "#d6272c" : "#f3f0ea";
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = active ? "#f3f0ea" : "#d6272c";
          ctx.stroke();
        }
      }

      ctx.fillStyle = "rgba(243,240,234,0.35)";
      ctx.font = "10px Figtree, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const f of [31, 125, 500, 2000, 8000]) {
        ctx.fillText(formatHz(f), xOfFreq(f, iw), ih + 2);
      }

      ctx.restore();
    };

    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [session, group, selectedId, onSelect]);

  const onCanvasPointer = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!onSelect) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padX = 8;
    const padY = 14;
    const iw = rect.width - padX * 2;
    const ih = rect.height - padY * 2;
    const px = e.clientX - rect.left - padX;
    const py = e.clientY - rect.top - padY;
    let best: PeqBand | null = null;
    let bestD = 28;
    for (const band of session.peq ?? []) {
      if (!band.enabled) continue;
      const x = xOfFreq(band.freq, iw);
      const y = yOfDb(Math.max(DB_MIN, Math.min(DB_MAX, nodeGain(band))), ih);
      const d = Math.hypot(px - x, py - y);
      if (d < bestD) {
        bestD = d;
        best = band;
      }
    }
    if (best) onSelect(best.id);
  };

  return (
    <div className={className ?? "relative h-44 w-full"}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        onPointerDown={onCanvasPointer}
      />
      <span className="sr-only">
        Combined graphic, parametric, and crossover frequency response.
      </span>
    </div>
  );
}

function nodeGain(band: PeqBand) {
  if (band.type === "hpf" || band.type === "lpf" || band.type === "notch") return 0;
  return band.gain;
}
