import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/auth/AuthProvider';

// ============ Checklist diário ============
export interface ChecklistDia {
  id: string | null;
  cliente_id: string;
  data: string;
  item_1: boolean; item_2: boolean; item_3: boolean;
  item_4: boolean; item_5: boolean; item_6: boolean;
  observacoes: string | null;
}

export const CHECKLIST_ITENS = [
  'Verificou orçamento / verba restante',
  'Analisou métricas (CPL, CPM, CTR, ROAS)',
  'Pausou anúncios/conjuntos sem resultado',
  'Escalou os criativos com bom desempenho',
  'Verificou entrega/aprovação das campanhas',
  'Encaminhou/validou os leads gerados',
];

// Ciclo de zeramento do checklist: segunda(1), quarta(3), sexta(5).
// Ex.: terça mostra o checklist da segunda; sábado/domingo, o da sexta.
function ultimoCicloChecklist(): string {
  const zeramentos = [1, 3, 5];
  const d = new Date();
  while (!zeramentos.includes(d.getDay())) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function useChecklistHoje(clienteId: string | undefined) {
  const ciclo = ultimoCicloChecklist();
  return useQuery({
    queryKey: ['trafego', 'checklist', clienteId, ciclo],
    queryFn: async (): Promise<ChecklistDia> => {
      const vazio: ChecklistDia = {
        id: null, cliente_id: clienteId!, data: ciclo,
        item_1: false, item_2: false, item_3: false, item_4: false, item_5: false, item_6: false,
        observacoes: null,
      };
      if (!clienteId) return vazio;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from as any)('trafego_checklist')
        .select('*').eq('cliente_id', clienteId).eq('data', ciclo).maybeSingle();
      return (data as ChecklistDia | null) ?? vazio;
    },
    enabled: !!clienteId,
    staleTime: 60_000,
  });
}

export function useSalvarChecklist() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (v: Partial<ChecklistDia> & { cliente_id: string; data: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('trafego_checklist').upsert({
        ...v,
        gestor_id: profile?.id ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'cliente_id,data' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trafego', 'checklist'] }),
  });
}

// ============ Saldo diário — config + contatos ============
export interface SaldoConfig {
  id?: string;
  ativo: boolean;
  horario: string;
  piso_alerta: number;
  dias_uteis_only: boolean;
  so_alertas: boolean;
  mensagem_topo: string | null;
}
export const SALDO_CONFIG_DEFAULT: SaldoConfig = {
  ativo: true, horario: '08:00', piso_alerta: 60, dias_uteis_only: true, so_alertas: false, mensagem_topo: null,
};

export function useSaldoConfig() {
  return useQuery({
    queryKey: ['trafego', 'saldo-config'],
    queryFn: async (): Promise<SaldoConfig> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from as any)('trafego_saldo_config').select('*').limit(1).maybeSingle();
      return (data as SaldoConfig) ?? SALDO_CONFIG_DEFAULT;
    },
    staleTime: 30_000,
  });
}
export function useSalvarSaldoConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Partial<SaldoConfig>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: atual } = await (supabase.from as any)('trafego_saldo_config').select('id').limit(1).maybeSingle();
      if (!atual?.id) throw new Error('config não inicializada');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('trafego_saldo_config')
        .update({ ...v, updated_at: new Date().toISOString() }).eq('id', atual.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trafego', 'saldo-config'] }),
  });
}

export interface SaldoContato {
  id: string;
  cliente_id: string | null;
  cliente_nome?: string | null;
  nome_grupo: string;
  zapi_chat_id: string;
  ativo: boolean;
}
export function useSaldoContatos() {
  return useQuery({
    queryKey: ['trafego', 'saldo-contatos'],
    queryFn: async (): Promise<SaldoContato[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: contatos } = await (supabase.from as any)('trafego_saldo_contatos').select('*').order('nome_grupo');
      const linhas = (contatos ?? []) as SaldoContato[];
      const cliIds = Array.from(new Set(linhas.map((l) => l.cliente_id).filter(Boolean))) as string[];
      if (!cliIds.length) return linhas;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cli } = await (supabase.from as any)('clientes').select('id, nome').in('id', cliIds);
      const m = new Map<string, string>((cli ?? []).map((c: { id: string; nome: string }) => [c.id, c.nome]));
      return linhas.map((l) => ({ ...l, cliente_nome: l.cliente_id ? m.get(l.cliente_id) ?? null : null }));
    },
    staleTime: 30_000,
  });
}
export function useSalvarContato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Partial<SaldoContato> & { nome_grupo: string; zapi_chat_id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = (supabase.from as any)('trafego_saldo_contatos');
      if (v.id) {
        const { id, cliente_nome: _n, ...patch } = v;
        void _n;
        const { error } = await tbl.update(patch).eq('id', id);
        if (error) throw error;
      } else {
        const { cliente_nome: _n, ...ins } = v;
        void _n;
        const { error } = await tbl.insert({ ...ins, ativo: ins.ativo ?? true });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trafego', 'saldo-contatos'] }),
  });
}
export function useExcluirContato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('trafego_saldo_contatos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trafego', 'saldo-contatos'] }),
  });
}

// Snapshot atual (última semana)
export interface SaldoSnapshot {
  data: string;
  cliente_id: string;
  cliente_nome?: string | null;
  disponivel: number | null;
  gasto_ontem: number | null;
  gasto_total: number | null;
  limite: number | null;
  situacao: string | null;
  enviado: boolean;
}
export function useSaldoSnapshotHoje() {
  const hoje = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['trafego', 'saldo-snap', hoje],
    queryFn: async (): Promise<SaldoSnapshot[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from as any)('trafego_saldo_snapshot')
        .select('*').eq('data', hoje);
      const linhas = (data ?? []) as SaldoSnapshot[];
      const cliIds = Array.from(new Set(linhas.map((l) => l.cliente_id).filter(Boolean))) as string[];
      if (!cliIds.length) return linhas;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cli } = await (supabase.from as any)('clientes').select('id, nome').in('id', cliIds);
      const m = new Map<string, string>((cli ?? []).map((c: { id: string; nome: string }) => [c.id, c.nome]));
      return linhas.map((l) => ({ ...l, cliente_nome: m.get(l.cliente_id) ?? null }));
    },
    staleTime: 60_000,
  });
}

export function useDispararSaldo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { forcado?: boolean; cliente_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('saldo-diario-enviar', { body: v });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trafego', 'saldo-snap'] }),
  });
}

// ============ Otimizações da semana ============
export interface OtimizacaoLog {
  id: string;
  cliente_id: string;
  cliente_nome?: string | null;
  semana_inicio: string;
  semana_fim: string;
  resumo: string | null;
  tem_otimizacao: boolean;
  justificativa: string | null;
  oculto: boolean;
}

// Segunda-feira da semana corrente
function segundaAtual(): Date {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useOtimizacoesSemana(offsetSemanas = 0) {
  const inicio = segundaAtual();
  inicio.setDate(inicio.getDate() + offsetSemanas * 7);
  const fim = new Date(inicio); fim.setDate(fim.getDate() + 6);
  const inicioStr = inicio.toISOString().slice(0, 10);
  const fimStr = fim.toISOString().slice(0, 10);

  return useQuery({
    queryKey: ['trafego', 'otim-semana', inicioStr],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: logs } = await (supabase.from as any)('trafego_otimizacoes_log')
        .select('*').eq('semana_inicio', inicioStr);
      // Puxa TODOS os clientes com serviço trafego_pago pra montar carteira
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clientes } = await (supabase.from as any)('clientes')
        .select('id, nome').contains('servicos', ['trafego_pago']).order('nome');

      const logsPorCli = new Map<string, OtimizacaoLog>();
      for (const l of (logs ?? []) as OtimizacaoLog[]) logsPorCli.set(l.cliente_id, l);

      const linhas: OtimizacaoLog[] = (clientes ?? []).map((c: any) => {
        const existente = logsPorCli.get(c.id);
        if (existente) return { ...existente, cliente_nome: c.nome };
        return {
          id: '', cliente_id: c.id, cliente_nome: c.nome,
          semana_inicio: inicioStr, semana_fim: fimStr,
          resumo: null, tem_otimizacao: false, justificativa: null, oculto: false,
        } as OtimizacaoLog;
      });
      return { semana_inicio: inicioStr, semana_fim: fimStr, linhas };
    },
    staleTime: 60_000,
  });
}

export function useSalvarOtimizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Partial<OtimizacaoLog> & { cliente_id: string; semana_inicio: string; semana_fim: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { id, cliente_nome: _n, ...body } = v;
      void _n;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('trafego_otimizacoes_log').upsert({
        ...body, atualizado_em: new Date().toISOString(),
      }, { onConflict: 'cliente_id,semana_inicio' });
      void id;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trafego', 'otim-semana'] }),
  });
}
