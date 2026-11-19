import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/auth/AuthProvider';
import { textoPuro } from '@/shared/ui/texto-rico/regras';
import { semanasRotuladas } from '@/modules/gestao-conteudo/lib/semanas';
import { SEMANA_EXTRA, type Ideia } from '@/modules/gestao-conteudo/types';
import type { DesignerTipo } from '@/modules/designer/api/demandasApi';

const DESIGNER_NOME = 'Gabriel';

function tipoDaIdeia(formato: string): DesignerTipo {
  if (formato === 'reels') return 'reels';
  if (formato === 'carrossel') return 'carrossel';
  return 'post';
}

/** Briefing interno para o designer: descrição, direção criativa e cenas (nada disso vai ao cliente). */
function briefingDaIdeia(i: Ideia): string {
  const partes: string[] = [];
  const desc = textoPuro(i.descricao).trim();
  if (desc) partes.push(desc);
  const como = textoPuro(i.como_aplicar).trim();
  if (como) partes.push(`Como aplicar: ${como}`);
  (i.cenas ?? []).forEach((c, n) => {
    const linhas = [`Cena ${n + 1}: ${c.acontece}`];
    if (c.fala) linhas.push(`Fala: ${c.fala}`);
    if (c.audio) linhas.push(`Áudio: ${c.audio}`);
    if (c.foto_apoio) linhas.push('Usar foto de apoio');
    partes.push(linhas.join('\n'));
  });
  return partes.join('\n\n');
}

export interface ResultadoEnvioDesigner { criadas: number; jaExistiam: number }

/** Cria uma demanda "A fazer" para o designer (Gabriel) por item da linha editorial. Não repete item já enviado. */
export function useEnviarParaDesigner() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (v: { clienteId: string; mes: string; itens: Ideia[] }): Promise<ResultadoEnvioDesigner> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (tabela: string) => (supabase.from as any)(tabela);
      const { data: gab } = await db('profiles').select('id').ilike('nome', `${DESIGNER_NOME}%`).limit(1);
      const responsavelId = (gab?.[0]?.id as string | undefined) ?? null;

      const { data: existentes, error: eEx } = await db('designer_demandas')
        .select('ideia_id').in('ideia_id', v.itens.map((i) => i.id));
      if (eEx) throw eEx;
      const jaTem = new Set((existentes ?? []).map((e: { ideia_id: string }) => e.ideia_id));
      const novos = v.itens.filter((i) => !jaTem.has(i.id));
      if (novos.length === 0) return { criadas: 0, jaExistiam: v.itens.length };

      const semanas = semanasRotuladas(v.mes);
      const linhas = novos.map((i) => ({
        cliente_id: v.clienteId,
        titulo: i.titulo,
        briefing: briefingDaIdeia(i) || null,
        tipo: tipoDaIdeia(i.formato),
        categoria: 'organico',
        status: 'a_fazer',
        origem: 'ideia_aprovada',
        ideia_id: i.id,
        responsavel_id: responsavelId,
        semana_ref: i.semana === SEMANA_EXTRA ? null : semanas.find((s) => s.numero === i.semana)?.ini ?? null,
        prazo: i.dia_postagem ?? null,
        criado_por: profile?.id ?? null,
      }));
      const { error } = await db('designer_demandas').insert(linhas);
      if (error) throw error;
      return { criadas: novos.length, jaExistiam: v.itens.length - novos.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designer'] }),
  });
}

/** Ids das ideias que já viraram demanda do designer (para marcar "Enviada p/ designer"). */
export function useIdeiasNoDesigner(ids: string[]) {
  return useQuery({
    queryKey: ['designer', 'ideias-enviadas', ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('designer_demandas').select('ideia_id').in('ideia_id', ids);
      if (error) throw error;
      return new Set((data ?? []).map((d: { ideia_id: string }) => d.ideia_id));
    },
  });
}
