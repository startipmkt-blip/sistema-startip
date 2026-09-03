import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type {
  AprovacaoStatus,
  ConteudoIdeia,
  ConteudoSugestao,
} from '@/modules/aprovacao-conteudo/types';

// ---------- Stores demo (mutáveis) ----------
const demoIdeias: ConteudoIdeia[] = [
  { id: 'ci1', cliente_id: 'c1', mes_referencia: '2026-09', semana: 1, titulo: 'Bastidores da produção do pão', descricao: 'Reels mostrando a fabricação artesanal de manhã cedo.', formato: 'reels', status: 'aprovado', justificativa: '', created_at: '2026-08-25T10:00:00Z' },
  { id: 'ci2', cliente_id: 'c1', mes_referencia: '2026-09', semana: 2, titulo: '5 dicas para conservar o pão', descricao: 'Carrossel educativo com dicas práticas.', formato: 'carrossel', status: 'pendente', justificativa: '', created_at: '2026-08-25T10:00:00Z' },
  { id: 'ci3', cliente_id: 'c1', mes_referencia: '2026-09', semana: 3, titulo: 'Promoção de sexta-feira', descricao: 'Post estático divulgando o combo café + pão.', formato: 'estatico', status: 'pendente', justificativa: '', created_at: '2026-08-25T10:00:00Z' },
  { id: 'ci4', cliente_id: 'c2', mes_referencia: '2026-09', semana: 1, titulo: 'Lookbook coleção primavera', descricao: 'Reels com as principais peças da nova coleção.', formato: 'reels', status: 'pendente', justificativa: '', created_at: '2026-08-26T10:00:00Z' },
];

const demoSugestoes: ConteudoSugestao[] = [];

const keys = {
  ideias: (clienteId: string) => ['aprovacao', 'ideias', clienteId] as const,
  sugestoes: (clienteId: string) => ['aprovacao', 'sugestoes', clienteId] as const,
};

// ---------- Ideias ----------
async function fetchIdeias(clienteId: string): Promise<ConteudoIdeia[]> {
  if (IS_DEMO) {
    return demoIdeias
      .filter((i) => !clienteId || i.cliente_id === clienteId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  let query = supabase.from('conteudo_aprovacao').select('*').order('created_at', { ascending: true });
  if (clienteId) query = query.eq('cliente_id', clienteId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ConteudoIdeia[];
}

export type IdeiaFormData = Pick<
  ConteudoIdeia,
  'cliente_id' | 'mes_referencia' | 'semana' | 'titulo' | 'descricao' | 'formato'
> & { dia_postagem?: string | null; anexos?: { path: string; name: string; type: string }[] };

async function gerarLoteIdeias(clienteId: string, mes: string, porSemana: 1 | 2 | 3): Promise<void> {
  // Distribui posts em branco entre as 4 semanas do mês (porSemana * 4 = total).
  const linhas: IdeiaFormData[] = [];
  for (let s = 1; s <= 4; s++) {
    for (let n = 1; n <= porSemana; n++) {
      linhas.push({
        cliente_id: clienteId,
        mes_referencia: mes,
        semana: s,
        titulo: `Ideia ${n} — semana ${s}`,
        descricao: '',
        formato: 'reels',
      });
    }
  }
  if (IS_DEMO) {
    for (const d of linhas) {
      demoIdeias.push({ id: crypto.randomUUID(), status: 'pendente', justificativa: '', created_at: new Date().toISOString(), ...d });
    }
    return;
  }
  const { error } = await supabase.from('conteudo_aprovacao').insert(linhas as never);
  if (error) throw error;
}

async function saveIdeia(id: string | undefined, dados: IdeiaFormData): Promise<void> {
  if (IS_DEMO) {
    if (id) {
      const it = demoIdeias.find((x) => x.id === id);
      if (it) Object.assign(it, dados);
    } else {
      demoIdeias.push({ id: crypto.randomUUID(), status: 'pendente', justificativa: '', created_at: new Date().toISOString(), ...dados });
    }
    return;
  }
  const { error } = id
    ? await supabase.from('conteudo_aprovacao').update(dados as never).eq('id', id)
    : await supabase.from('conteudo_aprovacao').insert(dados as never);
  if (error) throw error;
}

async function decidirIdeia(id: string, status: AprovacaoStatus, justificativa: string): Promise<void> {
  if (IS_DEMO) {
    const it = demoIdeias.find((x) => x.id === id);
    if (it) { it.status = status; it.justificativa = justificativa; }
    return;
  }
  const { error } = await supabase
    .from('conteudo_aprovacao')
    .update({ status, justificativa } as never)
    .eq('id', id);
  if (error) throw error;
}

// ---------- Sugestões (do cliente, para o mês seguinte) ----------
async function fetchSugestoes(clienteId: string): Promise<ConteudoSugestao[]> {
  if (IS_DEMO) {
    return demoSugestoes
      .filter((s) => !clienteId || s.cliente_id === clienteId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  let query = supabase.from('conteudo_sugestoes').select('*').order('created_at', { ascending: false });
  if (clienteId) query = query.eq('cliente_id', clienteId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ConteudoSugestao[];
}

async function addSugestao(clienteId: string, mes: string, texto: string): Promise<void> {
  if (IS_DEMO) {
    demoSugestoes.unshift({ id: crypto.randomUUID(), cliente_id: clienteId, mes_referencia: mes, texto, created_at: new Date().toISOString() });
    return;
  }
  const { error } = await supabase
    .from('conteudo_sugestoes')
    .insert({ cliente_id: clienteId, mes_referencia: mes, texto } as never);
  if (error) throw error;
}

// ---------- Hooks ----------
export function useIdeias(clienteId: string) {
  return useQuery({ queryKey: keys.ideias(clienteId), queryFn: () => fetchIdeias(clienteId) });
}
export function useSugestoes(clienteId: string) {
  return useQuery({ queryKey: keys.sugestoes(clienteId), queryFn: () => fetchSugestoes(clienteId) });
}
async function deleteIdeia(id: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoIdeias.findIndex((x) => x.id === id);
    if (i >= 0) demoIdeias.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('conteudo_aprovacao').delete().eq('id', id);
  if (error) throw error;
}

export function useGerarLoteIdeias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { clienteId: string; mes: string; porSemana: 1 | 2 | 3 }) =>
      gerarLoteIdeias(p.clienteId, p.mes, p.porSemana),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aprovacao', 'ideias'] }),
  });
}

export function useSalvarIdeia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: IdeiaFormData }) => saveIdeia(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aprovacao', 'ideias'] }),
  });
}

export function useExcluirIdeia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIdeia(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aprovacao', 'ideias'] }),
  });
}
// Ideias aprovadas pelo cliente — usadas no módulo Conteúdo (Kanban de produção).
async function fetchIdeiasAprovadas(clienteId: string): Promise<ConteudoIdeia[]> {
  if (IS_DEMO) {
    return demoIdeias.filter((i) => i.status === 'aprovado' && (!clienteId || i.cliente_id === clienteId));
  }
  let q = supabase.from('conteudo_aprovacao').select('*').eq('status', 'aprovado').order('semana').order('created_at');
  if (clienteId) q = q.eq('cliente_id', clienteId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ConteudoIdeia[];
}
export function useIdeiasAprovadas(clienteId: string) {
  return useQuery({ queryKey: ['aprovacao', 'aprovadas', clienteId], queryFn: () => fetchIdeiasAprovadas(clienteId) });
}

export function useMoverProducaoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; producao_status: 'ideia' | 'producao' | 'aprovacao_interna' | 'publicado' }) => {
      if (IS_DEMO) {
        const it = demoIdeias.find((x) => x.id === p.id);
        if (it) (it as { producao_status?: string }).producao_status = p.producao_status;
        return;
      }
      const { error } = await supabase.from('conteudo_aprovacao').update({ producao_status: p.producao_status } as never).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aprovacao', 'aprovadas'] }),
  });
}

export function useToggleVisivelIdeia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; visivel: boolean }) => {
      if (IS_DEMO) return;
      const { error } = await supabase.from('conteudo_aprovacao').update({ visivel_cliente: p.visivel } as never).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aprovacao', 'ideias'] }),
  });
}

export function usePublicarMesInteiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { clienteId: string; mes: string }) => {
      if (IS_DEMO) {
        demoIdeias.forEach((i) => {
          if (i.cliente_id === p.clienteId && i.mes_referencia === p.mes) {
            (i as { visivel_cliente?: boolean }).visivel_cliente = true;
          }
        });
        return;
      }
      const { error } = await supabase
        .from('conteudo_aprovacao')
        .update({ visivel_cliente: true } as never)
        .eq('cliente_id', p.clienteId)
        .eq('mes_referencia', p.mes);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aprovacao', 'ideias'] }),
  });
}

export function useDecidirIdeia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; status: AprovacaoStatus; justificativa: string }) =>
      decidirIdeia(p.id, p.status, p.justificativa),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aprovacao', 'ideias'] }),
  });
}
export function useAddSugestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { clienteId: string; mes: string; texto: string }) =>
      addSugestao(p.clienteId, p.mes, p.texto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aprovacao', 'sugestoes'] }),
  });
}
