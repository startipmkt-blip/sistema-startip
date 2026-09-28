import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClientes } from '@/shared/lib/demoData';
import type { DemandaUrgente, PainelTvDados, SaudeCliente, SaudeStatus } from '@/modules/painel-tv/types';

// ---------- Stores demo (mutáveis) ----------
const demoSaude: SaudeCliente[] = [
  { cliente_id: 'c1', status: 'urgente', motivo: 'Atraso na entrega dos posts', ordem: 1 },
  { cliente_id: 'c3', status: 'atencao', motivo: '', ordem: null },
];
const demoDemandas: DemandaUrgente[] = [
  { id: 'du1', titulo: 'Refazer arte da campanha', cliente_id: 'c1', responsavel: 'Designer', prazo: '2026-09-30', concluida: false, concluida_em: null, created_at: '2026-09-28T10:00:00Z' },
];
const DEMO_SLUG = 'demo-tv';
const DEMO_PIN = '54321';

const keys = {
  saude: ['painel-tv', 'saude'] as const,
  demandas: ['painel-tv', 'demandas'] as const,
  config: ['painel-tv', 'config'] as const,
  tv: (slug: string) => ['painel-tv', 'tv', slug] as const,
};

export type DemandaForm = Pick<DemandaUrgente, 'titulo' | 'cliente_id' | 'responsavel' | 'prazo'>;

async function fetchSaude(): Promise<SaudeCliente[]> {
  if (IS_DEMO) return demoSaude.map((s) => ({ ...s }));
  const { data, error } = await supabase.from('painel_saude_cliente').select('cliente_id, status, motivo, ordem');
  if (error) throw error;
  return (data ?? []) as SaudeCliente[];
}

async function salvarSaude(s: SaudeCliente): Promise<void> {
  const linha = { ...s, ordem: s.status === 'urgente' ? s.ordem : null };
  if (IS_DEMO) {
    const i = demoSaude.findIndex((x) => x.cliente_id === s.cliente_id);
    if (i >= 0) demoSaude[i] = linha; else demoSaude.push(linha);
    return;
  }
  const { error } = await supabase
    .from('painel_saude_cliente')
    .upsert({ ...linha, updated_at: new Date().toISOString() } as never, { onConflict: 'cliente_id' });
  if (error) throw error;
}

async function fetchDemandas(): Promise<DemandaUrgente[]> {
  if (IS_DEMO) return demoDemandas.filter((d) => !d.concluida).map((d) => ({ ...d }));
  const { data, error } = await supabase
    .from('painel_demandas_urgentes')
    .select('*')
    .eq('concluida', false)
    .order('prazo', { ascending: true, nullsFirst: false })
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as DemandaUrgente[];
}

async function salvarDemanda(id: string | undefined, dados: DemandaForm): Promise<void> {
  if (IS_DEMO) {
    if (id) Object.assign(demoDemandas.find((d) => d.id === id) ?? {}, dados);
    else demoDemandas.push({ id: crypto.randomUUID(), concluida: false, concluida_em: null, created_at: new Date().toISOString(), ...dados });
    return;
  }
  const { error } = id
    ? await supabase.from('painel_demandas_urgentes').update(dados as never).eq('id', id)
    : await supabase.from('painel_demandas_urgentes').insert(dados as never);
  if (error) throw error;
}

async function concluirDemanda(id: string): Promise<void> {
  if (IS_DEMO) {
    const d = demoDemandas.find((x) => x.id === id);
    if (d) { d.concluida = true; d.concluida_em = new Date().toISOString(); }
    return;
  }
  const { error } = await supabase
    .from('painel_demandas_urgentes')
    .update({ concluida: true, concluida_em: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw error;
}

async function excluirDemanda(id: string): Promise<void> {
  if (IS_DEMO) {
    demoDemandas.splice(demoDemandas.findIndex((d) => d.id === id), 1);
    return;
  }
  const { error } = await supabase.from('painel_demandas_urgentes').delete().eq('id', id);
  if (error) throw error;
}

async function fetchSlug(): Promise<string | null> {
  if (IS_DEMO) return DEMO_SLUG;
  const { data, error } = await supabase.from('painel_tv_config').select('slug').maybeSingle();
  if (error) throw error;
  return (data as { slug: string } | null)?.slug ?? null;
}

async function definirPin(pin: string): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.rpc('definir_pin' as never, { area: 'painel-tv', pin_plain: pin } as never);
  if (error) throw error;
}

/** Retorna null quando slug ou PIN estão errados. */
export async function fetchPainelTv(slug: string, pin: string): Promise<PainelTvDados | null> {
  if (IS_DEMO) {
    if (slug !== DEMO_SLUG || pin !== DEMO_PIN) return null;
    return {
      gerado_em: new Date().toISOString(),
      clientes: demoClientes.filter((c) => c.status === 'ativo').map((c) => {
        const s = demoSaude.find((x) => x.cliente_id === c.id);
        return { id: c.id, nome: c.nome, logo_url: c.logo_url, status: s?.status ?? 'saudavel', motivo: s?.motivo ?? '', ordem: s?.ordem ?? null };
      }),
      demandas: demoDemandas.filter((d) => !d.concluida).map((d) => ({
        id: d.id, titulo: d.titulo, responsavel: d.responsavel, prazo: d.prazo, created_at: d.created_at,
        cliente: demoClientes.find((c) => c.id === d.cliente_id)?.nome ?? null,
      })),
    };
  }
  const { data, error } = await supabase.rpc('painel_tv' as never, { p_slug: slug, p_pin: pin } as never);
  if (error) throw error;
  return (data ?? null) as PainelTvDados | null;
}

// ---------- Hooks ----------
export function useSaudeClientes() {
  return useQuery({ queryKey: keys.saude, queryFn: fetchSaude });
}

export function useSalvarSaude() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarSaude,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.saude }),
  });
}

export function useDemandasUrgentes() {
  return useQuery({ queryKey: keys.demandas, queryFn: fetchDemandas });
}

export function useSalvarDemanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: DemandaForm }) => salvarDemanda(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.demandas }),
  });
}

export function useConcluirDemanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: concluirDemanda,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.demandas }),
  });
}

export function useExcluirDemanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: excluirDemanda,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.demandas }),
  });
}

export function usePainelSlug() {
  return useQuery({ queryKey: keys.config, queryFn: fetchSlug });
}

export function useDefinirPinPainel() {
  return useMutation({ mutationFn: definirPin });
}

export function usePainelTv(slug: string, pin: string | null) {
  return useQuery({
    queryKey: [...keys.tv(slug), pin],
    queryFn: () => fetchPainelTv(slug, pin ?? ''),
    enabled: !!slug && !!pin,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    retry: 2,
  });
}

export const STATUS_ORDEM: SaudeStatus[] = ['urgente', 'atencao', 'saudavel'];
