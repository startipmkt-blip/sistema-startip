import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingLinks, useCriarLink, useMudarStatusLink, type OnboardingLink } from '@/modules/onboarding-publico/api/onboardingPublicoApi';
import { useSalvarCliente } from '@/modules/clientes/api/clientesApi';
import { supabase } from '@/shared/lib/supabaseClient';
import { Modal } from '@/shared/ui/Modal';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

function linkPublico(slug: string): string {
  return `${window.location.origin}/cadastro/${slug}`;
}

export function LinksCadastroPage() {
  const nav = useNavigate();
  const { data: links, isLoading } = useOnboardingLinks();
  const criar = useCriarLink();
  const mudarStatus = useMudarStatusLink();
  const salvarCliente = useSalvarCliente();
  const [expiraDias, setExpiraDias] = useState<string>('30');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [revisando, setRevisando] = useState<OnboardingLink | null>(null);
  const [criando, setCriando] = useState(false);

  async function virarCliente(link: OnboardingLink) {
    const d = link.dados as Record<string, string>;
    const nome = (d.razao_social || d.nome_fantasia || '').trim();
    if (!nome) { alert('Sem razão social no formulário.'); return; }
    setCriando(true);
    try {
      await salvarCliente.mutateAsync({
        dados: {
          nome,
          logo_url: null,
          tipo_negocio: 'local',
          status: 'ativo',
          servicos: [],
          conteudos_por_semana: 0,
          data_entrada: new Date().toISOString().slice(0, 10),
        },
      });
      // Recupera o id do cliente recém criado pra amarrar ao link.
      const { data: novo } = await supabase
        .from('clientes')
        .select('id')
        .eq('nome', nome)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const novoId = (novo as { id?: string } | null)?.id;
      if (novoId) {
        await supabase
          .from('onboarding_forms')
          .update({ cliente_id: novoId, status: 'revisado' } as never)
          .eq('id', link.id);
      } else {
        await mudarStatus.mutateAsync({ id: link.id, status: 'revisado' });
      }
      setRevisando(null);
      if (novoId) nav(`/clientes/${novoId}`);
    } finally {
      setCriando(false);
    }
  }

  async function copiar(l: OnboardingLink) {
    await navigator.clipboard.writeText(linkPublico(l.slug)).catch(() => { /* clipboard bloqueado */ });
    setCopiadoId(l.id);
    setTimeout(() => setCopiadoId((cur) => (cur === l.id ? null : cur)), 1500);
  }

  const linksPendentes = (links ?? []).filter((l) => l.status !== 'arquivado');
  const linksArquivados = (links ?? []).filter((l) => l.status === 'arquivado');

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Links de cadastro</h1>
          <p className="text-xs text-slate-400">Envie um link público para o cliente preencher o próprio cadastro. Você revisa antes de virar cliente.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-slate-400">
            Expira em
            <select
              value={expiraDias}
              onChange={(e) => setExpiraDias(e.target.value)}
              className="ml-2 rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]"
            >
              <option value="">nunca</option>
              <option value="7">7 dias</option>
              <option value="15">15 dias</option>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
            </select>
          </label>
          <Button
            onClick={() => criar.mutate({ expiraDias: expiraDias ? Number(expiraDias) : null })}
            disabled={criar.isPending}
          >
            {criar.isPending ? 'Gerando…' : '+ Gerar link'}
          </Button>
        </div>
      </header>

      {isLoading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : linksPendentes.length === 0 && linksArquivados.length === 0 ? (
        <EmptyState message='Nenhum link ainda. Clique em "+ Gerar link" pra começar.' />
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ativos</h2>
            <Card className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-white/5 text-left text-xs text-slate-400">
                  <tr>
                    <th className="p-3">Link</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Criado</th>
                    <th className="p-3">Expira</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {linksPendentes.map((l) => {
                    const url = linkPublico(l.slug);
                    const razao = (l.dados as { razao_social?: string })?.razao_social;
                    const tone: Parameters<typeof Badge>[0]['tone'] =
                      l.status === 'preenchido' ? 'amber' : l.status === 'revisado' ? 'green' : 'slate';
                    return (
                      <tr key={l.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-white/5 px-2 py-1 text-[11px] text-brand-200">{url}</code>
                            <button
                              onClick={() => copiar(l)}
                              className="rounded-md px-1.5 py-0.5 text-xs text-slate-300 hover:bg-white/10"
                              title="Copiar link"
                            >
                              {copiadoId === l.id ? '✓' : '📋'}
                            </button>
                          </div>
                          {razao && <div className="mt-1 text-xs text-slate-400">Preenchido por: <span className="text-slate-200">{razao}</span></div>}
                        </td>
                        <td className="p-3"><Badge tone={tone}>{l.status}</Badge></td>
                        <td className="p-3 text-xs text-slate-400">{new Date(l.criado_em).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3 text-xs text-slate-400">{l.expira_em ? new Date(l.expira_em).toLocaleDateString('pt-BR') : '—'}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            {l.status === 'preenchido' && (
                              <>
                                <Button onClick={() => setRevisando(l)}>👤 Virar cliente</Button>
                                <Button variant="secondary" onClick={() => mudarStatus.mutate({ id: l.id, status: 'revisado' })}>
                                  ✓ Marcar revisado
                                </Button>
                              </>
                            )}
                            <button
                              onClick={() => mudarStatus.mutate({ id: l.id, status: 'arquivado' })}
                              className="rounded-md px-2 text-xs text-slate-400 hover:bg-white/10"
                            >
                              📦
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </section>

          {linksArquivados.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Arquivados ({linksArquivados.length})</h2>
              <Card className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5 text-left text-xs text-slate-400">
                    <tr>
                      <th className="p-3">Link</th>
                      <th className="p-3">Criado</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linksArquivados.map((l) => {
                      const url = linkPublico(l.slug);
                      const razao = (l.dados as { razao_social?: string })?.razao_social;
                      const foiPreenchido = Object.keys(l.dados ?? {}).length > 0;
                      return (
                        <tr key={l.id} className="border-t border-white/5 opacity-70 hover:bg-white/[0.02] hover:opacity-100">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <code className="rounded bg-white/5 px-2 py-1 text-[11px] text-slate-400 line-through">{url}</code>
                            </div>
                            {razao && <div className="mt-1 text-xs text-slate-500">Preenchido por: <span className="text-slate-300">{razao}</span></div>}
                          </td>
                          <td className="p-3 text-xs text-slate-500">{new Date(l.criado_em).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="secondary"
                                onClick={() => mudarStatus.mutate({ id: l.id, status: foiPreenchido ? 'preenchido' : 'pendente' })}
                              >
                                ↩️ Desarquivar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </section>
          )}
        </>
      )}

      {revisando && (
        <Modal
          open={true}
          onClose={() => setRevisando(null)}
          title="Revisar cadastro e virar cliente"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRevisando(null)}>Cancelar</Button>
              <Button onClick={() => virarCliente(revisando)} disabled={criando}>
                {criando ? 'Criando…' : '👤 Criar cliente'}
              </Button>
            </>
          }
        >
          <div className="space-y-2 text-sm">
            <p className="text-xs text-slate-400">
              Confira os dados enviados pelo cliente. Ao confirmar, um novo cliente será criado com nome
              da razão social. Os demais campos ficam guardados em `onboarding_forms.dados` para
              consulta.
            </p>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries((revisando.dados as Record<string, string>) ?? {}).map(([k, v]) => (
                v ? (
                  <div key={k} className="rounded-md border border-white/5 bg-white/[0.02] p-2">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-500">{k}</dt>
                    <dd className="text-slate-200">{String(v)}</dd>
                  </div>
                ) : null
              ))}
            </dl>
          </div>
        </Modal>
      )}
    </div>
  );
}
