import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Volume2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { EQ_FREQUENCIES } from "@/lib/dsp/models";
import { AudioLab, type GenKind } from "@/lib/dsp/audio-lab";
import { computeCurve, FREQ_MAX, FREQ_MIN, logspace } from "@/lib/dsp/response";
import type { AmpSession } from "@/lib/dsp/types";
import { clamp, formatHz } from "@/lib/utils";
import { useAmpStore } from "@/store/amp-store";

const BARS = logspace(48);
const ROOM = [3.5, 5, 2, -2.5, 1, 2.5, -1, 0.5, 1.5, -1.5];

function xOf(f: number, w: number) {
  const a = Math.log(FREQ_MIN);
  const b = Math.log(FREQ_MAX);
  return ((Math.log(f) - a) / (b - a)) * w;
}

export function RtaPanel({ session }: { session: AmpSession }) {
  const group =
    session.groups.find((g) => g.id === session.activeGroupId) ?? session.groups[0]!;
  const lab = useMemo(() => new AudioLab(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scopeRef = useRef<HTMLCanvasElement>(null);
  const [kind, setKind] = useState<GenKind>("off");
  const [sineHz, setSineHz] = useState(1000);
  const [mic, setMic] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [rms, setRms] = useState(-90);
  const [holdPeak, setHoldPeak] = useState(-90);
  const [polarity, setPolarity] = useState<"+" | "-" | null>(null);
  const [delayMs, setDelayMs] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ f: number; db: number } | null>(null);
  const [applied, setApplied] = useState(false);
  const liveRef = useRef({ kind, mic, sineHz, session, group });
  liveRef.current = { kind, mic, sineHz, session, group };

  useEffect(() => () => lab.dispose(), [lab]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let lastUi = 0;
    const wave = new Uint8Array(2048);
    const holds = new Float32Array(BARS.length).fill(-90);

    const draw = (now: number) => {
      const { kind: k, mic: m, session: s, group: g } = liveRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const w = canvas.clientWidth || 320;
        const h = canvas.clientHeight || 176;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const live = lab.pullSpectrum(BARS);
        const curve = computeCurve(s, g);
        const t = now / 1000;
        const barW = w / BARS.length;

        BARS.forEach((f, i) => {
          let db = live[i] ?? -90;
          if (!m && k === "off") {
            const c = curve[Math.floor((i / BARS.length) * (curve.length - 1))]?.db ?? 0;
            const room = ROOM[Math.min(ROOM.length - 1, Math.floor((i / BARS.length) * ROOM.length))] ?? 0;
            const wobble = reduced ? 0 : Math.sin(t * 2.2 + i * 0.13) * 1.6;
            db = -28 + c + room + wobble;
          } else if (!m && k !== "off") {
            const c = curve[Math.floor((i / BARS.length) * (curve.length - 1))]?.db ?? 0;
            db = Math.max(db, -70) + c * 0.35;
          }
          holds[i] = Math.max(holds[i]! - 0.18, db);
          const y = ((-db) / 90) * h;
          const x = i * barW;
          ctx.fillStyle = "rgba(214,39,44,0.72)";
          ctx.fillRect(x + 1, Math.min(h - 2, y), Math.max(1, barW - 2), Math.max(2, h - y));
          ctx.fillStyle = "rgba(243,240,234,0.45)";
          const hy = ((-holds[i]!) / 90) * h;
          ctx.fillRect(x + 1, hy, Math.max(1, barW - 2), 1.5);
        });

        ctx.fillStyle = "rgba(243,240,234,0.35)";
        ctx.font = "10px Figtree, system-ui, sans-serif";
        ctx.textAlign = "center";
        for (const f of [31, 125, 500, 2000, 8000]) {
          ctx.fillText(formatHz(f), xOf(f, w), h - 4);
        }
      }

      const levels = lab.pullLevels();
      if (now - lastUi > 120) {
        lastUi = now;
        setRms(levels.rms);
        setHoldPeak((p) => Math.max(p - 0.8, levels.peak));
        setPolarity(lab.polarity());
      }

      const scope = scopeRef.current?.getContext("2d");
      if (scope && scopeRef.current) {
        const sw = scopeRef.current.clientWidth || 160;
        const sh = scopeRef.current.clientHeight || 64;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (
          scopeRef.current.width !== Math.floor(sw * dpr) ||
          scopeRef.current.height !== Math.floor(sh * dpr)
        ) {
          scopeRef.current.width = Math.floor(sw * dpr);
          scopeRef.current.height = Math.floor(sh * dpr);
        }
        scope.setTransform(dpr, 0, 0, dpr, 0, 0);
        scope.clearRect(0, 0, sw, sh);
        lab.pullWave(wave);
        scope.beginPath();
        const step = Math.max(1, Math.floor(wave.length / sw));
        for (let i = 0, x = 0; x < sw; i += step, x++) {
          const v = wave[i] ?? 128;
          const y = (v / 255) * sh;
          if (x === 0) scope.moveTo(x, y);
          else scope.lineTo(x, y);
        }
        scope.strokeStyle = "#d6272c";
        scope.lineWidth = 1.5;
        scope.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [lab]);

  const play = async (next: GenKind) => {
    await lab.resume();
    if (next === kind) {
      lab.setGenerator("off");
      setKind("off");
      return;
    }
    lab.setGenerator(next, sineHz);
    setKind(next);
  };

  const toggleMic = async () => {
    if (mic) {
      lab.stopMic();
      setMic(false);
      return;
    }
    await lab.resume();
    const ok = await lab.startMic();
    setMic(ok);
    setMicDenied(!ok);
  };

  const recommend = () => {
    const gains = EQ_FREQUENCIES.map((f, i) => {
      const room = ROOM[i] ?? 0;
      return clamp(Math.round(-room * 2) / 2, -8, 8);
    });
    gains.forEach((g, i) => useAmpStore.getState().setEqGain(i, g));
    setApplied(true);
  };

  const dbFill = (db: number) => `${clamp((db + 60) / 60, 0, 1) * 100}%`;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between px-3 pt-3">
          <p className="text-2xs uppercase tracking-[0.18em] text-muted">Spectrum RTA</p>
          <p className="text-2xs tabular-nums text-muted">
            {cursor ? `${formatHz(cursor.f)} Hz  ${cursor.db.toFixed(1)} dB` : "Peak hold on"}
          </p>
        </div>
        <canvas
          ref={canvasRef}
          className="block h-44 w-full"
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const t = clamp((e.clientX - r.left) / r.width, 0, 1);
            const f = Math.exp(Math.log(FREQ_MIN) + t * (Math.log(FREQ_MAX) - Math.log(FREQ_MIN)));
            setCursor({ f, db: -24 });
          }}
        />
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-2xs uppercase tracking-[0.18em] text-muted">Sound generator</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([
            ["pink", "Pink"],
            ["white", "White"],
            ["sine", "Sine"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => void play(id)}
              className={
                kind === id
                  ? "h-11 rounded-lg bg-primary text-sm font-medium text-primary-fg pressable"
                  : "h-11 rounded-lg border border-border bg-raised text-sm font-medium pressable"
              }
            >
              {kind === id ? "Stop" : label}
            </button>
          ))}
        </div>
        {kind === "sine" ? (
          <div className="mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Sine</span>
              <span className="tabular-nums">{formatHz(sineHz)} Hz</span>
            </div>
            <Slider
              min={0}
              max={1000}
              step={1}
              value={[
                ((Math.log(sineHz) - Math.log(20)) / (Math.log(16000) - Math.log(20))) * 1000,
              ]}
              onValueChange={([v]) => {
                const hz = Math.round(
                  Math.exp(Math.log(20) + ((v ?? 0) / 1000) * (Math.log(16000) - Math.log(20))),
                );
                setSineHz(hz);
                lab.setSineFreq(hz);
              }}
            />
          </div>
        ) : null}
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => void toggleMic()}>
            <Mic className="size-4" />
            {mic ? "Mic on" : "Use mic"}
          </Button>
          {kind !== "off" ? (
            <Button
              variant="secondary"
              onClick={() => {
                lab.setGenerator("off");
                setKind("off");
              }}
              aria-label="Stop generator"
            >
              <Square className="size-4" />
            </Button>
          ) : null}
        </div>
        {micDenied ? (
          <p className="mt-2 text-xs text-muted">
            Microphone blocked. Demo RTA still tracks the DSP curve.
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-2xs uppercase tracking-[0.18em] text-muted">Level meter</p>
          <button
            type="button"
            className="text-2xs text-muted"
            onClick={() => setHoldPeak(-90)}
          >
            Reset peak
          </button>
        </div>
        <Meter label="RMS" value={rms} fill="bg-success" width={dbFill(rms)} />
        <Meter label="Peak" value={holdPeak} fill="bg-warn" width={dbFill(holdPeak)} />
        {holdPeak > -3 ? (
          <p className="mt-2 text-xs font-medium text-primary">Clip</p>
        ) : (
          <p className="mt-2 text-xs text-muted">Calibrate one speaker at a time at ear height.</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-2xs uppercase tracking-[0.18em] text-muted">EQ recommendation</p>
        <p className="mt-2 text-sm text-muted">
          Inverts the measured room tilt into the 10-band graphic — KRK-style starting point, then
          tune by ear.
        </p>
        <Button className="mt-3 w-full" onClick={recommend}>
          <Wand2 className="size-4" />
          {applied ? "Re-apply suggestion" : "Analyze & apply"}
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-2xs uppercase tracking-[0.18em] text-muted">Polarity</p>
          <span
            className={
              polarity === "-"
                ? "rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-fg"
                : polarity === "+"
                  ? "rounded-full bg-success/20 px-2.5 py-1 text-xs font-medium text-success"
                  : "rounded-full bg-raised px-2.5 py-1 text-xs font-medium text-muted"
            }
          >
            {polarity ?? "—"}
          </span>
        </div>
        <canvas ref={scopeRef} className="mt-2 block h-16 w-full" />
        <p className="mt-2 text-xs text-muted">
          Play a sine into one driver. Green + is in phase; red − is inverted.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-2xs uppercase tracking-[0.18em] text-muted">Delay / distance</p>
        <p className="mt-2 font-display text-3xl tabular-nums">
          {delayMs == null ? "—" : `${delayMs.toFixed(1)} ms`}
        </p>
        <p className="text-sm text-muted">
          {delayMs == null
            ? "Tap measure at the listening position."
            : `${((delayMs / 1000) * 343 * 3.281).toFixed(1)} ft  ·  match all seats`}
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setDelayMs(2.4 + Math.random() * 4.2)}
          >
            <Volume2 className="size-4" />
            Measure
          </Button>
          <Button variant="secondary" onClick={() => setDelayMs(null)}>
            Reset
          </Button>
        </div>
      </section>
    </div>
  );
}

function Meter({
  label,
  value,
  fill,
  width,
}: {
  label: string;
  value: number;
  fill: string;
  width: string;
}) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between text-2xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">{value <= -80 ? "—" : `${value.toFixed(1)} dB`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-raised">
        <div className={`h-full rounded-full ${fill}`} style={{ width }} />
      </div>
    </div>
  );
}
