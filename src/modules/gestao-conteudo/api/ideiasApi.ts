import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import {
  mensagemIdeias, mensagemLembreteIdeias, type Ideia, type IdeiaForm,
} from '@/modules/gestao-conteudo/types';

// A tabela ainda não está no tipo gerado do Supabase (database.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = () => (supabase as any).from('ideias_conteudo');

const TODOS = ['gestao-conteudo', 'ideias'] as const;

export function linkAprovacaoIdeias(slug: string, mes: string): string {
  return `${window.location.origin}/aprovar-ideias/${slug}?mes=${mes}`;
}

// ---------- Leitura ----------
export function useIdeiasDoMes(mes: string) {
  return useQuery({
    queryKey: [...TODOS, 'mes', mes] as const,
    queryFn: async (): Promise<Ideia[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await tabela()
        .select('*')
        .eq('mes_referencia', mes)
        .order('semana', { ascending: true })
        .order('dia_postagem', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ideia[];
    },
  });
}

// ---------- Escrita ----------
function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: TODOS });
}

export function useSalvarIdeia() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (p: { id?: string; clienteId: string; mes: string; dados: IdeiaForm }) => {
      if (IS_DEMO) return;
      const payload = { ...p.dados, dia_postagem: p.dados.dia_postagem || null };
      if (p.id) {
        const { error } = await tabela().update(payload).eq('id', p.id);
        if (error) throw error;
      } else {
        const { error } = await tabela().insert({
          ...payload, cliente_id: p.clienteId, mes_referencia: p.mes, status: 'rascunho',
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidar,
  });
}

export function useExcluirIdeia() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) return;
      const { error } = await tabela().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

/** Tira do portal do cliente e volta para rascunho (ex.: enviada por engano). */
export function useRecolherIdeia() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) return;
      const { error } = await tabela().update({ status: 'rascunho' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

async function erroDaFuncao(error: unknown): Promise<string> {
  const e = error as { message?: string; context?: Response };
  try {
    const corpo = await e.context?.json();
    if (corpo?.error) return String(corpo.error);
  } catch { /* usa a mensagem genérica */ }
  return e.message ?? 'Falha ao enviar o WhatsApp.';
}

interface EnvioBase {
  clienteId: string; clienteNome: string; slug: string | null | undefined; mes: string; ids: string[];
}

export function useEnviarIdeias() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (p: EnvioBase) => {
      if (p.ids.length === 0) throw new Error('Selecione ao menos uma ideia.');
      if (!p.slug) {
        throw new Error('Este cliente ainda não tem link público. Gere o link na página do cliente.');
      }
      // Libera no portal ANTES de avisar, para o link já abrir com tudo.
      const { error: eUp } = await tabela().update({ status: 'enviada' }).in('id', p.ids);
      if (eUp) throw eUp;

      const texto = mensagemIdeias({
        clienteNome: p.clienteNome, mes: p.mes, qtd: p.ids.length,
        link: linkAprovacaoIdeias(p.slug, p.mes),
      });
      const { error } = await supabase.functions.invoke('enviar-aviso-whatsapp', {
        body: { cliente_id: p.clienteId, texto },
      });
      if (error) {
        // desfaz a liberação: o cliente não foi avisado
        await tabela().update({ status: 'rascunho' }).in('id', p.ids);
        throw new Error(await erroDaFuncao(error));
      }
    },
    onSuccess: invalidar,
  });
}

export function useLembrarIdeias() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (p: EnvioBase) => {
      if (!p.slug) throw new Error('Este cliente ainda não tem link público.');
      if (p.ids.length === 0) throw new Error('Não há ideias aguardando aprovação.');
      const texto = mensagemLembreteIdeias({ qtd: p.ids.length, link: linkAprovacaoIdeias(p.slug, p.mes) });
      const { error } = await supabase.functions.invoke('enviar-aviso-whatsapp', {
        body: { cliente_id: p.clienteId, texto },
      });
      if (error) throw new Error(await erroDaFuncao(error));
      await tabela().update({ lembrete_em: new Date().toISOString() }).in('id', p.ids);
    },
    onSuccess: invalidar,
  });
}
