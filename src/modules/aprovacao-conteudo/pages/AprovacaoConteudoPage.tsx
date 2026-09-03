import { useMemo, useState } from 'react';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useIdeias, useGerarLoteIdeias, useToggleVisivelIdeia, usePublicarMesInteiro } from '@/modules/aprovacao-conteudo/api/aprovacaoApi';
import type { ConteudoIdeia } from '@/modules/aprovacao-conteudo/types';
import { APROVACAO_LABEL, APROVACAO_TONE } from '@/modules/aprovacao-conteudo/types';
import { TIPO_LABEL } from '@/modules/conteudo/types';
import { IdeiaFormModal } from '@/modules/aprovacao-conteudo/components/IdeiaFormModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function mesRef(ano: number, mesIdx: number): string {
  return `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
}

export function AprovacaoConteudoPage() {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mesIdx, setMesIdx] = useState(now.getMonth());
  const [clienteId, setClienteId] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<ConteudoIdeia | undefined>();
  const [loteOpen, setLoteOpen] = useState(false);
  const gerarLote = useGerarLoteIdeias();
  const toggleVisivel = useToggleVisivelIdeia();
  const publicarMes = usePublicarMesInteiro();

  const clientesQ = useClientes('');
  const clientes = useMemo(
    () => (clientesQ.data ?? [])
      .filter((c) => c.status === 'ativo' && (c.servicos ?? []).includes('social_midia'))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [clientesQ.data],
  );

  // Auto-selecionar primeiro cliente ao carregar
  useMemo(() => { if (!clienteId && clientes[0]) setClienteId(clientes[0].id); }, [clientes, clienteId]);

  const { data: ideias, isLoading } = useIdeias(clienteId);
  const mes = mesRef(ano, mesIdx);
  const idsDoMes = (ideias ?? []).filter((i) => i.mes_referencia === mes);
  const clienteAtual = clientes.find((c) => c.id === clienteId);

  // Contagens por mês para "bolinhas" na aba
  const porMes = useMemo(() => {
    const mapa = new Map<string, { total: number; pendentes: number }>();
    for (const i of ideias ?? []) {
      const cur = mapa.get(i.mes_referencia) ?? { total: 0, pendentes: 0 };
      cur.total += 1;
      if (i.status === 'pendente') cur.pendentes += 1;
      mapa.set(i.mes_referencia, cur);
    }
    return mapa;
  }, [ideias]);

  const linkPublico = clienteAtual?.central_slug
    ? `${window.location.origin}/aprovar/${clienteAtual.central_slug}`
    : null;

  return (
    <div className="space-y-4">
      <PageHeader title="Aprovação de conteúdo" subtitle="Ideias por cliente e por mês. O cliente aprova via link público.">
        <select
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]"
        >
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => setLoteOpen(true)} disabled={!clienteId}>
          📅 Ideias do mês
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (idsDoMes.length === 0) return;
            const rascunhos = idsDoMes.filter((i) => i.visivel_cliente === false).length;
            if (rascunhos === 0) { alert('Todas as ideias deste mês já estão publicadas.'); return; }
            if (!confirm(`Publicar ${rascunhos} ideia(s) rascunho de ${MESES[mesIdx]}/${ano} para ${clienteAtual?.nome} ver?`)) return;
            publicarMes.mutate({ clienteId, mes });
          }}
          disabled={!clienteId || publicarMes.isPending}
          className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
        >
          🚀 Publicar tudo do mês
        </Button>
        <Button onClick={() => { setEditando(undefined); setFormOpen(true); }} disabled={!clienteId}>
          + Nova ideia
        </Button>
      </PageHeader>

      <div className="flex min-h-[60vh] gap-3">
        {/* Sidebar de clientes */}
        <aside className="flex w-64 shrink-0 flex-col rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/5 p-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Clientes ativos ({clientes.length})
          </div>
          <ul className="flex-1 overflow-y-auto">
            {clientesQ.isLoading && <div className="p-4"><Spinner /></div>}
            {clientes.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setClienteId(c.id)}
                  className={`flex w-full items-center gap-2 border-b border-white/5 p-2 text-left text-sm ${
                    clienteId === c.id ? 'bg-brand-500/15 text-white' : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {c.logo_url
                    ? <img src={c.logo_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                    : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px]">🏢</span>}
                  <span className="truncate">{c.nome}</span>
                </button>
              </li>
            ))}
            {!clientesQ.isLoading && clientes.length === 0 && (
              <li className="p-4 text-center text-xs text-slate-500">Cadastre clientes ativos primeiro.</li>
            )}
          </ul>
        </aside>

        {/* Conteúdo */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Abas de mês */}
          <div className="flex flex-wrap gap-1.5">
            {MESES.map((nome, i) => {
              const m = mesRef(ano, i);
              const info = porMes.get(m);
              const ativo = mesIdx === i;
              return (
                <button
                  key={nome}
                  onClick={() => setMesIdx(i)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                    ativo ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span>{nome}</span>
                  {info && info.total > 0 && (
                    <span className={`rounded-full px-1.5 text-[9px] font-semibold ${
                      info.pendentes > 0 ? 'bg-amber-500/30 text-amber-200' : 'bg-emerald-500/30 text-emerald-200'
                    }`}>
                      {info.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Link público */}
          {linkPublico && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
              🔗 <span className="text-slate-300">Link do cliente:</span>
              <code className="flex-1 truncate rounded bg-slate-800 px-2 py-0.5 text-slate-200">{linkPublico}</code>
              <button
                onClick={() => { void navigator.clipboard.writeText(linkPublico); }}
                className="rounded-md border border-white/10 px-2 py-0.5 text-slate-200 hover:bg-white/5"
              >
                Copiar
              </button>
            </div>
          )}

          {/* Cards de ideias */}
          {!clienteId ? (
            <Card><EmptyState message="Selecione um cliente na barra ao lado." /></Card>
          ) : isLoading ? (
            <Card className="flex justify-center p-12"><Spinner /></Card>
          ) : idsDoMes.length === 0 ? (
            <Card><EmptyState message={`Nenhuma ideia em ${MESES[mesIdx]} de ${ano} para ${clienteAtual?.nome}. Crie a primeira.`} /></Card>
          ) : (
            <div className="space-y-5">
              {[1, 2, 3, 4].map((semana) => {
                const daSemana = idsDoMes.filter((i) => i.semana === semana);
                if (daSemana.length === 0) return null;
                const pendSem = daSemana.filter((i) => i.status === 'pendente').length;
                return (
                  <section key={semana}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-200">
                        Semana {semana}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {daSemana.length} conteúdo{daSemana.length > 1 ? 's' : ''}
                        {pendSem > 0 && ` · ${pendSem} pendente${pendSem > 1 ? 's' : ''}`}
                      </span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {daSemana.map((i) => {
                        const rascunho = i.visivel_cliente === false;
                        return (
                        <div
                          key={i.id}
                          className={`rounded-2xl border p-4 shadow-sm ${
                            rascunho
                              ? 'border-dashed border-amber-500/30 bg-amber-500/5'
                              : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                          }`}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            <Badge tone="slate">{TIPO_LABEL[i.formato]}</Badge>
                            <Badge tone={APROVACAO_TONE[i.status]}>{APROVACAO_LABEL[i.status]}</Badge>
                            {rascunho && <Badge tone="amber">✏️ Rascunho interno</Badge>}
                            {i.dia_postagem && (
                              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                                📅 {new Date(i.dia_postagem).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                            {(i.anexos?.length ?? 0) > 0 && (
                              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                                📎 {i.anexos!.length}
                              </span>
                            )}
                          </div>
                          <h3 className="mb-1 text-sm font-semibold text-slate-100">{i.titulo}</h3>
                          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">{i.descricao || <span className="italic text-slate-500">Sem descrição — clique em editar.</span>}</p>
                          {i.status === 'reprovado' && i.justificativa && (
                            <div className="mt-2 rounded-md border border-red-500/20 bg-red-500/5 p-2 text-[11px] text-red-300">
                              <strong>Motivo:</strong> {i.justificativa}
                            </div>
                          )}
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <button
                              onClick={() => toggleVisivel.mutate({ id: i.id, visivel: rascunho })}
                              className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                                rascunho
                                  ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
                              }`}
                              title={rascunho ? 'Publicar para o cliente ver' : 'Ocultar do cliente (voltar a rascunho)'}
                            >
                              {rascunho ? '🚀 Publicar pro cliente' : '👁️ Publicado'}
                            </button>
                            <button
                              onClick={() => { setEditando(i); setFormOpen(true); }}
                              className="text-xs font-medium text-brand-300 hover:underline"
                            >
                              ✎ Editar
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <IdeiaFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          clienteIdInicial={clienteId}
          ideia={editando}
        />
      )}

      <Modal
        open={loteOpen}
        onClose={() => setLoteOpen(false)}
        title={`Gerar ideias do mês — ${MESES[mesIdx]}/${ano}`}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Quantos posts <strong>{clienteAtual?.nome}</strong> publica por semana?
            Vou criar os cards em branco para você preencher.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                onClick={async () => {
                  await gerarLote.mutateAsync({ clienteId, mes, porSemana: n });
                  setLoteOpen(false);
                }}
                disabled={gerarLote.isPending}
                className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center transition-all hover:-translate-y-0.5 hover:border-brand-400/50 hover:bg-brand-500/10 disabled:opacity-50"
              >
                <span className="text-3xl font-bold text-brand-300">{n * 4}</span>
                <span className="text-sm font-medium text-slate-100">{n} por semana</span>
                <span className="text-[11px] text-slate-500">= {n * 4} conteúdos no mês</span>
              </button>
            ))}
          </div>
          {idsDoMes.length > 0 && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-amber-300">
              ⚠️ Este mês já tem {idsDoMes.length} ideia(s). Os novos cards serão adicionados aos existentes.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
