import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  duracaoInicial?: number | null; // fallback quando metadata ainda não carregou
}

const VELOCIDADES = [1, 1.5, 2] as const;
type Velocidade = typeof VELOCIDADES[number];

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const seg = String(Math.floor(s % 60)).padStart(2, '0');
  return `${m}:${seg}`;
}

// Player estilo WhatsApp: play/pause, barra de progresso arrastável, timer,
// e chip de velocidade (1x → 1.5x → 2x, clique cicla). Usa <audio> escondido.
export function AudioPlayer({ src, duracaoInicial }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [dur, setDur] = useState<number>(duracaoInicial ?? 0);
  const [velocidade, setVelocidade] = useState<Velocidade>(1);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = velocidade;
  }, [velocidade]);

  function alternarPlay() {
    const el = audioRef.current;
    if (!el) return;
    setErro(null);
    if (tocando) el.pause();
    else el.play().catch((e) => setErro((e as Error).message || 'não consegui tocar'));
  }

  function proximaVelocidade() {
    setVelocidade((v) => {
      const i = VELOCIDADES.indexOf(v);
      return VELOCIDADES[(i + 1) % VELOCIDADES.length];
    });
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current;
    if (!el || !isFinite(dur)) return;
    const alvo = (parseFloat(e.target.value) / 100) * dur;
    el.currentTime = alvo;
    setTempo(alvo);
  }

  const progresso = dur > 0 ? Math.min(100, (tempo / dur) * 100) : 0;

  // Se o navegador não conseguiu carregar (formato incompatível no iOS Safari
  // com áudio OGG do WhatsApp, por exemplo), oferece link direto de download.
  if (erro) {
    return (
      <div className="flex min-w-[220px] items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-[11px] text-red-300">
        <span>🎵 áudio incompatível</span>
        <a href={src} download className="rounded-full bg-white/10 px-2 py-0.5 text-white hover:bg-white/20" target="_blank" rel="noopener">
          ⬇ baixar
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-w-[220px] items-center gap-2 rounded-full bg-black/20 px-2 py-1">
      <button
        onClick={alternarPlay}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs text-white hover:bg-white/25"
        title={tocando ? 'Pausar' : 'Tocar'}
      >
        {tocando ? '⏸' : '▶'}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={progresso}
        onChange={handleSeek}
        className="h-1 flex-1 accent-white/70"
        style={{ background: `linear-gradient(90deg, rgba(255,255,255,0.6) ${progresso}%, rgba(255,255,255,0.2) ${progresso}%)` }}
      />
      <span className="w-9 text-right font-mono text-[10px] text-white/80">{fmt(dur - tempo)}</span>
      <button
        onClick={proximaVelocidade}
        className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-white/25"
        title="Velocidade"
      >
        {velocidade}x
      </button>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d) && d > 0) setDur(d);
        }}
        onTimeUpdate={(e) => setTempo(e.currentTarget.currentTime)}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => { setTocando(false); setTempo(0); }}
        onError={() => setErro('formato não suportado neste dispositivo')}
        className="hidden"
      />
    </div>
  );
}
