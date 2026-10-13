import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClienteNome } from '@/shared/lib/demoData';
import { ROTEIRO_ONBOARDING } from '@/modules/onboarding/roteiro';
import type {
  EtapaAndamento,
  EtapaModelo,
  OnboardingAndamento,
  OnboardingPublico,
  OnboardingTemplate,
} from '@/modules/onboarding/types';

export function linkPublicoOnboarding(token: string): string {
  return `${window.location.origin}/onb/${token}`;
}

function novoToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function etapasDoModelo(etapas: EtapaModelo[], feitas = 0): EtapaAndamento[] {
  return etapas.map((e, i) => ({
    id: crypto.randomUUID(),
    etapa: e.titulo,
    tempo: e.tempo,
    itens: [...e.itens],
    itens_feitos: i < feitas ? e.itens.map((_, k) => k) : [],
    concluida: i < feitas,
    concluida_em: i < feitas ? '2026-07-22T10:00:00Z' : null,
  }));
}

// ---------- Stores demo (mutáveis) ----------
const ROTEIRO_PADRAO: EtapaModelo[] = ROTEIRO_ONBOARDING.map((e) => ({
  titulo: e.titulo,
  tempo: e.tempo ?? '',
  itens: [...e.itens],
}));

const demoTemplates: OnboardingTemplate[] = [
  { id: 'tpl1', nome: 'Onboarding Startip', created_at: '2026-06-01T10:00:00Z', etapas: ROTEIRO_PADRAO },
];

const demoAndamentos: OnboardingAndamento[] = [
  {
    id: 'c3', cliente_id: 'c3', cliente_nome: demoClienteNome('c3'), template_nome: 'Onboarding Startip',
    token: 'demo3', created_at: '2026-07-20T10:00:00Z', etapas: etapasDoModelo(ROTEIRO_PADRAO, 3),
  },
];

const demoConclusoes: OnboardingConclusao[] = [];

// ---------- Modelos (templates) ----------
async function fetchTemplates(): Promise<OnboardingTemplate[]> {
  if (IS_DEMO) return [...demoTemplates];
  const { data, error } = await supabase
    .from('onboarding_templates')
    .select('id, nome, created_at, onboarding_template_itens(etapa, tempo, itens, ordem)')
    .order('created_at', { ascending: true });
  if (error) throw error;
  // any: colunas novas (tempo/itens) ainda não estão nos tipos gerados.
  return (data ?? []).map((t: any) => ({
    id: t.id,
    nome: t.nome,
    created_at: t.created_at,
    etapas: (t.onboarding_template_itens ?? [])
      .sort((a: any, b: any) => a.ordem - b.ordem)
      .map((i: any) => ({ titulo: i.etapa, tempo: i.tempo ?? '', itens: i.itens ?? [] })),
  }));
}

async function salvarTemplate(p: { id?: string; nome: string; etapas: EtapaModelo[] }): Promise<void> {
  if (IS_DEMO) {
    const existente = demoTemplates.find((t) => t.id === p.id);
    if (existente) Object.assign(existente, { nome: p.nome, etapas: p.etapas });
    else demoTemplates.push({ id: crypto.randomUUID(), nome: p.nome, etapas: p.etapas, created_at: new Date().toISOString() });
    return;
  }
  let templateId = p.id;
  if (templateId) {
    const { error } = await supabase.from('onboarding_templates').update({ nome: p.nome } as never).eq('id', templateId);
    if (error) throw error;
    const { error: eDel } = await supabase.from('onboarding_template_itens').delete().eq('template_id', templateId);
    if (eDel) throw eDel;
  } else {
    const { data, error } = await supabase
      .from('onboarding_templates')
      .insert({ nome: p.nome } as never)
      .select('id')
      .single();
    if (error) throw error;
    templateId = (data as { id: string }).id;
  }
  const itens = p.etapas.map((e, ordem) => ({
    template_id: templateId,
    etapa: e.titulo,
    tempo: e.tempo || null,
    itens: e.itens,
    ordem,
  }));
  const { error: eIns } = await supabase.from('onboarding_template_itens').insert(itens as never);
  if (eIns) throw eIns;
}

async function excluirTemplate(id: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoTemplates.findIndex((t) => t.id === id);
    if (i >= 0) demoTemplates.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('onboarding_templates').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Andamentos (um por cliente) ----------
async function fetchAndamentos(): Promise<OnboardingAndamento[]> {
  if (IS_DEMO) return demoAndamentos.map((a) => ({ ...a, etapas: a.etapas.map((e) => ({ ...e })) }));
  const [cab, etapas] = await Promise.all([
    supabase
      .from('onboarding_andamentos' as never)
      .select('cliente_id, template_nome, token, created_at, clientes(nome)')
      .order('created_at', { ascending: false }),
    supabase
      .from('onboarding_etapas')
      .select('id, cliente_id, etapa, tempo, itens, itens_feitos, concluida, concluida_em, ordem, created_at')
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);
  if (cab.error) throw cab.error;
  if (etapas.error) throw etapas.error;

  const mapa = new Map<string, OnboardingAndamento>();
  for (const a of (cab.data ?? []) as any[]) {
    mapa.set(a.cliente_id, {
      id: a.cliente_id,
      cliente_id: a.cliente_id,
      cliente_nome: a.clientes?.nome ?? '—',
      template_nome: a.template_nome ?? '',
      token: a.token,
      created_at: a.created_at,
      etapas: [],
    });
  }
  for (const row of (etapas.data ?? []) as any[]) {
    mapa.get(row.cliente_id)?.etapas.push({
      id: row.id,
      etapa: row.etapa,
      tempo: row.tempo ?? '',
      itens: row.itens ?? [],
      itens_feitos: row.itens_feitos ?? [],
      concluida: row.concluida,
      concluida_em: row.concluida_em,
    });
  }
  return [...mapa.values()];
}

async function iniciarOnboarding(templateId: string, clienteId: string): Promise<string> {
  const tpl = (await fetchTemplates()).find((t) => t.id === templateId);
  if (!tpl) throw new Error('Modelo não encontrado.');
  if (tpl.etapas.length === 0) throw new Error('Este modelo não tem etapas.');

  if (IS_DEMO) {
    if (demoAndamentos.some((a) => a.cliente_id === clienteId)) {
      throw new Error('Este cliente já tem um onboarding.');
    }
    const token = novoToken();
    demoAndamentos.unshift({
      id: clienteId,
      cliente_id: clienteId,
      cliente_nome: demoClienteNome(clienteId),
      template_nome: tpl.nome,
      token,
      created_at: new Date().toISOString(),
      etapas: etapasDoModelo(tpl.etapas),
    });
    return token;
  }

  const { data, error } = await supabase
    .from('onboarding_andamentos' as never)
    .insert({ cliente_id: clienteId, template_id: tpl.id, template_nome: tpl.nome } as never)
    .select('token')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('Este cliente já tem um onboarding.');
    throw error;
  }
  const rows = tpl.etapas.map((e, ordem) => ({
    cliente_id: clienteId,
    etapa: e.titulo,
    tempo: e.tempo || null,
    itens: e.itens,
    itens_feitos: [],
    concluida: false,
    ordem,
  }));
  const { error: e2 } = await supabase.from('onboarding_etapas').insert(rows as never);
  if (e2) {
    // Sem as etapas o cabeçalho ficaria órfão e bloquearia uma nova tentativa.
    await supabase.from('onboarding_andamentos' as never).delete().eq('cliente_id', clienteId);
    throw e2;
  }
  return (data as { token: string }).token;
}

async function toggleEtapa(etapaId: string, concluida: boolean): Promise<void> {
  if (IS_DEMO) {
    for (const a of demoAndamentos) {
      const e = a.etapas.find((x) => x.id === etapaId);
      if (e) { e.concluida = concluida; e.concluida_em = concluida ? new Date().toISOString() : null; }
    }
    return;
  }
  const { error } = await supabase
    .from('onboarding_etapas')
    .update({ concluida, concluida_em: concluida ? new Date().toISOString() : null } as never)
    .eq('id', etapaId);
  if (error) throw error;
}

async function toggleItem(etapaId: string, index: number, feito: boolean): Promise<void> {
  if (IS_DEMO) {
    for (const a of demoAndamentos) {
      const e = a.etapas.find((x) => x.id === etapaId);
      if (!e) continue;
      const set = new Set(e.itens_feitos);
      if (feito) set.add(index); else set.delete(index);
      e.itens_feitos = [...set].sort((x, y) => x - y);
    }
    return;
  }
  const { data, error } = await supabase
    .from('onboarding_etapas')
    .select('itens_feitos')
    .eq('id', etapaId)
    .single();
  if (error) throw error;
  const atuais: number[] = ((data as any)?.itens_feitos ?? []) as number[];
  const set = new Set(atuais);
  if (feito) set.add(index); else set.delete(index);
  const novos = [...set].sort((x, y) => x - y);
  const { error: eUp } = await supabase
    .from('onboarding_etapas')
    .update({ itens_feitos: novos } as never)
    .eq('id', etapaId);
  if (eUp) throw eUp;
}

async function excluirOnboarding(clienteId: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoAndamentos.findIndex((a) => a.cliente_id === clienteId);
    if (i >= 0) demoAndamentos.splice(i, 1);
    const j = demoConclusoes.findIndex((c) => c.cliente_id === clienteId);
    if (j >= 0) demoConclusoes.splice(j, 1);
    return;
  }
  const { error } = await supabase.from('onboarding_etapas').delete().eq('cliente_id', clienteId);
  if (error) throw error;
  const { error: e2 } = await supabase.from('onboarding_conclusao').delete().eq('cliente_id', clienteId);
  if (e2) throw e2;
  const { error: e3 } = await supabase.from('onboarding_andamentos' as never).delete().eq('cliente_id', clienteId);
  if (e3) throw e3;
}

// ---------- Página pública do cliente ----------
async function fetchOnboardingPublico(token: string): Promise<OnboardingPublico | null> {
  if (IS_DEMO) {
    const a = demoAndamentos.find((x) => x.token === token);
    if (!a) return null;
    return {
      cliente_nome: a.cliente_nome,
      template_nome: a.template_nome,
      iniciado_em: a.created_at,
      concluido_em: demoConclusoes.find((c) => c.cliente_id === a.cliente_id)?.concluido_em ?? null,
      etapas: a.etapas,
    };
  }
  // any: RPC criada na migration 0051, fora dos tipos gerados.
  const { data, error } = await (supabase as any).rpc('onboarding_por_token', { p_token: token });
  if (error) throw error;
  return (data as OnboardingPublico | null) ?? null;
}

// ---------- Hooks ----------
export function useOnboardingTemplates() {
  return useQuery({ queryKey: ['onboarding', 'templates'], queryFn: fetchTemplates });
}
export function useOnboardingAndamentos() {
  return useQuery({ queryKey: ['onboarding', 'andamentos'], queryFn: fetchAndamentos });
}
export function useOnboardingPublico(token: string | undefined) {
  return useQuery({
    queryKey: ['onboarding', 'publico', token],
    queryFn: () => fetchOnboardingPublico(token as string),
    enabled: Boolean(token),
  });
}

export function useSalvarTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding', 'templates'] }),
  });
}
export function useExcluirTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: excluirTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding', 'templates'] }),
  });
}
export function useIniciarOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { templateId: string; clienteId: string }) =>
      iniciarOnboarding(p.templateId, p.clienteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding', 'andamentos'] }),
  });
}
export function useToggleEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { etapaId: string; concluida: boolean }) => toggleEtapa(p.etapaId, p.concluida),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding', 'andamentos'] }),
  });
}
export function useToggleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { etapaId: string; index: number; feito: boolean }) =>
      toggleItem(p.etapaId, p.index, p.feito),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding', 'andamentos'] }),
  });
}
export function useExcluirOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: excluirOnboarding,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding'] }),
  });
}

// -------- Conclusão do onboarding por cliente --------
export interface OnboardingConclusao {
  cliente_id: string;
  concluido_em: string;
  observacoes: string | null;
}

async function fetchConclusoes(): Promise<OnboardingConclusao[]> {
  if (IS_DEMO) return [...demoConclusoes];
  const { data, error } = await supabase.from('onboarding_conclusao').select('*');
  if (error) throw error;
  return (data ?? []) as OnboardingConclusao[];
}
export function useOnboardingConclusoes() {
  return useQuery({ queryKey: ['onboarding', 'conclusoes'], queryFn: fetchConclusoes });
}

export function useConcluirOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { cliente_id: string; observacoes?: string }) => {
      const concluido_em = new Date().toISOString();
      if (IS_DEMO) {
        demoConclusoes.push({ cliente_id: p.cliente_id, concluido_em, observacoes: p.observacoes ?? null });
        return;
      }
      const { error } = await supabase
        .from('onboarding_conclusao')
        .upsert({ cliente_id: p.cliente_id, observacoes: p.observacoes ?? null, concluido_em } as never, { onConflict: 'cliente_id' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding'] }); },
  });
}

export function useReabrirOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cliente_id: string) => {
      if (IS_DEMO) {
        const i = demoConclusoes.findIndex((c) => c.cliente_id === cliente_id);
        if (i >= 0) demoConclusoes.splice(i, 1);
        return;
      }
      const { error } = await supabase.from('onboarding_conclusao').delete().eq('cliente_id', cliente_id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding'] }); },
  });
}
