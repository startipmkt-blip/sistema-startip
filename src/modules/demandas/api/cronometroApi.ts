import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

// Quem pode tocar uma demanda. Os nomes precisam bater com `usuarios.nome` do cronômetro.
export const TOCADORES = ['Dhomini', 'Iuri', 'Gabriel'] as const;
export type Tocador = (typeof TOCADORES)[number];

// O cronômetro vive no mesmo Supabase, mas as tabelas dele não estão no tipo gerado do banco.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type FiltroRegistro = { demanda_id: string } | { usuario_id: string };

// Mesma conta do Timer do cronômetro: tempo total menos o tempo pausado.
async function fecharRegistrosAbertos(filtro: FiltroRegistro): Promise<void> {
  let q = db
    .from('registros_tempo')
    .select('id, inicio, pausado, inicio_pausa, tempo_pausado_total')
    .is('fim', null);
  q = 'demanda_id' in filtro ? q.eq('demanda_id', filtro.demanda_id) : q.eq('usuario_id', filtro.usuario_id);
  const { data, error } = await q;
  if (error) throw error;

  const fim = new Date();
  for (const r of data ?? []) {
    let pausado: number = r.tempo_pausado_total ?? 0;
    if (r.pausado && r.inicio_pausa) {
      pausado += Math.floor((fim.getTime() - new Date(r.inicio_pausa).getTime()) / 1000);
    }
    const bruto = Math.floor((fim.getTime() - new Date(r.inicio).getTime()) / 1000);
    const { error: upErr } = await db
      .from('registros_tempo')
      .update({
        fim: fim.toISOString(),
        duracao_segundos: Math.max(bruto - pausado, 0),
        pausado: false,
        inicio_pausa: null,
        tempo_pausado_total: pausado,
      })
      .eq('id', r.id);
    if (upErr) throw upErr;
  }
}

export async function iniciarTimerDemanda(
  demanda: { id: string; titulo: string },
  tocador: Tocador,
): Promise<void> {
  if (IS_DEMO) return;

  const { data: usuario, error: uErr } = await db
    .from('usuarios')
    .select('id')
    .eq('nome', tocador)
    .maybeSingle();
  if (uErr) throw uErr;
  if (!usuario) throw new Error(`"${tocador}" não está cadastrado no cronômetro.`);

  // O cronômetro só mostra um timer aberto por pessoa: encerra o que estiver rodando.
  await fecharRegistrosAbertos({ usuario_id: usuario.id });
  await fecharRegistrosAbertos({ demanda_id: demanda.id });

  // Tipo de tarefa = título da demanda (cria se ainda não existir).
  const titulo = demanda.titulo.trim();
  const { data: tipo, error: tErr } = await db
    .from('tipos_tarefa')
    .upsert({ nome: titulo }, { onConflict: 'nome' })
    .select('id')
    .single();
  if (tErr) throw tErr;

  const { error } = await db.from('registros_tempo').insert({
    usuario_id: usuario.id,
    tipo_tarefa_id: tipo.id,
    descricao: titulo,
    inicio: new Date().toISOString(),
    demanda_id: demanda.id,
  });
  if (error) throw error;
}

export async function pararTimerDemanda(demandaId: string): Promise<void> {
  if (IS_DEMO) return;
  await fecharRegistrosAbertos({ demanda_id: demandaId });
}

// Mapa demanda_id -> nome de quem está com o timer rodando.
export function useTocadoresAtivos() {
  return useQuery({
    queryKey: ['cronometro', 'ativos'],
    queryFn: async (): Promise<Record<string, string>> => {
      if (IS_DEMO) return {};
      const { data, error } = await db
        .from('registros_tempo')
        .select('demanda_id, usuarios(nome)')
        .is('fim', null)
        .not('demanda_id', 'is', null);
      if (error) throw error;
      const mapa: Record<string, string> = {};
      for (const r of data ?? []) mapa[r.demanda_id] = r.usuarios?.nome ?? '';
      return mapa;
    },
    retry: false,
  });
}
