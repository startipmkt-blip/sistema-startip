import { useMemo, useState } from 'react';
import { useAuth } from '@/shared/auth/AuthProvider';
import {
  useIdeias,
  useSugestoes,
  useDecidirIdeia,
  useAddSugestao,
} from '@/modules/aprovacao-conteudo/api/aprovacaoApi';
import { proximoMes, type ConteudoIdeia } from '@/modules/aprovacao-conteudo/types';
import { IdeiasPorSemana } from '@/modules/aprovacao-conteudo/components/IdeiasPorSemana';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatMonth } from '@/shared/lib/format';

export function PortalAprovacao() {
  const { profile } = useAuth();
  const clienteId = profile?.cliente_id ?? '';
  const { data: ideias, isLoading } = useIdeias(clienteId);
  const { data: sugestoes } = useSugestoes(clienteId);
  const decidir = useDecidirIdeia();
  const addSugestao = useAddSugestao();

  const [mesAberto, setMesAberto] = useState<string | null>(null);
  const [reprovandoId, setReprovandoId] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [sugestaoTexto, setSugestaoTexto] = useState('');

  const porMes = useMemo(() => {
    const mapa = new Map<string, ConteudoIdeia[]>();
    for (const i of ideias ?? []) {
      if (!mapa.has(i.mes_referencia)) mapa.set(i.mes_referencia, []);
      mapa.get(i.mes_referencia)!.push(i);
    }
    return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [ideias]);

  const ideiasDoMes = (ideias ?? []).filter((i) => i.mes_referencia === mesAberto);
  const todasDecididas = ideiasDoMes.length > 0 && ideiasDoMes.every((i) => i.status !== 'pendente');
  const mesSeguinte = mesAberto ? proximoMes(mesAberto) : '';
  const jaSugeriu = (sugestoes ?? []).some((s) => s.mes_referencia === mesSeguinte);

  async function aprovar(id: string) {
    await decidir.mutateAsync({ id, status: 'aprovado', justificativa: '' });
  }
  async function confirmarReprovacao(id: string) {
    if (!justificativa.trim()) return;
    await decidir.mutateAsync({ id, status: 'reprovado', justificativa });
    setReprovandoId(null);
    setJustificativa('');
  }
  async function enviarSugestao() {
    if (!sugestaoTexto.trim()) return;
    await addSugestao.mutateAsync({ clienteId, mes: mesSeguinte, texto: sugestaoTexto });
    setSugestaoTexto('');
  }

  if (isLoading) return <Card className="flex justify-center p-12"><Spinner /></Card>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Aprovação de conteúdo</h1>
        <p className="text-sm text-slate-400">Abra a pasta do mês e aprove ou reprove cada conteúdo.</p>
      </div>

      {porMes.length === 0 ? (
        <Card><EmptyState message="Ainda não há conteúdos para aprovar." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {porMes.map(([mes, itens]) => {
            const pendentes = itens.filter((i) => i.status === 'pendente').length;
            return (
              <button
                key={mes}
                onClick={() => setMesAberto(mes)}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-5 text-left shadow-sm transition-colors hover:border-brand-400/50 hover:bg-brand-500/10"
              >
                <span className="text-3xl">📁</span>
                <div>
                  <div className="text-base font-semibold capitalize text-slate-100">{formatMonth(mes)}</div>
                  <div className="text-xs text-slate-400">
                    {itens.length} conteúdo(s) ·{' '}
                    {pendentes === 0 ? 'tudo revisado ✓' : `${pendentes} aguardando você`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Janela expandida do mês */}
      <Modal
        open={mesAberto !== null}
        onClose={() => { setMesAberto(null); setReprovandoId(null); }}
        size="xl"
        title={mesAberto ? `Conteúdos de ${formatMonth(mesAberto)}` : ''}
      >
        <div className="space-y-5">
          <IdeiasPorSemana
            ideias={ideiasDoMes}
            renderAcoes={(i) =>
              reprovandoId === i.id ? (
                <div className="space-y-2">
                  <Textarea
                    label="Por que você não aprovou? (obrigatório)"
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => { setReprovandoId(null); setJustificativa(''); }}>Cancelar</Button>
                    <Button onClick={() => confirmarReprovacao(i.id)} disabled={!justificativa.trim() || decidir.isPending}>
                      Confirmar reprovação
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={() => aprovar(i.id)} disabled={decidir.isPending}>✓ Aprovar</Button>
                  <Button variant="secondary" onClick={() => { setReprovandoId(i.id); setJustificativa(i.justificativa); }}>
                    ✕ Não aprovar
                  </Button>
                </div>
              )
            }
          />

          {/* Sugestões para o mês seguinte */}
          {todasDecididas && mesSeguinte && (
            <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 p-4">
              <h3 className="text-sm font-semibold text-slate-100">
                🎉 Tudo revisado! Sugestões para <span className="capitalize">{formatMonth(mesSeguinte)}</span>?
              </h3>
              {jaSugeriu ? (
                <p className="mt-2 text-sm font-medium text-emerald-300">✓ Recebemos suas sugestões. Obrigado!</p>
              ) : (
                <div className="mt-2 space-y-2">
                  <Textarea
                    placeholder="Ex.: gostaria de um conteúdo sobre encomendas para festas…"
                    value={sugestaoTexto}
                    onChange={(e) => setSugestaoTexto(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button onClick={enviarSugestao} disabled={!sugestaoTexto.trim() || addSugestao.isPending}>
                      Enviar sugestões
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
