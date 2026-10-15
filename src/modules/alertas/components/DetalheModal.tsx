import { useDetalhePendencia } from '@/modules/alertas/api/alertasApi';
import { formatarDuracao, formatarHora } from '@/modules/alertas/lib/format';
import { TIPO_LABEL, type Pendencia } from '@/modules/alertas/types';
import { Modal } from '@/shared/ui/Modal';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';

const CLASSE_LABEL: Record<string, string> = {
  cliente: 'Cliente', equipe: 'Equipe Startip', incerto: 'Remetente incerto',
  automatica: 'Automática (ignorada)', pendente_origem: 'Verificando origem',
};
const ENVIO_TONE = { enviado: 'green', falhou: 'red', cancelado: 'slate', pendente: 'amber', enviando: 'amber' } as const;

export function DetalheModal({ pendencia, onClose }: { pendencia: Pendencia | null; onClose: () => void }) {
  const q = useDetalhePendencia(pendencia?.id ?? null);
  if (!pendencia) return null;

  return (
    <Modal open onClose={onClose} title={`Atendimento — ${pendencia.cliente_nome ?? pendencia.grupo_nome ?? ''}`} size="lg">
      <div className="space-y-5 text-sm">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-slate-300">
          <div><dt className="text-xs text-slate-500">Grupo</dt><dd>{pendencia.grupo_nome ?? '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Primeira mensagem sem resposta</dt><dd>{formatarHora(pendencia.iniciada_em)}</dd></div>
          <div><dt className="text-xs text-slate-500">Mensagens do cliente</dt><dd>{pendencia.qtd_msgs}</dd></div>
          <div><dt className="text-xs text-slate-500">Prazo</dt><dd>{pendencia.prazo_min} min</dd></div>
          <div>
            <dt className="text-xs text-slate-500">Respondido em</dt>
            <dd>{pendencia.respondida_em ? `${formatarHora(pendencia.respondida_em)} por ${pendencia.respondida_por_nome ?? 'equipe'}` : 'Ainda não respondido'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tempo total de resposta</dt>
            <dd>{pendencia.tempo_resposta_seg != null ? formatarDuracao(pendencia.tempo_resposta_seg / 60) : formatarDuracao(pendencia.minutos_decorridos)}</dd>
          </div>
        </dl>

        {q.isLoading && <Spinner />}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Alertas</h3>
          {(q.data?.envios.length ?? 0) === 0 ? (
            <p className="text-slate-500">Nenhum alerta gerado para esta pendência.</p>
          ) : (
            <ul className="space-y-1">
              {q.data?.envios.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 text-slate-300">
                  <Badge tone={ENVIO_TONE[e.status]}>Nível {e.nivel} · {e.status}</Badge>
                  <span>{e.enviado_em ? formatarHora(e.enviado_em) : ''}</span>
                  {e.tentativas > 1 && <span className="text-xs text-slate-500">{e.tentativas} tentativas</span>}
                  {e.erro && <span className="text-xs text-slate-500">{e.erro}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Histórico de mensagens</h3>
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {q.data?.eventos.map((e) => (
              <li key={e.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{formatarHora(e.ocorrido_em)}</span>
                  <Badge tone={e.classificacao === 'equipe' ? 'blue' : 'slate'}>{CLASSE_LABEL[e.classificacao] ?? e.classificacao}</Badge>
                  <span>{e.from_me ? 'Número conectado' : (e.remetente_nome ?? '')}</span>
                  <span>· {TIPO_LABEL[e.tipo] ?? e.tipo}</span>
                </div>
                {e.texto && <p className="mt-1 whitespace-pre-wrap text-slate-200">{e.texto}</p>}
              </li>
            ))}
            {(q.data?.eventos.length ?? 0) === 0 && !q.isLoading && (
              <li className="text-slate-500">Sem mensagens registradas.</li>
            )}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
