import { useEffect } from "react";
import { BluetoothConnected, Power } from "lucide-react";
import { AmpView } from "@/components/app/amp-view";
import { ConnectView } from "@/components/app/connect-view";
import { EqView } from "@/components/app/eq-view";
import { HomeView } from "@/components/app/home-view";
import { RgbView } from "@/components/app/rgb-view";
import { TabBar } from "@/components/app/tab-bar";
import { XoverView } from "@/components/app/xover-view";
import { bleLink } from "@/lib/bluetooth/link";
import type { NearbyAmp } from "@/lib/bluetooth/transport";
import { getModel } from "@/lib/dsp/models";
import { useAmpStore } from "@/store/amp-store";

export function DspApp() {
  const status = useAmpStore((s) => s.status);
  const session = useAmpStore((s) => s.session);
  const tab = useAmpStore((s) => s.tab);
  const presets = useAmpStore((s) => s.presets);

  useEffect(() => {
    void useAmpStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    let timer = 0;
    const unsub = useAmpStore.subscribe((state, prev) => {
      if (state.session?.transport !== "ble") return;
      if (state.session === prev.session) return;
      window.clearTimeout(timer);
      const next = state.session;
      timer = window.setTimeout(() => {
        void bleLink.sync(next);
      }, 60);
    });
    return () => {
      window.clearTimeout(timer);
      unsub();
    };
  }, []);

  const connectAmp = (amp: NearbyAmp) => {
    useAmpStore.getState().setStatus("connecting");
    window.setTimeout(() => {
      useAmpStore.getState().connect({
        modelId: amp.modelId,
        name: amp.name,
        transport: amp.kind,
        deviceId: amp.id,
      });
      if (amp.kind === "ble") {
        const s = useAmpStore.getState().session;
        if (s) void bleLink.sync(s);
      }
    }, 700);
  };

  const scan = () => {
    useAmpStore.getState().setStatus("scanning");
    window.setTimeout(() => {
      const current = useAmpStore.getState();
      if (current.status === "scanning") current.setStatus("idle");
    }, 900);
  };

  const disconnect = () => {
    bleLink.disconnect();
    useAmpStore.getState().disconnect();
  };

  const shell = "flex min-h-svh w-full max-w-md flex-col border-x border-border bg-bg";

  if (!session || status !== "connected") {
    return (
      <div className={shell}>
        <ConnectView
          scanning={status === "scanning"}
          connecting={status === "connecting"}
          onScan={scan}
          onConnect={connectAmp}
          onBle={connectAmp}
        />
      </div>
    );
  }

  const model = getModel(session.modelId);

  return (
    <div className={shell}>
      <header className="safe-top flex items-center gap-3 px-5 pb-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-raised text-success">
          <BluetoothConnected className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{session.name}</p>
          <p className="text-2xs uppercase tracking-[0.16em] text-muted">
            {model.name} · {session.transport === "ble" ? "BLE" : "Demo"}
            {session.transport === "ble" && bleLink.info?.writeUuid
              ? ` · ${shortUuid(bleLink.info.writeUuid)}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label="Disconnect"
          onClick={disconnect}
          className="flex size-11 items-center justify-center rounded-lg text-muted pressable"
        >
          <Power className="size-5" />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === "home" ? (
          <HomeView
            session={session}
            onMaster={(v) => useAmpStore.getState().setMaster(v)}
            onMute={(v) => useAmpStore.getState().setMuted(v)}
            onPreset={(id) => useAmpStore.getState().applyEqPreset(id)}
          />
        ) : null}
        {tab === "eq" ? <EqView session={session} /> : null}
        {tab === "xover" ? (
          <XoverView
            session={session}
            onGroup={(id) => useAmpStore.getState().setActiveGroup(id)}
            onPatch={(id, patch) => useAmpStore.getState().patchGroup(id, patch)}
          />
        ) : null}
        {tab === "light" ? (
          <RgbView
            session={session}
            onRgb={(patch) => useAmpStore.getState().setRgb(patch)}
          />
        ) : null}
        {tab === "amp" ? (
          <AmpView
            session={session}
            presets={presets}
            onRename={(name) => useAmpStore.getState().rename(name)}
            onSave={(name) => useAmpStore.getState().savePreset(name)}
            onLoad={(id) => useAmpStore.getState().loadPreset(id)}
            onDelete={(id) => useAmpStore.getState().deletePreset(id)}
            onReset={() => useAmpStore.getState().resetDsp()}
            onDisconnect={disconnect}
            onMute={(v) => useAmpStore.getState().setMuted(v)}
          />
        ) : null}
      </main>

      <TabBar tab={tab} onChange={(id) => useAmpStore.getState().setTab(id)} />
    </div>
  );
}

function shortUuid(uuid: string) {
  const m = uuid.match(/^0000([0-9a-f]{4})/i);
  return m ? m[1]!.toUpperCase() : uuid.slice(0, 8);
}
