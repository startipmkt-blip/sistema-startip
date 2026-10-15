import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type {
  AlertasConfig, EnvioAlerta, EventoAlerta, GrupoAlerta, LogAlerta, MembroEquipe, Pendencia,
} from '@/modules/alertas/types';

const keys = {
  config: ['alertas', 'config'] as const,
  grupos: ['alertas', 'grupos'] as const,
  equipe: ['alertas', 'equipe'] as const,
  pendencias: (ini: string | null, fim: string | null) => ['alertas', 'pendencias', ini, fim] as const,
  detalhe: (id: string) => ['alertas', 'detalhe', id] as const,
  envios: (ini: string | null, fim: string | null) => ['alertas', 'envios', ini, fim] as const,
  log: ['alertas', 'log'] as const,
};

// Painel se atualiza sozinho (sem recarregar a página).
const REFRESH_MS = 15_000;

// ---------- Demo (somente sem chaves do Supabase) ----------
const agora = () => Date.now();
const iso = (minAtras: number) => new Date(agora() - minAtras * 60000).toISOString();

const demoConfig: AlertasConfig = {
  ativo: true, grupo_interno_id: 'demo-interno-group', grupo_interno_nome: 'Startip | Alertas (demo)',
  nivel1_min: 10, nivel2_min: 40, nivel3_min: 60, sla_min: 30,
  horario_comercial_ativo: false, hc_inicio: '08:00:00', hc_fim: '18:00:00', hc_dias: [1, 2, 3, 4, 5],
  max_tentativas: 5, retencao_dias: 180,
};
const demoGrupos: GrupoAlerta[] = [
  {
    id: 'g1', chat_id: 'demo-1-group', nome_grupo: 'LG Internet | Startip', cliente_nome: 'LG Internet', cliente_id: null,
    monitorar: true, prazo_min: null, hc_ativo: null, hc_inicio: null, hc_fim: null, hc_dias: null,
    ultima_msg_cliente_em: iso(14), ultima_msg_cliente_texto: 'Pessoal, precisamos ajustar a campanha.',
    ultima_resposta_em: iso(180), ultima_resposta_por: 'Ana',
  },
  {
    id: 'g2', chat_id: 'demo-2-group', nome_grupo: 'Clínica Exemplo | Startip', cliente_nome: 'Clínica Exemplo', cliente_id: null,
    monitorar: true, prazo_min: 15, hc_ativo: null, hc_inicio: null, hc_fim: null, hc_dias: null,
    ultima_msg_cliente_em: iso(50), ultima_msg_cliente_texto: 'Obrigado!', ultima_resposta_em: iso(45), ultima_resposta_por: 'Ana',
  },
  {
    id: 'g3', chat_id: 'demo-3-group', nome_grupo: 'Loja Modelo | Startip', cliente_nome: 'Loja Modelo', cliente_id: null,
    monitorar: false, prazo_min: null, hc_ativo: null, hc_inicio: null, hc_fim: null, hc_dias: null,
    ultima_msg_cliente_em: null, ultima_msg_cliente_texto: null, ultima_resposta_em: null, ultima_resposta_por: null,
  },
];
const demoEquipe: MembroEquipe[] = [
  { id: 'e1', nome: 'Ana (Social Media)', cargo: 'Social media', telefone: '5511987654321', ativo: true },
];
const demoPendencias: Pendencia[] = [
  {
    id: 'p1', chat_id: 'demo-1-group', grupo_id: 'g1', cliente_nome: 'LG Internet', grupo_nome: 'LG Internet | Startip',
    iniciada_em: iso(14), ultima_msg_em: iso(12), ultima_msg_texto: 'Pessoal, precisamos ajustar a campanha.',
    ultima_msg_tipo: 'texto', qtd_msgs: 2, prazo_min: 10, status: 'aguardando', respondida_em: null,
    respondida_por_nome: null, tempo_resposta_seg: null, dentro_prazo: null, alertas_enviados: 1,
    ultimo_alerta_nivel: 1, ultimo_alerta_em: iso(4), minutos_decorridos: 14,
  },
  {
    id: 'p2', chat_id: 'demo-2-group', grupo_id: 'g2', cliente_nome: 'Clínica Exemplo', grupo_nome: 'Clínica Exemplo | Startip',
    iniciada_em: iso(55), ultima_msg_em: iso(55), ultima_msg_texto: 'Podem subir o post hoje?', ultima_msg_tipo: 'texto',
    qtd_msgs: 1, prazo_min: 15, status: 'respondida', respondida_em: iso(50), respondida_por_nome: 'Ana',
    tempo_resposta_seg: 300, dentro_prazo: true, alertas_enviados: 0, ultimo_alerta_nivel: null, ultimo_alerta_em: null,
    minutos_decorridos: 5,
  },
];

// ---------- Leituras ----------
export function useAlertasConfig() {
  return useQuery({
    queryKey: keys.config,
    queryFn: async (): Promise<AlertasConfig> => {
      if (IS_DEMO) return { ...demoConfig };
      const { data, error } = await supabase.from('alertas_config').select('*').eq('id', true).single();
      if (error) throw error;
      return data as AlertasConfig;
    },
  });
}

export function useGruposAlerta() {
  return useQuery({
    queryKey: keys.grupos,
    refetchInterval: REFRESH_MS,
    queryFn: async (): Promise<GrupoAlerta[]> => {
      if (IS_DEMO) return demoGrupos.map((g) => ({ ...g }));
      const { data, error } = await supabase.from('alertas_grupos').select('*').order('nome_grupo');
      if (error) throw error;
      return (data ?? []) as GrupoAlerta[];
    },
  });
}

export function useEquipeAlerta() {
  return useQuery({
    queryKey: keys.equipe,
    queryFn: async (): Promise<MembroEquipe[]> => {
      if (IS_DEMO) return demoEquipe.map((m) => ({ ...m }));
      const { data, error } = await supabase.from('alertas_equipe').select('*').order('nome');
      if (error) throw error;
      return (data ?? []) as MembroEquipe[];
    },
  });
}

// Pendências do período (+ todas as abertas). Tempo decorrido calculado no servidor.
export function usePendencias(inicio: string | null, fim: string | null) {
  return useQuery({
    queryKey: keys.pendencias(inicio, fim),
    refetchInterval: REFRESH_MS,
    queryFn: async (): Promise<Pendencia[]> => {
      if (IS_DEMO) return demoPendencias.map((p) => ({ ...p }));
      const { data, error } = await supabase.rpc('alertas_painel' as never, { p_inicio: inicio, p_fim: fim } as never);
      if (error) throw error;
      return ((data ?? []) as Pendencia[]).map((r) => ({ ...r, minutos_decorridos: r.minutos_decorridos == null ? null : Number(r.minutos_decorridos) }));
    },
  });
}

export function useDetalhePendencia(id: string | null) {
  return useQuery({
    queryKey: keys.detalhe(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<{ eventos: EventoAlerta[]; envios: EnvioAlerta[] }> => {
      if (IS_DEMO) return { eventos: [], envios: [] };
      const [ev, en] = await Promise.all([
        supabase.from('alertas_eventos')
          .select('id, tipo, texto, remetente_nome, classificacao, from_me, ocorrido_em')
          .eq('pendencia_id', id as string).order('ocorrido_em'),
        supabase.from('alertas_envios')
          .select('id, pendencia_id, nivel, status, tentativas, erro, enviado_em, created_at')
          .eq('pendencia_id', id as string).order('nivel'),
      ]);
      if (ev.error) throw ev.error;
      if (en.error) throw en.error;
      return { eventos: (ev.data ?? []) as EventoAlerta[], envios: (en.data ?? []) as EnvioAlerta[] };
    },
  });
}

export function useEnviosPeriodo(inicio: string | null, fim: string | null) {
  return useQuery({
    queryKey: keys.envios(inicio, fim),
    queryFn: async (): Promise<(EnvioAlerta & { pendencia: { cliente_nome: string | null; grupo_nome: string | null } | null })[]> => {
      if (IS_DEMO) return [];
      let q = supabase.from('alertas_envios')
        .select('id, pendencia_id, nivel, status, tentativas, erro, enviado_em, created_at, pendencia:alertas_pendencias(cliente_nome, grupo_nome)')
        .in('status', ['enviado', 'falhou'])
        .order('created_at', { ascending: false }).limit(2000);
      if (inicio) q = q.gte('created_at', inicio);
      if (fim) q = q.lt('created_at', fim);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as never;
    },
  });
}

export function useLogAlertas() {
  return useQuery({
    queryKey: keys.log,
    queryFn: async (): Promise<LogAlerta[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase.from('alertas_log')
        .select('id, em, tipo, chat_id, detalhe').order('em', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as LogAlerta[];
    },
  });
}

// ---------- Escritas ----------
function useInvalidar(...chaves: (readonly unknown[])[]) {
  const qc = useQueryClient();
  return () => { chaves.forEach((k) => void qc.invalidateQueries({ queryKey: k })); };
}

export function useSalvarConfig() {
  const inv = useInvalidar(keys.config, keys.grupos);
  return useMutation({
    mutationFn: async (patch: Partial<AlertasConfig>) => {
      if (IS_DEMO) { Object.assign(demoConfig, patch); return; }
      const { error } = await supabase.from('alertas_config').update(patch as never).eq('id', true);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useSalvarGrupo() {
  const inv = useInvalidar(keys.grupos);
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<GrupoAlerta> & { id: string }) => {
      if (IS_DEMO) {
        const g = demoGrupos.find((x) => x.id === id);
        if (g) Object.assign(g, patch);
        return;
      }
      const { error } = await supabase.from('alertas_grupos').update(patch as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useSincronizarGrupos() {
  const inv = useInvalidar(keys.grupos);
  return useMutation({
    mutationFn: async (): Promise<{ total: number; aviso?: string }> => {
      if (IS_DEMO) return { total: demoGrupos.length };
      const { data, error } = await supabase.functions.invoke('alertas-api', { body: { acao: 'sincronizar_grupos' } });
      if (error) throw error;
      if (data?.erro) throw new Error(data.erro);
      return { total: data?.total ?? 0, aviso: data?.aviso };
    },
    onSuccess: inv,
  });
}

export function useTestarEnvio() {
  return useMutation({
    mutationFn: async () => {
      if (IS_DEMO) return;
      const { data, error } = await supabase.functions.invoke('alertas-api', { body: { acao: 'testar_envio' } });
      if (error) throw error;
      if (data?.erro) throw new Error(data.erro);
    },
  });
}

export function useSalvarMembro() {
  const inv = useInvalidar(keys.equipe);
  return useMutation({
    mutationFn: async (m: Partial<MembroEquipe> & { nome: string; telefone: string }) => {
      if (IS_DEMO) {
        if (m.id) Object.assign(demoEquipe.find((x) => x.id === m.id) ?? {}, m);
        else demoEquipe.push({ id: `e${demoEquipe.length + 1}`, cargo: null, ativo: true, ...m });
        return;
      }
      const linha = { nome: m.nome, cargo: m.cargo ?? null, telefone: m.telefone, ativo: m.ativo ?? true };
      const { error } = m.id
        ? await supabase.from('alertas_equipe').update(linha as never).eq('id', m.id)
        : await supabase.from('alertas_equipe').insert(linha as never);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useExcluirMembro() {
  const inv = useInvalidar(keys.equipe);
  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) {
        const i = demoEquipe.findIndex((x) => x.id === id);
        if (i >= 0) demoEquipe.splice(i, 1);
        return;
      }
      const { error } = await supabase.from('alertas_equipe').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}
