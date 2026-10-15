import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/auth/AuthProvider';
import { posicaoDaDemanda } from '../lib/periodo';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import {
  iniciarTimerDemanda, pararTimerDemanda, TOCADORES, type Tocador,
} from '@/modules/demandas/api/cronometroApi';
import { sincronizarGestaoConteudo } from './sincronizarConteudo';

// Quem toca quando o responsável da demanda não é um usuário do cronômetro.
const DESIGNER_PADRAO: Tocador = 'Gabriel';

// O timer segue o status: abre ao entrar em "Em andamento" e fecha ao sair
// (aprovação, concluído ou de volta pra fila). Falha no cronômetro não desfaz a demanda.
export interface ResultadoCronometro { cronometroErro?: string }

async function sincronizarCronometro(opts: {
  id: string; titulo: string; de?: DesignerStatus; para: DesignerStatus; responsavelNome?: string | null;
}): Promise<ResultadoCronometro> {
  try {
    if (opts.para === 'em_andamento' && opts.de !== 'em_andamento') {
      const tocador = (TOCADORES as readonly string[]).includes(opts.responsavelNome ?? '')
        ? (opts.responsavelNome as Tocador)
        : DESIGNER_PADRAO;
      await iniciarTimerDemanda({ id: opts.id, titulo: opts.titulo }, tocador, 'designer_demanda_id');
    } else if (opts.para !== 'em_andamento' && (opts.de === 'em_andamento' || opts.de === undefined)) {
      await pararTimerDemanda(opts.id, 'designer_demanda_id');
    }
    return {};
  } catch (e) {
    console.error('Falha ao sincronizar com o cronômetro:', e);
    return { cronometroErro: e instanceof Error ? e.message : String(e) };
  }
}

// Marca início (1ª vez em andamento) e conclusão; reabrir limpa a conclusão.
function carimbos(de: DesignerStatus | undefined, para: DesignerStatus, jaIniciado: string | null | undefined) {
  const agora = new Date().toISOString();
  const patch: { iniciado_em?: string; concluido_em?: string | null } = {};
  if (para === 'em_andamento' && !jaIniciado) patch.iniciado_em = agora;
  if (para === 'concluido' && de !== 'concluido') patch.concluido_em = agora;
  if (para !== 'concluido' && de === 'concluido') patch.concluido_em = null;
  return patch;
}

export type DesignerStatus = 'a_fazer' | 'alteracao' | 'em_andamento' | 'aprovacao' | 'concluido';
export type DesignerOrigem = 'manual' | 'ideia_aprovada' | 'calendario';
export type DesignerTipo = 'post' | 'carrossel' | 'reels' | 'story' | 'web' | 'extra';

export const STATUS_COLUNAS: Array<{ id: DesignerStatus; label: string; cor: string; emoji: string }> = [
  { id: 'a_fazer',      label: 'A fazer',        cor: 'slate',   emoji: '📥' },
  { id: 'em_andamento', label: 'Em andamento',   cor: 'blue',    emoji: '🎨' },
  { id: 'alteracao',    label: 'Alteração',      cor: 'red',     emoji: '🔁' },
  { id: 'aprovacao',    label: 'Aguardando aprovação', cor: 'amber', emoji: '👀' },
  { id: 'concluido',    label: 'Concluído',      cor: 'green',   emoji: '✅' },
];

export const TIPO_LABEL: Record<DesignerTipo, string> = {
  post: 'Post',
  carrossel: 'Carrossel',
  reels: 'Reels',
  story: 'Story',
  web: 'Web',
  extra: 'Extra',
};

export interface DesignerDemanda {
  id: string;
  cliente_id: string | null;
  cliente_nome?: string | null;
  cliente_logo?: string | null;
  titulo: string;
  descricao: string | null;
  briefing: string | null;
  tipo: DesignerTipo;
  status: DesignerStatus;
  responsavel_id: string | null;
  responsavel_nome?: string | null;
  prazo: string | null;
  origem: DesignerOrigem;
  ideia_id: string | null;
  anexos: CriativoAnexo[];
  /** Link do conteúdo pronto (Drive etc.); vai como link_drive do post em gestão de conteúdo. */
  link_conteudo?: string | null;
  /** Semana escolhida (data de início); vazio = semana do prazo ou da criação. */
  semana_ref?: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  /** Cliente reprovou o conteúdo: motivo e quando (vale enquanto a peça não volta para aprovação). */
  reprovado_justificativa?: string | null;
  reprovado_em?: string | null;
  /** Calculados no cliente: vencida, levada de mês anterior, e data que define a semana. */
  atrasada?: boolean;
  carregada?: boolean;
  ref_data?: string;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

interface Filtros {
  clienteId?: string | null;
  responsavelId?: string | null;
  tipo?: DesignerTipo | null;
  q?: string;
  periodo?: { ini: string; fim: string } | null;
  /** Restringe a demandas desses clientes (grupo orgânico / só tráfego). */
  clienteIds?: string[] | null;
}

type CliMin = { id: string; nome: string; logo_url: string | null };

async function fetchDemandas(): Promise<DesignerDemanda[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('designer_demandas')
    .select('*')
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as DesignerDemanda[];
  // Join nomes de cliente e responsável (dois selects pequenos).
  const cliIds = Array.from(new Set(rows.map((r) => r.cliente_id).filter(Boolean))) as string[];
  const respIds = Array.from(new Set(rows.map((r) => r.responsavel_id).filter(Boolean))) as string[];

  const [clientes, profiles] = await Promise.all([
    cliIds.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from as any)('clientes').select('id, nome, logo_url').in('id', cliIds)
      : Promise.resolve({ data: [] as CliMin[] }),
    respIds.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from as any)('profiles').select('id, nome').in('id', respIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ]);

  const mapaCli = new Map<string, string>((clientes.data ?? []).map((c: CliMin) => [c.id, c.nome]));
  const mapaLogo = new Map<string, string | null>((clientes.data ?? []).map((c: CliMin) => [c.id, c.logo_url || null]));
  const mapaProf = new Map<string, string>((profiles.data ?? []).map((p: { id: string; nome: string }) => [p.id, p.nome]));
  return rows.map((r) => {
    const pos = posicaoDaDemanda(r);
    return {
    ...r,
    anexos: Array.isArray(r.anexos) ? r.anexos : [],
    atrasada: pos.atrasada,
    carregada: pos.carregada,
    ref_data: pos.ref,
    cliente_nome: r.cliente_id ? (mapaCli.get(r.cliente_id) ?? null) : null,
    cliente_logo: r.cliente_id ? (mapaLogo.get(r.cliente_id) ?? null) : null,
    responsavel_nome: r.responsavel_id ? (mapaProf.get(r.responsavel_id) ?? null) : null,
    };
  });
}

export function useDemandas(filtros: Filtros = {}) {
  return useQuery({
    queryKey: ['designer', 'demandas', filtros],
    queryFn: async () => {
      const rows = await fetchDemandas();
      return rows.filter((r) => {
        if (filtros.clienteId && r.cliente_id !== filtros.clienteId) return false;
        if (filtros.responsavelId && r.responsavel_id !== filtros.responsavelId) return false;
        if (filtros.tipo && r.tipo !== filtros.tipo) return false;
        if (filtros.clienteIds && (!r.cliente_id || !filtros.clienteIds.includes(r.cliente_id))) return false;
        if (filtros.periodo) {
          const ref = r.ref_data ?? '';
          if (ref < filtros.periodo.ini || ref > filtros.periodo.fim) return false;
        }
        if (filtros.q) {
          const q = filtros.q.toLowerCase();
          const hay = `${r.titulo} ${r.descricao ?? ''} ${r.briefing ?? ''} ${r.cliente_nome ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    },
    staleTime: 30_000,
  });
}

interface UpsertInput {
  id?: string;
  cliente_id: string | null;
  titulo: string;
  descricao?: string | null;
  briefing?: string | null;
  tipo: DesignerTipo;
  status?: DesignerStatus;
  responsavel_id?: string | null;
  prazo?: string | null;
  anexos?: CriativoAnexo[];
  link_conteudo?: string | null;
  semana_ref?: string | null;
  // Contexto pro cronômetro (não vai pro banco).
  de?: DesignerStatus;
  iniciado_em?: string | null;
  responsavel_nome?: string | null;
}

export function useSalvarDemanda() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertInput): Promise<ResultadoCronometro> => {
      const { de, iniciado_em, responsavel_nome, ...dados } = input;
      const para = dados.status ?? 'a_fazer';
      const payload = {
        ...dados,
        ...carimbos(input.id ? de : undefined, para, iniciado_em),
        criado_por: input.id ? undefined : profile?.id ?? null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = (supabase.from as any)('designer_demandas');
      let id = input.id;
      if (id) {
        const { id: _omit, ...patch } = payload;
        const { error } = await tbl.update(patch).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await tbl.insert(payload).select('id').single();
        if (error) throw error;
        id = (data as { id: string }).id;
      }
      await sincronizarGestaoConteudo(id!);
      return sincronizarCronometro({
        id: id!, titulo: input.titulo, de: input.id ? de : undefined, para, responsavelNome: responsavel_nome,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['designer'] });
      qc.invalidateQueries({ queryKey: ['cronometro'] });
      qc.invalidateQueries({ queryKey: ['gestao-conteudo'] });
    },
  });
}

export interface DemandaLote {
  cliente_id: string;
  titulo: string;
  tipo: DesignerTipo;
  semana_ref: string;
}

/** Cria varias demandas "A fazer" de uma vez (gerar a semana a partir da carteira). */
export function useGerarSemana() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (lote: DemandaLote[]): Promise<number> => {
      if (lote.length === 0) return 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('designer_demandas').insert(
        lote.map((l) => ({
          ...l, status: 'a_fazer', origem: 'manual', criado_por: profile?.id ?? null,
        })),
      );
      if (error) throw error;
      return lote.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designer'] }),
  });
}

export function useMoverStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string; status: DesignerStatus; titulo: string; de: DesignerStatus;
      iniciado_em: string | null; responsavel_nome: string | null;
    }): Promise<ResultadoCronometro> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('designer_demandas')
        .update({ status: v.status, updated_at: new Date().toISOString(), ...carimbos(v.de, v.status, v.iniciado_em) })
        .eq('id', v.id);
      if (error) throw error;
      await sincronizarGestaoConteudo(v.id);
      return sincronizarCronometro({
        id: v.id, titulo: v.titulo, de: v.de, para: v.status, responsavelNome: v.responsavel_nome,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['designer'] });
      qc.invalidateQueries({ queryKey: ['cronometro'] });
      qc.invalidateQueries({ queryKey: ['gestao-conteudo'] });
    },
  });
}

export function useExcluirDemanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Não deixa timer órfão rodando.
      await pararTimerDemanda(id, 'designer_demanda_id').catch((e) => console.error('Falha ao parar o cronômetro:', e));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('designer_demandas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['designer'] });
      qc.invalidateQueries({ queryKey: ['cronometro'] });
    },
  });
}

// Realtime: atualiza kanban quando trigger da aprovação cria nova demanda.
export function useDemandasRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canal = (supabase.channel as any)('designer-demandas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'designer_demandas' }, () => {
        qc.invalidateQueries({ queryKey: ['designer'] });
      })
      .subscribe();
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).removeChannel(canal);
    };
  }, [qc]);
}

// ---------- Tempo (cronômetro) por demanda ----------
export interface TempoDemanda {
  segundosFechados: number;
  aberto: { inicio: string; quem: string; pausado: boolean; pausadoSeg: number; inicioPausa: string | null } | null;
}

export function useTempoDesigner() {
  return useQuery({
    queryKey: ['cronometro', 'designer'],
    queryFn: async (): Promise<Record<string, TempoDemanda>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('registros_tempo')
        .select('designer_demanda_id, inicio, fim, duracao_segundos, pausado, inicio_pausa, tempo_pausado_total, usuarios(nome)')
        .not('designer_demanda_id', 'is', null);
      if (error) throw error;
      const mapa: Record<string, TempoDemanda> = {};
      for (const r of data ?? []) {
        const t = (mapa[r.designer_demanda_id] ??= { segundosFechados: 0, aberto: null });
        if (r.fim) t.segundosFechados += r.duracao_segundos ?? 0;
        else t.aberto = {
          inicio: r.inicio, quem: r.usuarios?.nome ?? '', pausado: !!r.pausado,
          pausadoSeg: r.tempo_pausado_total ?? 0, inicioPausa: r.inicio_pausa ?? null,
        };
      }
      return mapa;
    },
    refetchInterval: 30_000,
    retry: false,
  });
}

// Segundos efetivos do registro aberto (mesma conta do Timer do cronômetro).
export function segundosAberto(a: NonNullable<TempoDemanda['aberto']>, agora = Date.now()): number {
  let pausado = a.pausadoSeg;
  if (a.pausado && a.inicioPausa) pausado += Math.floor((agora - new Date(a.inicioPausa).getTime()) / 1000);
  return Math.max(Math.floor((agora - new Date(a.inicio).getTime()) / 1000) - pausado, 0);
}

export function formatarDuracao(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  if (m > 0) return `${m}min`;
  return `${seg}s`;
}
