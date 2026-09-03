import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { pillarInfo, type PillarKey } from '@/shared/lib/pillars';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';

function hojeIso(): string { return new Date().toISOString().slice(0, 10); }

interface AgendaHojeEvento {
  id: string; titulo: string; hora: string; duracao_min: number;
  clientes: string[]; pilares: PillarKey[]; status: string;
}
function useAgendaHoje() {
  return useQuery({
    queryKey: ['agenda-hoje', hojeIso()],
    queryFn: async (): Promise<AgendaHojeEvento[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase.from('agenda_events')
        .select('id, titulo, hora, duracao_min, clientes, pilares, status')
        .eq('data', hojeIso())
        .order('hora');
      if (error) throw error;
      return (data ?? []) as AgendaHojeEvento[];
    },
  });
}

interface SolicitacaoPendente {
  id: string; texto: string; origem_em: string;
  crm_leads?: { nome: string } | null;
}
function useSolicitacoesPendentes() {
  return useQuery({
    queryKey: ['solicitacoes-hoje'],
    queryFn: async (): Promise<SolicitacaoPendente[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase.from('client_requests')
        .select('id, texto, origem_em, crm_leads(nome)')
        .eq('status', 'pendente')
        .order('origem_em')
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as SolicitacaoPendente[];
    },
  });
}

interface ContratoExpirando {
  id: string; titulo: string; razao_social: string | null; end_date: string;
}
function useContratosExpirando() {
  return useQuery({
    queryKey: ['contratos-expirando'],
    queryFn: async (): Promise<ContratoExpirando[]> => {
      if (IS_DEMO) return [];
      const em30 = new Date(); em30.setDate(em30.getDate() + 30);
      const { data, error } = await supabase.from('contracts')
        .select('id, titulo, razao_social, end_date')
        .eq('status', 'assinado')
        .not('end_date', 'is', null)
        .lte('end_date', em30.toISOString().slice(0, 10))
        .gte('end_date', hojeIso())
        .order('end_date')
        .limit(10);
      if (error) throw error;
      return (data ?? []) as ContratoExpirando[];
    },
  });
}

function tempoAtras(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function PainelHoje() {
  const { data: agenda }        = useAgendaHoje();
  const { data: solicitacoes }  = useSolicitacoesPendentes();
  const { data: contratos }     = useContratosExpirando();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Agenda de hoje */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">📅 Agenda de hoje</h3>
          <Link to="/agenda" className="text-[11px] text-brand-300 hover:underline">Abrir agenda</Link>
        </div>
        {!agenda ? <div className="h-10" /> : agenda.length === 0 ? (
          <EmptyState message="Sem compromissos hoje." />
        ) : (
          <ul className="space-y-1.5">
            {agenda.map((e) => (
              <li key={e.id} className="rounded-md border border-white/5 bg-white/[0.02] p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400">{e.hora.slice(0, 5)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-100">{e.titulo}</span>
                  <div className="flex shrink-0 gap-0.5">
                    {e.pilares.map((p) => <span key={p} title={pillarInfo(p).label}>{pillarInfo(p).icone}</span>)}
                  </div>
                </div>
                {e.status !== 'agendado' && <Badge tone={e.status === 'concluido' ? 'green' : 'slate'}>{e.status}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Solicitações do Agente Turbo */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">🤖 Solicitações pendentes</h3>
          <Link to="/crm?tab=solicitacoes" className="text-[11px] text-brand-300 hover:underline">Ver todas</Link>
        </div>
        {!solicitacoes ? <div className="h-10" /> : solicitacoes.length === 0 ? (
          <EmptyState message="Nenhuma solicitação pendente." />
        ) : (
          <ul className="space-y-1.5">
            {solicitacoes.map((s) => (
              <li key={s.id} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-100">{s.crm_leads?.nome ?? '—'}</span>
                  <span className="shrink-0 text-[10px] text-amber-300">há {tempoAtras(s.origem_em)}</span>
                </div>
                <div className="line-clamp-2 text-slate-300">{s.texto}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Contratos expirando */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">📋 Contratos expirando (30d)</h3>
          <Link to="/contratos" className="text-[11px] text-brand-300 hover:underline">Ver contratos</Link>
        </div>
        {!contratos ? <div className="h-10" /> : contratos.length === 0 ? (
          <EmptyState message="Nenhum contrato vence nos próximos 30 dias." />
        ) : (
          <ul className="space-y-1.5">
            {contratos.map((k) => (
              <li key={k.id} className="rounded-md border border-white/5 bg-white/[0.02] p-2 text-xs">
                <div className="truncate font-medium text-slate-100">{k.razao_social || k.titulo}</div>
                <div className="text-[11px] text-slate-500">
                  Termina em {new Date(k.end_date).toLocaleDateString('pt-BR')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
