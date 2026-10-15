import { useMemo, useState } from 'react';
import {
  useAlertasConfig, useEnviosPeriodo, useGruposAlerta, useLogAlertas, usePendencias,
} from '@/modules/alertas/api/alertasApi';
import { DetalheModal } from '@/modules/alertas/components/DetalheModal';
import {
  baixarCsv, esperaMinutos, fimDoDia, formatarDuracao, formatarHora, hojeSP, inicioDoDia, somarDias, statusVisual,
} from '@/modules/alertas/lib/format';
import { STATUS_VISUAL, TIPO_LABEL, type Pendencia, type StatusVisual } from '@/modules/alertas/types';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { StatCard } from '@/shared/ui/StatCard';
import { Table, type Column } from '@/shared/ui/Table';

export function RelatoriosTab() {
  const hoje = hojeSP();
  const [de, setDe] = useState(somarDias(hoje, -29));
  const [ate, setAte] = useState(hoje);
  const [cliente, setCliente] = useState('');
  const [status, setStatus] = useState<'' | StatusVisual>('');
  const [detalhe, setDetalhe] = useState<Pendencia | null>(null);

  const inicio = inicioDoDia(de);
  const fim = fimDoDia(ate);
  const pendQ = usePendencias(inicio, fim);
  const enviosQ = useEnviosPeriodo(inicio, fim);
  const logQ = useLogAlertas();
  const gruposQ = useGruposAlerta();
  const cfgQ = useAlertasConfig();
  const sla = cfgQ.data?.sla_min ?? 30;

  const grupoPorChat = useMemo(() => new Map((gruposQ.data ?? []).map((g) => [g.chat_id, g])), [gruposQ.data]);
  const clientes = useMemo(
    () => [...new Set((pendQ.data ?? []).map((p) => p.cliente_nome ?? '').filter(Boolean))].sort(),
    [pendQ.data],
  );

  const linhas = useMemo(() => (pendQ.data ?? []).filter((p) => {
    // Pendências abertas mais antigas que o período entram sempre; o filtro de data vale para o resto.
    if (cliente && p.cliente_nome !== cliente) return false;
    if (status && statusVisual(p, grupoPorChat.get(p.chat_id)) !== status) return false;
    return true;
  }), [pendQ.data, cliente, status, grupoPorChat]);

  const resumo = useMemo(() => {
    const resp = linhas.filter((p) => p.status === 'respondida');
    const abertas = linhas.filter((p) => p.status === 'aguardando');
    const esperas = linhas.map((p) => esperaMinutos(p)).filter((v): v is number => v != null);
    return {
      recebidas: linhas.length,
      ate30: resp.filter((p) => (p.tempo_resposta_seg ?? Infinity) <= sla * 60).length,
      atraso: resp.filter((p) => p.dentro_prazo === false).length + abertas.filter((p) => (p.minutos_decorridos ?? 0) >= p.prazo_min).length,
      medio: resp.length ? resp.reduce((s, p) => s + (p.tempo_resposta_seg ?? 0), 0) / resp.length / 60 : null,
      maior: esperas.length ? Math.max(...esperas) : null,
      pendentes: abertas.length,
    };
  }, [linhas, sla]);

  const colunas: Column<Pendencia>[] = [
    { header: 'Cliente', render: (p) => <span className="font-medium text-white">{p.cliente_nome ?? '—'}</span> },
    { header: 'Recebida', render: (p) => formatarHora(p.iniciada_em) },
    { header: 'Mensagem', render: (p) => <span className="block max-w-xs truncate">{p.ultima_msg_texto || `[${TIPO_LABEL[p.ultima_msg_tipo ?? 'texto']}]`}</span> },
    { header: 'Respondida', render: (p) => formatarHora(p.respondida_em) },
    { header: 'Tempo', render: (p) => formatarDuracao(esperaMinutos(p)) },
    { header: 'Alertas', render: (p) => String(p.alertas_enviados) },
    { header: 'Status', render: (p) => {
      const s = STATUS_VISUAL[statusVisual(p, grupoPorChat.get(p.chat_id))];
      return <Badge tone={s.tone}>{s.label}</Badge>;
    } },
  ];

  function exportar() {
    baixarCsv(
      `startip-alertas-${de}-a-${ate}.csv`,
      ['Cliente', 'Grupo', 'Recebida em', 'Respondida em', 'Respondida por', 'Tempo (min)', 'Prazo (min)', 'Mensagens', 'Alertas enviados', 'Status'],
      linhas.map((p) => [
        p.cliente_nome, p.grupo_nome, formatarHora(p.iniciada_em), formatarHora(p.respondida_em), p.respondida_por_nome,
        esperaMinutos(p)?.toFixed(1).replace('.', ','), p.prazo_min, p.qtd_msgs, p.alertas_enviados,
        STATUS_VISUAL[statusVisual(p, grupoPorChat.get(p.chat_id))].label,
      ]),
    );
  }

  function exportarAlertas() {
    baixarCsv(
      `startip-alertas-enviados-${de}-a-${ate}.csv`,
      ['Cliente', 'Grupo', 'Nível', 'Situação', 'Enviado em', 'Tentativas', 'Erro'],
      (enviosQ.data ?? []).map((e) => [
        e.pendencia?.cliente_nome, e.pendencia?.grupo_nome, e.nivel, e.status, formatarHora(e.enviado_em), e.tentativas, e.erro,
      ]),
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Input label="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          <Input label="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          <Select label="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)}
            options={[{ value: '', label: 'Todos' }, ...clientes.map((c) => ({ value: c, label: c }))]} />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as '' | StatusVisual)}
            options={[{ value: '', label: 'Todos' },
              ...(Object.keys(STATUS_VISUAL) as StatusVisual[]).map((k) => ({ value: k, label: STATUS_VISUAL[k].label }))]} />
          <div className="flex items-end"><Button variant="secondary" onClick={exportar} className="w-full">Exportar CSV</Button></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Solicitações recebidas" value={String(resumo.recebidas)} tone="blue" />
        <StatCard label={`Atendidas em ${sla} min`} value={String(resumo.ate30)} tone="green" />
        <StatCard label="Atendidas com atraso" value={String(resumo.atraso)} tone="red" />
        <StatCard label="1ª resposta (média)" value={formatarDuracao(resumo.medio)} />
        <StatCard label="Maior tempo de espera" value={formatarDuracao(resumo.maior)} tone="amber" />
        <StatCard label="Ainda pendentes" value={String(resumo.pendentes)} tone="amber" />
      </div>

      <Card className="overflow-hidden">
        {pendQ.isLoading ? <div className="flex justify-center p-10"><Spinner /></div> : (
          <Table columns={colunas} data={linhas} keyOf={(p) => p.id} onRowClick={setDetalhe}
            emptyMessage="Nenhum atendimento para os filtros escolhidos. Só existem dados a partir da ativação do monitoramento." />
        )}
      </Card>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Histórico de alertas enviados</h2>
          <Button variant="ghost" onClick={exportarAlertas}>Exportar CSV</Button>
        </div>
        <Card className="overflow-hidden">
          <Table
            data={enviosQ.data ?? []}
            keyOf={(e) => e.id}
            emptyMessage="Nenhum alerta enviado no período."
            columns={[
              { header: 'Cliente', render: (e) => e.pendencia?.cliente_nome ?? '—' },
              { header: 'Nível', render: (e) => `Nível ${e.nivel}` },
              { header: 'Situação', render: (e) => <Badge tone={e.status === 'enviado' ? 'green' : 'red'}>{e.status === 'enviado' ? 'Enviado' : 'Falhou'}</Badge> },
              { header: 'Quando', render: (e) => formatarHora(e.enviado_em ?? e.created_at) },
              { header: 'Tentativas', render: (e) => String(e.tentativas) },
              { header: 'Erro', render: (e) => e.erro ?? '' },
            ]}
          />
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">Auditoria (últimos 100 registros)</h2>
        <Card className="overflow-hidden">
          <Table
            data={logQ.data ?? []}
            keyOf={(l) => l.id}
            emptyMessage="Sem registros de auditoria."
            columns={[
              { header: 'Quando', render: (l) => formatarHora(l.em) },
              { header: 'Evento', render: (l) => l.tipo.replace(/_/g, ' ') },
              { header: 'Detalhe', render: (l) => <span className="block max-w-md truncate text-xs text-slate-400">{l.detalhe ? JSON.stringify(l.detalhe) : ''}</span> },
            ]}
          />
        </Card>
      </section>

      <DetalheModal pendencia={detalhe} onClose={() => setDetalhe(null)} />
    </div>
  );
}
