import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';
import { useConversas, useOperadores, useInboxRealtime } from '@/modules/crm/api/atendimentoApi';
import type { FiltroInbox, CrmConversa } from '@/modules/crm/types';
import { ETAPAS_ATIVAS } from '@/modules/crm/types';
import { InboxSidebar } from './InboxSidebar';
import { InboxLista } from './InboxLista';
import { InboxConversa } from './InboxConversa';
import { useInboxBadge } from '@/modules/crm/hooks/useInboxBadge';
import { useNotificacoesCrm } from '@/modules/crm/api/notificacoesApi';

interface Props {
  onIrParaFunil: (leadId: string) => void;
}

// Contagens sobre a lista COMPLETA (sem filtro principal aplicado). Usadas
// para mostrar os badges de "quantas em cada categoria".
function contarPorFiltro(todas: CrmConversa[]): Record<FiltroInbox, number> {
  const agora = Date.now();
  // "Sem resposta há 3+ dias" — usado tanto no filtro da sidebar quanto pra
  // pintar o chip de follow-up na lista.
  const tresDiasMs = 3 * 24 * 60 * 60 * 1000;
  const c = { todas: 0, nao_lidas: 0, fixadas: 0, grupos: 0, sem_resposta: 0, arquivadas: 0 };
  for (const x of todas) {
    if (x.arquivado) { c.arquivadas++; continue; }
    c.todas++;
    if (x.nao_lidas > 0) c.nao_lidas++;
    if (x.fixado) c.fixadas++;
    if (x.is_grupo) c.grupos++;
    if (
      ETAPAS_ATIVAS.includes(x.etapa as (typeof ETAPAS_ATIVAS)[number]) &&
      x.ultima_saida_em &&
      agora - new Date(x.ultima_saida_em).getTime() >= tresDiasMs
    ) {
      c.sem_resposta++;
    }
  }
  return c;
}

export function AtendimentoTab({ onIrParaFunil }: Props) {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filtro, setFiltro] = useState<FiltroInbox>('todas');
  const [atendente, setAtendente] = useState<string | 'todas' | 'nao_atribuidas'>('todas');
  const [busca, setBusca] = useState('');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(searchParams.get('leadId'));

  useInboxRealtime();
  useInboxBadge();
  useNotificacoesCrm();
  const { data: conversasFiltradas, isLoading } = useConversas(filtro, atendente);
  const { data: operadores } = useOperadores();

  // Para os contadores, buscamos separado com filtro "todas".
  const { data: conversasTodas } = useConversas('todas', 'todas');

  const contagens = useMemo(() => contarPorFiltro(conversasTodas ?? []), [conversasTodas]);

  // Busca por nome/telefone dentro do filtro atual.
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return conversasFiltradas ?? [];
    return (conversasFiltradas ?? []).filter(
      (c) => c.nome.toLowerCase().includes(q) || c.telefone.includes(q),
    );
  }, [conversasFiltradas, busca]);

  // Sincroniza seleção com a URL (?leadId=xxx) — permite cross-nav do Kanban.
  useEffect(() => {
    const q = searchParams.get('leadId');
    if (q && q !== selecionadaId) setSelecionadaId(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function selecionar(id: string) {
    setSelecionadaId(id);
    const next = new URLSearchParams(searchParams);
    next.set('leadId', id);
    setSearchParams(next, { replace: true });
  }

  const conversaAberta = filtradas.find((c) => c.id === selecionadaId)
    ?? (conversasTodas ?? []).find((c) => c.id === selecionadaId)
    ?? null;

  return (
    <div className="flex h-full min-h-0 gap-3 p-3">
      <InboxSidebar
        filtro={filtro}
        atendente={atendente}
        operadores={operadores ?? []}
        contagens={contagens}
        meuId={profile?.id ?? null}
        onFiltro={setFiltro}
        onAtendente={setAtendente}
      />

      <div className="flex min-w-0 flex-1 gap-4">
        <InboxLista
          conversas={filtradas}
          isLoading={isLoading}
          buscaTexto={busca}
          selecionadaId={selecionadaId}
          onBuscar={setBusca}
          onSelecionar={selecionar}
        />

        <div className="hidden min-w-0 flex-1 border-l border-white/5 pl-4 md:flex">
          {conversaAberta ? (
            <InboxConversa
              key={conversaAberta.id}
              conversa={conversaAberta}
              onIrParaFunil={() => onIrParaFunil(conversaAberta.id)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-500">
              <div>
                <div className="mb-2 text-3xl">💬</div>
                Selecione uma conversa à esquerda
                <div className="mt-1 text-xs text-slate-600">
                  Mensagens novas do WhatsApp aparecem aqui em tempo real
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
