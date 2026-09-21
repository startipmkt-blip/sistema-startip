import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/auth/AuthProvider';

export interface NotifConfig {
  som: boolean;
  notificacao: boolean;
  titulo_badge: boolean;
  mute_ate: string | null;
  novas_atribuidas: boolean;
  fila_livre: boolean;
}

const DEFAULT_CONFIG: NotifConfig = {
  som: true,
  notificacao: true,
  titulo_badge: true,
  mute_ate: null,
  novas_atribuidas: true,
  fila_livre: true,
};

export function useNotifConfig() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const cfg = useQuery({
    queryKey: ['crm', 'notif-config', profile?.id],
    queryFn: async (): Promise<NotifConfig> => {
      if (!profile?.id) return DEFAULT_CONFIG;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('profiles')
        .select('notif_config')
        .eq('id', profile.id)
        .maybeSingle();
      if (error) return DEFAULT_CONFIG;
      return { ...DEFAULT_CONFIG, ...((data?.notif_config as Partial<NotifConfig>) ?? {}) };
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  });

  const salvar = useMutation({
    mutationFn: async (patch: Partial<NotifConfig>) => {
      if (!profile?.id) return;
      const atual = cfg.data ?? DEFAULT_CONFIG;
      const novo = { ...atual, ...patch };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('profiles')
        .update({ notif_config: novo })
        .eq('id', profile.id);
      if (error) throw error;
      return novo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm', 'notif-config'] }),
  });

  return { config: cfg.data ?? DEFAULT_CONFIG, isLoading: cfg.isLoading, salvar };
}

// ---------- Som via Web Audio (sem arquivo externo) ----------
let audioCtx: AudioContext | null = null;
export function tocarBip() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor: any = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    const ctx = audioCtx;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, now);
    o.frequency.exponentialRampToValueAtTime(660, now + 0.15);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(now);
    o.stop(now + 0.4);
  } catch { /* ignore */ }
}

// ---------- Badge no título ----------
let contadorGlobal = 0;
let tituloOriginal = '';
export function bumpBadgeTitulo() {
  if (!tituloOriginal) tituloOriginal = document.title.replace(/^\(\d+\)\s+/, '');
  contadorGlobal += 1;
  document.title = `(${contadorGlobal}) ${tituloOriginal}`;
}
export function limparBadgeTitulo() {
  contadorGlobal = 0;
  if (tituloOriginal) document.title = tituloOriginal;
}

// ---------- Permissão + Notification ----------
export async function pedirPermissao(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'default') {
    try { return await Notification.requestPermission(); } catch { return 'denied'; }
  }
  return Notification.permission;
}

export function mostrarNotificacao(titulo: string, corpo: string, url?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(titulo, {
      body: corpo,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'crm-msg',
    });
    if (url) {
      n.onclick = () => {
        window.focus();
        if (window.location.pathname !== url) window.location.href = url;
        n.close();
      };
    }
  } catch { /* ignore */ }
}

// ---------- Anti-spam simples: agrupa 3s ----------
const janela = new Map<string, { count: number; timer: number }>();
function comAgrupamento(chaveLead: string, cb: () => void) {
  const existente = janela.get(chaveLead);
  if (existente) {
    existente.count += 1;
    return;
  }
  cb();
  const timer = window.setTimeout(() => janela.delete(chaveLead), 3000);
  janela.set(chaveLead, { count: 1, timer });
}

// ---------- Hook principal: escuta realtime e dispara notificações ----------
export function useNotificacoesCrm() {
  const { profile } = useAuth();
  const { config } = useNotifConfig();
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!profile?.id) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canal = (supabase.channel as any)('crm-notifs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crm_mensagens' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (payload: any) => {
          const m = payload?.new;
          if (!m || m.direcao !== 'recebida') return;

          const cfg = configRef.current;
          if (!cfg.notificacao && !cfg.som && !cfg.titulo_badge) return;
          if (cfg.mute_ate && new Date(cfg.mute_ate) > new Date()) return;

          // Checa se o lead tem atendente. Se sim, só notifica esse atendente.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: lead } = await (supabase.from as any)('crm_leads')
            .select('id, nome, atendente_id')
            .eq('id', m.lead_id)
            .maybeSingle();
          if (!lead) return;

          if (lead.atendente_id) {
            if (lead.atendente_id !== profile.id) return;
            if (!cfg.novas_atribuidas) return;
          } else {
            if (!cfg.fila_livre) return;
          }

          // Se o usuário está OLHANDO essa conversa agora, não notifica.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: vendo } = await (supabase.from as any)('crm_visualizando')
            .select('user_id, ultimo_ping')
            .eq('lead_id', m.lead_id)
            .eq('user_id', profile.id)
            .gt('ultimo_ping', new Date(Date.now() - 90_000).toISOString())
            .maybeSingle();
          if (vendo) return;

          comAgrupamento(String(m.lead_id), () => {
            if (cfg.som) tocarBip();
            if (cfg.titulo_badge) bumpBadgeTitulo();
            if (cfg.notificacao) {
              const preview = String(m.conteudo ?? '').slice(0, 120) || 'Nova mensagem';
              mostrarNotificacao(`💬 ${lead.nome}`, preview, '/crm');
            }
          });
        },
      )
      .subscribe();

    // Limpa badge quando a aba volta ao foco.
    const onFocus = () => limparBadgeTitulo();
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).removeChannel(canal);
    };
  }, [profile?.id]);
}
