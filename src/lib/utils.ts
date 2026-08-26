import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatHz(freq: number) {
  if (freq >= 1000) {
    const k = freq / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return `${Math.round(freq)}`;
}

export function formatGainMv(mv: number) {
  if (mv >= 1000) return `${(mv / 1000).toFixed(1)} V`;
  return `${Math.round(mv)} mV`;
}

export function hslToRgb(h: number, s: number, l: number) {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

export function rgbCss(h: number, s: number, l: number) {
  const { r, g, b } = hslToRgb(h, s, l);
  return `rgb(${r} ${g} ${b})`;
}

export function vibrate(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}
