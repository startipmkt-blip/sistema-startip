import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { useCalendarioPublico } from '@/modules/datas-comemorativas/api/datasApi';
import {
  agruparPorMes, anoDe, diasEntre, formatarData, gerarOcorrencias, hojeSaoPaulo, mapaAprovacoes, mesDe, periodoVigente,
} from '@/modules/datas-comemorativas/lib/recorrencia';
import { OcorrenciaCard } from '@/modules/datas-comemorativas/components/OcorrenciaCard';
import { AprovacaoCliente, AprovacaoStatus } from '@/modules/datas-comemorativas/components/AprovacaoData';
import { MESES } from '@/modules/datas-comemorativas/types';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { LogoCliente } from '@/shared/ui/LogoCliente';

type Aba = 'proximas' | 'historico';

function faltam(dias: number): string {
  if (dias === 0) return 'é hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

export function CalendarioPublicoPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useCalendarioPublico(slug.toLowerCase());
  const [aba, setAba] = useState<Aba>('proximas');
  const hoje = hojeSaoPaulo();

  useEffect(() => {
    if (data?.cliente.nome) document.title = `${data.cliente.nome} · Datas comemorativas`;
  }, [data?.cliente.nome]);

  const visao = useMemo(() => {
    if (!data) return null;
    const periodo = periodoVigente(data.inicio, hoje);
    const anos: number[] = [];
    for (let a = anoDe(data.inicio); a <= periodo.ano; a++) anos.push(a);
    const todas = gerarOcorrencias(data.itens, data.base, anos, hoje);
    const aPartirDe = periodo.de > hoje ? periodo.de : hoje;
    const proximas = todas.filter((o) => o.data >= aPartirDe && o.data <= periodo.ate);
    const historico = todas.filter((o) => o.data < hoje).reverse();
    return { periodo, proximas, historico, aprovacoes: mapaAprovacoes(data.aprovacoes) };
  }, [data, hoje]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Spinner /></div>;

  if (error || !data || !visao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-3 text-3xl"><GlassIcon name="alert" /></div>
          <div className="text-slate-100">{error ? 'Não foi possível carregar o calendário.' : 'Link inválido.'}</div>
          <p className="mt-2 text-xs text-slate-400">Confira o endereço ou fale com a equipe Startip.</p>
        </Card>
      </div>
    );
  }

  const { periodo, proximas, historico, aprovacoes } = visao;
  const pendentes = proximas.filter((o) => !aprovacoes.has(o.key)).length;
  const proxima = proximas[0];
  const lista = aba === 'proximas' ? proximas : historico;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-center">
          {data.cliente.logo_url && (
            <LogoCliente src={data.cliente.logo_url} alt="" className="mx-auto mb-3 h-16 w-16 rounded-full border border-white/10 object-cover" />
          )}
          <h1 className="text-2xl font-semibold uppercase tracking-wide text-white">{data.cliente.nome}</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Calendário de datas comemorativas</p>
          <p className="mt-2 text-sm font-medium uppercase text-slate-200">
            {MESES[mesDe(periodo.de) - 1]} → {MESES[11]} {periodo.ano}
          </p>
          <p className="text-xs text-slate-500">{formatarData(periodo.de)} → {formatarData(periodo.ate)}</p>
        </header>

        <p className="mx-auto max-w-xl text-center text-xs leading-relaxed text-slate-400">
          Estas são as datas comemorativas escolhidas para a sua marca. <strong className="text-slate-300">Em planejamento</strong> indica
          que a data está próxima (ou já tem etapas de preparação em andamento) e a equipe Startip está trabalhando nela.
          Datas que já passaram ficam no <strong className="text-slate-300">Histórico</strong>.
          Em cada data você pode <strong className="text-slate-300">aprovar</strong> ou <strong className="text-slate-300">reprovar</strong> —
          ao reprovar, conte o motivo para a equipe ajustar o planejamento.
        </p>

        {proxima && (
          <div className="rounded-2xl border border-brand-400/30 bg-brand-500/10 p-4 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-200">Próxima data</div>
            <div className="mt-1 text-base font-semibold text-white">{proxima.base.nome}</div>
            <div className="text-xs text-slate-300">
              {formatarData(proxima.data, { weekday: 'long', day: '2-digit', month: 'long' })} · {faltam(diasEntre(hoje, proxima.data))}
            </div>
          </div>
        )}

        {pendentes > 0 && (
          <p className="text-center text-xs text-amber-300">
            <GlassIcon name="hourglass" /> {pendentes === 1 ? '1 data aguardando' : `${pendentes} datas aguardando`} a sua aprovação
          </p>
        )}

        <div className="flex justify-center gap-2">
          {([
            ['proximas', `Próximas oportunidades (${proximas.length})`],
            ['historico', `Histórico (${historico.length})`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                aba === id ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {lista.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-400">
            {aba === 'proximas' ? 'Nenhuma data prevista para o restante do período.' : 'Nenhuma data no histórico ainda.'}
          </Card>
        ) : (
          <div className="space-y-6">
            {agruparPorMes(lista).map((g) => (
              <section key={g.chave}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-sm font-semibold text-brand-200">{g.titulo}</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="space-y-3">
                  {g.itens.map((o) => {
                    const aprovacao = aprovacoes.get(o.key);
                    return (
                      <OcorrenciaCard
                        key={o.key}
                        ocorrencia={o}
                        hoje={hoje}
                        rodape={
                          aba === 'proximas'
                            ? <AprovacaoCliente slug={slug.toLowerCase()} ocorrencia={o} aprovacao={aprovacao} />
                            : aprovacao && <AprovacaoStatus aprovacao={aprovacao} visao="cliente" />
                        }
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="pt-6 text-center text-[11px] text-slate-500">
          Calendário atualizado automaticamente pela equipe Startip. Dúvidas? Fale com seu gerente.
        </footer>
      </div>
    </div>
  );
}
