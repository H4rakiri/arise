// Короткие системные сэмплы (§11): level-up, new quest, card drop, xp.
// Синтез через WebAudio — ноль внешних зависимостей, за тумблером в настройках.

let ctx = null;

function ensureCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', gain = 0.08) {
  const c = ensureCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur);
}

const SOUNDS = {
  xp:       () => tone(880, 0, 0.12, 'triangle'),
  quest:    () => { tone(523, 0, 0.15, 'square', 0.05); tone(784, 0.12, 0.2, 'square', 0.05); },
  levelup:  () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle')); },
  rankup:   () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.3, 'triangle')); },
  card:     () => { tone(1175, 0, 0.1, 'sine'); tone(1568, 0.09, 0.25, 'sine'); },
  freeze:   () => tone(330, 0, 0.3, 'sine', 0.06),
};

export function playSound(name, enabled) {
  if (!enabled) return;
  try {
    SOUNDS[name]?.();
  } catch {
    /* автоплей-политика — не критично */
  }
}
