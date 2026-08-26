import { useState } from "react";
import { EqFader } from "@/components/app/eq-fader";
import { PeqPanel } from "@/components/app/peq-panel";
import { ResponseCurve } from "@/components/app/response-curve";
import { RtaPanel } from "@/components/app/rta-panel";
import { Segmented } from "@/components/app/segmented";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { EQ_FREQUENCIES } from "@/lib/dsp/models";
import { EQ_PRESETS } from "@/lib/dsp/presets";
import type { AmpSession, EqPage } from "@/lib/dsp/types";
import { cn } from "@/lib/utils";
import { useAmpStore } from "@/store/amp-store";

export function EqView({ session }: { session: AmpSession }) {
  const [page, setPage] = useState<EqPage>("graphic");
  const [peqId, setPeqId] = useState(session.peq[0]?.id ?? "p1");

  return (
    <div className="flex flex-col gap-4 px-5 pb-6 pt-2">
      <div>
        <h2 className="text-lg font-medium">Equalizer</h2>
        <p className="text-sm text-muted">
          10-band graphic, 6-band parametric, and KRK-style RTA in one DSP chain.
        </p>
      </div>

      <Segmented
        ariaLabel="EQ page"
        value={page}
        onChange={setPage}
        options={[
          { id: "graphic", label: "Graphic" },
          { id: "parametric", label: "Param" },
          { id: "rta", label: "RTA" },
        ]}
      />

      {page === "graphic" ? <GraphicPage session={session} /> : null}
      {page === "parametric" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-sm">Parametric engine</p>
            <Switch
              checked={session.peqOn}
              onCheckedChange={(v) => useAmpStore.getState().setPeqOn(v)}
            />
          </div>
          <PeqPanel
            session={session}
            selectedId={session.peq.some((b) => b.id === peqId) ? peqId : session.peq[0]!.id}
            onSelect={setPeqId}
          />
        </div>
      ) : null}
      {page === "rta" ? <RtaPanel session={session} /> : null}
    </div>
  );
}

function GraphicPage({ session }: { session: AmpSession }) {
  const group =
    session.groups.find((g) => g.id === session.activeGroupId) ?? session.groups[0]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border bg-surface px-2 pt-3">
        <div className="flex items-center justify-between px-2">
          <p className="text-2xs uppercase tracking-[0.18em] text-muted">Response</p>
          <span className="text-2xs text-muted">
            {session.graphicOn ? "GEQ on" : "GEQ bypass"}
            {session.peqOn ? " · PEQ" : ""}
          </span>
        </div>
        <ResponseCurve session={session} group={group} className="h-36 w-full" />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
        <p className="text-sm">Graphic engine</p>
        <Switch
          checked={session.graphicOn}
          onCheckedChange={(v) => useAmpStore.getState().setGraphicOn(v)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface px-1 py-3">
        <div className="flex min-w-80 gap-0">
          {EQ_FREQUENCIES.map((freq, i) => (
            <EqFader
              key={freq}
              freq={freq}
              gain={session.eqGains[i] ?? 0}
              compact
              onChange={(g) => useAmpStore.getState().setEqGain(i, g)}
            />
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-end justify-between">
          <p className="text-sm text-muted">Band Q</p>
          <p className="font-display text-xl tabular-nums">{session.graphicQ.toFixed(2)}</p>
        </div>
        <Slider
          min={30}
          max={600}
          step={5}
          value={[session.graphicQ * 100]}
          onValueChange={([v]) => useAmpStore.getState().setGraphicQ((v ?? 140) / 100)}
        />
        <div className="mt-3 flex items-end justify-between">
          <p className="text-sm text-muted">Preamp</p>
          <p className="font-display text-xl tabular-nums">
            {session.preampDb > 0 ? "+" : ""}
            {session.preampDb.toFixed(1)} dB
          </p>
        </div>
        <Slider
          min={-12}
          max={12}
          step={0.5}
          value={[session.preampDb]}
          onValueChange={([v]) => useAmpStore.getState().setPreamp(v ?? 0)}
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm">Proportional Q</p>
          <Switch
            checked={session.proportionalQ}
            onCheckedChange={(v) => useAmpStore.getState().setProportionalQ(v)}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm">Shelf ends</p>
          <Switch
            checked={session.shelfEnds}
            onCheckedChange={(v) => useAmpStore.getState().setShelfEnds(v)}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Proportional Q tightens as you boost. Shelf ends turn 31 Hz and 16 kHz into true shelves.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {EQ_PRESETS.map((p) => {
          const active = session.eqPreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => useAmpStore.getState().applyEqPreset(p.id)}
              className={cn(
                "h-9 rounded-full px-3.5 text-sm font-medium pressable",
                active
                  ? "bg-primary text-primary-fg"
                  : "border border-border bg-surface text-fg",
              )}
            >
              {p.label}
            </button>
          );
        })}
        {session.eqPreset === "custom" ? (
          <span className="flex h-9 items-center rounded-full border border-border px-3.5 text-sm text-muted">
            Custom
          </span>
        ) : null}
      </div>

      <Button variant="secondary" onClick={() => useAmpStore.getState().applyEqPreset("flat")}>
        Flatten graphic
      </Button>
    </div>
  );
}
