import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

// conteudo por (cliente, chave).
export interface DocValor {
  conteudo: string;
  anexo_url?: string | null; // PDF/documento anexado (nome/URL)
  updated_at: string;
}
export type DocsDoCliente = Record<string, DocValor>;

// ---------- Store demo (mutável) ----------
// chave do mapa: `${clienteId}:${chave}`
const demoStore: Record<string, DocValor> = {
  'c1:info': { conteudo: 'Cliente âncora do bairro. Dono muito presente e exigente com atendimento. Responder rápido no WhatsApp e manter tom próximo.', updated_at: '2026-07-28T10:00:00Z' },
  'c1:icp': { conteudo: 'Moradores num raio de 3km da loja. Famílias que valorizam pães e doces artesanais. Ticket médio ~R$45. Canais: Instagram, WhatsApp, Google Maps.', updated_at: '2026-07-28T10:00:00Z' },
  'c1:persona': { conteudo: 'Dona Marta, 52, aposentada. Valoriza tradição e atendimento próximo, compra pão fresco toda manhã. Objeção: preço acima do supermercado.', updated_at: '2026-07-28T10:00:00Z' },
  'c1:dores': { conteudo: 'Mecanismo único: pão artesanal fresco todo dia. Diferencial: atendimento humano e receita da família. Dores do público: falta de tempo para cozinhar, busca por qualidade.', updated_at: '2026-07-28T10:00:00Z' },
  'c2:icp': { conteudo: 'Mulheres 25-45 que compram moda fitness online no Brasil. Ticket médio ~R$180. Canais: Instagram, Meta Ads, Google Shopping.', updated_at: '2026-07-30T10:00:00Z' },
  'c2:persona': { conteudo: 'Juliana Fit, 31, personal trainer. Compra para treinar e revender para alunas. Objeções: frete caro, dúvida no tamanho.', updated_at: '2026-07-30T10:00:00Z' },
  'c3:icp': { conteudo: 'Adultos 30-55 buscando qualidade de vida e reabilitação. Ticket médio ~R$350. Canais: Instagram, indicação, Google.', updated_at: '2026-07-22T10:00:00Z' },
};

async function fetchDocs(clienteId: string): Promise<DocsDoCliente> {
  if (IS_DEMO) {
    const out: DocsDoCliente = {};
    for (const k of Object.keys(demoStore)) {
      const [cid, chave] = k.split(':');
      if (cid === clienteId) out[chave] = demoStore[k];
    }
    return out;
  }
  const { data, error } = await supabase
    .from('cliente_docs')
    .select('chave, conteudo, anexo_url, updated_at')
    .eq('cliente_id', clienteId);
  if (error) throw error;
  const out: DocsDoCliente = {};
  for (const row of (data ?? []) as any[]) {
    out[row.chave] = { conteudo: row.conteudo, anexo_url: row.anexo_url, updated_at: row.updated_at };
  }
  return out;
}

async function saveDoc(clienteId: string, chave: string, valor: { conteudo: string; anexo_url?: string | null }): Promise<void> {
  const agora = new Date().toISOString();
  if (IS_DEMO) {
    demoStore[`${clienteId}:${chave}`] = { conteudo: valor.conteudo, anexo_url: valor.anexo_url ?? null, updated_at: agora };
    return;
  }
  // upsert por (cliente_id, chave)
  const { error } = await supabase
    .from('cliente_docs')
    .upsert({ cliente_id: clienteId, chave, conteudo: valor.conteudo, anexo_url: valor.anexo_url ?? null, updated_at: agora } as never, {
      onConflict: 'cliente_id,chave',
    });
  if (error) throw error;
}

export function useClienteDocs(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['cliente-docs', clienteId],
    queryFn: () => fetchDocs(clienteId as string),
    enabled: Boolean(clienteId),
  });
}

export function useSalvarClienteDoc(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { chave: string; conteudo: string; anexo_url?: string | null }) =>
      saveDoc(clienteId, p.chave, { conteudo: p.conteudo, anexo_url: p.anexo_url }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cliente-docs', clienteId] }),
  });
}
