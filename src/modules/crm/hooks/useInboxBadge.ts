import { useEffect, useRef, useState } from 'react';
import { useConversas } from '@/modules/crm/api/atendimentoApi';

const CHAVE_PUSH = 'startip-os:push-desktop';

export type EstadoPush = 'nao-suportado' | 'pedido-recusado' | 'desligado' | 'ligado';

function suportaNotificacao(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function usePushDesktop() {
  const [estado, setEstado] = useState<EstadoPush>('desligado');

  useEffect(() => {
    if (!suportaNotificacao()) { setEstado('nao-suportado'); return; }
    const optIn = localStorage.getItem(CHAVE_PUSH) === '1';
    if (Notification.permission === 'granted' && optIn) setEstado('ligado');
    else if (Notification.permission === 'denied') setEstado('pedido-recusado');
    else setEstado('desligado');
  }, []);

  async function ligar() {
    if (!suportaNotificacao()) return;
    const p = await Notification.requestPermission();
    if (p === 'granted') {
      localStorage.setItem(CHAVE_PUSH, '1');
      setEstado('ligado');
      new Notification('Startip OS', { body: 'Notificações do WhatsApp estão ativas.' });
    } else if (p === 'denied') {
      setEstado('pedido-recusado');
    }
  }

  function desligar() {
    localStorage.setItem(CHAVE_PUSH, '0');
    setEstado('desligado');
  }

  return { estado, ligar, desligar };
}

// Bip curto (200ms) gerado com WebAudio — não precisa de asset externo.
function tocarBip() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    setTimeout(() => ctx.close().catch(() => { /* já fechado */ }), 400);
  } catch {
    // Autoplay bloqueado ou WebAudio indisponível — silencia.
  }
}

const TITULO_ORIGINAL = 'Startip OS';

export function useInboxBadge() {
  const { data: conversas } = useConversas('todas', 'todas');
  const ultimoTotalRef = useRef(0);

  useEffect(() => {
    const total = (conversas ?? [])
      .filter((c) => !c.arquivado)
      .reduce((soma, c) => soma + (c.nao_lidas || 0), 0);

    document.title = total > 0 ? `(${total}) ${TITULO_ORIGINAL}` : TITULO_ORIGINAL;

    if (total > ultimoTotalRef.current && ultimoTotalRef.current > 0) {
      tocarBip();
      // Desktop push (se opt-in e aba está oculta).
      try {
        if (
          suportaNotificacao() &&
          Notification.permission === 'granted' &&
          localStorage.getItem(CHAVE_PUSH) === '1' &&
          document.visibilityState !== 'visible'
        ) {
          const diff = total - ultimoTotalRef.current;
          new Notification('Startip OS', {
            body: diff === 1 ? 'Nova mensagem no WhatsApp' : `${diff} mensagens novas no WhatsApp`,
            tag: 'startip-os-inbox',
          });
        }
      } catch { /* Notification bloqueada */ }
    }
    ultimoTotalRef.current = total;
  }, [conversas]);

  useEffect(() => () => { document.title = TITULO_ORIGINAL; }, []);
}
