import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Modal } from '@/shared/ui/Modal';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { formatDate } from '@/shared/lib/format';
import {
  useContasMeta, useClientesTrafego,
  useSalvarContaMeta, useExcluirContaMeta, useSincronizarMeta,
  type ContaMetaComCliente,
} from '../api/metaAdsApi';

export function MetaAdsPage() {
  const contas = useContasMeta();
  const clientes = useClientesTrafego();
  const sync = useSincronizarMeta();
  const excluir = useExcluirContaMeta();

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<ContaMetaComCliente | null>(null);
  const [resultadoSync, setResultadoSync] = useState<string | null>(null);

  function abrirNovo() { setEditando(null); setModalAberto(true); }
  function abrirEditar(c: ContaMetaComCliente) { setEditando(c); setModalAberto(true); }

  async function sincronizarTudo() {
    setResultadoSync(null);
    try {
      const r: any = await sync.mutateAsync({});
      setResultadoSync(
        `${r?.contas ?? 0} conta(s) processada(s). ` +
        (r?.resultado?.map?.((x: any) => `${x.linhas} linhas${x.erro ? ` (erro: ${x.erro})` : ''}`).join(' · ') ?? '')
      );
    } catch (e) {
      setResultadoSync(`Erro: ${(e as Error).message}`);
    }
  }

  const clientesFaltando = useMemo(() => {
    const conectados = new Set((contas.data ?? []).map((c) => c.cliente_id));
    return (clientes.data ?? []).filter((c: any) => !conectados.has(c.id));
  }, [contas.data, clientes.data]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="📊 Meta Ads"
        subtitle="Configure e sincronize as contas de anúncio Meta dos clientes com tráfego pago."
      >
        <Button onClick={sincronizarTudo} variant="secondary" disabled={sync.isPending}>
          {sync.isPending ? 'Sincronizando…' : '🔄 Sincronizar tudo'}
        </Button>
        <Button onClick={abrirNovo}>+ Conectar conta</Button>
      </PageHeader>

      {resultadoSync && (
        <Card className="border-brand-500/30 bg-brand-500/5 p-3 text-xs text-brand-100">
          {resultadoSync}
        </Card>
      )}

      {contas.isLoading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : !contas.data?.length ? (
        <Card className="p-8 text-center">
          <div className="mb-2 text-4xl">📊</div>
          <h2 className="text-lg font-semibold text-slate-100">Nenhuma conta Meta conectada</h2>
          <p className="mt-1 text-sm text-slate-400">Conecte uma conta pra começar a puxar métricas automaticamente.</p>
          <div className="mt-4 flex justify-center">
            <Button onClick={abrirNovo}>+ Conectar primeira conta</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {contas.data.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-100">{c.cliente_nome}</p>
                  <p className="text-xs text-slate-400">{c.nome_exibicao} · act_{c.id_externo}</p>
                </div>
                <Badge tone={c.sincronizacao_ativa && c.tem_token ? 'green' : 'slate'}>
                  {c.sincronizacao_ativa && c.tem_token ? 'Ativa' : 'Pausada'}
                </Badge>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-y-1 text-[11px] text-slate-400">
                <dt>Moeda</dt><dd className="text-right text-slate-300">{c.moeda ?? 'BRL'}</dd>
                <dt>Token</dt><dd className="text-right text-slate-300">{c.tem_token ? '••• salvo' : '⚠ ausente'}</dd>
                <dt>Última sync</dt><dd className="text-right text-slate-300">{c.ultima_sync_at ? formatDate(c.ultima_sync_at) : '—'}</dd>
              </dl>

              {c.ultimo_erro_sync && (
                <p className="mt-2 rounded bg-red-500/10 p-2 text-[11px] text-red-300">⚠ {c.ultimo_erro_sync}</p>
              )}

              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => abrirEditar(c)} className="flex-1">Editar</Button>
                <Button
                  variant="secondary"
                  onClick={() => sync.mutate({ cliente_id: c.cliente_id })}
                  disabled={sync.isPending || !c.tem_token || !c.sincronizacao_ativa}
                >🔄</Button>
                <Button
                  variant="secondary"
                  className="text-red-300 hover:bg-red-500/10"
                  onClick={() => {
                    if (confirm(`Excluir integração de ${c.cliente_nome}?`)) excluir.mutate(c.id);
                  }}
                >🗑</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {clientesFaltando.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium text-slate-200">Clientes com tráfego pago sem conta conectada</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {clientesFaltando.map((c: any) => (
              <li key={c.id}>
                <Badge tone="amber">{c.nome}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ContaModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        conta={editando}
        clientes={clientes.data ?? []}
      />
    </div>
  );
}

// -------------------------------------------------------------
interface ModalProps {
  open: boolean;
  onClose: () => void;
  conta: ContaMetaComCliente | null;
  clientes: Array<{ id: string; nome: string }>;
}
function ContaModal({ open, onClose, conta, clientes }: ModalProps) {
  const salvar = useSalvarContaMeta();
  const [clienteId, setClienteId] = useState(conta?.cliente_id ?? '');
  const [idExterno, setIdExterno] = useState(conta?.id_externo ?? '');
  const [nomeExibicao, setNomeExibicao] = useState(conta?.nome_exibicao ?? '');
  const [token, setToken] = useState('');
  const [ativa, setAtiva] = useState(conta?.sincronizacao_ativa ?? true);
  const [moeda, setMoeda] = useState(conta?.moeda ?? 'BRL');
  const [erro, setErro] = useState<string | null>(null);

  // reset ao trocar de conta
  useEffect(() => {
    setClienteId(conta?.cliente_id ?? '');
    setIdExterno(conta?.id_externo ?? '');
    setNomeExibicao(conta?.nome_exibicao ?? '');
    setToken('');
    setAtiva(conta?.sincronizacao_ativa ?? true);
    setMoeda(conta?.moeda ?? 'BRL');
    setErro(null);
  }, [conta]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!clienteId) { setErro('Escolha o cliente.'); return; }
    if (!idExterno.trim()) { setErro('Informe o Ad Account ID (ex: 1234567890 ou act_1234567890).'); return; }
    if (!nomeExibicao.trim()) { setErro('Dê um nome de exibição.'); return; }
    if (!conta && !token.trim()) { setErro('Cole o Access Token da Meta.'); return; }
    try {
      await salvar.mutateAsync({
        id: conta?.id,
        cliente_id: clienteId,
        id_externo: idExterno,
        nome_exibicao: nomeExibicao,
        access_token: token || undefined,
        sincronizacao_ativa: ativa,
        moeda,
      });
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={conta ? 'Editar conta Meta' : 'Conectar conta Meta'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Select
          id="cli"
          label="Cliente"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          options={[
            { value: '', label: 'Selecione…' },
            ...clientes.map((c) => ({ value: c.id, label: c.nome })),
          ]}
        />

        <Input
          id="ext"
          label="Ad Account ID"
          placeholder="1234567890 (sem 'act_')"
          value={idExterno}
          onChange={(e) => setIdExterno(e.target.value)}
        />

        <Input
          id="nome"
          label="Nome de exibição"
          placeholder="Ex: Acme — BM Principal"
          value={nomeExibicao}
          onChange={(e) => setNomeExibicao(e.target.value)}
        />

        <div>
          <label htmlFor="tok" className="text-sm font-medium text-slate-300">
            Access Token {conta ? '(deixe em branco para manter o atual)' : ''}
          </label>
          <textarea
            id="tok"
            rows={3}
            placeholder="EAAB... (System User Token do Business Manager)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="glass-field mt-1 w-full rounded-md px-3 py-2 font-mono text-xs text-slate-100"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            No Business Manager &rarr; Configurações do negócio &rarr; Usuários do sistema &rarr; Gerar token
            (permissões: <code>ads_read</code>, <code>read_insights</code>, <code>business_management</code>).
            Prefira token de longa duração.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            id="moeda"
            label="Moeda"
            value={moeda ?? 'BRL'}
            onChange={(e) => setMoeda(e.target.value)}
            options={[
              { value: 'BRL', label: 'BRL (R$)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'EUR', label: 'EUR (€)' },
            ]}
          />
          <label className="mt-6 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
            Sincronização ativa
          </label>
        </div>

        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
      </form>
    </Modal>
  );
}
