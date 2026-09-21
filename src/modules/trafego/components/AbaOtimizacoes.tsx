import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';
import { useOtimizacoesSemana, useSalvarOtimizacao, type OtimizacaoLog } from '../api/trafegoApi';

export function AbaOtimizacoes() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useOtimizacoesSemana(offset);
  const [editando, setEditando] = useState<OtimizacaoLog | null>(null);
  const salvar = useSalvarOtimizacao();

  const visiveis = useMemo(() => (data?.linhas ?? []).filter((l) => !l.oculto), [data]);
  const cover = useMemo(() => {
    const total = visiveis.length;
    const feitas = visiveis.filter((l) => l.tem_otimizacao).length;
    const justif = visiveis.filter((l) => !l.tem_otimizacao && l.justificativa).length;
    return { total, feitas, justif };
  }, [visiveis]);

  if (isLoading || !data) return <Card className="flex justify-center p-10"><Spinner /></Card>;

  const semanaLabel = `${new Date(data.semana_inicio).toLocaleDateString('pt-BR')} → ${new Date(data.semana_fim).toLocaleDateString('pt-BR')}`;

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Button variant="secondary" onClick={() => setOffset((v) => v - 1)}>←</Button>
        <span className="text-sm font-semibold text-slate-100">{semanaLabel}</span>
        <Button variant="secondary" onClick={() => setOffset((v) => v + 1)} disabled={offset >= 0}>→</Button>
        <span className="ml-auto text-xs text-slate-400">
          Cobertura: <strong className="text-slate-100">{cover.feitas + cover.justif}/{cover.total}</strong>{' '}
          ({cover.total > 0 ? Math.round(((cover.feitas + cover.justif) / cover.total) * 100) : 0}%) ·{' '}
          {cover.justif} justificada(s)
        </span>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-3">
          <h3 className="mb-2 text-sm font-semibold text-red-300">⚠ Sem otimização</h3>
          <ul className="space-y-1.5">
            {visiveis.filter((l) => !l.tem_otimizacao).map((l) => (
              <li key={l.cliente_id} className="flex items-center gap-2 rounded border border-white/10 bg-white/5 p-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-100">{l.cliente_nome}</p>
                  {l.justificativa && <p className="mt-0.5 truncate text-[10px] text-slate-400">📝 {l.justificativa}</p>}
                </div>
                <Button variant="secondary" onClick={() => setEditando(l)}>Editar</Button>
              </li>
            ))}
            {visiveis.filter((l) => !l.tem_otimizacao).length === 0 && (
              <li className="text-xs text-slate-500">Todos justificados/otimizados ✨</li>
            )}
          </ul>
        </Card>

        <Card className="p-3">
          <h3 className="mb-2 text-sm font-semibold text-emerald-300">✅ Com otimização</h3>
          <ul className="space-y-1.5">
            {visiveis.filter((l) => l.tem_otimizacao).map((l) => (
              <li key={l.cliente_id} className="flex items-center gap-2 rounded border border-white/10 bg-white/5 p-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-100">{l.cliente_nome}</p>
                  {l.resumo && <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{l.resumo}</p>}
                </div>
                <Badge tone="green">otimizada</Badge>
                <Button variant="secondary" onClick={() => setEditando(l)}>Editar</Button>
              </li>
            ))}
            {visiveis.filter((l) => l.tem_otimizacao).length === 0 && (
              <li className="text-xs text-slate-500">Nada marcado como otimizado nessa semana.</li>
            )}
          </ul>
        </Card>
      </div>

      {editando && (
        <EditarOtimizacaoModal
          linha={editando}
          onClose={() => setEditando(null)}
          onSalvar={async (v) => {
            await salvar.mutateAsync(v);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function EditarOtimizacaoModal({ linha, onClose, onSalvar }: {
  linha: OtimizacaoLog;
  onClose: () => void;
  onSalvar: (v: Partial<OtimizacaoLog> & { cliente_id: string; semana_inicio: string; semana_fim: string }) => Promise<void>;
}) {
  const [temOtim, setTemOtim] = useState(linha.tem_otimizacao);
  const [resumo, setResumo] = useState(linha.resumo ?? '');
  const [justif, setJustif] = useState(linha.justificativa ?? '');

  return (
    <Modal open onClose={onClose} title={`${linha.cliente_nome} — semana`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSalvar({
            cliente_id: linha.cliente_id, semana_inicio: linha.semana_inicio, semana_fim: linha.semana_fim,
            tem_otimizacao: temOtim, resumo: resumo || null, justificativa: justif || null, oculto: false,
          })}>Salvar</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="flex items-center gap-2 text-slate-200">
          <input type="checkbox" checked={temOtim} onChange={(e) => setTemOtim(e.target.checked)} />
          Foi otimizada nessa semana
        </label>
        {temOtim ? (
          <Textarea id="res" label="Resumo do que foi feito" rows={4} value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="ex: pausei 3 anúncios, escalei carrossel Black, criei nova campanha de Remarketing" />
        ) : (
          <Textarea id="jus" label="Justificativa (por que não teve otimização)" rows={4} value={justif} onChange={(e) => setJustif(e.target.value)} placeholder="ex: cliente pediu para não mexer / campanhas maduras entregando meta / criativos em produção" />
        )}
      </div>
    </Modal>
  );
}
