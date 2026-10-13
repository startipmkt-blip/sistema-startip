import type { CsResposta } from '@/modules/cs-clientes/api/csEnviosApi';
import { dataHora } from '@/modules/cs-clientes/lib/mensagens';
import { Modal } from '@/shared/ui/Modal';
import { Badge } from '@/shared/ui/Badge';

const TIPO_LABEL: Record<CsResposta['tipo'], string> = { semanal: 'CS de sexta', nps: 'NPS' };

interface Props {
  clienteNome: string;
  respostas: CsResposta[];
  onClose: () => void;
}

export function RespostasModal({ clienteNome, respostas, onClose }: Props) {
  return (
    <Modal open onClose={onClose} title={`Respostas de ${clienteNome}`} size="lg">
      {respostas.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">Este cliente ainda não respondeu nenhum CS.</p>
      ) : (
        <ul className="max-h-[65vh] space-y-3 overflow-y-auto">
          {respostas.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="blue">{TIPO_LABEL[r.tipo]}</Badge>
                <span className="text-xs text-slate-400">{dataHora(r.created_at)}</span>
                {r.nota !== null && <Badge tone={r.nota >= 9 ? 'green' : r.nota >= 7 ? 'amber' : 'red'}>Nota {r.nota}</Badge>}
              </div>
              <dl className="space-y-2">
                {r.respostas.map((i) => (
                  <div key={i.pergunta}>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{i.pergunta}</dt>
                    <dd className="whitespace-pre-line text-sm text-slate-100">{i.resposta}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
