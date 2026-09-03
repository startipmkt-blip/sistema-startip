import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCrmLeads, useEtapasCrm, useMoverLeadEtapa } from '@/modules/crm/api/crmApi';
import {
  CRM_ETIQUETAS,
  etiquetaInfo,
  type CrmLead,
} from '@/modules/crm/types';
import { FunilChart } from '@/modules/crm/components/FunilChart';
import { LeadFormModal } from '@/modules/crm/components/LeadFormModal';
import { LeadConversasModal } from '@/modules/crm/components/LeadConversasModal';
import { GerenciarEtapasModal } from '@/modules/crm/components/GerenciarEtapasModal';
import { AtendimentoTab } from '@/modules/crm/components/atendimento/AtendimentoTab';
import { ContatosTab } from '@/modules/crm/components/contatos/ContatosTab';
import { SolicitacoesTab } from '@/modules/crm/components/solicitacoes/SolicitacoesTab';
import { KanbanCard } from '@/modules/crm/components/KanbanCard';
import { exportarLeadsCsv, exportarPdf } from '@/modules/crm/lib/exportLeads';
import { ClienteFormModal } from '@/modules/clientes/components/ClienteFormModal';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { StatCard } from '@/shared/ui/StatCard';
import { KanbanBoard } from '@/shared/ui/KanbanBoard';
import { formatMoney } from '@/shared/lib/format';

type Sub = 'atendimento' | 'solicitacoes' | 'leads' | 'funil' | 'contatos';

// Ordem exibida das abas (nesta ordem também é o default se não vier na URL).
const ABAS: { id: Sub; label: string; icone: string }[] = [
  { id: 'atendimento',  label: 'Atendimento',  icone: '💬' },
  { id: 'solicitacoes', label: 'Solicitações', icone: '🤖' },
  { id: 'leads',        label: 'Leads',        icone: '📇' },
  { id: 'funil',        label: 'Funil',        icone: '📊' },
  { id: 'contatos',     label: 'Contatos',     icone: '👥' },
];

// Modo tela cheia por padrão: ao entrar no CRM, o header padrão da AppShell
// continua, mas o corpo do CRM esconde qualquer "chrome" e ocupa todo o
// espaço disponível para maximizar conversas/kanban.

export function CrmPage() {
  const navigate = useNavigate();
  const { data: leads, isLoading } = useCrmLeads('');
  const { data: etapas } = useEtapasCrm();
  const moverLead = useMoverLeadEtapa();
  const todos = useMemo(() => leads ?? [], [leads]);
  const colunas = etapas ?? [];

  const [searchParams, setSearchParams] = useSearchParams();
  const tabInicial = (searchParams.get('tab') as Sub) || 'atendimento';
  const [sub, setSubState] = useState<Sub>(
    ABAS.some((a) => a.id === tabInicial) ? tabInicial : 'atendimento',
  );
  function setSub(next: Sub, extra?: Record<string, string>) {
    setSubState(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
    if (next !== 'atendimento') params.delete('leadId');
    setSearchParams(params, { replace: true });
  }

  const [etiqueta, setEtiqueta] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [etapasOpen, setEtapasOpen] = useState(false);
  const [conversaLead, setConversaLead] = useState<CrmLead | null>(null);
  const [editando, setEditando] = useState<CrmLead | undefined>();
  // Leads que viram cliente: guardamos o pré-preenchimento pra abrir o modal
  // de novo cliente com nome/telefone já prontos.
  const [converterLead, setConverterLead] = useState<CrmLead | null>(null);

  // Métricas do funil.
  const contatos = todos.length;
  const ganhos = todos.filter((l) => l.etapa === 'ganho');
  const receitaTotal = ganhos.reduce((s, l) => s + l.valor, 0);
  const taxaConversao = contatos ? (ganhos.length / contatos) * 100 : 0;
  const receitaMediaAba = receitaTotal / Math.max(1, colunas.length);

  const funilEtapas = colunas
    .filter((e) => e.id !== 'perdido')
    .map((e) => ({ label: e.label, count: todos.filter((l) => l.etapa === e.id).length }));

  const filtrados = etiqueta ? todos.filter((l) => l.etiquetas.includes(etiqueta)) : todos;

  return (
    // -m-4 sm:-m-6 cancela o padding do <main> da AppShell → ocupa tela cheia.
    // A altura calc(100vh - 4rem) descarta a altura do Topbar (h-16).
    <div className="-m-4 flex h-[calc(100vh-4rem)] flex-col bg-slate-950/40 sm:-m-6">
      {/* Barra superior compacta — voltar + abas + ações */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-2">
        <button
          onClick={() => navigate('/inicio')}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-white/5"
          title="Voltar ao início"
        >
          ← Voltar
        </button>
        <span className="mr-2 text-sm font-semibold text-white">CRM da agência</span>

        <nav className="flex flex-wrap gap-1">
          {ABAS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sub === t.id
                  ? 'bg-brand-500/15 text-brand-200'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <span aria-hidden>{t.icone}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {sub === 'leads' && (
            <>
              <Button variant="secondary" onClick={() => exportarLeadsCsv(todos)}>
                ⬇️ Excel
              </Button>
              <Button variant="secondary" onClick={exportarPdf}>
                📄 PDF
              </Button>
              <Button variant="secondary" onClick={() => setEtapasOpen(true)}>
                Etapas
              </Button>
            </>
          )}
          <Button onClick={() => { setEditando(undefined); setFormOpen(true); }}>
            + Novo lead
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {sub === 'atendimento' && (
          <AtendimentoTab
            onIrParaFunil={() => setSub('leads')}
          />
        )}

        {sub === 'solicitacoes' && (
          <SolicitacoesTab
            onAbrirConversa={(id) => setSub('atendimento', { leadId: id })}
          />
        )}

        {sub === 'contatos' && (
          <ContatosTab
            leads={todos}
            onAbrirConversa={(id) => setSub('atendimento', { leadId: id })}
            onEditarLead={(l) => { setEditando(l); setFormOpen(true); }}
            onNovoContato={() => { setEditando(undefined); setFormOpen(true); }}
            onConverterCliente={(l) => setConverterLead(l)}
          />
        )}

        {sub === 'funil' && (
          <div className="h-full space-y-4 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Contatos" value={String(contatos)} tone="slate" />
              <StatCard label="Taxa de conversão por contato" value={`${taxaConversao.toFixed(2)}%`} tone="blue" />
              <StatCard label="Receita média por aba" value={formatMoney(receitaMediaAba)} tone="slate" />
              <StatCard label="Receita total" value={formatMoney(receitaTotal)} tone="green" />
            </div>
            <Card className="p-5">
              <h2 className="mb-2 text-sm font-semibold text-slate-200">Funil de Vendas</h2>
              <FunilChart etapas={funilEtapas} />
            </Card>
          </div>
        )}

        {sub === 'leads' && (
          <div className="h-full space-y-3 overflow-y-auto p-4">
            {/* Filtro por etiqueta */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Etiquetas:</span>
              <button
                onClick={() => setEtiqueta('')}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  etiqueta === '' ? 'bg-brand-600 text-white' : 'bg-white/10 text-slate-300'
                }`}
              >
                Todas
              </button>
              {CRM_ETIQUETAS.map((et) => (
                <button
                  key={et.id}
                  onClick={() => setEtiqueta(et.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    etiqueta === et.id ? 'bg-brand-600 text-white' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {et.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <Card className="flex justify-center p-12"><Spinner /></Card>
            ) : (
              <KanbanBoard<CrmLead>
                columns={colunas}
                items={filtrados}
                columnOf={(l) => l.etapa}
                keyOf={(l) => l.id}
                onMove={(l, novaEtapa) => moverLead.mutate({ id: l.id, etapa: novaEtapa })}
                renderCard={(l) => (
                  <KanbanCard
                    lead={l}
                    onEtiquetaInfo={etiquetaInfo}
                    onAbrirConversa={() => setSub('atendimento', { leadId: l.id })}
                    onEditar={() => setConversaLead(l)}
                    onConverterCliente={() => setConverterLead(l)}
                  />
                )}
              />
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} lead={editando} />
      )}
      <GerenciarEtapasModal open={etapasOpen} onClose={() => setEtapasOpen(false)} />

      {conversaLead && (
        <LeadConversasModal
          open={conversaLead !== null}
          onClose={() => setConversaLead(null)}
          lead={conversaLead}
          onEditar={() => {
            setEditando(conversaLead);
            setConversaLead(null);
            setFormOpen(true);
          }}
        />
      )}

      {converterLead && (
        <ClienteFormModal
          open={true}
          onClose={() => setConverterLead(null)}
          preencher={{
            nome: converterLead.nome,
            // O telefone do lead vai como observação de contato; ClienteFormModal
            // hoje não tem campo telefone — mostramos o dado no nome/logo pra
            // memória enquanto o modal de cliente não estender esse campo.
          }}
        />
      )}
    </div>
  );
}
