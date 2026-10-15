// Sons de alerta gerados no navegador (Web Audio): sem arquivo de áudio.
// Três timbres: nível 1 (triplo, o mais chamativo no 1º aviso), 2 (chime), 3 (sirene).

const CHAVE_PREFS = 'startip-alertas-som';
const CHAVE_VISTOS = 'startip-alertas-vistos';

export interface PrefsSom {
  ativo: boolean;
  volume: number; // 0..1
  desktop: boolean; // notificação do sistema operacional
}

export function lerPrefs(): PrefsSom {
  try {
    const bruto = localStorage.getItem(CHAVE_PREFS);
    if (bruto) return { ativo: true, volume: 0.8, desktop: false, ...JSON.parse(bruto) };
  } catch { /* storage indisponível */ }
  return { ativo: true, volume: 0.8, desktop: false };
}

export function salvarPrefs(p: PrefsSom): void {
  try { localStorage.setItem(CHAVE_PREFS, JSON.stringify(p)); } catch { /* ignora */ }
}

// Pendência → maior nível já avisado neste navegador (evita repetir som ao recarregar).
export function lerVistos(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(CHAVE_VISTOS) ?? '{}'); } catch { return {}; }
}
export function salvarVistos(v: Record<string, number>): void {
  try { localStorage.setItem(CHAVE_VISTOS, JSON.stringify(v)); } catch { /* ignora */ }
}

let ctx: AudioContext | null = null;
function contexto(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

// Navegadores só liberam áudio depois de um gesto do usuário.
export function destravarAudio(): void {
  const c = contexto();
  if (c && c.state === 'suspended') void c.resume();
}
export function audioLiberado(): boolean {
  return ctx?.state === 'running';
}

function nota(c: AudioContext, freq: number, ini: number, dur: number, vol: number, tipo: OscillatorType = 'sine') {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, ini);
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), ini + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
  o.connect(g).connect(c.destination);
  o.start(ini);
  o.stop(ini + dur + 0.05);
}

export function tocarAlerta(nivel: 1 | 2 | 3, volume = 0.8): boolean {
  const c = contexto();
  if (!c) return false;
  if (c.state === 'suspended') void c.resume();
  if (c.state !== 'running') return false;
  const t = c.currentTime + 0.02;
  const v = Math.min(1, Math.max(0, volume)) * 0.6;
  if (nivel === 2) {
    nota(c, 784, t, 0.35, v);
    nota(c, 1047, t + 0.18, 0.5, v);
  } else if (nivel === 1) {
    [880, 880, 1175].forEach((f, i) => nota(c, f, t + i * 0.22, 0.3, v, 'triangle'));
  } else {
    for (let i = 0; i < 4; i += 1) {
      nota(c, 988, t + i * 0.4, 0.2, v, 'square');
      nota(c, 740, t + i * 0.4 + 0.2, 0.2, v, 'square');
    }
  }
  return true;
}
