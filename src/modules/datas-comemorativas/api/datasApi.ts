import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClientes } from '@/shared/lib/demoData';
import type {
  CalendarioConfig, CalendarioPublico, DataBase, DataCliente, Prioridade,
} from '@/modules/datas-comemorativas/types';

// ---------- Stores demo (mutáveis) ----------
const demoBase: DataBase[] = [
  { id: 'db-bf', chave: 'black_friday', nome: 'Black Friday', categoria: 'Comercial', prioridade: 'muito_alta', opcional: false, regra: 'semana_do_mes', mes: 11, dia: null, dia_semana: 5, ordem_semana: -1, dias_offset: null, relativa_a: null, data_unica: null, angulos: ['condições especiais', 'conversão'], observacao: 'Última sexta-feira de novembro.', marcos: [{ dias: -31, titulo: 'Definição da campanha' }, { dias: -7, titulo: 'Início da comunicação' }] },
  { id: 'db-cm', chave: 'cyber_monday', nome: 'Cyber Monday', categoria: 'Comercial', prioridade: 'alta', opcional: false, regra: 'relativa', mes: null, dia: null, dia_semana: null, ordem_semana: null, dias_offset: 3, relativa_a: 'db-bf', data_unica: null, angulos: [], observacao: '', marcos: [] },
  { id: 'db-cri', chave: 'dia_criancas', nome: 'Dia das Crianças', categoria: 'Sazonal', prioridade: 'media', opcional: false, regra: 'fixa', mes: 10, dia: 12, dia_semana: null, ordem_semana: null, dias_offset: null, relativa_a: null, data_unica: null, angulos: ['internet em família'], observacao: '', marcos: [] },
  { id: 'db-apa', chave: 'nsa_aparecida', nome: 'Nossa Senhora Aparecida', categoria: 'Feriado nacional', prioridade: 'operacional', opcional: true, regra: 'fixa', mes: 10, dia: 12, dia_semana: null, ordem_semana: null, dias_offset: null, relativa_a: null, data_unica: null, angulos: [], observacao: 'Não é obrigatório gerar conteúdo.', marcos: [] },
  { id: 'db-cli', chave: 'dia_cliente', nome: 'Dia do Cliente', categoria: 'Comercial', prioridade: 'alta', opcional: false, regra: 'fixa', mes: 9, dia: 15, dia_semana: null, ordem_semana: null, dias_offset: null, relativa_a: null, data_unica: null, angulos: [], observacao: '', marcos: [] },
  { id: 'db-nat', chave: 'natal', nome: 'Natal', categoria: 'Institucional / Sazonal', prioridade: 'alta', opcional: false, regra: 'fixa', mes: 12, dia: 25, dia_semana: null, ordem_semana: null, dias_offset: null, relativa_a: null, data_unica: null, angulos: ['conexão entre famílias'], observacao: '', marcos: [] },
  { id: 'db-car', chave: 'carnaval', nome: 'Carnaval', categoria: 'Sazonal', prioridade: 'media', opcional: true, regra: 'pascoa', mes: null, dia: null, dia_semana: null, ordem_semana: null, dias_offset: -47, relativa_a: null, data_unica: null, angulos: [], observacao: '', marcos: [] },
];
const demoItens: Required<DataCliente>[] = [
  { id: 'dc1', cliente_id: 'c1', data_id: 'db-bf', prioridade: null, relevancia: 'Principal data comercial do ano.', angulos: null, visivel_cliente: true },
  { id: 'dc2', cliente_id: 'c1', data_id: 'db-cm', prioridade: null, relevancia: '', angulos: null, visivel_cliente: true },
  { id: 'dc3', cliente_id: 'c1', data_id: 'db-cri', prioridade: null, relevancia: '', angulos: null, visivel_cliente: true },
  { id: 'dc4', cliente_id: 'c1', data_id: 'db-apa', prioridade: null, relevancia: '', angulos: null, visivel_cliente: false },
  { id: 'dc5', cliente_id: 'c1', data_id: 'db-cli', prioridade: null, relevancia: '', angulos: null, visivel_cliente: true },
  { id: 'dc6', cliente_id: 'c1', data_id: 'db-nat', prioridade: null, relevancia: '', angulos: null, visivel_cliente: true },
];
const demoCalendarios: CalendarioConfig[] = [
  { cliente_id: 'c1', slug: 'padaria-do-bairro', inicio: '2026-09-25' },
];

const keys = {
  base: ['datas', 'base'] as const,
  itens: (clienteId: string) => ['datas', 'itens', clienteId] as const,
  calendario: (clienteId: string) => ['datas', 'calendario', clienteId] as const,
  publico: (slug: string) => ['datas', 'publico', slug] as const,
};

export type DataBaseForm = Omit<DataBase, 'id' | 'chave'>;
export type DataClienteForm = Pick<DataCliente, 'prioridade' | 'relevancia' | 'angulos'> & { visivel_cliente: boolean };

// ---------- Base Mãe ----------
async function fetchBase(): Promise<DataBase[]> {
  if (IS_DEMO) return [...demoBase].sort((a, b) => a.nome.localeCompare(b.nome));
  const { data, error } = await supabase.from('datas_base').select('*').order('nome');
  if (error) throw error;
  return (data ?? []) as DataBase[];
}

async function saveBase(id: string | undefined, dados: DataBaseForm): Promise<void> {
  if (IS_DEMO) {
    if (id) Object.assign(demoBase.find((b) => b.id === id) ?? {}, dados);
    else demoBase.push({ id: crypto.randomUUID(), chave: null, ...dados });
    return;
  }
  const payload = { ...dados, updated_at: new Date().toISOString() };
  const { error } = id
    ? await supabase.from('datas_base').update(payload as never).eq('id', id)
    : await supabase.from('datas_base').insert(dados as never);
  if (error) throw error;
}

async function deleteBase(id: string): Promise<void> {
  if (IS_DEMO) {
    if (demoItens.some((i) => i.data_id === id) || demoBase.some((b) => b.relativa_a === id)) {
      throw new Error('em uso');
    }
    demoBase.splice(demoBase.findIndex((b) => b.id === id), 1);
    return;
  }
  const { error } = await supabase.from('datas_base').delete().eq('id', id);
  if (error) {
    // 23503 = foreign_key_violation: algum cliente (ou regra relativa) usa esta data.
    if (error.code === '23503') throw new Error('em uso');
    throw error;
  }
}

// ---------- Datas do cliente ----------
async function fetchItens(clienteId: string): Promise<DataCliente[]> {
  if (IS_DEMO) return demoItens.filter((i) => i.cliente_id === clienteId);
  const { data, error } = await supabase.from('datas_cliente').select('*').eq('cliente_id', clienteId);
  if (error) throw error;
  return (data ?? []) as DataCliente[];
}

async function addItens(clienteId: string, dataIds: string[]): Promise<void> {
  if (IS_DEMO) {
    for (const data_id of dataIds) {
      if (demoItens.some((i) => i.cliente_id === clienteId && i.data_id === data_id)) continue;
      demoItens.push({ id: crypto.randomUUID(), cliente_id: clienteId, data_id, prioridade: null, relevancia: '', angulos: null, visivel_cliente: true });
    }
    return;
  }
  const linhas = dataIds.map((data_id) => ({ cliente_id: clienteId, data_id }));
  const { error } = await supabase
    .from('datas_cliente')
    .upsert(linhas as never, { onConflict: 'cliente_id,data_id', ignoreDuplicates: true });
  if (error) throw error;
}

async function updateItem(id: string, dados: DataClienteForm): Promise<void> {
  if (IS_DEMO) {
    Object.assign(demoItens.find((i) => i.id === id) ?? {}, dados);
    return;
  }
  const { error } = await supabase.from('datas_cliente').update(dados as never).eq('id', id);
  if (error) throw error;
}

async function removeItem(id: string): Promise<void> {
  if (IS_DEMO) {
    demoItens.splice(demoItens.findIndex((i) => i.id === id), 1);
    return;
  }
  const { error } = await supabase.from('datas_cliente').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Link / início do calendário ----------
async function fetchCalendario(clienteId: string): Promise<CalendarioConfig | null> {
  if (IS_DEMO) return demoCalendarios.find((c) => c.cliente_id === clienteId) ?? null;
  const { data, error } = await supabase.from('datas_calendario').select('*').eq('cliente_id', clienteId).maybeSingle();
  if (error) throw error;
  return (data ?? null) as CalendarioConfig | null;
}

async function saveCalendario(cfg: CalendarioConfig): Promise<void> {
  if (IS_DEMO) {
    if (demoCalendarios.some((c) => c.slug === cfg.slug && c.cliente_id !== cfg.cliente_id)) throw new Error('slug em uso');
    const i = demoCalendarios.findIndex((c) => c.cliente_id === cfg.cliente_id);
    if (i >= 0) demoCalendarios[i] = cfg; else demoCalendarios.push(cfg);
    return;
  }
  const { error } = await supabase.from('datas_calendario').upsert(cfg as never, { onConflict: 'cliente_id' });
  if (error) {
    // 23505 = unique_violation no slug.
    if (error.code === '23505') throw new Error('slug em uso');
    throw error;
  }
}

// ---------- Visão pública ----------
async function fetchPublico(slug: string): Promise<CalendarioPublico | null> {
  if (IS_DEMO) {
    const cal = demoCalendarios.find((c) => c.slug === slug);
    if (!cal) return null;
    const itens = demoItens.filter((i) => i.cliente_id === cal.cliente_id && i.visivel_cliente);
    const cli = demoClientes.find((c) => c.id === cal.cliente_id);
    return { cliente: { nome: cli?.nome ?? '', logo_url: cli?.logo_url ?? null }, inicio: cal.inicio, itens, base: demoBase };
  }
  const { data, error } = await supabase.rpc('calendario_publico' as never, { p_slug: slug } as never);
  if (error) throw error;
  return (data ?? null) as CalendarioPublico | null;
}

// ---------- Hooks ----------
export function useDatasBase() {
  return useQuery({ queryKey: keys.base, queryFn: fetchBase });
}

export function useDatasCliente(clienteId: string) {
  return useQuery({ queryKey: keys.itens(clienteId), queryFn: () => fetchItens(clienteId), enabled: !!clienteId });
}

export function useCalendarioConfig(clienteId: string) {
  return useQuery({ queryKey: keys.calendario(clienteId), queryFn: () => fetchCalendario(clienteId), enabled: !!clienteId });
}

export function useCalendarioPublico(slug: string) {
  return useQuery({ queryKey: keys.publico(slug), queryFn: () => fetchPublico(slug), enabled: !!slug, retry: 1 });
}

export function useSalvarDataBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: DataBaseForm }) => saveBase(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datas'] }),
  });
}

export function useExcluirDataBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBase(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.base }),
  });
}

export function useAdicionarDatasCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { clienteId: string; dataIds: string[] }) => addItens(p.clienteId, p.dataIds),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: keys.itens(p.clienteId) }),
  });
}

export function useAtualizarDataCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; dados: DataClienteForm }) => updateItem(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datas', 'itens'] }),
  });
}

export function useRemoverDataCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datas', 'itens'] }),
  });
}

export function useSalvarCalendario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cfg: CalendarioConfig) => saveCalendario(cfg),
    onSuccess: (_d, cfg) => qc.invalidateQueries({ queryKey: keys.calendario(cfg.cliente_id) }),
  });
}

export const PRIORIDADES: Prioridade[] = ['muito_alta', 'alta', 'media', 'baixa', 'operacional'];
