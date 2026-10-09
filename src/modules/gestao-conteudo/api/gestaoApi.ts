import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { ConfigGestao, Etapa, Post, PostForm } from '@/modules/gestao-conteudo/types';
import {
  CONFIG_PADRAO, mensagemAprovacao, mensagemLembrete, mesmoDiaEmOutroMes,
} from '@/modules/gestao-conteudo/types';

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

/** Posts com dia de postagem dentro do período (usado na agenda da semana). */
export function usePostsPeriodo(inicio: string, fim: string) {
  return useQuery({
    queryKey: ['gestao-conteudo', 'periodo', inicio, fim] as const,
    queryFn: async (): Promise<Post[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase
        .from('conteudo_aprovacao')
        .select('*')
        .gte('dia_postagem', inicio)
        .lte('dia_postagem', fim)
        .order('dia_postagem', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Post[];
    },
  });
}

export function useConfigGestao() {
  return useQuery({
    queryKey: ['gestao-conteudo-config'] as const,
    queryFn: async (): Promise<ConfigGestao> => {
      if (IS_DEMO) return CONFIG_PADRAO;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('gestao_conteudo_config').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return { ...CONFIG_PADRAO, ...((data ?? {}) as Partial<ConfigGestao>) };
    },
  });
}

export function useSalvarConfigGestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: ConfigGestao) => {
      if (IS_DEMO) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('gestao_conteudo_config')
        .update({
          whatsapp_equipe: c.whatsapp_equipe?.trim() || null,
          avisar_reprovacao: c.avisar_reprovacao,
          lembrete_ativo: c.lembrete_ativo,
          lembrete_horas: c.lembrete_horas,
          lembrete_maximo: c.lembrete_maximo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gestao-conteudo-config'] }),
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

/** Copia o planejamento do mês anterior como rascunho (sem arquivos nem decisões). */
export function useCopiarMesAnterior() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (p: { clienteId: string; mesOrigem: string; mesDestino: string }): Promise<number> => {
      if (IS_DEMO) return 0;
      const { data: origem, error: eO } = await supabase
        .from('conteudo_aprovacao').select('*')
        .eq('cliente_id', p.clienteId).eq('mes_referencia', p.mesOrigem);
      if (eO) throw eO;
      const { data: destino, error: eD } = await supabase
        .from('conteudo_aprovacao').select('titulo, semana')
        .eq('cliente_id', p.clienteId).eq('mes_referencia', p.mesDestino);
      if (eD) throw eD;

      const jaTem = new Set(((destino ?? []) as unknown as Pick<Post, 'semana' | 'titulo'>[]).map((d) => `${d.semana}|${d.titulo}`));
      const novos = ((origem ?? []) as unknown as Post[])
        .filter((o) => !jaTem.has(`${o.semana}|${o.titulo}`))
        .map((o) => ({
          cliente_id: p.clienteId,
          mes_referencia: p.mesDestino,
          semana: o.semana,
          titulo: o.titulo,
          descricao: o.descricao,
          formato: o.formato,
          dia_postagem: mesmoDiaEmOutroMes(o.dia_postagem, p.mesDestino),
          link_drive: null,
          visivel_cliente: false,
          etapa: 'em_edicao',
        }));
      if (novos.length === 0) return 0;
      const { error } = await supabase.from('conteudo_aprovacao').insert(novos as never);
      if (error) throw error;
      return novos.length;
    },
    onSuccess: invalidar,
  });
}

/** Lembrete manual: reenvia o link ao cliente e zera o relógio do lembrete automático. */
export function useLembrarCliente() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (p: {
      clienteId: string; clienteNome: string; slug: string | null | undefined;
      mes: string; ids: string[];
    }) => {
      if (!p.slug) throw new Error('Este cliente ainda não tem link público.');
      if (p.ids.length === 0) throw new Error('Não há conteúdos aguardando aprovação.');
      const texto = mensagemLembrete({
        clienteNome: p.clienteNome, qtd: p.ids.length, link: linkAprovacao(p.slug, p.mes),
      });
      const { error } = await supabase.functions.invoke('enviar-aviso-whatsapp', {
        body: { cliente_id: p.clienteId, texto },
      });
      if (error) throw new Error(await erroDaFuncao(error));
      await supabase
        .from('conteudo_aprovacao')
        .update({ lembrete_em: new Date().toISOString() } as never)
        .in('id', p.ids);
    },
    onSuccess: invalidar,
  });
}
