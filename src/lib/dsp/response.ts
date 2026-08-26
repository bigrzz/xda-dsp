import { BASS_BOOST_HZ, EQ_FREQUENCIES } from "./models.ts";
import type { AmpSession, ChannelGroupState, PeqBand, PeqType, XoverMode } from "./types.ts";

const FS = 48000;
const POINTS = 160;

export const FREQ_MIN = 20;
export const FREQ_MAX = 20000;
export const DB_MIN = -24;
export const DB_MAX = 15;

function biquadMagDb(
  f: number,
  b0: number,
  b1: number,
  b2: number,
  a0: number,
  a1: number,
  a2: number,
) {
  const w = (2 * Math.PI * f) / FS;
  const c1 = Math.cos(w);
  const c2 = Math.cos(2 * w);
  const s1 = Math.sin(w);
  const s2 = Math.sin(2 * w);
  const numRe = b0 + b1 * c1 + b2 * c2;
  const numIm = -(b1 * s1 + b2 * s2);
  const denRe = a0 + a1 * c1 + a2 * c2;
  const denIm = -(a1 * s1 + a2 * s2);
  const num = numRe * numRe + numIm * numIm;
  const den = denRe * denRe + denIm * denIm;
  if (den < 1e-18) return 0;
  return 10 * Math.log10(num / den);
}

function rbj(f0: number, Q: number) {
  const w0 = (2 * Math.PI * f0) / FS;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Math.max(Q, 0.05));
  return { cos, alpha };
}

export function peakingDb(f: number, f0: number, gainDb: number, Q: number) {
  if (Math.abs(gainDb) < 0.01) return 0;
  const A = 10 ** (gainDb / 40);
  const { cos, alpha } = rbj(f0, Q);
  const b0 = 1 + alpha * A;
  const b1 = -2 * cos;
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * cos;
  const a2 = 1 - alpha / A;
  return biquadMagDb(f, b0, b1, b2, a0, a1, a2);
}

export function lowShelfDb(f: number, f0: number, gainDb: number, Q: number) {
  if (Math.abs(gainDb) < 0.01) return 0;
  const A = 10 ** (gainDb / 40);
  const { cos, alpha } = rbj(f0, Q);
  const twoSa = 2 * Math.sqrt(A) * alpha;
  const b0 = A * (A + 1 - (A - 1) * cos + twoSa);
  const b1 = 2 * A * (A - 1 - (A + 1) * cos);
  const b2 = A * (A + 1 - (A - 1) * cos - twoSa);
  const a0 = A + 1 + (A - 1) * cos + twoSa;
  const a1 = -2 * (A - 1 + (A + 1) * cos);
  const a2 = A + 1 + (A - 1) * cos - twoSa;
  return biquadMagDb(f, b0, b1, b2, a0, a1, a2);
}

export function highShelfDb(f: number, f0: number, gainDb: number, Q: number) {
  if (Math.abs(gainDb) < 0.01) return 0;
  const A = 10 ** (gainDb / 40);
  const { cos, alpha } = rbj(f0, Q);
  const twoSa = 2 * Math.sqrt(A) * alpha;
  const b0 = A * (A + 1 + (A - 1) * cos + twoSa);
  const b1 = -2 * A * (A - 1 + (A + 1) * cos);
  const b2 = A * (A + 1 + (A - 1) * cos - twoSa);
  const a0 = A + 1 - (A - 1) * cos + twoSa;
  const a1 = 2 * (A - 1 - (A + 1) * cos);
  const a2 = A + 1 - (A - 1) * cos - twoSa;
  return biquadMagDb(f, b0, b1, b2, a0, a1, a2);
}

export function notchDb(f: number, f0: number, Q: number) {
  const { cos, alpha } = rbj(f0, Q);
  const b0 = 1;
  const b1 = -2 * cos;
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return biquadMagDb(f, b0, b1, b2, a0, a1, a2);
}

export function hpfBiquadDb(f: number, f0: number, Q: number) {
  const { cos, alpha } = rbj(f0, Q);
  const b0 = (1 + cos) / 2;
  const b1 = -(1 + cos);
  const b2 = (1 + cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return biquadMagDb(f, b0, b1, b2, a0, a1, a2);
}

export function lpfBiquadDb(f: number, f0: number, Q: number) {
  const { cos, alpha } = rbj(f0, Q);
  const b0 = (1 - cos) / 2;
  const b1 = 1 - cos;
  const b2 = (1 - cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return biquadMagDb(f, b0, b1, b2, a0, a1, a2);
}

export function hpfDb(f: number, fc: number, order: number) {
  const ratio = fc / Math.max(f, 1e-6);
  return 10 * Math.log10(1 / (1 + ratio ** (2 * order)));
}

export function lpfDb(f: number, fc: number, order: number) {
  const ratio = f / Math.max(fc, 1e-6);
  return 10 * Math.log10(1 / (1 + ratio ** (2 * order)));
}

export function xoverDb(f: number, group: ChannelGroupState, mode: XoverMode) {
  const order = group.slope / 6;
  if (mode === "hpf") return hpfDb(f, group.frequency, order);
  if (mode === "lpf") return lpfDb(f, group.frequency, order);
  return 0;
}

export function peqBandDb(f: number, band: PeqBand) {
  if (!band.enabled) return 0;
  switch (band.type) {
    case "peak":
      return peakingDb(f, band.freq, band.gain, band.q);
    case "lshelf":
      return lowShelfDb(f, band.freq, band.gain, band.q);
    case "hshelf":
      return highShelfDb(f, band.freq, band.gain, band.q);
    case "notch":
      return notchDb(f, band.freq, band.q);
    case "hpf":
      return hpfBiquadDb(f, band.freq, band.q);
    case "lpf":
      return lpfBiquadDb(f, band.freq, band.q);
    default:
      return 0;
  }
}

export function graphicBandDb(
  f: number,
  freq: number,
  gain: number,
  q: number,
  type: PeqType,
) {
  if (type === "lshelf") return lowShelfDb(f, freq, gain, q);
  if (type === "hshelf") return highShelfDb(f, freq, gain, q);
  return peakingDb(f, freq, gain, q);
}

export function logspace(count = POINTS) {
  const out: number[] = [];
  const a = Math.log(FREQ_MIN);
  const b = Math.log(FREQ_MAX);
  for (let i = 0; i < count; i++) {
    out.push(Math.exp(a + ((b - a) * i) / (count - 1)));
  }
  return out;
}

const FREQS = logspace();

export function effectiveGraphicQ(
  baseQ: number,
  gain: number,
  proportional: boolean,
) {
  if (!proportional) return baseQ;
  return baseQ * (1 + Math.abs(gain) / 15);
}

export function computeCurve(session: AmpSession, group: ChannelGroupState) {
  const last = EQ_FREQUENCIES.length - 1;
  return FREQS.map((f) => {
    let db = session.preampDb ?? 0;
    if (session.graphicOn !== false) {
      for (let i = 0; i < EQ_FREQUENCIES.length; i++) {
        const gain = session.eqGains[i] ?? 0;
        const q = effectiveGraphicQ(
          session.graphicQ ?? 1.4,
          gain,
          session.proportionalQ ?? false,
        );
        let type: PeqType = "peak";
        if (session.shelfEnds) {
          if (i === 0) type = "lshelf";
          if (i === last) type = "hshelf";
        }
        db += graphicBandDb(f, EQ_FREQUENCIES[i]!, gain, q, type);
      }
    }
    if (session.peqOn !== false) {
      for (const band of session.peq ?? []) {
        db += peqBandDb(f, band);
      }
    }
    if (group.bassBoostDb > 0.01) {
      db += peakingDb(f, BASS_BOOST_HZ, group.bassBoostDb, 0.9);
    }
    db += xoverDb(f, group, group.mode);
    return { f, db };
  });
}

export { FREQS as CURVE_FREQS };
