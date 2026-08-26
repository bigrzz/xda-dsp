import { bleLink } from "@/lib/bluetooth/link.ts";
import { MODEL_BY_ID } from "@/lib/dsp/models.ts";

export interface NearbyAmp {
  id: string;
  modelId: string;
  name: string;
  rssi: number;
  kind: "demo" | "ble";
}

export const DEMO_NEARBY: NearbyAmp[] = [
  { id: "demo-xda92", modelId: "XDA92RB", name: "XDA92RB", rssi: -47, kind: "demo" },
  { id: "demo-xda91", modelId: "XDA91RB", name: "XDA91RB", rssi: -58, kind: "demo" },
  { id: "demo-xda95", modelId: "XDA95RB", name: "XDA95RB", rssi: -52, kind: "demo" },
  { id: "demo-xda94", modelId: "XDA94RB", name: "XDA94RB", rssi: -66, kind: "demo" },
];

export function bluetoothAvailable() {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export async function requestHardwareAmp(): Promise<NearbyAmp | null> {
  const info = await bleLink.pair();
  if (!info) return null;
  const rawName = info.name;
  const modelId =
    Object.keys(MODEL_BY_ID).find((id) =>
      rawName.toUpperCase().includes(id.toUpperCase()),
    ) ?? "XDA92RB";
  return {
    id: `ble-${info.id}`,
    modelId,
    name: rawName,
    rssi: -40,
    kind: "ble",
  };
}
