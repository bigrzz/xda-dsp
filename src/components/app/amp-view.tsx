import { useState } from "react";
import { Bluetooth, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getModel } from "@/lib/dsp/models";
import type { AmpSession, SavedPreset } from "@/lib/dsp/types";

export function AmpView({
  session,
  presets,
  onRename,
  onSave,
  onLoad,
  onDelete,
  onReset,
  onDisconnect,
  onMute,
}: {
  session: AmpSession;
  presets: SavedPreset[];
  onRename: (name: string) => void;
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
  onDisconnect: () => void;
  onMute: (muted: boolean) => void;
}) {
  const model = getModel(session.modelId);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(session.name);
  const mine = presets.filter((p) => p.modelId === session.modelId);

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-2">
      <div>
        <h2 className="text-lg font-medium">Amplifier</h2>
        <p className="text-sm text-muted">{model.blurb}</p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-raised text-primary">
            <Bluetooth className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xs uppercase tracking-[0.16em] text-muted">
              {session.transport === "ble" ? "Hardware" : "Demo link"}
            </p>
            <input
              value={editing}
              onChange={(e) => setEditing(e.target.value)}
              onBlur={() => onRename(editing)}
              className="w-full bg-transparent text-base font-medium outline-none"
              aria-label="Amplifier name"
            />
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-2xs uppercase tracking-[0.16em] text-muted">Model</dt>
            <dd>{model.name}</dd>
          </div>
          <div>
            <dt className="text-2xs uppercase tracking-[0.16em] text-muted">Layout</dt>
            <dd className="uppercase">{model.layout}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-2xs uppercase tracking-[0.16em] text-muted">Power</dt>
            <dd>{model.rms}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-2xs uppercase tracking-[0.16em] text-muted">Save tune</p>
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Night drive, SQ, bass…"
            className="h-11 flex-1 rounded-lg border border-border bg-raised px-3 text-sm outline-none placeholder:text-subtle"
          />
          <Button
            variant="secondary"
            onClick={() => {
              if (!draft.trim()) return;
              onSave(draft.trim());
              setDraft("");
            }}
          >
            Save
          </Button>
        </div>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No saved tunes for this model yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {mine.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => onLoad(p.id)}
                  className="min-w-0 flex-1 text-left text-sm"
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => onDelete(p.id)}
                  className="flex size-9 items-center justify-center text-muted"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Mute output</p>
            <p className="text-xs text-muted">Silence master without losing the last level.</p>
          </div>
          <Switch checked={session.muted} onCheckedChange={onMute} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-subtle">
          Hardware pairing works in Chrome on Android. iPhone does not expose Bluetooth
          to web apps — add this tuner to your Home Screen and use a demo amp, or the
          official Jensen DSP Amp Smart App for live hardware.
        </p>
      </section>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={onReset}>
          Reset DSP
        </Button>
        <Button variant="primary" onClick={onDisconnect}>
          Disconnect
        </Button>
      </div>
    </div>
  );
}
