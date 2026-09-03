import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClienteNome } from '@/shared/lib/demoData';
import type {
  OnboardingAndamento,
  OnboardingTemplate,
} from '@/modules/onboarding/types';

// ---------- Stores demo (mutáveis) ----------
const demoTemplates: OnboardingTemplate[] = [
  {
    id: 'tpl1',
    nome: 'Onboarding padrão',
    created_at: '2026-06-01T10:00:00Z',
    etapas: [
      'Contrato assinado',
      'Acessos recebidos (BM, contas, redes)',
      'Formulário de planejamento preenchido',
      'ICP e persona definidos',
      'Pixel / conversões configurados',
      'Primeira campanha no ar',
    ],
  },
  {
    id: 'tpl2',
    nome: 'Onboarding e-commerce',
    created_at: '2026-06-15T10:00:00Z',
    etapas: [
      'Contrato assinado',
      'Acessos + catálogo de produtos',
      'Pixel + eventos de e-commerce',
      'Feed de produtos conectado',
      'Campanha de catálogo (DPA) no ar',
    ],
  },
];

const demoAndamentos: OnboardingAndamento[] = [
  {
    id: 'and1', cliente_id: 'c1', cliente_nome: 'Padaria do Bairro', template_nome: 'Onboarding padrão',
    created_at: '2025-11-10T10:00:00Z',
    etapas: [
      { etapa: 'Contrato assinado', concluida: true },
      { etapa: 'Acessos recebidos (BM, contas, redes)', concluida: true },
      { etapa: 'Formulário de planejamento preenchido', concluida: true },
      { etapa: 'ICP e persona definidos', concluida: true },
      { etapa: 'Pixel / conversões configurados', concluida: true },
      { etapa: 'Primeira campanha no ar', concluida: true },
    ],
  },
  {
    id: 'and2', cliente_id: 'c3', cliente_nome: 'Studio Pilates Vida', template_nome: 'Onboarding padrão',
    created_at: '2026-07-20T10:00:00Z',
    etapas: [
      { etapa: 'Contrato assinado', concluida: true },
      { etapa: 'Acessos recebidos (BM, contas, redes)', concluida: true },
      { etapa: 'Formulário de planejamento preenchido', concluida: true },
      { etapa: 'ICP e persona definidos', concluida: false },
      { etapa: 'Pixel / conversões configurados', concluida: false },
      { etapa: 'Primeira campanha no ar', concluida: false },
    ],
  },
];

// ---------- Templates ----------
async function fetchTemplates(): Promise<OnboardingTemplate[]> {
  if (IS_DEMO) return [...demoTemplates];
  const { data, error } = await supabase
    .from('onboarding_templates')
    .select('id, nome, created_at, onboarding_template_itens(etapa, ordem)')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((t: any) => ({
    id: t.id,
    nome: t.nome,
    created_at: t.created_at,
    etapas: (t.onboarding_template_itens ?? [])
      .sort((a: any, b: any) => a.ordem - b.ordem)
      .map((i: any) => i.etapa),
  }));
}

async function createTemplate(nome: string, etapas: string[]): Promise<void> {
  if (IS_DEMO) {
    demoTemplates.push({ id: crypto.randomUUID(), nome, etapas, created_at: new Date().toISOString() });
    return;
  }
  const { data, error } = await supabase
    .from('onboarding_templates')
    .insert({ nome } as never)
    .select('id')
    .single();
  if (error) throw error;
  const templateId = (data as any).id as string;
  const itens = etapas.map((etapa, ordem) => ({ template_id: templateId, etapa, ordem }));
  const { error: e2 } = await supabase.from('onboarding_template_itens').insert(itens as never);
  if (e2) throw e2;
}

// ---------- Andamentos (por cliente) ----------
async function fetchAndamentos(): Promise<OnboardingAndamento[]> {
  if (IS_DEMO) return [...demoAndamentos];
  const { data, error } = await supabase
    .from('onboarding_etapas')
    .select('id, cliente_id, etapa, concluida, ordem, clientes(nome)')
    .order('ordem', { ascending: true });
  if (error) throw error;
  const mapa = new Map<string, OnboardingAndamento>();
  for (const row of (data ?? []) as any[]) {
    if (!mapa.has(row.cliente_id)) {
      mapa.set(row.cliente_id, {
        id: row.cliente_id,
        cliente_id: row.cliente_id,
        cliente_nome: row.clientes?.nome ?? demoClienteNome(row.cliente_id),
        template_nome: '',
        etapas: [],
        created_at: '',
      });
    }
    mapa.get(row.cliente_id)!.etapas.push({ etapa: row.etapa, concluida: row.concluida });
  }
  return [...mapa.values()];
}

async function iniciarOnboarding(templateId: string, clienteId: string): Promise<void> {
  if (IS_DEMO) {
    const tpl = demoTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    demoAndamentos.unshift({
      id: crypto.randomUUID(),
      cliente_id: clienteId,
      cliente_nome: demoClienteNome(clienteId),
      template_nome: tpl.nome,
      created_at: new Date().toISOString(),
      etapas: tpl.etapas.map((etapa) => ({ etapa, concluida: false })),
    });
    return;
  }
  const { data: itens, error } = await supabase
    .from('onboarding_template_itens')
    .select('etapa, ordem')
    .eq('template_id', templateId)
    .order('ordem', { ascending: true });
  if (error) throw error;
  const rows = (itens ?? []).map((i: any) => ({
    cliente_id: clienteId,
    etapa: i.etapa,
    concluida: false,
    ordem: i.ordem,
  }));
  const { error: e2 } = await supabase.from('onboarding_etapas').insert(rows as never);
  if (e2) throw e2;
}

async function toggleEtapa(andamentoId: string, index: number): Promise<void> {
  if (IS_DEMO) {
    const a = demoAndamentos.find((x) => x.id === andamentoId);
    if (a && a.etapas[index]) a.etapas[index].concluida = !a.etapas[index].concluida;
    return;
  }
  // Em produção, o andamento é identificado por cliente_id (andamentoId) +
  // ordem (index). Alterna o concluida da etapa correspondente.
  const { data, error } = await supabase
    .from('onboarding_etapas')
    .select('id, concluida')
    .eq('cliente_id', andamentoId)
    .eq('ordem', index)
    .single();
  if (error) throw error;
  const row = data as any;
  const { error: e2 } = await supabase
    .from('onboarding_etapas')
    .update({ concluida: !row.concluida } as never)
    .eq('id', row.id);
  if (e2) throw e2;
}

// ---------- Hooks ----------
export function useOnboardingTemplates() {
  return useQuery({ queryKey: ['onboarding', 'templates'], queryFn: fetchTemplates });
}
export function useOnboardingAndamentos() {
  return useQuery({ queryKey: ['onboarding', 'andamentos'], queryFn: fetchAndamentos });
}

export function useCriarTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { nome: string; etapas: string[] }) => createTemplate(p.nome, p.etapas),
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
    mutationFn: (p: { andamentoId: string; index: number }) => toggleEtapa(p.andamentoId, p.index),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding', 'andamentos'] }),
  });
}

// -------- Conclusão do onboarding por cliente --------
export interface OnboardingConclusao {
  cliente_id: string;
  concluido_em: string;
  observacoes: string | null;
}

async function fetchConclusoes(): Promise<OnboardingConclusao[]> {
  if (IS_DEMO) return [];
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
      if (IS_DEMO) return;
      const { error } = await supabase
        .from('onboarding_conclusao')
        .upsert({ cliente_id: p.cliente_id, observacoes: p.observacoes ?? null, concluido_em: new Date().toISOString() } as never, { onConflict: 'cliente_id' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding'] }); },
  });
}

export function useReabrirOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cliente_id: string) => {
      if (IS_DEMO) return;
      const { error } = await supabase.from('onboarding_conclusao').delete().eq('cliente_id', cliente_id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding'] }); },
  });
}
