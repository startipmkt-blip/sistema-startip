import { useMemo, useState } from 'react';
import { useGruposAlerta, usePendencias, useAlertasConfig } from '@/modules/alertas/api/alertasApi';
import { DetalheModal } from '@/modules/alertas/components/DetalheModal';
import {
  esperaMinutos, fimDoDia, formatarDuracao, formatarHora, hojeSP, inicioDoDia, somarDias, statusVisual,
} from '@/modules/alertas/lib/format';
import { STATUS_VISUAL, TIPO_LABEL, type Pendencia } from '@/modules/alertas/types';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { StatCard } from '@/shared/ui/StatCard';
import { Table, type Column } from '@/shared/ui/Table';

type Periodo = 'hoje' | '7d' | '30d';

export function PainelTab() {
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const [detalhe, setDetalhe] = useState<Pendencia | null>(null);
  const hoje = hojeSP();
  const inicio = inicioDoDia(periodo === 'hoje' ? hoje : somarDias(hoje, periodo === '7d' ? -6 : -29));
  const fim = fimDoDia(hoje);

  const pendQ = usePendencias(inicio, fim);
  const gruposQ = useGruposAlerta();
  const cfgQ = useAlertasConfig();

  const grupoPorChat = useMemo(
    () => new Map((gruposQ.data ?? []).map((g) => [g.chat_id, g])),
    [gruposQ.data],
  );
  const lista = pendQ.data ?? [];

  const kpi = useMemo(() => {
    const abertas = lista.filter((p) => p.status === 'aguardando');
    const respondidas = lista.filter((p) => p.status === 'respondida');
    const atrasadasAbertas = abertas.filter((p) => (p.minutos_decorridos ?? 0) >= p.prazo_min).length;
    const respDentro = respondidas.filter((p) => p.dentro_prazo === true).length;
    const respFora = respondidas.filter((p) => p.dentro_prazo === false).length;
    const tempos = respondidas.map((p) => p.tempo_resposta_seg ?? 0);
    const medio = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length / 60 : null;
    return {
      monitorados: (gruposQ.data ?? []).filter((g) => g.monitorar).length,
      aguardando: abertas.length,
      dentro: respDentro,
      atraso: atrasadasAbertas + respFora,
      medio,
      alertas: lista.reduce((s, p) => s + (p.alertas_enviados ?? 0), 0),
    };
  }, [lista, gruposQ.data]);

  const colunas: Column<Pendencia>[] = [
    { header: 'Cliente', render: (p) => <span className="font-medium text-white">{p.cliente_nome ?? '—'}</span> },
    { header: 'Grupo', render: (p) => p.grupo_nome ?? '—' },
    { header: 'Mensagem', render: (p) => (
      <div className="max-w-xs">
        <div className="truncate">{p.ultima_msg_texto || `[${TIPO_LABEL[p.ultima_msg_tipo ?? 'texto'] ?? 'Mídia'}]`}</div>
        <div className="text-xs text-slate-500">
          {TIPO_LABEL[p.ultima_msg_tipo ?? 'texto']}{p.qtd_msgs > 1 ? ` · ${p.qtd_msgs} mensagens` : ''}
        </div>
      </div>
    ) },
    { header: 'Recebida', render: (p) => formatarHora(p.iniciada_em) },
    { header: 'Tempo', render: (p) => formatarDuracao(esperaMinutos(p)) },
    { header: 'Status', render: (p) => {
      const s = STATUS_VISUAL[statusVisual(p, grupoPorChat.get(p.chat_id))];
      return <Badge tone={s.tone}>{s.label}</Badge>;
    } },
    { header: 'Último alerta', render: (p) => (
      p.ultimo_alerta_nivel
        ? <span>Nível {p.ultimo_alerta_nivel} · {formatarHora(p.ultimo_alerta_em)}</span>
        : <span className="text-slate-500">Nenhum</span>
    ) },
  ];

  const ordenada = [...lista].sort((a, b) => {
    const pri = (p: Pendencia) => (p.status === 'aguardando' ? 0 : 1);
    return pri(a) - pri(b) || new Date(b.iniciada_em).getTime() - new Date(a.iniciada_em).getTime();
  });
  const semInterno = cfgQ.data && !cfgQ.data.grupo_interno_id;

  return (
    <div className="space-y-4">
      {semInterno && (
        <Card className="border-amber-400/40 p-3 text-sm text-amber-200">
          Nenhum grupo interno de alertas configurado: sem ele, nenhum aviso é enviado. Defina em Configurações.
        </Card>
      )}
      {cfgQ.data && !cfgQ.data.ativo && (
        <Card className="border-red-400/40 p-3 text-sm text-red-200">O monitoramento está desativado nas Configurações.</Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Visão geral</h2>
        <div className="w-44">
          <Select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Periodo)}
            options={[{ value: 'hoje', label: 'Hoje' }, { value: '7d', label: 'Últimos 7 dias' }, { value: '30d', label: 'Últimos 30 dias' }]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Grupos monitorados" value={String(kpi.monitorados)} tone="blue" />
        <StatCard label="Aguardando resposta" value={String(kpi.aguardando)} tone="amber" />
        <StatCard label="Dentro do prazo" value={String(kpi.dentro)} tone="green" />
        <StatCard label="Com atraso" value={String(kpi.atraso)} tone="red" />
        <StatCard label="1ª resposta (média)" value={formatarDuracao(kpi.medio)} />
        <StatCard label="Alertas enviados" value={String(kpi.alertas)} />
      </div>

      <Card className="overflow-hidden">
        {pendQ.isLoading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : (
          <Table
            columns={colunas}
            data={ordenada}
            keyOf={(p) => p.id}
            onRowClick={setDetalhe}
            emptyMessage="Nenhum atendimento registrado neste período. Os dados aparecem a partir da ativação do monitoramento."
          />
        )}
      </Card>
      <p className="text-xs text-slate-500">Atualiza automaticamente a cada 15 segundos. Horários em Brasília.</p>

      <DetalheModal pendencia={detalhe} onClose={() => setDetalhe(null)} />
    </div>
  );
}
