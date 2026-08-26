import type { AmpModel, ChannelGroupState, PeqBand } from "./types.ts";

const speaker = (
  id: string,
  label: string,
  channels: string,
): AmpModel["groups"][number] => ({
  id,
  label,
  kind: "speaker",
  channels,
});

const sub = (
  id: string,
  label: string,
  channels: string,
): AmpModel["groups"][number] => ({
  id,
  label,
  kind: "sub",
  channels,
});

export const AMP_MODELS: AmpModel[] = [
  {
    id: "XDA91RB",
    name: "XDA91RB",
    series: "XDA",
    layout: "mono",
    peakWatts: 1200,
    rms: "240W × 1 @ 4Ω · 600W @ 1Ω",
    groups: [sub("sub", "Sub", "CH1")],
    lpfMin: 32,
    lpfMax: 350,
    hpfMin: null,
    hpfMax: null,
    remoteBass: true,
    bassBoost: true,
    blurb: "Class D monoblock. Low-pass, remote bass, 10-band + PEQ, RGB badge.",
  },
  {
    id: "XDA92RB",
    name: "XDA92RB",
    series: "XDA",
    layout: "2ch",
    peakWatts: 600,
    rms: "80W × 2 @ 4Ω · 240W bridged",
    groups: [speaker("front", "CH 1/2", "CH1/2")],
    lpfMin: 32,
    lpfMax: 320,
    hpfMin: 32,
    hpfMax: 320,
    remoteBass: false,
    bassBoost: true,
    blurb: "2-channel. High-pass / low-pass / full, 10-band + PEQ, RGB badge.",
  },
  {
    id: "XDA94RB",
    name: "XDA94RB",
    series: "XDA",
    layout: "4ch",
    peakWatts: 1000,
    rms: "75W × 4 @ 4Ω · 1000W peak",
    groups: [
      speaker("front", "CH 1/2", "CH1/2"),
      speaker("rear", "CH 3/4", "CH3/4"),
    ],
    lpfMin: 32,
    lpfMax: 320,
    hpfMin: 32,
    hpfMax: 320,
    remoteBass: false,
    bassBoost: true,
    blurb: "4-channel. Independent crossovers per pair, 10-band + PEQ, RGB.",
  },
  {
    id: "XDA95RB",
    name: "XDA95RB",
    series: "XDA",
    layout: "5ch",
    peakWatts: 1500,
    rms: "4 speakers + sub · 1500W peak",
    groups: [
      speaker("front", "CH 1/2", "CH1/2"),
      speaker("rear", "CH 3/4", "CH3/4"),
      sub("sub", "Sub", "CH5"),
    ],
    lpfMin: 32,
    lpfMax: 320,
    hpfMin: 32,
    hpfMax: 320,
    remoteBass: true,
    bassBoost: true,
    blurb: "5-channel. Front/rear/sub DSP plus 10-band graphic and parametric EQ.",
  },
  {
    id: "JA1B",
    name: "JA1B",
    series: "JA",
    layout: "mono",
    peakWatts: 690,
    rms: "Class D mono · Bluetooth DSP",
    groups: [sub("sub", "Sub", "CH1")],
    lpfMin: 32,
    lpfMax: 350,
    hpfMin: null,
    hpfMax: null,
    remoteBass: true,
    bassBoost: true,
    blurb: "JA-B monoblock. App-controlled DSP, RGB illumination.",
  },
  {
    id: "JA2B",
    name: "JA2B",
    series: "JA",
    layout: "2ch",
    peakWatts: 225,
    rms: "95W × 2 @ 4Ω · 225W bridged",
    groups: [speaker("front", "CH 1/2", "CH1/2")],
    lpfMin: 32,
    lpfMax: 320,
    hpfMin: 32,
    hpfMax: 320,
    remoteBass: false,
    bassBoost: true,
    blurb: "Compact 2-channel JA-B. Crossovers, 10-band + PEQ, RGB.",
  },
  {
    id: "JA4B",
    name: "JA4B",
    series: "JA",
    layout: "4ch",
    peakWatts: 740,
    rms: "90W × 4 @ 4Ω · 230W × 2 bridged",
    groups: [
      speaker("front", "CH 1/2", "CH1/2"),
      speaker("rear", "CH 3/4", "CH3/4"),
    ],
    lpfMin: 32,
    lpfMax: 320,
    hpfMin: 32,
    hpfMax: 320,
    remoteBass: false,
    bassBoost: true,
    blurb: "4-channel JA-B. Two pair crossovers, 10-band + PEQ, RGB.",
  },
  {
    id: "JA5B",
    name: "JA5B",
    series: "JA",
    layout: "5ch",
    peakWatts: 815,
    rms: "4 speakers + sub · Bluetooth DSP",
    groups: [
      speaker("front", "CH 1/2", "CH1/2"),
      speaker("rear", "CH 3/4", "CH3/4"),
      sub("sub", "Sub", "CH5"),
    ],
    lpfMin: 32,
    lpfMax: 320,
    hpfMin: 32,
    hpfMax: 320,
    remoteBass: true,
    bassBoost: true,
    blurb: "5-channel JA-B. Front/rear/sub DSP groups, RGB badge.",
  },
  {
    id: "BOAUNO",
    name: "BOAUNO",
    series: "BOA",
    layout: "4ch",
    peakWatts: 800,
    rms: "Marine 4-channel · Bluetooth DSP",
    groups: [
      speaker("front", "CH 1/2", "CH1/2"),
      speaker("rear", "CH 3/4", "CH3/4"),
    ],
    lpfMin: 32,
    lpfMax: 320,
    hpfMin: 32,
    hpfMax: 320,
    remoteBass: false,
    bassBoost: true,
    blurb: "Marine 4-channel. Same DSP stack: graphic, parametric, RGB.",
  },
];

export const MODEL_BY_ID = Object.fromEntries(
  AMP_MODELS.map((m) => [m.id, m]),
) as Record<string, AmpModel>;

export const XDA_MODELS = AMP_MODELS.filter((m) => m.series === "XDA");
export const OTHER_MODELS = AMP_MODELS.filter((m) => m.series !== "XDA");

export const EQ_FREQUENCIES = [
  31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
] as const;
export const EQ_Q = 1.4;
export const EQ_GAIN_MIN = -15;
export const EQ_GAIN_MAX = 15;
export const BASS_BOOST_HZ = 45;
export const MASTER_MAX = 40;
export const GAIN_MIN_MV = 200;
export const GAIN_MAX_MV = 6000;

export function getModel(id: string): AmpModel {
  return MODEL_BY_ID[id] ?? AMP_MODELS[1]!;
}

export function createDefaultGroups(model: AmpModel): ChannelGroupState[] {
  return model.groups.map((g) => ({
    id: g.id,
    mode: g.kind === "sub" ? "lpf" : "full",
    frequency: 80,
    slope: 12,
    gainMv: 500,
    bassBoostDb: 0,
    remoteBass: 50,
  }));
}

export function createDefaultPeq(): PeqBand[] {
  return [
    { id: "p1", enabled: true, type: "hpf", freq: 25, gain: 0, q: 0.7 },
    { id: "p2", enabled: true, type: "peak", freq: 80, gain: 0, q: 1.1 },
    { id: "p3", enabled: true, type: "peak", freq: 250, gain: 0, q: 1.0 },
    { id: "p4", enabled: true, type: "peak", freq: 1000, gain: 0, q: 1.0 },
    { id: "p5", enabled: true, type: "peak", freq: 4000, gain: 0, q: 1.2 },
    { id: "p6", enabled: true, type: "hshelf", freq: 10000, gain: 0, q: 0.7 },
  ];
}

export function freqRangeForGroup(model: AmpModel, groupId: string) {
  const spec = model.groups.find((g) => g.id === groupId);
  if (spec?.kind === "sub") {
    return { min: model.lpfMin, max: model.lpfMax };
  }
  return {
    min: model.hpfMin ?? model.lpfMin,
    max: model.hpfMax ?? model.lpfMax,
  };
}

export function allowedModes(
  model: AmpModel,
  groupId: string,
): Array<"full" | "hpf" | "lpf"> {
  const spec = model.groups.find((g) => g.id === groupId);
  if (spec?.kind === "sub" || model.hpfMin == null) return ["lpf", "full"];
  return ["full", "hpf", "lpf"];
}

export function expandLegacyGains(gains: number[]): number[] {
  if (gains.length >= EQ_FREQUENCIES.length) {
    return EQ_FREQUENCIES.map((_, i) => gains[i] ?? 0);
  }
  const old = [50, 250, 1000, 4000, 16000];
  return EQ_FREQUENCIES.map((f) => {
    let lo = 0;
    while (lo < old.length - 1 && old[lo + 1]! < f) lo += 1;
    const hi = Math.min(lo + 1, old.length - 1);
    const f0 = old[lo]!;
    const f1 = old[hi]!;
    const g0 = gains[lo] ?? 0;
    const g1 = gains[hi] ?? g0;
    if (f1 === f0) return g0;
    const t = (Math.log(f) - Math.log(f0)) / (Math.log(f1) - Math.log(f0));
    return Math.round((g0 + (g1 - g0) * t) * 2) / 2;
  });
}
