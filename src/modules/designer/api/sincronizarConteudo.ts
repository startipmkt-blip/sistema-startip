import { supabase } from '@/shared/lib/supabaseClient';
import { mesDaSemana, posicaoDaDemanda, semanaDe } from '../lib/periodo';
import type { DesignerStatus, DesignerTipo } from './demandasApi';
import type { ConteudoTipo } from '@/modules/conteudo/types';

// Status do designer que espelham a demanda em gestao-conteudo (editado,
// pronto para o gestor enviar ao cliente). Mover para outro status não
// desfaz o post espelho — o gestor pode já ter mexido nele.
const STATUS_ESPELHO: ReadonlySet<DesignerStatus> = new Set(['aprovacao', 'concluido']);

function formatoDaDemanda(tipo: DesignerTipo): ConteudoTipo {
  if (tipo === 'reels') return 'reels';
  if (tipo === 'carrossel') return 'carrossel';
  return 'estatico';
}

/**
 * Garante que a demanda tenha um post correspondente em conteudo_aprovacao
 * quando ela está em "aguardando aprovação" ou "concluída". Idempotente:
 * usa designer_demanda_id como chave. Falha silenciosamente — a demanda não
 * deve ser desfeita se o espelho não grudar.
 */
export async function sincronizarGestaoConteudo(demandaId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from as any)('designer_demandas')
      .select('id, cliente_id, titulo, descricao, briefing, tipo, status, prazo, concluido_em, created_at')
      .eq('id', demandaId)
      .maybeSingle();
    if (error || !data) return;
    if (!data.cliente_id) return;
    if (!STATUS_ESPELHO.has(data.status as DesignerStatus)) return;

    const pos = posicaoDaDemanda({
      status: data.status,
      concluido_em: data.concluido_em,
      prazo: data.prazo,
      created_at: data.created_at,
    });
    const mes = mesDaSemana(pos.ref);
    const semana = semanaDe(mes, pos.ref).numero;
    const formato = formatoDaDemanda(data.tipo as DesignerTipo);
    const descricao = (data.descricao ?? data.briefing ?? '') as string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tbl = (supabase.from as any)('conteudo_aprovacao');
    const { data: existente, error: eSel } = await tbl
      .select('id, etapa')
      .eq('designer_demanda_id', demandaId)
      .maybeSingle();
    if (eSel) return;

    if (existente) {
      // Repassa só dados editoriais; etapa continua a que o gestor escolheu — exceto peça
      // reprovada pelo cliente e refeita: volta a "editado", pronta para reenviar.
      const refeita = existente.etapa === 'reprovado'
        ? { etapa: 'editado', status: 'pendente', visivel_cliente: false, enviado_em: null, decidido_em: null, justificativa: '' }
        : {};
      await tbl
        .update({
          titulo: data.titulo,
          descricao,
          formato,
          mes_referencia: mes,
          semana,
          ...refeita,
        })
        .eq('id', existente.id);
    } else {
      await tbl.insert({
        cliente_id: data.cliente_id,
        mes_referencia: mes,
        semana,
        titulo: data.titulo,
        descricao,
        formato,
        link_drive: null,
        visivel_cliente: false,
        etapa: 'editado',
        status: 'pendente',
        designer_demanda_id: demandaId,
      });
    }
  } catch (e) {
    console.error('Falha ao espelhar demanda em gestao-conteudo:', e);
  }
}
