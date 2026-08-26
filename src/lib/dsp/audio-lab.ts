export type GenKind = "off" | "sine" | "pink" | "white";

function pinkBuffer(ctx: AudioContext, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] =
      (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buf;
}

function whiteBuffer(ctx: AudioContext, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export class AudioLab {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private master: GainNode | null = null;
  private osc: OscillatorNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private mic: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  kind: GenKind = "off";
  freq = 1000;
  private level = 0.18;
  micOn = false;

  private ensure() {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.72;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    const master = ctx.createGain();
    master.gain.value = this.level;
    analyser.connect(master);
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.analyser = analyser;
    this.master = master;
    return ctx;
  }

  async resume() {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
  }

  setLevel(v: number) {
    this.level = v;
    if (this.master) this.master.gain.value = v;
  }

  setGenerator(kind: GenKind, freq = this.freq) {
    this.freq = freq;
    this.stopGen();
    this.kind = kind;
    if (kind === "off") return;
    const ctx = this.ensure();
    if (!this.analyser) return;
    if (kind === "sine") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(this.analyser);
      osc.start();
      this.osc = osc;
      return;
    }
    const buf = kind === "pink" ? pinkBuffer(ctx) : whiteBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.analyser);
    src.start();
    this.noise = src;
  }

  setSineFreq(freq: number) {
    this.freq = freq;
    if (this.osc) this.osc.frequency.setTargetAtTime(freq, this.ctx?.currentTime ?? 0, 0.02);
  }

  private stopGen() {
    this.osc?.stop();
    this.osc?.disconnect();
    this.osc = null;
    this.noise?.stop();
    this.noise?.disconnect();
    this.noise = null;
  }

  async startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = this.ensure();
      await this.resume();
      const src = ctx.createMediaStreamSource(stream);
      if (this.analyser) src.connect(this.analyser);
      this.mic = src;
      this.stream = stream;
      this.micOn = true;
      return true;
    } catch {
      this.micOn = false;
      return false;
    }
  }

  stopMic() {
    this.mic?.disconnect();
    this.mic = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.micOn = false;
  }

  sampleRate() {
    return this.ctx?.sampleRate ?? 48000;
  }

  pullSpectrum(freqs: number[]): number[] {
    const analyser = this.analyser;
    if (!analyser || (this.kind === "off" && !this.micOn)) {
      return freqs.map(() => -90);
    }
    const bins = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(bins);
    const nyquist = this.sampleRate() / 2;
    return freqs.map((f) => {
      const idx = Math.min(bins.length - 1, Math.round((f / nyquist) * bins.length));
      const v = bins[idx] ?? -90;
      return Number.isFinite(v) ? v : -90;
    });
  }

  pullLevels() {
    const analyser = this.analyser;
    if (!analyser || (this.kind === "off" && !this.micOn)) {
      return { rms: -90, peak: -90 };
    }
    const wave = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(wave);
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < wave.length; i++) {
      const s = wave[i] ?? 0;
      sum += s * s;
      peak = Math.max(peak, Math.abs(s));
    }
    const rms = Math.sqrt(sum / wave.length);
    const toDb = (x: number) => (x < 1e-6 ? -90 : 20 * Math.log10(x));
    return { rms: toDb(rms), peak: toDb(peak) };
  }

  pullWave(out: Uint8Array<ArrayBuffer>) {
    if (!this.analyser) {
      out.fill(128);
      return;
    }
    this.analyser.getByteTimeDomainData(out);
  }

  polarity(): "+" | "-" | null {
    if (this.kind !== "sine" && !this.micOn) return null;
    const analyser = this.analyser;
    if (!analyser) return null;
    const wave = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(wave);
    let min = 255;
    let max = 0;
    let maxI = 0;
    let minI = 0;
    for (let i = 0; i < wave.length; i++) {
      const v = wave[i] ?? 128;
      if (v > max) {
        max = v;
        maxI = i;
      }
      if (v < min) {
        min = v;
        minI = i;
      }
    }
    if (max - min < 8) return null;
    return maxI < minI ? "+" : "-";
  }

  dispose() {
    this.stopGen();
    this.stopMic();
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.master = null;
  }
}
