import { useEffect, useRef, useState } from 'react';
import { enviarAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface Props {
  onGravado: (anexo: CriativoAnexo) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Cada navegador grava num formato (Chrome webm, Safari mp4); pega o primeiro suportado.
function escolherMime(): { mime: string; ext: string } {
  const candidatos: Array<[string, string]> = [
    ['audio/webm;codecs=opus', 'webm'],
    ['audio/webm', 'webm'],
    ['audio/mp4', 'm4a'],
    ['audio/ogg;codecs=opus', 'ogg'],
  ];
  for (const [mime, ext] of candidatos) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  }
  return { mime: '', ext: 'webm' };
}

function mensagemErro(e: Error): string {
  if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
    return 'Permissão de microfone negada. Libere o microfone para este site no navegador.';
  }
  if (e.name === 'NotFoundError') return 'Nenhum microfone encontrado.';
  if (e.name === 'NotReadableError') return 'O microfone está em uso por outro programa.';
  return e.message || 'Não foi possível gravar o áudio.';
}

type Estado = 'parado' | 'gravando' | 'enviando';

// Grava o briefing em áudio e já hospeda o arquivo junto da demanda.
export function GravadorAudio({ onGravado }: Props) {
  const [estado, setEstado] = useState<Estado>('parado');
  const [tempo, setTempo] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  function limpar() {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Fechar o modal no meio da gravação não pode deixar o microfone aberto.
  useEffect(() => () => {
    limpar();
    if (recRef.current && recRef.current.state !== 'inactive') {
      recRef.current.onstop = null;
      recRef.current.stop();
    }
  }, []);

  async function iniciar() {
    setErro(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErro('Este navegador não suporta gravação de áudio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mime, ext } = escolherMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      pedacosRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) pedacosRef.current.push(e.data); };
      rec.onstop = async () => {
        limpar();
        const tipo = rec.mimeType || mime || 'audio/webm';
        const blob = new Blob(pedacosRef.current, { type: tipo });
        if (blob.size === 0) { setEstado('parado'); return; }
        setEstado('enviando');
        try {
          const nome = `audio-briefing-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.${ext}`;
          const file = new File([blob], nome, { type: tipo.split(';')[0] });
          onGravado(await enviarAnexo(file));
        } catch (e) {
          setErro((e as Error).message || 'Falha ao enviar o áudio.');
        }
        setEstado('parado');
      };
      recRef.current = rec;
      rec.start();
      setTempo(0);
      setEstado('gravando');
      timerRef.current = window.setInterval(() => setTempo((t) => t + 1), 1000);
    } catch (e) {
      limpar();
      setErro(mensagemErro(e as Error));
      setEstado('parado');
    }
  }

  function parar() {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    recRef.current?.stop();
  }

  return (
    <div className="space-y-1">
      {estado === 'parado' && (
        <button
          type="button"
          onClick={() => void iniciar()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 hover:border-brand-400/60 hover:bg-brand-500/10"
        >
          <GlassIcon name="mic" /> Gravar áudio explicando a demanda
        </button>
      )}
      {estado === 'gravando' && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          <span className="font-semibold text-red-200">Gravando… {fmt(tempo)}</span>
          <button
            type="button"
            onClick={parar}
            className="ml-auto rounded-md bg-red-500/30 px-3 py-1 font-semibold text-red-100 hover:bg-red-500/40"
          >
            <GlassIcon name="stop" /> Parar e salvar
          </button>
        </div>
      )}
      {estado === 'enviando' && <p className="text-xs text-slate-300">Salvando áudio…</p>}
      {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
    </div>
  );
}
