import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { useAuth } from '@/shared/auth/AuthProvider';
import type { ConteudoTipo } from '@/modules/conteudo/types';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import type { DesignerTipo } from '@/modules/designer/api/demandasApi';

export interface IdeiaBanco {
  id: string;
  cliente_id: string;
  titulo: string;
  descricao: string;
  formato: ConteudoTipo;
  anexos: CriativoAnexo[];
  usada_em: string | null;
  usada_semana: string | null;
  created_at: string;
}

export type IdeiaBancoForm = Pick<IdeiaBanco, 'titulo' | 'descricao' | 'formato' | 'anexos'>;

// A tabela ainda não está no tipo gerado do Supabase (database.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = () => (supabase as any).from('ideias_banco');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabelaDesigner = () => (supabase as any).from('designer_demandas');

const KEY = ['gestao-conteudo', 'banco'] as const;

export function useBancoIdeias(clienteId: string) {
  return useQuery({
    queryKey: [...KEY, clienteId] as const,
    queryFn: async (): Promise<IdeiaBanco[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await tabela()
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IdeiaBanco[];
    },
  });
}

export function useSalvarIdeiaBanco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; clienteId: string; dados: IdeiaBancoForm }) => {
      if (IS_DEMO) return;
      if (p.id) {
        const { error } = await tabela().update(p.dados).eq('id', p.id);
        if (error) throw error;
      } else {
        const { error } = await tabela().insert({ ...p.dados, cliente_id: p.clienteId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useExcluirIdeiaBanco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) return;
      const { error } = await tabela().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

const tipoDesigner = (f: ConteudoTipo): DesignerTipo =>
  (f === 'reels' ? 'reels' : f === 'carrossel' ? 'carrossel' : 'post');

/** Copia os anexos no storage: apagar a demanda depois não pode levar embora os arquivos da ideia. */
async function copiarAnexos(anexos: CriativoAnexo[]): Promise<CriativoAnexo[]> {
  if (IS_DEMO) return anexos;
  const copias: CriativoAnexo[] = [];
  for (const a of anexos) {
    const nome = a.path.split('/').pop() ?? a.name;
    const novoPath = `_/${crypto.randomUUID()}-${nome.replace(/^[0-9a-f-]{36}-/, '')}`;
    const { error } = await supabase.storage.from('anexos-internos').copy(a.path, novoPath);
    if (error) throw error;
    copias.push({ ...a, path: novoPath });
  }
  return copias;
}

/**
 * Aplica a ideia numa semana: cria a demanda "A fazer" no Designer (na semana escolhida)
 * e marca a ideia como usada.
 */
export function useAplicarIdeiaBanco() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (p: { ideia: IdeiaBanco; semanaIni: string }) => {
      if (IS_DEMO) return;
      const anexos = await copiarAnexos(p.ideia.anexos ?? []);
      const { error } = await tabelaDesigner().insert({
        cliente_id: p.ideia.cliente_id,
        titulo: p.ideia.titulo,
        briefing: p.ideia.descricao.trim() || null,
        tipo: tipoDesigner(p.ideia.formato),
        status: 'a_fazer',
        origem: 'manual',
        semana_ref: p.semanaIni,
        anexos,
        criado_por: profile?.id ?? null,
      });
      if (error) throw error;
      const { error: eUp } = await tabela()
        .update({ usada_em: new Date().toISOString(), usada_semana: p.semanaIni })
        .eq('id', p.ideia.id);
      if (eUp) throw eUp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['designer'] });
    },
  });
}
