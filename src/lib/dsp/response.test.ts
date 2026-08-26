import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPeq, expandLegacyGains } from "./models.ts";
import { highShelfDb, hpfBiquadDb, peakingDb } from "./response.ts";

describe("expandLegacyGains", () => {
  it("stretches 5-band tunes onto 10 ISO centers", () => {
    const next = expandLegacyGains([4, 1, 0, 2, 3]);
    assert.equal(next.length, 10);
    assert.equal(next[3], 1);
    assert.equal(next[5], 0);
    assert.equal(next[7], 2);
    assert.equal(next[9], 3);
  });
});

describe("biquads", () => {
  it("peaks near the center frequency", () => {
    const at = peakingDb(1000, 1000, 6, 1.2);
    const away = peakingDb(8000, 1000, 6, 1.2);
    assert.ok(at > 4);
    assert.ok(away < 2);
  });

  it("high shelf lifts the top end", () => {
    assert.ok(highShelfDb(12000, 8000, 4, 0.7) > 2);
    assert.ok(highShelfDb(80, 8000, 4, 0.7) < 1);
  });

  it("HPF attenuates below cutoff", () => {
    assert.ok(hpfBiquadDb(20, 80, 0.7) < -6);
    assert.ok(hpfBiquadDb(1000, 80, 0.7) > -1);
  });

  it("default PEQ is six enabled bands", () => {
    assert.equal(createDefaultPeq().length, 6);
  });
});
