import { useEffect, useRef, useState } from 'react';
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
const CHAVE_AVISADO = 'startip-designer-ocioso-ultimo-toque';

interface Estado { rodando: boolean; desde: string | null }

// Está tocando algo agora? Timer aberto e não pausado = sim. Senão, ocioso desde o fim
// do último timer (ou desde o início da pausa).
async function lerEstado(): Promise<Estado> {
  // O quadro manda: demanda dele (ou sem responsável) em "Em andamento" = trabalhando,
  // mesmo que o timer esteja pausado, fechado ou aberto em outro nome.
  const { data: designers } = await db.from('profiles').select('id').neq('papel', 'admin').ilike('cargo', '%designer%');
  const ids = new Set<string>(((designers ?? []) as { id: string }[]).map((p) => p.id));
  const { data: andamento, error: eA } = await db.from('designer_demandas').select('responsavel_id').eq('status', 'em_andamento');
  if (eA) return { rodando: true, desde: null }; // sem leitura confiável, não avisa
  const naMao = ((andamento ?? []) as { responsavel_id: string | null }[])
    .some((d) => !d.responsavel_id || ids.has(d.responsavel_id));
  if (naMao) return { rodando: true, desde: null };

  const { data: u } = await db.from('usuarios').select('id').eq('nome', DESIGNER_NOME).maybeSingle();
  if (!u) return { rodando: true, desde: null }; // sem cadastro no cronômetro: não dá para medir
  const { data: aberto, error: eB } = await db
    .from('registros_tempo').select('pausado, inicio_pausa').eq('usuario_id', u.id).is('fim', null)
    .order('inicio', { ascending: false }).limit(1).maybeSingle();
  if (eB) return { rodando: true, desde: null };
  if (aberto) {
    return aberto.pausado && aberto.inicio_pausa
      ? { rodando: false, desde: aberto.inicio_pausa }
      : { rodando: true, desde: null };
  }
  const { data: ultimo, error: eC } = await db
    .from('registros_tempo').select('fim').eq('usuario_id', u.id).not('fim', 'is', null)
    .order('fim', { ascending: false }).limit(1).maybeSingle();
  if (eC) return { rodando: true, desde: null };
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

  // Trava rígida: no máximo um toque a cada 15 min por navegador, aconteça o que acontecer
  // com os dados (o último toque fica em memória e no localStorage).
  const ultimoToque = useRef<number>(0);
  if (ultimoToque.current === 0) {
    try { ultimoToque.current = Number(localStorage.getItem(CHAVE_AVISADO)) || 0; } catch { /* ignora */ }
  }

  useEffect(() => {
    if (!habilitado || !q.data) return;
    if (q.data.rodando) { setAviso(null); return; }
    const min = minutosOciososNoExpediente(q.data.desde, new Date());
    if (min < LIMITE_OCIOSO_MIN) return;
    const agora = Date.now();
    if (agora - ultimoToque.current < LIMITE_OCIOSO_MIN * 60_000) return;
    ultimoToque.current = agora;
    try { localStorage.setItem(CHAVE_AVISADO, String(agora)); } catch { /* ignora */ }
    const chave = String(agora);

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
