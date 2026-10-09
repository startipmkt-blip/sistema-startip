import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { Etapa, Post, PostForm } from '@/modules/gestao-conteudo/types';
import { mensagemAprovacao } from '@/modules/gestao-conteudo/types';

const chaves = {
  mes: (mes: string) => ['gestao-conteudo', 'mes', mes] as const,
  todos: ['gestao-conteudo'] as const,
};

// ---------- Leitura ----------
export function usePostsDoMes(mes: string) {
  return useQuery({
    queryKey: chaves.mes(mes),
    queryFn: async (): Promise<Post[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase
        .from('conteudo_aprovacao')
        .select('*')
        .eq('mes_referencia', mes)
        .order('semana', { ascending: true })
        .order('dia_postagem', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Post[];
    },
  });
}

// ---------- Escrita ----------
function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: chaves.todos });
}

export function useSalvarPost() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (p: { id?: string; clienteId: string; mes: string; dados: PostForm }) => {
      if (IS_DEMO) return;
      const payload = {
        ...p.dados,
        link_drive: p.dados.link_drive?.trim() || null,
        dia_postagem: p.dados.dia_postagem || null,
      };
      if (p.id) {
        const { error } = await supabase
          .from('conteudo_aprovacao').update(payload as never).eq('id', p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('conteudo_aprovacao').insert({
          ...payload,
          cliente_id: p.clienteId,
          mes_referencia: p.mes,
          // nasce interno: o cliente só vê depois de "enviar para aprovação"
          visivel_cliente: false,
          etapa: 'em_edicao',
        } as never);
        if (error) throw error;
      }
    },
    onSuccess: invalidar,
  });
}

export function useMudarEtapa() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (p: { id: string; etapa: Etapa }) => {
      if (IS_DEMO) return;
      let patch: Record<string, unknown> = { etapa: p.etapa };
      if (p.etapa === 'em_edicao' || p.etapa === 'editado') {
        // volta para a mesa: sai do portal e pode ser reenviado depois
        patch = { etapa: p.etapa, status: 'pendente', visivel_cliente: false };
      } else if (p.etapa === 'enviado') {
        patch = {
          etapa: 'enviado', status: 'pendente', visivel_cliente: true,
          enviado_em: new Date().toISOString(),
        };
      } else if (p.etapa === 'aprovado') {
        patch = { etapa: 'aprovado', status: 'aprovado', visivel_cliente: true };
      }
      const { error } = await supabase
        .from('conteudo_aprovacao').update(patch as never).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useExcluirPost() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) return;
      const { error } = await supabase.from('conteudo_aprovacao').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useSalvarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { clienteId: string; porSemana: number; porMes: number }) => {
      if (IS_DEMO) return;
      const { error } = await supabase
        .from('clientes')
        .update({ conteudos_por_semana: p.porSemana, posts_por_mes: p.porMes } as never)
        .eq('id', p.clienteId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });
}

// ---------- WhatsApp ----------
export function linkAprovacao(slug: string, mes: string): string {
  return `${window.location.origin}/aprovar/${slug}?mes=${mes}`;
}

async function erroDaFuncao(error: unknown): Promise<string> {
  const e = error as { message?: string; context?: Response };
  try {
    const corpo = await e.context?.json();
    if (corpo?.error) return String(corpo.error);
  } catch { /* usa a mensagem genérica */ }
  return e.message ?? 'Falha ao enviar o WhatsApp.';
}

export function useEnviarParaAprovacao() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (p: {
      clienteId: string; clienteNome: string; slug: string | null | undefined;
      mes: string; ids: string[];
    }) => {
      if (p.ids.length === 0) throw new Error('Selecione ao menos um conteúdo.');
      if (!p.slug) {
        throw new Error('Este cliente ainda não tem link público. Gere o link na página do cliente.');
      }
      // Libera os itens no portal ANTES de avisar, para o link já abrir com tudo.
      const { error: eUp } = await supabase
        .from('conteudo_aprovacao')
        .update({
          etapa: 'enviado', status: 'pendente', visivel_cliente: true,
          enviado_em: new Date().toISOString(),
        } as never)
        .in('id', p.ids);
      if (eUp) throw eUp;

      const texto = mensagemAprovacao({
        clienteNome: p.clienteNome, mes: p.mes, qtd: p.ids.length,
        link: linkAprovacao(p.slug, p.mes),
      });
      const { error } = await supabase.functions.invoke('enviar-aviso-whatsapp', {
        body: { cliente_id: p.clienteId, texto },
      });
      if (error) {
        // desfaz a liberação: o cliente não foi avisado
        await supabase
          .from('conteudo_aprovacao')
          .update({ etapa: 'editado', visivel_cliente: false, enviado_em: null } as never)
          .in('id', p.ids);
        throw new Error(await erroDaFuncao(error));
      }
    },
    onSuccess: invalidar,
  });
}
