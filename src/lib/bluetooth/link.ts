import { encodeSession, resetSeq } from "@/lib/bluetooth/protocol.ts";
import type { AmpSession } from "@/lib/dsp/types.ts";

/** Official Jensen DSP Amp Smart App (F.e) */
export const HEART_RATE = "0000180d-0000-1000-8000-00805f9b34fb";
export const AE00 = "0000ae00-0000-1000-8000-00805f9b34fb";
export const AE01 = "0000ae01-0000-1000-8000-00805f9b34fb";
export const AE02 = "0000ae02-0000-1000-8000-00805f9b34fb";
export const CCCD = "00002902-0000-1000-8000-00805f9b34fb";

export const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
export const FFE0 = "0000ffe0-0000-1000-8000-00805f9b34fb";
export const FFE1 = "0000ffe1-0000-1000-8000-00805f9b34fb";
export const FFF0 = "0000fff0-0000-1000-8000-00805f9b34fb";
export const FFF1 = "0000fff1-0000-1000-8000-00805f9b34fb";
export const FFF2 = "0000fff2-0000-1000-8000-00805f9b34fb";

export const OPTIONAL_SERVICES = [
  AE00,
  HEART_RATE,
  NUS_SERVICE,
  FFE0,
  FFF0,
  "generic_access",
  "device_information",
];

export const NAME_PREFIXES = ["XDA", "JA", "Jensen", "JENSEN", "BOA", "DSP", "OCTANE"];

type GattServer = {
  connected: boolean;
  connect: () => Promise<GattServer>;
  disconnect: () => void;
  getPrimaryService: (uuid: string) => Promise<GattService>;
  getPrimaryServices?: () => Promise<GattService[]>;
};

type GattService = {
  uuid: string;
  getCharacteristic: (uuid: string) => Promise<GattChar>;
  getCharacteristics?: () => Promise<GattChar[]>;
};

type GattChar = {
  uuid: string;
  properties: {
    write?: boolean;
    writeWithoutResponse?: boolean;
    notify?: boolean;
  };
  writeValue: (data: Uint8Array) => Promise<void>;
  writeValueWithoutResponse?: (data: Uint8Array) => Promise<void>;
  startNotifications?: () => Promise<GattChar>;
  addEventListener: (type: string, fn: (ev: Event) => void) => void;
};

type BleDevice = {
  id: string;
  name?: string;
  gatt?: GattServer;
  addEventListener: (type: string, fn: () => void) => void;
};

export type BleStatus = "idle" | "chooser" | "connecting" | "ready" | "error";

export interface BleInfo {
  id: string;
  name: string;
  service: string;
  writeUuid: string;
}

async function findWriteChar(server: GattServer): Promise<{
  service: string;
  char: GattChar;
} | null> {
  const tries: Array<{ service: string; char: string; notify?: string }> = [
    { service: AE00, char: AE01, notify: AE02 },
    { service: FFE0, char: FFE1 },
    { service: NUS_SERVICE, char: NUS_RX, notify: NUS_TX },
    { service: FFF0, char: FFF1 },
    { service: FFF0, char: FFF2 },
  ];
  for (const t of tries) {
    try {
      const svc = await server.getPrimaryService(t.service);
      const char = await svc.getCharacteristic(t.char);
      if (t.notify) {
        try {
          const n = await svc.getCharacteristic(t.notify);
          await n.startNotifications?.();
        } catch {
          /* notify optional */
        }
      }
      return { service: t.service, char };
    } catch {
      /* try next UART */
    }
  }
  if (!server.getPrimaryServices) return null;
  try {
    const services = await server.getPrimaryServices();
    for (const svc of services) {
      const chars = (await svc.getCharacteristics?.()) ?? [];
      const writable = chars.find(
        (c) => c.properties.writeWithoutResponse || c.properties.write,
      );
      if (writable) return { service: svc.uuid, char: writable };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export class BleLink {
  device: BleDevice | null = null;
  private writeChar: GattChar | null = null;
  private queue: Promise<void> = Promise.resolve();
  info: BleInfo | null = null;
  status: BleStatus = "idle";
  lastError: string | null = null;
  onStatus?: (status: BleStatus, error?: string | null) => void;

  private setStatus(status: BleStatus, error: string | null = null) {
    this.status = status;
    this.lastError = error;
    this.onStatus?.(status, error);
  }

  async pair(): Promise<BleInfo | null> {
    const nav = navigator as Navigator & {
      bluetooth?: {
        requestDevice: (opts: {
          filters?: Array<{ namePrefix?: string; services?: string[] }>;
          optionalServices?: string[];
          acceptAllDevices?: boolean;
        }) => Promise<BleDevice>;
      };
    };
    if (!nav.bluetooth) {
      this.setStatus("error", "Web Bluetooth is not available in this browser.");
      return null;
    }

    this.setStatus("chooser");
    let device: BleDevice;
    try {
      device = await nav.bluetooth.requestDevice({
        filters: [
          { services: [HEART_RATE] },
          { services: [AE00] },
          ...NAME_PREFIXES.map((namePrefix) => ({ namePrefix })),
        ],
        optionalServices: OPTIONAL_SERVICES,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/choos(er|e)|cancel|abort/i.test(message)) {
        this.setStatus("idle");
        return null;
      }
      try {
        device = await nav.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: OPTIONAL_SERVICES,
        });
      } catch (fallback) {
        const why = fallback instanceof Error ? fallback.message : message;
        this.setStatus("error", why || "Pairing cancelled.");
        return null;
      }
    }

    this.device = device;
    device.addEventListener("gattserverdisconnected", () => {
      this.writeChar = null;
      this.info = null;
      this.setStatus("error", "Amplifier disconnected.");
    });

    this.setStatus("connecting");
    try {
      const server = await device.gatt?.connect();
      if (!server) throw new Error("No GATT server.");
      const found = await findWriteChar(server);
      if (!found) {
        this.setStatus(
          "error",
          "Connected, but no AE01 / FFE1 writable characteristic was found.",
        );
        return {
          id: device.id,
          name: device.name?.trim() || "Jensen Amp",
          service: "unknown",
          writeUuid: "none",
        };
      }
      this.writeChar = found.char;
      this.info = {
        id: device.id,
        name: device.name?.trim() || "Jensen Amp",
        service: found.service,
        writeUuid: found.char.uuid,
      };
      this.setStatus("ready");
      return this.info;
    } catch (err) {
      const why = err instanceof Error ? err.message : "GATT connect failed.";
      this.setStatus("error", why);
      return null;
    }
  }

  get connected() {
    return Boolean(this.device?.gatt?.connected && this.writeChar);
  }

  async write(bytes: Uint8Array) {
    const char = this.writeChar;
    if (!char) return;
    this.queue = this.queue
      .then(async () => {
        if (char.writeValueWithoutResponse) await char.writeValueWithoutResponse(bytes);
        else await char.writeValue(bytes);
      })
      .catch((err) => {
        this.setStatus("error", err instanceof Error ? err.message : "Write failed.");
      });
    return this.queue;
  }

  async sync(session: AmpSession) {
    if (!this.connected) return;
    resetSeq();
    for (const pkt of encodeSession(session)) {
      await this.write(pkt);
      await new Promise((r) => setTimeout(r, 40));
    }
  }

  disconnect() {
    try {
      this.device?.gatt?.disconnect();
    } catch {
      /* ignore */
    }
    this.device = null;
    this.writeChar = null;
    this.info = null;
    this.setStatus("idle");
  }
}

export const bleLink = new BleLink();
