import { useEffect, useRef, useState } from 'react';
import { useEnviarMidia } from '@/modules/crm/api/crmApi';
import { AudioPlayer } from './AudioPlayer';
// opus-recorder grava direto em OGG Opus — o formato que o WhatsApp mobile toca.
// Sem isso, o Chrome grava WebM e o áudio chega "indisponível" no celular.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import Recorder from 'opus-recorder';

interface Props {
  leadId: string;
  stream?: MediaStream;
  respondendoWaId?: string;
  respondendoId?: string;
  onCancel: () => void;
  onEnviado: () => void;
}

function formatoTempo(s: number): string {
  const m = Math.floor(s / 60);
  const seg = String(Math.floor(s % 60)).padStart(2, '0');
  return `${m}:${seg}`;
}

function mensagemErroMic(e: Error): string {
  const nome = e.name || '';
  if (nome === 'NotAllowedError' || nome === 'SecurityError') return 'Permissão de microfone negada. Libere o mic pra este site nas configurações do navegador.';
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError' || (e.message || '').includes('device not found')) return 'Nenhum microfone encontrado. Conecte um mic e tente de novo.';
  if (nome === 'NotReadableError') return 'O microfone está em uso por outro programa. Feche o outro app e tente.';
  return e.message || 'Não foi possível acessar o microfone.';
}

type Estado = 'preparando' | 'gravando' | 'pausado' | 'preview' | 'enviando' | 'erro';

export function AudioRecorder({ leadId, stream: streamProp, respondendoWaId, respondendoId, onCancel, onEnviado }: Props) {
  const [estado, setEstado] = useState<Estado>('preparando');
  const [erro, setErro] = useState<string | null>(null);
  const [tempo, setTempo] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recorderRef = useRef<InstanceType<typeof Recorder> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const enviar = useEnviarMidia();

  function iniciarTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setTempo((t) => t + 1), 1000);
  }
  function pararTimer() {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function iniciarGravacao() {
    setErro(null);
    setEstado('preparando');
    try {
      // Se o stream veio pronto do clique do botão, reutiliza.
      const stream = streamProp ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
      streamRef.current = stream;

      // Cria o Recorder OGG/Opus com worker separado (evita bloquear main thread).
      const rec = new Recorder({
        encoderPath: '/encoderWorker.min.js',
        encoderSampleRate: 16000,        // taxa alvo para voz
        numberOfChannels: 1,
        streamPages: false,
      });
      recorderRef.current = rec;

      rec.ondataavailable = (arrayBuffer: ArrayBuffer) => {
        const b = new Blob([arrayBuffer], { type: 'audio/ogg;codecs=opus' });
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        setEstado('preview');
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      await rec.start(stream);
      setTempo(0);
      setEstado('gravando');
      iniciarTimer();
    } catch (e) {
      const err = e as Error;
      console.error('[mic] falha ao gravar:', err.name, err.message);
      setErro(`${mensagemErroMic(err)} (${err.name || 'sem-nome'})`);
      setEstado('erro');
    }
  }

  useEffect(() => {
    iniciarGravacao();
    return () => {
      pararTimer();
      try { recorderRef.current?.stop(); } catch { /* ignore */ }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pausar() {
    try { recorderRef.current?.pause(); pararTimer(); setEstado('pausado'); }
    catch { /* opus-recorder não suporta pause em todas versões */ }
  }
  function retomar() {
    try { recorderRef.current?.resume(); iniciarTimer(); setEstado('gravando'); }
    catch { /* ignore */ }
  }
  function pararEIrParaPreview() {
    pararTimer();
    try { recorderRef.current?.stop(); } catch { /* ondataavailable dispara */ }
  }
  function descartar() {
    pararTimer();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  }

  async function enviarAudio() {
    if (!blob) return;
    setEstado('enviando');
    try {
      await enviar.mutateAsync({
        leadId,
        tipo: 'audio',
        arquivo: blob,
        nome: `audio-${Date.now()}.ogg`,
        mime: 'audio/ogg',
        duracao: tempo,
        respondendoWaId,
        respondendoId,
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      onEnviado();
    } catch (e) {
      setErro((e as Error).message || 'Falha ao enviar o áudio.');
      setEstado('erro');
    }
  }

  if (estado === 'erro') {
    return (
      <div className="flex items-center gap-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
        <span>⚠️ {erro}</span>
        <button onClick={iniciarGravacao} className="ml-auto rounded px-2 py-1 hover:bg-white/10">Tentar de novo</button>
        <button onClick={descartar} className="rounded px-2 py-1 hover:bg-white/10">Fechar</button>
      </div>
    );
  }

  if (estado === 'gravando' || estado === 'pausado' || estado === 'preparando') {
    const pausado = estado === 'pausado';
    return (
      <div className="flex items-center gap-3 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-slate-100">
        <span className={`relative flex h-3 w-3 ${pausado ? 'opacity-50' : ''}`}>
          {!pausado && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />}
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
        <span className="font-mono">{formatoTempo(tempo)}</span>
        <span className="text-xs text-slate-400">{pausado ? 'Pausado' : 'Gravando…'}</span>
        <button onClick={descartar} className="ml-auto rounded-full px-2 py-1 text-slate-300 hover:bg-white/10" title="Descartar">🗑️</button>
        {pausado ? (
          <button onClick={retomar} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20">▶ Retomar</button>
        ) : (
          <button onClick={pausar} disabled={estado === 'preparando'} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-50">⏸ Pausar</button>
        )}
        <button onClick={pararEIrParaPreview} disabled={estado === 'preparando'} className="rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">⏹ Parar</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
      {previewUrl && <AudioPlayer src={previewUrl} duracaoInicial={tempo} />}
      <span className="text-xs text-slate-400">{formatoTempo(tempo)}</span>
      <button onClick={descartar} className="ml-auto rounded-full px-2 py-1 text-slate-300 hover:bg-white/10" title="Descartar">🗑️</button>
      <button onClick={iniciarGravacao} className="rounded-full bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20" title="Regravar">🔄</button>
      <button onClick={enviarAudio} disabled={estado === 'enviando'} className="rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
        {estado === 'enviando' ? 'Enviando…' : '➤ Enviar'}
      </button>
    </div>
  );
}
