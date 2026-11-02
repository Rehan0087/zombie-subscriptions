/**
 * Sound effects synthesized with Web Audio: no sampled or copyrighted audio (graveyard-ui 5.2).
 * Off by default; the caller checks the setting.
 */
let ctx: AudioContext | undefined;

function audio(): AudioContext | undefined {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return undefined;
  }
}

function noise(ac: AudioContext, seconds: number): AudioBufferSourceNode {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  return src;
}

function envelope(ac: AudioContext, at: number, peak: number, attack: number, release: number): GainNode {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
  g.connect(ac.destination);
  return g;
}

/** Two scrapes of a shovel in dirt (kill). */
function shovel(ac: AudioContext) {
  for (const offset of [0, 0.32]) {
    const at = ac.currentTime + offset;
    const src = noise(ac, 0.3);
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, at);
    filter.frequency.exponentialRampToValueAtTime(300, at + 0.25);
    src.connect(filter).connect(envelope(ac, at, 0.35, 0.02, 0.25));
    src.start(at);
  }
}

/** A soft gust (spare). */
function wind(ac: AudioContext) {
  const at = ac.currentTime;
  const src = noise(ac, 1.4);
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 4;
  filter.frequency.setValueAtTime(300, at);
  filter.frequency.exponentialRampToValueAtTime(1200, at + 0.7);
  filter.frequency.exponentialRampToValueAtTime(400, at + 1.3);
  src.connect(filter).connect(envelope(ac, at, 0.25, 0.4, 0.9));
  src.start(at);
}

/** A low groan (opening a zombie whose price went up). */
function groan(ac: AudioContext) {
  const at = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(95, at);
  osc.frequency.exponentialRampToValueAtTime(55, at + 0.8);
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  osc.connect(filter).connect(envelope(ac, at, 0.18, 0.15, 0.7));
  osc.start(at);
  osc.stop(at + 1);
}

const EFFECTS = { shovel, wind, groan };
export type SoundName = keyof typeof EFFECTS;

export function play(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  const ac = audio();
  if (ac) EFFECTS[name](ac);
}
