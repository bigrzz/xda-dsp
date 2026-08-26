import { VolumeX } from "lucide-react";
import { AmpBadge } from "@/components/app/amp-badge";
import { MasterKnob } from "@/components/app/master-knob";
import { ResponseCurve } from "@/components/app/response-curve";
import { Button } from "@/components/ui/button";
import { EQ_PRESETS } from "@/lib/dsp/presets";
import { getModel, MASTER_MAX } from "@/lib/dsp/models";
import type { AmpSession } from "@/lib/dsp/types";
import { cn } from "@/lib/utils";

export function HomeView({
  session,
  onMaster,
  onMute,
  onPreset,
}: {
  session: AmpSession;
  onMaster: (v: number) => void;
  onMute: (v: boolean) => void;
  onPreset: (id: string) => void;
}) {
  const model = getModel(session.modelId);
  const group = session.groups.find((g) => g.id === session.activeGroupId) ?? session.groups[0]!;
  const clipping = !session.muted && session.master >= 36 && group.bassBoostDb >= 6;

  return (
    <div className="flex flex-col gap-4 px-5 pb-6 pt-2">
      <AmpBadge rgb={session.rgb} label={model.series} />

      <div className="overflow-hidden rounded-xl border border-border bg-surface px-2 pt-3">
        <div className="flex items-center justify-between px-3">
          <p className="text-2xs uppercase tracking-[0.18em] text-muted">Response</p>
          {clipping ? (
            <span className="text-2xs font-medium uppercase tracking-wider text-primary">
              Clip
            </span>
          ) : (
            <span className="text-2xs uppercase tracking-wider text-success">DSP</span>
          )}
        </div>
        <ResponseCurve session={session} group={group} className="h-32 w-full" />
      </div>

      <MasterKnob value={session.master} muted={session.muted} onChange={onMaster} />

      <div className="flex items-center justify-center gap-3">
        <Button
          variant={session.muted ? "primary" : "secondary"}
          size="pill"
          onClick={() => onMute(!session.muted)}
        >
          <VolumeX className="size-4" />
          {session.muted ? "Unmute" : "Mute"}
        </Button>
        <span className="text-xs tabular-nums text-muted">
          {session.muted ? 0 : session.master} / {MASTER_MAX}
        </span>
      </div>

      <div>
        <p className="mb-2 text-2xs uppercase tracking-[0.18em] text-muted">EQ presets</p>
        <div className="flex flex-wrap gap-2">
          {EQ_PRESETS.map((p) => {
            const active = session.eqPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPreset(p.id)}
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
        </div>
      </div>
    </div>
  );
}
