let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function note(
  ac: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine"
) {
  const osc = ac.createOscillator();
  const gainNode = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);

  gainNode.gain.setValueAtTime(0, startAt);
  gainNode.gain.linearRampToValueAtTime(gain, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  osc.connect(gainNode);
  gainNode.connect(ac.destination);

  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

export function playSuccess() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    note(ac, 523.25, t,        0.18, 0.18);
    note(ac, 659.25, t + 0.1,  0.18, 0.18);
    note(ac, 783.99, t + 0.2,  0.28, 0.22);
  } catch {}
}

export function playError() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    note(ac, 349.23, t,        0.18, 0.22, "sawtooth");
    note(ac, 246.94, t + 0.15, 0.28, 0.20, "sawtooth");
  } catch {}
}

export function playInfo() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    note(ac, 880, t, 0.18, 0.14);
  } catch {}
}

export function playWarning() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    note(ac, 440, t,        0.12, 0.16, "triangle");
    note(ac, 440, t + 0.16, 0.12, 0.16, "triangle");
  } catch {}
}

export type SoundType = "success" | "error" | "info" | "warning";

export function playSound(type: SoundType) {
  switch (type) {
    case "success": return playSuccess();
    case "error":   return playError();
    case "warning": return playWarning();
    case "info":    return playInfo();
  }
}
