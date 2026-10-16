import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type {
  Formulario,
  FormularioModelo,
  FormularioTipo,
  Pergunta,
} from '@/modules/formularios/types';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/formularios-publico`;

const keys = {
  all: ['formularios'] as const,
  porCliente: (clienteId: string) => ['formularios', 'cliente', clienteId] as const,
  modeloIcp: ['formularios', 'modelo-icp'] as const,
};

// ---------- Modelos (admin / seed) ----------
async function fetchModeloIcp(): Promise<FormularioModelo | null> {
  if (IS_DEMO) return null;
  const { data, error } = await supabase
    .from('formularios_modelos')
    .select('*')
    .eq('chave', 'icp_padrao')
    .maybeSingle();
  if (error) throw error;
  return (data as FormularioModelo | null) ?? null;
}
export function useModeloIcp() {
  return useQuery({ queryKey: keys.modeloIcp, queryFn: fetchModeloIcp });
}

export function useSalvarPerguntasModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; perguntas: Pergunta[] }) => {
      const { error } = await supabase
        .from('formularios_modelos')
        .update({ perguntas: p.perguntas } as never)
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.modeloIcp }),
  });
}

// ---------- Formulários do cliente ----------
async function fetchPorCliente(clienteId: string): Promise<Formulario[]> {
  if (IS_DEMO) return [];
  const { data, error } = await supabase
    .from('formularios')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Formulario[];
}
export function useFormulariosDoCliente(clienteId: string) {
  return useQuery({
    queryKey: keys.porCliente(clienteId),
    queryFn: () => fetchPorCliente(clienteId),
    enabled: !!clienteId,
  });
}

function slugAleatorio(): string {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => abc[n % abc.length]).join('');
}

export interface CriarFormularioParams {
  clienteId: string;
  comTrafego?: boolean; // inclui as perguntas condicionais de tráfego pago
  tipo: FormularioTipo;
  perguntasNicho?: Pergunta[]; // obrigatório para 'nicho' e 'unificado'
}

async function fetchModeloPadrao(): Promise<FormularioModelo | null> {
  const { data, error } = await supabase
    .from('formularios_modelos')
    .select('*')
    .eq('chave', 'briefing_padrao')
    .maybeSingle();
  if (error) throw error;
  return (data as FormularioModelo | null) ?? null;
}

async function criarFormulario(p: CriarFormularioParams): Promise<Formulario> {
  const modelo = p.tipo === 'padrao' ? await fetchModeloPadrao() : await fetchModeloIcp();
  let perguntas: Pergunta[] = [];
  let titulo = '';
  let modeloId: string | null = null;

  if (p.tipo === 'padrao') {
    if (!modelo) throw new Error('Briefing padrão não encontrado. Rode a migration 0080 no Supabase.');
    perguntas = modelo.perguntas.filter((q) => !q.condicao || (q.condicao === 'trafego_pago' && p.comTrafego));
    titulo = modelo.titulo;
    modeloId = modelo.id;
  } else if (p.tipo === 'icp') {
    if (!modelo) throw new Error('Modelo ICP padrão não encontrado.');
    perguntas = modelo.perguntas;
    titulo = modelo.titulo;
    modeloId = modelo.id;
  } else if (p.tipo === 'nicho') {
    if (!p.perguntasNicho?.length) throw new Error('Cole as perguntas do nicho.');
    perguntas = p.perguntasNicho;
    titulo = 'Formulário Adaptado ao Nicho';
  } else {
    // unificado
    if (!modelo) throw new Error('Modelo ICP padrão não encontrado.');
    if (!p.perguntasNicho?.length) throw new Error('Cole as perguntas do nicho.');
    const nichoRenum = p.perguntasNicho.map((q, i) => ({ ...q, id: `n${i + 1}` }));
    perguntas = [...modelo.perguntas, ...nichoRenum];
    titulo = 'Formulário Unificado (ICP + Nicho)';
    modeloId = modelo.id;
  }

  const slug = slugAleatorio();
  const { data, error } = await supabase
    .from('formularios')
    .insert({
      cliente_id: p.clienteId,
      tipo: p.tipo,
      modelo_id: modeloId,
      slug,
      titulo,
      perguntas,
      status: 'pendente',
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  return data as Formulario;
}
export function useCriarFormulario(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Omit<CriarFormularioParams, 'clienteId'>) =>
      criarFormulario({ ...p, clienteId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.porCliente(clienteId) }),
  });
}

export function useArquivarFormulario(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('formularios')
        .update({ status: 'arquivado' } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.porCliente(clienteId) }),
  });
}

// ---------- API PÚBLICA (via Edge Function) ----------
export interface FormularioPublico {
  slug: string;
  titulo: string;
  tipo: FormularioTipo;
  perguntas: Pergunta[];
  preenchido: boolean;
}

export async function carregarFormularioPublico(
  slug: string,
): Promise<{ ok: true; dados: FormularioPublico } | { ok: false; error: string; status: number }> {
  const r = await fetch(`${FN_URL}?slug=${encodeURIComponent(slug)}`);
  const body = await r.json().catch(() => ({}));
  if (r.ok) return { ok: true, dados: body as FormularioPublico };
  return { ok: false, error: body?.error ?? 'erro', status: r.status };
}

export async function enviarFormularioPublico(
  slug: string,
  respostas: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug, respostas }),
  });
  const body = await r.json().catch(() => ({}));
  if (r.ok) return { ok: true };
  return { ok: false, error: body?.error ?? 'erro' };
}
