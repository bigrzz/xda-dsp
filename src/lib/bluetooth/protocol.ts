import { EQ_FREQUENCIES } from "../dsp/models.ts";
import type { AmpSession, ChannelGroupState, XoverMode } from "../dsp/types.ts";

/** Magic from Jensen DSP Amp Smart App (pyapp.jsdsp). */
export const JLBT = [0x4a, 0x4c, 0x42, 0x54] as const; // "JLBT"
export const BTST = [0x42, 0x54, 0x53, 0x54] as const; // "BTST"

export const OP = {
  queryVersion: 0x80,
  volChange: 0x83,
  modeSwitch: 0x84,
  queryModeNum: 0x85,
  eqFamily: 0x88,
  colorSelect: 0x89,
  filterSetting: 0x8b,
  channelSelect: 0x8c,
  filterReset: 0x8f,
  queryFirmware: 0x90,
  channelSync: 0x8e,
} as const;

export const EQ_SUB = {
  select: 0,
  setGain: 1,
  save: 2,
  reset: 3,
  bassBoost: 4,
  allSync: 5,
} as const;

/** Official 5-band speaker EQ. Channel 5 (sub) uses SUB_EQ_FREQS. */
export const HW_EQ_FREQS = [63, 240, 1000, 6500, 12000] as const;
export const HW_SUB_EQ_FREQS = [45, 63, 100, 200, 320] as const;

const PRESET_MASK: Record<string, number> = {
  pop: 1,
  rock: 2,
  vocal: 4,
  jazz: 8,
  classic: 16,
  custom: 32,
};

function u32be(n: number) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function u16be(n: number) {
  const v = Math.max(0, Math.round(n)) & 0xffff;
  return [(v >> 8) & 255, v & 255];
}

let seq = 1;

export function resetSeq() {
  seq = 1;
}

/** JLBT header (15 bytes) + payload. Matches F.a.e() in the official APK. */
export function jlbt(payload: number[], sequence = seq++) {
  const pkt = new Uint8Array(15 + payload.length);
  pkt[0] = JLBT[0];
  pkt[1] = JLBT[1];
  pkt[2] = JLBT[2];
  pkt[3] = JLBT[3];
  pkt.set(u32be(sequence), 4);
  pkt.set(u32be(0), 8);
  pkt[12] = 0;
  pkt[13] = 1;
  pkt[14] = payload.length & 255;
  pkt.set(payload, 15);
  return pkt;
}

export function filterType(mode: XoverMode, slope: number): number {
  if (mode === "hpf") {
    if (slope >= 18) return 1;
    if (slope >= 12) return 2;
    return 3;
  }
  if (mode === "lpf") {
    if (slope >= 18) return 4;
    if (slope >= 12) return 5;
    return 6;
  }
  return 0;
}

export function sampleEq(
  eqGains: number[],
  srcFreqs: readonly number[],
  targets: readonly number[],
) {
  return targets.map((f) => {
    let lo = 0;
    while (lo < srcFreqs.length - 1 && srcFreqs[lo + 1]! < f) lo += 1;
    const hi = Math.min(lo + 1, srcFreqs.length - 1);
    const f0 = srcFreqs[lo]!;
    const f1 = srcFreqs[hi]!;
    const g0 = eqGains[lo] ?? 0;
    const g1 = eqGains[hi] ?? g0;
    if (f1 === f0) return clampGain(g0);
    const t = (Math.log(f) - Math.log(f0)) / (Math.log(f1) - Math.log(f0));
    return clampGain(g0 + (g1 - g0) * t);
  });
}

function clampGain(g: number) {
  return Math.max(-9, Math.min(9, Math.round(g)));
}

/** Pack 5 bands the way request_EQSetGain does. */
export function packEqGains(freqs: readonly number[], gains: number[], chCount: number) {
  const payload = new Array<number>(15).fill(0);
  payload[0] = OP.eqFamily;
  payload[1] = EQ_SUB.setGain;
  let mask = PRESET_MASK.custom ?? 32;
  if (chCount >= 2) mask |= 128;
  payload[2] = mask;
  for (let i = 0; i < 3; i++) {
    const g = clampGain(gains[i] ?? 0);
    const packed = Math.abs(g) | (g < 0 ? 16 : 0);
    const freq = freqs[i] ?? 0;
    payload[3 + i * 2] = ((packed << 3) & 255) | ((freq >> 8) & 255);
    payload[4 + i * 2] = freq & 255;
  }
  for (let i = 3; i < 5; i++) {
    const g = clampGain(gains[i] ?? 0);
    const off = i === 3 ? 9 : 12;
    payload[off] = g >= 0 ? g & 255 : (Math.abs(g) & 127) | 128;
    const freq = freqs[i] ?? 0;
    payload[off + 1] = (freq >> 8) & 255;
    payload[off + 2] = freq & 255;
  }
  return payload;
}

function hslToRgb(h: number, s: number, _l: number) {
  const sat = s / 100;
  const light = 0.5;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ];
}

function channelCount(session: AmpSession) {
  if (session.groups.length >= 3) return 5;
  if (session.groups.length === 2) return 4;
  return session.groups[0]?.id === "sub" ? 1 : 2;
}

function groupChannelIndex(session: AmpSession, group: ChannelGroupState) {
  const i = session.groups.findIndex((g) => g.id === group.id);
  if (i <= 0) return 1;
  if (group.id === "sub") return 5;
  return i * 2 + 1;
}

export function encodeHello() {
  return [jlbt([OP.queryVersion]), jlbt([OP.queryFirmware]), jlbt([OP.queryModeNum])];
}

export function encodeMaster(session: AmpSession) {
  const n = channelCount(session);
  const payload = new Array<number>(8).fill(0);
  payload[0] = OP.volChange;
  let master = Math.max(0, Math.min(40, session.master)) & 127;
  if (session.muted) master |= 128;
  payload[1] = master;
  const start = 2;
  for (let i = 0; i < n && start + i < payload.length; i++) payload[start + i] = master;
  return jlbt(payload);
}

export function encodeGraphic(session: AmpSession) {
  const n = channelCount(session);
  const frames: Uint8Array[] = [];
  const speaker = sampleEq(session.eqGains, EQ_FREQUENCIES, HW_EQ_FREQS);
  frames.push(jlbt(packEqGains(HW_EQ_FREQS, speaker, n)));
  if (session.eqPreset && PRESET_MASK[session.eqPreset] && session.eqPreset !== "custom") {
    frames.unshift(jlbt([OP.eqFamily, EQ_SUB.select, PRESET_MASK[session.eqPreset]!]));
  }
  const sub = session.groups.find((g) => g.id === "sub");
  if (sub) {
    frames.push(jlbt([OP.channelSelect, 5]));
    frames.push(
      jlbt(packEqGains(HW_SUB_EQ_FREQS, sampleEq(session.eqGains, EQ_FREQUENCIES, HW_SUB_EQ_FREQS), n)),
    );
  }
  return frames;
}

export function encodeXover(session: AmpSession) {
  const frames: Uint8Array[] = [];
  for (const group of session.groups) {
    frames.push(jlbt([OP.channelSelect, groupChannelIndex(session, group)]));
    const type = filterType(group.mode, group.slope);
    if (type === 0) {
      frames.push(jlbt([OP.filterSetting, 0, ...u16be(20)]));
    } else {
      frames.push(jlbt([OP.filterSetting, type, ...u16be(group.frequency)]));
    }
    frames.push(jlbt([OP.eqFamily, EQ_SUB.bassBoost, group.bassBoostDb > 0.1 ? 1 : 0]));
  }
  return frames;
}

export function encodeRgb(session: AmpSession) {
  const on = session.rgb.mode !== "off";
  let flags = on ? 1 : 0;
  if (session.rgb.mode === "cycle") flags |= 4;
  if (session.rgb.mode === "breathe") flags |= 128;
  const [r, g, b] = hslToRgb(session.rgb.hue, session.rgb.sat, session.rgb.brightness);
  const br = session.rgb.brightness / 100;
  return jlbt([
    OP.colorSelect,
    flags,
    Math.round(r * br),
    Math.round(g * br),
    Math.round(b * br),
  ]);
}

export function encodeSession(session: AmpSession) {
  return [
    ...encodeHello(),
    encodeMaster(session),
    ...encodeGraphic(session),
    ...encodeXover(session),
    encodeRgb(session),
  ];
}
