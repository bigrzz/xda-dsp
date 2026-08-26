import { ResponseCurve } from "@/components/app/response-curve";
import { Segmented } from "@/components/app/segmented";
import { Slider } from "@/components/ui/slider";
import {
  BASS_BOOST_HZ,
  GAIN_MAX_MV,
  GAIN_MIN_MV,
  allowedModes,
  freqRangeForGroup,
  getModel,
} from "@/lib/dsp/models";
import type { AmpSession, SlopeDb, XoverMode } from "@/lib/dsp/types";
import { formatGainMv, formatHz } from "@/lib/utils";

export function XoverView({
  session,
  onGroup,
  onPatch,
}: {
  session: AmpSession;
  onGroup: (id: string) => void;
  onPatch: (
    id: string,
    patch: Partial<(typeof session.groups)[number]>,
  ) => void;
}) {
  const model = getModel(session.modelId);
  const group = session.groups.find((g) => g.id === session.activeGroupId) ?? session.groups[0]!;
  const spec = model.groups.find((g) => g.id === group.id);
  const range = freqRangeForGroup(model, group.id);
  const modes = allowedModes(model, group.id);
  const showRemote = model.remoteBass && spec?.kind === "sub";
  const logMin = Math.log(range.min);
  const logMax = Math.log(range.max);
  const logValue = Math.log(group.frequency);

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-2">
      <div>
        <h2 className="text-lg font-medium">Crossover</h2>
        <p className="text-sm text-muted">
          Filters, slope, input gain, and 45 Hz bass boost.
        </p>
      </div>

      {model.groups.length > 1 ? (
        <Segmented
          ariaLabel="Channel group"
          value={group.id}
          onChange={onGroup}
          options={model.groups.map((g) => ({ id: g.id, label: g.label }))}
        />
      ) : (
        <p className="text-sm text-muted">{spec?.label} · {spec?.channels}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface px-2 pt-3">
        <ResponseCurve session={session} group={group} className="h-36 w-full" />
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-2xs uppercase tracking-[0.18em] text-muted">Mode</p>
        <Segmented
          ariaLabel="Crossover mode"
          value={group.mode}
          onChange={(mode) => onPatch(group.id, { mode: mode as XoverMode })}
          options={modes.map((id) => ({
            id,
            label: id === "full" ? "Full" : id === "hpf" ? "HPF" : "LPF",
          }))}
        />

        <div className="mt-4 flex items-end justify-between">
          <p className="text-sm text-muted">Frequency</p>
          <p className="font-display text-2xl tabular-nums leading-none">
            {formatHz(group.frequency)}
            <span className="ml-1 text-sm text-muted">Hz</span>
          </p>
        </div>
        <Slider
          min={0}
          max={1000}
          step={1}
          disabled={group.mode === "full"}
          value={[((logValue - logMin) / (logMax - logMin)) * 1000]}
          onValueChange={([v]) => {
            const t = (v ?? 0) / 1000;
            const hz = Math.round(Math.exp(logMin + t * (logMax - logMin)));
            onPatch(group.id, { frequency: hz });
          }}
        />
        <p className="text-2xs text-subtle">
          {range.min}–{range.max} Hz
        </p>

        <p className="mb-2 mt-4 text-2xs uppercase tracking-[0.18em] text-muted">Slope</p>
        <Segmented
          ariaLabel="Filter slope"
          value={String(group.slope)}
          onChange={(id) => onPatch(group.id, { slope: Number(id) as SlopeDb })}
          options={[
            { id: "6", label: "6 dB" },
            { id: "12", label: "12 dB" },
            { id: "18", label: "18 dB" },
          ]}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-end justify-between">
          <p className="text-sm text-muted">Input gain</p>
          <p className="font-display text-xl tabular-nums">{formatGainMv(group.gainMv)}</p>
        </div>
        <Slider
          min={GAIN_MIN_MV}
          max={GAIN_MAX_MV}
          step={50}
          value={[group.gainMv]}
          onValueChange={([v]) => onPatch(group.id, { gainMv: v ?? group.gainMv })}
        />
        <p className="text-2xs text-subtle">200 mV – 6.0 V</p>

        {model.bassBoost ? (
          <>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-sm text-muted">Bass boost · {BASS_BOOST_HZ} Hz</p>
              <p className="font-display text-xl tabular-nums">
                +{group.bassBoostDb.toFixed(0)} dB
              </p>
            </div>
            <Slider
              min={0}
              max={12}
              step={1}
              value={[group.bassBoostDb]}
              onValueChange={([v]) => onPatch(group.id, { bassBoostDb: v ?? 0 })}
            />
          </>
        ) : null}

        {showRemote ? (
          <>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-sm text-muted">Remote bass</p>
              <p className="font-display text-xl tabular-nums">{group.remoteBass}</p>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[group.remoteBass]}
              onValueChange={([v]) => onPatch(group.id, { remoteBass: v ?? 0 })}
            />
          </>
        ) : null}
      </section>
    </div>
  );
}
