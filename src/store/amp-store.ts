import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  createDefaultGroups,
  createDefaultPeq,
  expandLegacyGains,
  EQ_FREQUENCIES,
  EQ_GAIN_MAX,
  EQ_GAIN_MIN,
  getModel,
  MASTER_MAX,
} from "@/lib/dsp/models";
import { EQ_PRESETS, matchEqPreset } from "@/lib/dsp/presets";
import type {
  AmpSession,
  ChannelGroupState,
  LinkStatus,
  PeqBand,
  RgbState,
  SavedPreset,
  TabId,
} from "@/lib/dsp/types";
import { clamp } from "@/lib/utils";

const DEFAULT_RGB: RgbState = {
  mode: "solid",
  hue: 8,
  sat: 86,
  brightness: 80,
  speed: 4,
};

function eqFields() {
  return {
    eqGains: Array.from({ length: EQ_FREQUENCIES.length }, () => 0),
    eqPreset: "flat",
    graphicQ: 1.4,
    shelfEnds: false,
    proportionalQ: true,
    preampDb: 0,
    graphicOn: true,
    peqOn: true,
    peq: createDefaultPeq(),
  };
}

function newSession(
  modelId: string,
  name: string,
  transport: AmpSession["transport"],
  deviceId: string,
): AmpSession {
  const model = getModel(modelId);
  const groups = createDefaultGroups(model);
  return {
    deviceId,
    name,
    modelId,
    transport,
    master: 28,
    muted: false,
    ...eqFields(),
    groups,
    activeGroupId: groups[0]?.id ?? "front",
    rgb: { ...DEFAULT_RGB },
  };
}

function migrateSession(raw: AmpSession): AmpSession {
  const fresh = eqFields();
  return {
    ...fresh,
    ...raw,
    eqGains: expandLegacyGains(raw.eqGains ?? fresh.eqGains),
    peq: raw.peq?.length ? raw.peq : fresh.peq,
    graphicQ: raw.graphicQ ?? fresh.graphicQ,
    shelfEnds: raw.shelfEnds ?? false,
    proportionalQ: raw.proportionalQ ?? true,
    preampDb: raw.preampDb ?? 0,
    graphicOn: raw.graphicOn ?? true,
    peqOn: raw.peqOn ?? true,
  };
}

function snapshotEq(session: AmpSession) {
  return {
    master: session.master,
    eqGains: [...session.eqGains],
    eqPreset: session.eqPreset,
    graphicQ: session.graphicQ,
    shelfEnds: session.shelfEnds,
    proportionalQ: session.proportionalQ,
    preampDb: session.preampDb,
    graphicOn: session.graphicOn,
    peqOn: session.peqOn,
    peq: session.peq.map((b) => ({ ...b })),
    groups: session.groups.map((g) => ({ ...g })),
    rgb: { ...session.rgb },
  };
}

const persistStorage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return localStorage;
});

interface AmpState {
  status: LinkStatus;
  tab: TabId;
  session: AmpSession | null;
  presets: SavedPreset[];
  connect: (opts: {
    modelId: string;
    name: string;
    transport: AmpSession["transport"];
    deviceId: string;
  }) => void;
  disconnect: () => void;
  setStatus: (status: LinkStatus) => void;
  setTab: (tab: TabId) => void;
  rename: (name: string) => void;
  setMaster: (value: number) => void;
  setMuted: (muted: boolean) => void;
  setEqGain: (index: number, gain: number) => void;
  applyEqPreset: (id: string) => void;
  setGraphicQ: (q: number) => void;
  setShelfEnds: (v: boolean) => void;
  setProportionalQ: (v: boolean) => void;
  setPreamp: (db: number) => void;
  setGraphicOn: (v: boolean) => void;
  setPeqOn: (v: boolean) => void;
  patchPeq: (id: string, patch: Partial<PeqBand>) => void;
  addPeqBand: () => void;
  removePeqBand: (id: string) => void;
  setActiveGroup: (id: string) => void;
  patchGroup: (id: string, patch: Partial<ChannelGroupState>) => void;
  setRgb: (patch: Partial<RgbState>) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  resetDsp: () => void;
}

export const useAmpStore = create<AmpState>()(
  persist(
    (set, get) => ({
      status: "idle",
      tab: "home",
      session: null,
      presets: [],
      connect: ({ modelId, name, transport, deviceId }) =>
        set({
          status: "connected",
          tab: "home",
          session: newSession(modelId, name, transport, deviceId),
        }),
      disconnect: () =>
        set({
          status: "idle",
          tab: "home",
          session: null,
        }),
      setStatus: (status) => set({ status }),
      setTab: (tab) => set({ tab }),
      rename: (name) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, name: name.trim() || session.name } });
      },
      setMaster: (value) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, master: clamp(value, 0, MASTER_MAX) } });
      },
      setMuted: (muted) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, muted } });
      },
      setEqGain: (index, gain) => {
        const session = get().session;
        if (!session) return;
        const eqGains = session.eqGains.map((g, i) =>
          i === index ? clamp(gain, EQ_GAIN_MIN, EQ_GAIN_MAX) : g,
        );
        set({
          session: { ...session, eqGains, eqPreset: matchEqPreset(eqGains) },
        });
      },
      applyEqPreset: (id) => {
        const session = get().session;
        if (!session) return;
        const preset = EQ_PRESETS.find((p) => p.id === id);
        if (!preset) return;
        set({
          session: {
            ...session,
            eqGains: [...preset.gains],
            eqPreset: preset.id,
          },
        });
      },
      setGraphicQ: (q) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, graphicQ: clamp(q, 0.3, 8) } });
      },
      setShelfEnds: (shelfEnds) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, shelfEnds } });
      },
      setProportionalQ: (proportionalQ) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, proportionalQ } });
      },
      setPreamp: (db) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, preampDb: clamp(db, -12, 12) } });
      },
      setGraphicOn: (graphicOn) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, graphicOn } });
      },
      setPeqOn: (peqOn) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, peqOn } });
      },
      patchPeq: (id, patch) => {
        const session = get().session;
        if (!session) return;
        set({
          session: {
            ...session,
            peq: session.peq.map((b) => (b.id === id ? { ...b, ...patch } : b)),
          },
        });
      },
      addPeqBand: () => {
        const session = get().session;
        if (!session || session.peq.length >= 8) return;
        const band: PeqBand = {
          id: `p${Date.now()}`,
          enabled: true,
          type: "peak",
          freq: 800,
          gain: 0,
          q: 1.0,
        };
        set({ session: { ...session, peq: [...session.peq, band] } });
      },
      removePeqBand: (id) => {
        const session = get().session;
        if (!session || session.peq.length <= 1) return;
        set({ session: { ...session, peq: session.peq.filter((b) => b.id !== id) } });
      },
      setActiveGroup: (id) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, activeGroupId: id } });
      },
      patchGroup: (id, patch) => {
        const session = get().session;
        if (!session) return;
        set({
          session: {
            ...session,
            groups: session.groups.map((g) =>
              g.id === id ? { ...g, ...patch } : g,
            ),
          },
        });
      },
      setRgb: (patch) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, rgb: { ...session.rgb, ...patch } } });
      },
      savePreset: (name) => {
        const session = get().session;
        if (!session) return;
        const preset: SavedPreset = {
          id: `p-${Date.now()}`,
          name: name.trim() || "Untitled",
          modelId: session.modelId,
          createdAt: Date.now(),
          ...snapshotEq(session),
        };
        set({ presets: [preset, ...get().presets].slice(0, 24) });
      },
      loadPreset: (id) => {
        const session = get().session;
        const preset = get().presets.find((p) => p.id === id);
        if (!session || !preset) return;
        if (preset.modelId !== session.modelId) return;
        const migrated = migrateSession({
          ...session,
          ...snapshotEq(preset as unknown as AmpSession),
        });
        set({ session: migrated });
      },
      deletePreset: (id) =>
        set({ presets: get().presets.filter((p) => p.id !== id) }),
      resetDsp: () => {
        const session = get().session;
        if (!session) return;
        set({
          session: newSession(
            session.modelId,
            session.name,
            session.transport,
            session.deviceId,
          ),
        });
      },
    }),
    {
      name: "xda-dsp-v1",
      version: 2,
      storage: persistStorage,
      partialize: (state) => ({
        status: state.status === "connected" ? "connected" : "idle",
        session: state.session,
        presets: state.presets,
        tab: "home" as TabId,
      }),
      migrate: (persisted, version) => {
        const data = persisted as {
          session: AmpSession | null;
          presets: SavedPreset[];
          status: LinkStatus;
          tab: TabId;
        };
        if (version < 2) {
          if (data.session) data.session = migrateSession(data.session);
          data.presets = (data.presets ?? []).map((p) => {
            const s = migrateSession({
              ...(p as unknown as AmpSession),
              deviceId: "preset",
              name: p.name,
              modelId: p.modelId,
              transport: "demo",
              muted: false,
              activeGroupId: p.groups?.[0]?.id ?? "front",
            });
            return { ...p, ...snapshotEq(s) };
          });
        }
        return data;
      },
      skipHydration: true,
    },
  ),
);
