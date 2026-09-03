// =============================================================
// atendimentoApi.ts — hooks da aba "Atendimento" do CRM.
// =============================================================
// Consumidos por: componentes InboxSidebar, InboxLista, InboxConversa.
// Persistência: view public.crm_conversas + tabelas crm_leads/crm_mensagens.
// Realtime: assinaturas em crm_mensagens (mensagem nova cai sem F5) e
// crm_leads (mudança de etapa, atribuição, fixar/arquivar entre operadores).
// =============================================================
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { CrmConversa, FiltroInbox } from '@/modules/crm/types';
import { ETAPAS_ATIVAS } from '@/modules/crm/types';

// ---------- Chaves ----------
const inboxKeys = {
  all: ['atendimento'] as const,
  conversas: (filtro: FiltroInbox, atendente: string | 'todas' | 'nao_atribuidas') =>
    ['atendimento', 'conversas', filtro, atendente] as const,
  operadores: ['atendimento', 'operadores'] as const,
};

// ---------- Seeds do modo demo ----------
type SeedConversa = CrmConversa & { _demo: true };
const demoConversas: SeedConversa[] = [
  {
    _demo: true,
    id: 'l1', nome: 'João Souza', empresa: 'Restaurante Sabor', telefone: '5511988881111',
    origem: 'Instagram', etapa: 'novo', etiquetas: ['qualificada'], valor: 1200,
    atendente_id: null, atendente_nome: null, fixado: true, arquivado: false, is_grupo: false,
    created_at: '2026-08-25T10:00:00Z',
    ultima_mensagem: 'Tenho um restaurante. Quanto fica por mês?', ultima_direcao: 'recebida',
    ultima_em: '2026-08-27T09:12:00Z', ultima_saida_em: '2026-08-24T10:05:00Z', nao_lidas: 2,
  },
  {
    _demo: true,
    id: 'l2', nome: 'Maria Lima', empresa: 'Clínica Bem Estar', telefone: '5511977772222',
    origem: 'WhatsApp', etapa: 'contato', etiquetas: ['reuniao'], valor: 900,
    atendente_id: 'u-iuri', atendente_nome: 'Iuri Pacheco', fixado: false, arquivado: false, is_grupo: false,
    created_at: '2026-08-25T10:00:00Z',
    ultima_mensagem: 'Bom dia Maria! Podemos sim, quinta às 15h te atende?', ultima_direcao: 'enviada',
    ultima_em: '2026-08-27T09:10:00Z', ultima_saida_em: '2026-08-27T09:10:00Z', nao_lidas: 0,
  },
  {
    _demo: true,
    id: 'l3', nome: 'Grupo Fornecedores', empresa: null, telefone: '120363TEST-group',
    origem: 'WhatsApp', etapa: 'contato', etiquetas: [], valor: 0,
    atendente_id: null, atendente_nome: null, fixado: false, arquivado: false, is_grupo: true,
    created_at: '2026-08-24T10:00:00Z',
    ultima_mensagem: 'Chegou pedido novo, alguém consegue?', ultima_direcao: 'recebida',
    ultima_em: '2026-08-27T08:00:00Z', ultima_saida_em: null, nao_lidas: 5,
  },
];

// ---------- Filtragem no cliente (demo E produção) ----------
function aplicaFiltro(
  linhas: CrmConversa[],
  filtro: FiltroInbox,
  atendente: string | 'todas' | 'nao_atribuidas',
): CrmConversa[] {
  const tresDiasMs = 3 * 24 * 60 * 60 * 1000;
  const agora = Date.now();

  return linhas
    .filter((c) => {
      // Atendente
      if (atendente === 'nao_atribuidas' && c.atendente_id) return false;
      if (atendente !== 'todas' && atendente !== 'nao_atribuidas' && c.atendente_id !== atendente) {
        return false;
      }
      // Filtro principal
      switch (filtro) {
        case 'arquivadas': return c.arquivado;
        case 'nao_lidas': return !c.arquivado && c.nao_lidas > 0;
        case 'grupos':    return !c.arquivado && c.is_grupo;
        case 'fixadas':   return !c.arquivado && c.fixado;
        case 'sem_resposta': {
          if (c.arquivado) return false;
          if (!ETAPAS_ATIVAS.includes(c.etapa as (typeof ETAPAS_ATIVAS)[number])) return false;
          const ultima = c.ultima_saida_em ? new Date(c.ultima_saida_em).getTime() : 0;
          return ultima > 0 && agora - ultima >= tresDiasMs;
        }
        case 'todas':
        default:
          return !c.arquivado;
      }
    })
    .sort((a, b) => {
      // Fixadas sempre no topo. Depois por data da última mensagem desc.
      if (a.fixado !== b.fixado) return a.fixado ? -1 : 1;
      const ta = a.ultima_em ? new Date(a.ultima_em).getTime() : 0;
      const tb = b.ultima_em ? new Date(b.ultima_em).getTime() : 0;
      return tb - ta;
    });
}

async function fetchConversas(
  filtro: FiltroInbox,
  atendente: string | 'todas' | 'nao_atribuidas',
): Promise<CrmConversa[]> {
  if (IS_DEMO) return aplicaFiltro(demoConversas, filtro, atendente);
  const { data, error } = await supabase.from('crm_conversas').select('*').limit(500);
  if (error) throw error;
  return aplicaFiltro((data ?? []) as unknown as CrmConversa[], filtro, atendente);
}

export function useConversas(
  filtro: FiltroInbox,
  atendente: string | 'todas' | 'nao_atribuidas',
) {
  return useQuery({
    queryKey: inboxKeys.conversas(filtro, atendente),
    queryFn: () => fetchConversas(filtro, atendente),
  });
}

/**
 * Deve ser chamado UMA VEZ pelo componente-container da inbox. Assina o
 * Realtime do Supabase e invalida o cache da inbox quando alguma mensagem
 * ou lead muda. Chamar duas vezes causa "cannot add postgres_changes
 * callbacks after subscribe()" — o canal com o mesmo nome é reutilizado
 * pelo cliente do Supabase e o segundo .on() falha.
 */
export function useInboxRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    if (IS_DEMO) return;
    // Nome único garante que subscribes concorrentes não colidam.
    const canal = supabase
      .channel(`atendimento-inbox-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_mensagens' }, () => {
        qc.invalidateQueries({ queryKey: inboxKeys.all });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
        qc.invalidateQueries({ queryKey: inboxKeys.all });
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [qc]);
}

// ---------- Mutations no lead (fixar/arquivar/atribuir/etapa) ----------
async function patchLead(leadId: string, patch: Partial<CrmConversa>): Promise<void> {
  if (IS_DEMO) {
    const c = demoConversas.find((x) => x.id === leadId);
    if (c) Object.assign(c, patch);
    return;
  }
  const { error } = await supabase
    .from('crm_leads')
    .update(patch as never)
    .eq('id', leadId);
  if (error) throw error;
}

export function useFixarConversa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; fixado: boolean }) => patchLead(p.leadId, { fixado: p.fixado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.all }),
  });
}
export function useArquivarConversa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; arquivado: boolean }) => patchLead(p.leadId, { arquivado: p.arquivado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.all }),
  });
}
export function useAtribuirConversa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; atendenteId: string | null }) =>
      patchLead(p.leadId, { atendente_id: p.atendenteId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.all }),
  });
}
export function useMudarEtapa() {
  // Reutilizada tanto pela inbox quanto pelo Kanban — muda a coluna do funil.
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; etapa: string }) => patchLead(p.leadId, { etapa: p.etapa }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inboxKeys.all });
      qc.invalidateQueries({ queryKey: ['crm'] });
    },
  });
}

// ---------- Marcar como lida ----------
export function useMarcarLida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      if (IS_DEMO) {
        const c = demoConversas.find((x) => x.id === leadId);
        if (c) c.nao_lidas = 0;
        return;
      }
      const { error } = await supabase
        .from('crm_mensagens')
        .update({ lida: true } as never)
        .eq('lead_id', leadId)
        .eq('direcao', 'recebida')
        .eq('lida', false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.all }),
  });
}

// ---------- Operadores disponíveis (equipe ativa) ----------
export interface Operador { id: string; nome: string; }

async function fetchOperadores(): Promise<Operador[]> {
  if (IS_DEMO) {
    return [
      { id: 'u-iuri',    nome: 'Iuri Pacheco' },
      { id: 'u-dhomini', nome: 'Dhomini Ferrari' },
    ];
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('tipo', 'equipe')
    .eq('status', 'ativo')
    .order('nome');
  if (error) throw error;
  return (data ?? []) as Operador[];
}

export function useOperadores() {
  return useQuery({ queryKey: inboxKeys.operadores, queryFn: fetchOperadores });
}
