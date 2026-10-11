import { useState } from 'react';
import { Textarea } from '@/shared/ui/Textarea';
import { useResponderData } from '@/modules/datas-comemorativas/api/datasApi';
import type { Aprovacao, Ocorrencia } from '@/modules/datas-comemorativas/types';

function quando(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

interface StatusProps {
  aprovacao: Aprovacao;
  /** Muda só a redação: quem lê é o próprio cliente ou a equipe. */
  visao: 'cliente' | 'equipe';
}

export function AprovacaoStatus({ aprovacao: a, visao }: StatusProps) {
  const aprovada = a.status === 'aprovada';
  const titulo = visao === 'cliente'
    ? (aprovada ? 'Você aprovou esta data' : 'Você reprovou esta data')
    : (aprovada ? 'Aprovada pelo cliente' : 'Reprovada pelo cliente');
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs ${
        aprovada ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-200'
      }`}
    >
      <div className="font-semibold">
        {aprovada ? '✅' : '❌'} {titulo} <span className="font-normal opacity-70">· {quando(a.respondido_em)}</span>
      </div>
      {!aprovada && a.justificativa && (
        <p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-200">
          <span className="text-slate-400">Motivo: </span>{a.justificativa}
        </p>
      )}
    </div>
  );
}

interface ClienteProps {
  slug: string;
  ocorrencia: Ocorrencia;
  aprovacao?: Aprovacao;
}

/** Bloco do link público: o cliente aprova ou reprova (com justificativa) a data. */
export function AprovacaoCliente({ slug, ocorrencia: o, aprovacao }: ClienteProps) {
  const responder = useResponderData(slug);
  const [alterando, setAlterando] = useState(false);
  const [reprovando, setReprovando] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(status: Aprovacao['status']) {
    setErro(null);
    if (status === 'reprovada' && !justificativa.trim()) {
      setErro('Conte o motivo para a equipe poder ajustar o planejamento.');
      return;
    }
    try {
      await responder.mutateAsync({ itemId: o.item.id, ano: o.ano, status, justificativa });
      setAlterando(false);
      setReprovando(false);
      setJustificativa('');
    } catch {
      setErro('Não foi possível registrar sua resposta. Tente novamente.');
    }
  }

  if (aprovacao && !alterando) {
    return (
      <div className="space-y-1">
        <AprovacaoStatus aprovacao={aprovacao} visao="cliente" />
        <button
          onClick={() => { setAlterando(true); setJustificativa(aprovacao.justificativa); }}
          className="text-[11px] text-slate-400 hover:text-slate-200 hover:underline"
        >
          Alterar resposta
        </button>
      </div>
    );
  }

  const campoId = `just-${o.key}`;
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-slate-900/40 p-3">
      <div className="text-xs text-slate-300">Você aprova trabalharmos esta data?</div>

      {!reprovando ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void enviar('aprovada')}
            disabled={responder.isPending}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            ✓ Aprovar
          </button>
          <button
            onClick={() => { setReprovando(true); setErro(null); }}
            disabled={responder.isPending}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
          >
            ✕ Reprovar
          </button>
          {aprovacao && (
            <button onClick={() => setAlterando(false)} className="px-2 text-xs text-slate-400 hover:text-slate-200">
              Cancelar
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            id={campoId}
            label="Por que você não aprova esta data?"
            placeholder="Ex.: não combina com a nossa marca, não vamos atender nesse dia…"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            maxLength={2000}
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void enviar('reprovada')}
              disabled={responder.isPending || !justificativa.trim()}
              className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50"
            >
              {responder.isPending ? 'Enviando…' : 'Enviar reprovação'}
            </button>
            <button
              onClick={() => { setReprovando(false); setErro(null); }}
              disabled={responder.isPending}
              className="px-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {erro && <div className="text-xs text-red-300">{erro}</div>}
    </div>
  );
}
