import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { destravarAudio, lerPrefs, tocarAvisoOcioso } from '@/modules/alertas/lib/som';

// Nome no cronômetro (`usuarios.nome`) de quem faz as demandas do Designer.
export const DESIGNER_NOME = 'Gabriel';
export const LIMITE_OCIOSO_MIN = 15;
// Só cobra no expediente (horário de Brasília, seg–sex), para não apitar à noite e no fim de semana.
const EXPEDIENTE = { inicio: 9, fim: 18 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const CHAVE_AVISADO = 'startip-designer-ocioso';

interface Estado { rodando: boolean; desde: string | null }

// Está tocando algo agora? Timer aberto e não pausado = sim. Senão, ocioso desde o fim
// do último timer (ou desde o início da pausa).
async function lerEstado(): Promise<Estado> {
  const { data: u } = await db.from('usuarios').select('id').eq('nome', DESIGNER_NOME).maybeSingle();
  if (!u) return { rodando: true, desde: null }; // sem cadastro no cronômetro: não dá para medir
  const { data: aberto } = await db
    .from('registros_tempo').select('pausado, inicio_pausa').eq('usuario_id', u.id).is('fim', null)
    .order('inicio', { ascending: false }).limit(1).maybeSingle();
  if (aberto) {
    return aberto.pausado && aberto.inicio_pausa
      ? { rodando: false, desde: aberto.inicio_pausa }
      : { rodando: true, desde: null };
  }
  const { data: ultimo } = await db
    .from('registros_tempo').select('fim').eq('usuario_id', u.id).not('fim', 'is', null)
    .order('fim', { ascending: false }).limit(1).maybeSingle();
  return { rodando: false, desde: ultimo?.fim ?? null };
}

function partesSP(d: Date) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? '';
  return { dia: get('weekday'), min: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

/** Minutos parado dentro do expediente (0 fora dele; no começo do dia conta desde a abertura). */
function minutosOciososNoExpediente(desde: string | null, agora: Date): number {
  const a = partesSP(agora);
  if (a.dia === 'Sat' || a.dia === 'Sun') return 0;
  if (a.min < EXPEDIENTE.inicio * 60 || a.min >= EXPEDIENTE.fim * 60) return 0;
  const inicioExpediente = new Date(agora.getTime() - (a.min - EXPEDIENTE.inicio * 60) * 60_000);
  const base = desde && new Date(desde) > inicioExpediente ? new Date(desde) : inicioExpediente;
  return Math.max(0, (agora.getTime() - base.getTime()) / 60_000);
}

export interface AvisoOcioso { id: string; minutos: number }

/** Avisa (som + cartão + notificação do sistema) quando o designer fica parado ≥ 15 min. */
export function useDesignerOcioso(habilitado: boolean, onAbrir?: () => void) {
  const q = useQuery({
    queryKey: ['designer', 'ocioso'],
    queryFn: lerEstado,
    enabled: habilitado && !IS_DEMO,
    refetchInterval: 30_000,
  });
  const [aviso, setAviso] = useState<AvisoOcioso | null>(null);
  const [relogio, setRelogio] = useState(0);

  useEffect(() => {
    if (!habilitado) return;
    const liberar = () => destravarAudio();
    window.addEventListener('pointerdown', liberar, { once: true });
    window.addEventListener('keydown', liberar, { once: true });
    const t = setInterval(() => setRelogio((n) => n + 1), 30_000);
    return () => {
      window.removeEventListener('pointerdown', liberar);
      window.removeEventListener('keydown', liberar);
      clearInterval(t);
    };
  }, [habilitado]);

  useEffect(() => {
    if (!habilitado || !q.data) return;
    if (q.data.rodando) {
      setAviso(null);
      try { localStorage.removeItem(CHAVE_AVISADO); } catch { /* ignora */ }
      return;
    }
    const min = minutosOciososNoExpediente(q.data.desde, new Date());
    const faixa = Math.floor(min / LIMITE_OCIOSO_MIN); // 1 = 15 min, 2 = 30 min…
    if (faixa < 1) return;
    // Uma vez por faixa de 15 min e por período parado (chave = desde quando está parado).
    const chave = `${q.data.desde ?? 'expediente'}#${faixa}`;
    let ja: string | null = null;
    try { ja = localStorage.getItem(CHAVE_AVISADO); } catch { /* ignora */ }
    if (ja === chave) return;
    try { localStorage.setItem(CHAVE_AVISADO, chave); } catch { /* ignora */ }

    const minutos = Math.round(min);
    setAviso({ id: chave, minutos });
    const prefs = lerPrefs();
    if (prefs.ativo) tocarAvisoOcioso(prefs.volume);
    if (prefs.desktop && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(`${DESIGNER_NOME} está parado`, {
          body: `${DESIGNER_NOME} não está tocando nenhuma demanda há mais de ${minutos} min.`,
          tag: 'designer-ocioso', requireInteraction: true, silent: false,
        });
        n.onclick = () => { window.focus(); onAbrir?.(); n.close(); };
      } catch { /* navegador sem suporte */ }
    }
  }, [habilitado, q.data, relogio, onAbrir]);

  return { aviso, dispensar: () => setAviso(null) };
}
