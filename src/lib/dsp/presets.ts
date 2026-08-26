export interface EqFactoryPreset {
  id: string;
  label: string;
  gains: number[];
}

export const EQ_PRESETS: EqFactoryPreset[] = [
  { id: "flat", label: "Flat", gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: "classic", label: "Classic", gains: [2, 3, 2, 1, 0, 0, 1, 1, 2, 2] },
  { id: "pop", label: "Pop", gains: [4, 4, 2, 1, -1, -1, 1, 2, 3, 4] },
  { id: "rock", label: "Rock", gains: [5, 5, 3, 2, -2, -1, 1, 3, 3, 3] },
  { id: "jazz", label: "Jazz", gains: [2, 2, 1, 0, 1, 2, 1, 1, 0, -1] },
  { id: "bass", label: "Bass", gains: [6, 5, 3, 1, 0, -1, 0, 0, -1, -2] },
  { id: "vocal", label: "Vocal", gains: [0, -1, -1, 1, 2, 3, 2, 1, 0, 0] },
];

export function matchEqPreset(gains: number[]): string {
  for (const preset of EQ_PRESETS) {
    if (
      preset.gains.length === gains.length &&
      preset.gains.every((g, i) => Math.abs(g - (gains[i] ?? 0)) < 0.05)
    ) {
      return preset.id;
    }
  }
  return "custom";
}
