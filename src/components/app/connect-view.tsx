import { useMemo, useState } from "react";
import { Bluetooth, ChevronDown, LoaderCircle, Radio, Signal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OTHER_MODELS, XDA_MODELS, getModel } from "@/lib/dsp/models";
import {
  DEMO_NEARBY,
  bluetoothAvailable,
  requestHardwareAmp,
  type NearbyAmp,
} from "@/lib/bluetooth/transport";
import { cn } from "@/lib/utils";

function RssiBars({ rssi }: { rssi: number }) {
  const level = rssi > -50 ? 3 : rssi > -65 ? 2 : 1;
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1 rounded-full",
            i === 1 ? "h-1.5" : i === 2 ? "h-2.5" : "h-3.5",
            i <= level ? "bg-success" : "bg-border",
          )}
        />
      ))}
    </span>
  );
}

export function ConnectView({
  scanning,
  connecting,
  onScan,
  onConnect,
  onBle,
}: {
  scanning: boolean;
  connecting: boolean;
  onScan: () => void;
  onConnect: (amp: NearbyAmp) => void;
  onBle: (amp: NearbyAmp) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const [bleError, setBleError] = useState<string | null>(null);
  const [bleBusy, setBleBusy] = useState(false);
  const ble = useMemo(() => bluetoothAvailable(), []);

  const handleBle = async () => {
    setBleError(null);
    setBleBusy(true);
    const amp = await requestHardwareAmp();
    setBleBusy(false);
    if (!amp) {
      setBleError(
        "No amplifier selected. Pairing needs a tap in Chrome, Edge, or Samsung Internet.",
      );
      return;
    }
    onBle(amp);
  };

  return (
    <div className="flex min-h-svh flex-col bg-bg px-5 safe-top safe-bottom">
      <header className="pt-6 pb-4">
        <p className="text-2xs font-medium uppercase tracking-[0.28em] text-primary">
          Jensen compatible
        </p>
        <h1 className="font-display mt-2 text-5xl leading-none tracking-tight">XDA DSP</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
          Bluetooth tuner for XDA and JA-B amplifiers. EQ, crossover, gain, bass, and RGB
          from your phone.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-2xs uppercase tracking-[0.18em] text-muted">Pair over Bluetooth</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm text-muted">
          <li>Power the amp and wait for the BT LED to blink.</li>
          <li>Tap Pair hardware — Chrome chooser lists nearby modules.</li>
          <li>
            If asked for a PIN, try{" "}
            <span className="font-medium text-fg">0000</span> or{" "}
            <span className="font-medium text-fg">1234</span>. Modules advertise as
            Heart Rate (<span className="font-medium text-fg">0x180D</span>) and talk
            on <span className="font-medium text-fg">0xAE00</span>.
          </li>
        </ol>
        {ble ? (
          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={() => void handleBle()}
            disabled={bleBusy || connecting}
          >
            {bleBusy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Bluetooth className="size-4" />
            )}
            {bleBusy ? "Waiting for chooser…" : "Pair hardware"}
          </Button>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            iPhone Safari has no Web Bluetooth. Open this app in Chrome on Android, or use a
            demo amp below to tune offline.
          </p>
        )}
        {bleError ? <p className="mt-2 text-xs text-primary">{bleError}</p> : null}
      </section>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Radio className="size-4 text-primary" />
          Demo amplifiers
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onScan}
          disabled={scanning || connecting}
          className="text-muted"
        >
          {scanning ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Signal className="size-4" />
          )}
          {scanning ? "Scanning" : "Scan"}
        </Button>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {DEMO_NEARBY.map((amp) => {
          const model = getModel(amp.modelId);
          return (
            <li key={amp.id}>
              <button
                type="button"
                disabled={connecting}
                onClick={() => onConnect(amp)}
                className="pressable flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-raised text-primary">
                  <Bluetooth className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{amp.name}</span>
                  <span className="block truncate text-xs text-muted">{model.rms}</span>
                </span>
                <RssiBars rssi={amp.rssi} />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="mt-4 flex items-center gap-1 text-sm text-muted"
      >
        More models
        <ChevronDown
          className={cn("size-4 transition-transform duration-150", showMore && "rotate-180")}
        />
      </button>

      {showMore ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[...XDA_MODELS, ...OTHER_MODELS].map((model) => (
            <button
              key={model.id}
              type="button"
              disabled={connecting}
              onClick={() =>
                onConnect({
                  id: `demo-${model.id.toLowerCase()}`,
                  modelId: model.id,
                  name: model.name,
                  rssi: -50,
                  kind: "demo",
                })
              }
              className="pressable rounded-lg border border-border bg-surface px-3 py-3 text-left"
            >
              <span className="block text-sm font-medium">{model.name}</span>
              <span className="block text-2xs text-muted">{model.layout}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-auto pt-6">
        {connecting ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" />
            Linking DSP…
          </p>
        ) : null}
      </div>
    </div>
  );
}
