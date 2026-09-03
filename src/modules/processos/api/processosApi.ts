import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { ProcessoDoc } from '@/modules/processos/types';

const demoDocs: ProcessoDoc[] = [
  {
    id: 'doc1',
    categoria: 'trafego',
    titulo: 'Como estruturar uma campanha no Meta Ads',
    autor: 'Iuri',
    updated_at: '2026-07-30T10:00:00Z',
    created_at: '2026-06-01T10:00:00Z',
    conteudo: `1. Definir objetivo (conversão, tráfego, alcance).
2. Configurar o pixel e os eventos de conversão.
3. Estruturar público (frio, morno, remarketing).
4. Criar 3 a 5 variações de criativo por conjunto.
5. Definir orçamento diário e regra de escala.
6. Acompanhar CPL e CTR nas primeiras 48h antes de otimizar.`,
  },
  {
    id: 'doc2',
    categoria: 'atendimento',
    titulo: 'Padrão de reunião mensal de resultados',
    autor: 'Iuri',
    updated_at: '2026-07-20T10:00:00Z',
    created_at: '2026-06-10T10:00:00Z',
    conteudo: `1. Enviar convite com 3 dias de antecedência.
2. Preparar o relatório do mês (investimento, leads, CPL, ROI).
3. Abrir com os resultados, depois aprendizados, depois próximos passos.
4. Registrar decisões no painel do cliente.
5. Enviar ata por WhatsApp em até 24h.`,
  },
  {
    id: 'doc3',
    categoria: 'onboarding',
    titulo: 'Checklist de entrada de novo cliente',
    autor: 'Atendimento',
    updated_at: '2026-07-15T10:00:00Z',
    created_at: '2026-05-20T10:00:00Z',
    conteudo: `Ver também o módulo Onboarding (templates aplicáveis por cliente).
1. Assinar contrato e registrar no financeiro.
2. Solicitar acessos (BM, contas de anúncio, redes).
3. Preencher formulário de planejamento estratégico.
4. Definir ICP e persona.
5. Configurar rastreamento (pixel/conversões).`,
  },
];

async function fetchDocs(): Promise<ProcessoDoc[]> {
  if (IS_DEMO) {
    return [...demoDocs].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
  const { data, error } = await supabase
    .from('processos')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProcessoDoc[];
}

export type ProcessoFormData = Pick<
  ProcessoDoc,
  'categoria' | 'titulo' | 'conteudo' | 'autor' | 'anexos'
>;

async function saveDoc(id: string | undefined, dados: ProcessoFormData): Promise<void> {
  if (IS_DEMO) {
    const agora = new Date().toISOString();
    if (id) {
      const d = demoDocs.find((x) => x.id === id);
      if (d) Object.assign(d, dados, { updated_at: agora });
    } else {
      demoDocs.unshift({ id: crypto.randomUUID(), created_at: agora, updated_at: agora, ...dados });
    }
    return;
  }
  const { error } = id
    ? await supabase.from('processos').update({ ...dados, updated_at: new Date().toISOString() } as never).eq('id', id)
    : await supabase.from('processos').insert(dados as never);
  if (error) throw error;
}

async function deleteDoc(id: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoDocs.findIndex((x) => x.id === id);
    if (i >= 0) demoDocs.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('processos').delete().eq('id', id);
  if (error) throw error;
}

export function useProcessosDocs() {
  return useQuery({ queryKey: ['processos', 'docs'], queryFn: fetchDocs });
}

export function useSalvarProcessoDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: ProcessoFormData }) => saveDoc(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['processos', 'docs'] }),
  });
}

export function useExcluirProcessoDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDoc(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['processos', 'docs'] }),
  });
}
