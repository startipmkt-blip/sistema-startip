import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';

export interface ContaMetaComCliente {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  plataforma: 'meta' | 'google';
  id_externo: string;
  nome_exibicao: string;
  sincronizacao_ativa: boolean;
  ultima_sync_at: string | null;
  ultimo_erro_sync: string | null;
  moeda: string | null;
  tem_token: boolean;
}

// Lista contas Meta com nome do cliente (join manual para evitar select embed no client).
export function useContasMeta() {
  return useQuery({
    queryKey: ['meta-ads', 'contas'],
    queryFn: async (): Promise<ContaMetaComCliente[]> => {
      const { data: contas, error } = await supabase
        .from('contas_anuncio')
        .select('id, cliente_id, plataforma, id_externo, nome_exibicao, sincronizacao_ativa, ultima_sync_at, ultimo_erro_sync, moeda, access_token')
        .eq('plataforma', 'meta')
        .order('nome_exibicao');
      if (error) throw error;

      const clienteIds = Array.from(new Set((contas ?? []).map((c: any) => c.cliente_id)));
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome')
        .in('id', clienteIds.length ? clienteIds : ['00000000-0000-0000-0000-000000000000']);
      const mapa = new Map((clientes ?? []).map((c: any) => [c.id, c.nome]));

      return (contas ?? []).map((c: any) => ({
        id: c.id,
        cliente_id: c.cliente_id,
        cliente_nome: mapa.get(c.cliente_id) ?? '—',
        plataforma: c.plataforma,
        id_externo: c.id_externo,
        nome_exibicao: c.nome_exibicao,
        sincronizacao_ativa: !!c.sincronizacao_ativa,
        ultima_sync_at: c.ultima_sync_at,
        ultimo_erro_sync: c.ultimo_erro_sync,
        moeda: c.moeda,
        tem_token: !!c.access_token,
      }));
    },
  });
}

export function useClientesTrafego() {
  return useQuery({
    queryKey: ['meta-ads', 'clientes-trafego'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, servicos, status')
        .contains('servicos', ['trafego_pago'])
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
}

interface UpsertContaInput {
  id?: string;
  cliente_id: string;
  id_externo: string;
  nome_exibicao: string;
  access_token?: string;
  sincronizacao_ativa: boolean;
  moeda?: string;
}
export function useSalvarContaMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertContaInput) => {
      const payload: Record<string, unknown> = {
        cliente_id: input.cliente_id,
        plataforma: 'meta',
        id_externo: input.id_externo.replace(/^act_/, ''),
        nome_exibicao: input.nome_exibicao,
        sincronizacao_ativa: input.sincronizacao_ativa,
        moeda: input.moeda ?? 'BRL',
      };
      if (input.access_token && input.access_token.trim().length > 20) {
        payload.access_token = input.access_token.trim();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = (supabase.from as any)('contas_anuncio');
      if (input.id) {
        const { error } = await tbl.update(payload).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await tbl.insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-ads', 'contas'] });
    },
  });
}

export function useExcluirContaMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contas_anuncio').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meta-ads', 'contas'] }),
  });
}

export function useSincronizarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { cliente_id?: string; dias?: number }) => {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-ads'] });
      qc.invalidateQueries({ queryKey: ['diretoria'] });
    },
  });
}

// -------- Views para Diretoria --------
export interface CarteiraLinha {
  cliente_id: string;
  cliente_nome: string;
  cliente_status: string;
  tipo_negocio: string;
  servicos: string[] | null;
  entrou_em: string | null;
  saude: number;
  mrr: number;
  spend_30d: number;
  impressions_30d: number;
  clicks_30d: number;
  conversions_30d: number;
  roas_30d: number;
  cpa_30d: number;
  ctr_30d: number;
  ultima_metrica_em: string | null;
  trafego_conectado: boolean;
}
export function useDiretoriaCarteira() {
  return useQuery({
    queryKey: ['diretoria', 'carteira'],
    queryFn: async (): Promise<CarteiraLinha[]> => {
      const { data, error } = await supabase
        .from('diretoria_carteira')
        .select('*')
        .order('mrr', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CarteiraLinha[];
    },
  });
}

export interface TrafegoAgregado {
  spend_total: number;
  impressions_total: number;
  clicks_total: number;
  conversions_total: number;
  roas_medio: number;
  cpa_medio: number;
  clientes_ativos_trafego: number;
}
export function useDiretoriaTrafego30d() {
  return useQuery({
    queryKey: ['diretoria', 'trafego-30d'],
    queryFn: async (): Promise<TrafegoAgregado | null> => {
      const { data, error } = await supabase
        .from('diretoria_trafego_30d').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return (data as unknown as TrafegoAgregado) ?? null;
    },
  });
}

export interface DiaSpend { dia: string; spend: number; clicks: number; conversions: number }
export function useDiretoriaTrafegoDiario() {
  return useQuery({
    queryKey: ['diretoria', 'trafego-diario'],
    queryFn: async (): Promise<DiaSpend[]> => {
      const { data, error } = await supabase
        .from('diretoria_trafego_diario').select('*');
      if (error) throw error;
      return (data ?? []) as unknown as DiaSpend[];
    },
  });
}
