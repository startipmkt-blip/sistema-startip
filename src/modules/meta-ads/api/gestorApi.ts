import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';

export type PeriodoPreset = 'today' | 'yesterday' | 'last_7d' | 'last_14d' | 'last_30d' | 'last_90d';
export interface Periodo {
  preset?: PeriodoPreset;
  since?: string;   // YYYY-MM-DD
  until?: string;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('meta-ads-consulta', { body });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

// ---------- KPIs conta ----------
export interface KpisResp {
  ok: true;
  moeda: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  frequency: number;
  conversions: number;
  valor_conversao: number;
  cpa: number;
  roas: number;
}
export function useKpisConta(contaId: string | undefined, periodo: Periodo) {
  return useQuery({
    queryKey: ['meta-ads', 'kpis', contaId, periodo],
    queryFn: () => invoke<KpisResp>({ acao: 'kpis', conta_id: contaId, ...periodo }),
    enabled: Boolean(contaId),
    staleTime: 60_000,
  });
}

// ---------- Série diária ----------
export interface DiaLinha {
  dia: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  valor_conversao: number;
}
export function useDiario(contaId: string | undefined, periodo: Periodo) {
  return useQuery({
    queryKey: ['meta-ads', 'diario', contaId, periodo],
    queryFn: async () => (await invoke<{ ok: true; linhas: DiaLinha[] }>({ acao: 'diario', conta_id: contaId, ...periodo })).linhas,
    enabled: Boolean(contaId),
    staleTime: 60_000,
  });
}

// ---------- Campanhas ----------
export interface Campanha {
  id: string;
  nome: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  effective_status: string;
  objetivo: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
  start_time: string | null;
  stop_time: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  frequency: number;
  conversions: number;
  valor_conversao: number;
  cpa: number;
  roas: number;
}
export function useCampanhas(contaId: string | undefined, periodo: Periodo) {
  return useQuery({
    queryKey: ['meta-ads', 'campanhas', contaId, periodo],
    queryFn: async () => (await invoke<{ ok: true; campanhas: Campanha[]; moeda: string }>({ acao: 'campanhas', conta_id: contaId, ...periodo })),
    enabled: Boolean(contaId),
    staleTime: 60_000,
  });
}

// ---------- Ads / criativos ----------
export interface Anuncio {
  id: string;
  nome: string;
  status: string;
  effective_status: string;
  thumbnail: string | null;
  titulo_criativo: string | null;
  texto_criativo: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  valor_conversao: number;
  cpa: number;
  roas: number;
}
export function useAnuncios(contaId: string | undefined, periodo: Periodo, campanhaId?: string) {
  return useQuery({
    queryKey: ['meta-ads', 'anuncios', contaId, periodo, campanhaId],
    queryFn: async () => (await invoke<{ ok: true; anuncios: Anuncio[] }>({ acao: 'anuncios', conta_id: contaId, campanha_id: campanhaId, ...periodo })).anuncios,
    enabled: Boolean(contaId),
    staleTime: 60_000,
  });
}

// ---------- Ações: pausar/ativar ----------
export function usePausarObjeto(contaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { objeto_id: string; status: 'PAUSED' | 'ACTIVE' }) => {
      return invoke<{ ok: true }>({ acao: 'pausar', conta_id: contaId, ...v });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meta-ads'] }),
  });
}

// ---------- Ações: editar orçamento ----------
export function useEditarOrcamento(contaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { objeto_id: string; daily_budget_brl?: number; lifetime_budget_brl?: number }) => {
      return invoke<{ ok: true }>({ acao: 'orcamento', conta_id: contaId, ...v });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meta-ads'] }),
  });
}
