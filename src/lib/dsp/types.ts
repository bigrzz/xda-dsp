export type TabId = "home" | "eq" | "xover" | "light" | "amp";

export type EqPage = "graphic" | "parametric" | "rta";

export type XoverMode = "full" | "hpf" | "lpf";

export type SlopeDb = 6 | 12 | 18;

export type RgbMode = "off" | "solid" | "cycle" | "breathe";

export type ChannelKind = "speaker" | "sub";

export type AmpLayout = "mono" | "2ch" | "4ch" | "5ch";

export type PeqType = "peak" | "lshelf" | "hshelf" | "notch" | "hpf" | "lpf";

export interface ChannelGroupSpec {
  id: string;
  label: string;
  kind: ChannelKind;
  channels: string;
}

export interface AmpModel {
  id: string;
  name: string;
  series: "XDA" | "JA" | "BOA";
  layout: AmpLayout;
  peakWatts: number;
  rms: string;
  groups: ChannelGroupSpec[];
  lpfMin: number;
  lpfMax: number;
  hpfMin: number | null;
  hpfMax: number | null;
  remoteBass: boolean;
  bassBoost: boolean;
  blurb: string;
}

export interface ChannelGroupState {
  id: string;
  mode: XoverMode;
  frequency: number;
  slope: SlopeDb;
  gainMv: number;
  bassBoostDb: number;
  remoteBass: number;
}

export interface RgbState {
  mode: RgbMode;
  hue: number;
  sat: number;
  brightness: number;
  speed: number;
}

export interface PeqBand {
  id: string;
  enabled: boolean;
  type: PeqType;
  freq: number;
  gain: number;
  q: number;
}

export interface AmpSession {
  deviceId: string;
  name: string;
  modelId: string;
  transport: "demo" | "ble";
  master: number;
  muted: boolean;
  eqGains: number[];
  eqPreset: string;
  graphicQ: number;
  shelfEnds: boolean;
  proportionalQ: boolean;
  preampDb: number;
  graphicOn: boolean;
  peqOn: boolean;
  peq: PeqBand[];
  groups: ChannelGroupState[];
  activeGroupId: string;
  rgb: RgbState;
}

export interface SavedPreset {
  id: string;
  name: string;
  modelId: string;
  createdAt: number;
  master: number;
  eqGains: number[];
  eqPreset: string;
  graphicQ: number;
  shelfEnds: boolean;
  proportionalQ: boolean;
  preampDb: number;
  graphicOn: boolean;
  peqOn: boolean;
  peq: PeqBand[];
  groups: ChannelGroupState[];
  rgb: RgbState;
}

export type LinkStatus = "idle" | "scanning" | "connecting" | "connected";
