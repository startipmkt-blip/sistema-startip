// Sons de alerta: níveis 1 e 2 usam os áudios da agência (public/sons);
// o nível 3 e a reserva usam sons gerados no navegador (Web Audio).

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

// Áudios personalizados da agência (public/sons). O nível 3 usa a sirene do sistema.
const ARQUIVOS: Partial<Record<1 | 2 | 3, string>> = {
  1: '/sons/alerta-1.mp3',
  2: '/sons/alerta-2.mp3',
};

function sintetizado(nivel: 1 | 2 | 3, volume: number): boolean {
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

// Retorna true se o arquivo começou a tocar ou o som sintetizado foi usado.
// Se o arquivo falhar (rede, bloqueio), cai no som sintetizado.
export function tocarAlerta(nivel: 1 | 2 | 3, volume = 0.8): boolean {
  const arquivo = ARQUIVOS[nivel];
  if (arquivo) {
    try {
      const a = new Audio(arquivo);
      a.volume = Math.min(1, Math.max(0, volume));
      void a.play().catch(() => { sintetizado(nivel, volume); });
      return true;
    } catch {
      return sintetizado(nivel, volume);
    }
  }
  return sintetizado(nivel, volume);
}
