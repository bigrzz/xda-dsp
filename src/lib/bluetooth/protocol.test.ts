import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HW_EQ_FREQS,
  JLBT,
  OP,
  filterType,
  jlbt,
  packEqGains,
  resetSeq,
  sampleEq,
} from "./protocol.ts";

describe("official JLBT frames", () => {
  it("starts with JLBT and a 15-byte header", () => {
    resetSeq();
    const pkt = jlbt([OP.queryVersion], 1);
    assert.deepEqual([...pkt.slice(0, 4)], [...JLBT]);
    assert.equal(pkt[13], 1);
    assert.equal(pkt[14], 1);
    assert.equal(pkt[15], OP.queryVersion);
    assert.equal(pkt.length, 16);
  });

  it("maps HPF/LPF slopes the way the stock app does", () => {
    assert.equal(filterType("hpf", 18), 1);
    assert.equal(filterType("hpf", 12), 2);
    assert.equal(filterType("hpf", 6), 3);
    assert.equal(filterType("lpf", 18), 4);
    assert.equal(filterType("lpf", 12), 5);
    assert.equal(filterType("lpf", 6), 6);
    assert.equal(filterType("full", 12), 0);
  });

  it("packs 5-band EQ like request_EQSetGain", () => {
    const payload = packEqGains(HW_EQ_FREQS, [3, -2, 0, 4, -1], 2);
    assert.equal(payload[0], 0x88);
    assert.equal(payload[1], 1);
    assert.equal(payload[2], 32 | 128);
    assert.equal(payload.length, 15);
  });

  it("samples 10-band graphic onto official 63/240/1k/6.5k/12k centers", () => {
    const gains = [6, 5, 3, 1, 0, -1, 0, 0, -1, -2];
    const src = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    const sampled = sampleEq(gains, src, HW_EQ_FREQS);
    assert.equal(sampled.length, 5);
    assert.ok(sampled[0]! >= 4);
    assert.equal(sampled[2], -1);
  });
});
