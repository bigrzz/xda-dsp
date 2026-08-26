import { Plus, Trash2 } from "lucide-react";
import { ResponseCurve } from "@/components/app/response-curve";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { EQ_GAIN_MAX, EQ_GAIN_MIN } from "@/lib/dsp/models";
import type { AmpSession, PeqType } from "@/lib/dsp/types";
import { formatHz } from "@/lib/utils";
import { useAmpStore } from "@/store/amp-store";

const TYPES: { id: PeqType; label: string }[] = [
  { id: "peak", label: "Peak" },
  { id: "lshelf", label: "L-Sh" },
  { id: "hshelf", label: "H-Sh" },
  { id: "notch", label: "Notch" },
  { id: "hpf", label: "HPF" },
  { id: "lpf", label: "LPF" },
];

const FLOG_MIN = Math.log(20);
const FLOG_MAX = Math.log(20000);

export function PeqPanel({
  session,
  selectedId,
  onSelect,
}: {
  session: AmpSession;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const group =
    session.groups.find((g) => g.id === session.activeGroupId) ?? session.groups[0]!;
  const band = session.peq.find((b) => b.id === selectedId) ?? session.peq[0]!;
  const usesGain = band.type === "peak" || band.type === "lshelf" || band.type === "hshelf";
  const logVal = Math.log(band.freq);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border bg-surface px-2 pt-3">
        <ResponseCurve
          session={session}
          group={group}
          selectedId={band.id}
          onSelect={onSelect}
          className="h-40 w-full"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {session.peq.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b.id)}
            className={
              b.id === band.id
                ? "h-8 rounded-full bg-primary px-3 text-2xs font-medium text-primary-fg pressable"
                : "h-8 rounded-full border border-border bg-surface px-3 text-2xs font-medium text-fg pressable"
            }
          >
            {i + 1} {formatHz(b.freq)}
            {!b.enabled ? " off" : ""}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Band</p>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-muted">On</span>
            <Switch
              checked={band.enabled}
              onCheckedChange={(v) =>
                useAmpStore.getState().patchPeq(band.id, { enabled: v })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {TYPES.map((t) => {
            const active = band.type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => useAmpStore.getState().patchPeq(band.id, { type: t.id })}
                className={
                  active
                    ? "h-9 rounded-md bg-primary text-xs font-medium text-primary-fg pressable"
                    : "h-9 rounded-md bg-raised text-xs font-medium text-muted pressable"
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-end justify-between">
          <p className="text-sm text-muted">Frequency</p>
          <p className="font-display text-xl tabular-nums">
            {formatHz(band.freq)}
            <span className="ml-1 text-sm text-muted">Hz</span>
          </p>
        </div>
        <Slider
          min={0}
          max={1000}
          step={1}
          value={[((logVal - FLOG_MIN) / (FLOG_MAX - FLOG_MIN)) * 1000]}
          onValueChange={([v]) => {
            const t = (v ?? 0) / 1000;
            const hz = Math.round(Math.exp(FLOG_MIN + t * (FLOG_MAX - FLOG_MIN)));
            useAmpStore.getState().patchPeq(band.id, { freq: hz });
          }}
        />

        {usesGain ? (
          <>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-sm text-muted">Gain</p>
              <p className="font-display text-xl tabular-nums">
                {band.gain > 0 ? "+" : ""}
                {band.gain.toFixed(1)} dB
              </p>
            </div>
            <Slider
              min={EQ_GAIN_MIN}
              max={EQ_GAIN_MAX}
              step={0.5}
              value={[band.gain]}
              onValueChange={([v]) =>
                useAmpStore.getState().patchPeq(band.id, { gain: v ?? 0 })
              }
            />
          </>
        ) : null}

        <div className="mt-3 flex items-end justify-between">
          <p className="text-sm text-muted">{band.type === "notch" ? "Width Q" : "Q"}</p>
          <p className="font-display text-xl tabular-nums">{band.q.toFixed(2)}</p>
        </div>
        <Slider
          min={30}
          max={800}
          step={1}
          value={[band.q * 100]}
          onValueChange={([v]) =>
            useAmpStore.getState().patchPeq(band.id, { q: (v ?? 100) / 100 })
          }
        />
      </section>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => useAmpStore.getState().addPeqBand()}
          disabled={session.peq.length >= 8}
        >
          <Plus className="size-4" />
          Add band
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const next = session.peq.find((b) => b.id !== band.id);
            useAmpStore.getState().removePeqBand(band.id);
            if (next) onSelect(next.id);
          }}
          disabled={session.peq.length <= 1}
          aria-label="Remove band"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
