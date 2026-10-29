import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { useDadosPortal, useMarcarIdeia } from '@/modules/ideias-vip/api/ideiasVipApi';
import { dataLocal, formatarDia, segundaDaSemana } from '@/modules/ideias-vip/lib/importar';
import { IDEA_TYPES, tipoInfo } from '@/modules/ideias-vip/types';
import type { Idea, IdeaClientState, IdeaType } from '@/modules/ideias-vip/types';

const mesTexto = (iso: string | null, titulo: string) => titulo || iso || '';

const porHorario = (a: Idea, b: Idea) => (a.suggested_time ?? '99:99').localeCompare(b.suggested_time ?? '99:99') || a.position - b.position;

export function IdeiasVipCliente({ clientId }: { clientId: string }) {
  const { data, isLoading, isError } = useDadosPortal(clientId);
  const marcar = useMarcarIdeia(clientId);
  const [loteSel, setLoteSel] = useState('');
  const [tipo, setTipo] = useState<IdeaType | 'todas'>('todas');
  const [busca, setBusca] = useState('');
  const [ocultarUsadas, setOcultarUsadas] = useState(false);
  const [copiada, setCopiada] = useState<string | null>(null);

  const estados = useMemo(() => new Map((data?.estados ?? []).map((e) => [e.idea_id, e])), [data]);
  const loteId = loteSel || data?.lotes[0]?.id || '';
  const hoje = dataLocal();

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (data?.ideias ?? []).filter((i) => {
      if (i.batch_id !== loteId) return false;
      if (tipo !== 'todas' && i.type !== tipo) return false;
      if (ocultarUsadas && estados.get(i.id)?.status === 'usada') return false;
      if (q && !`${i.title ?? ''} ${i.body} ${i.theme ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, loteId, tipo, busca, ocultarUsadas, estados]);

  const paraHoje = useMemo(() => filtradas.filter((i) => i.suggested_date === hoje).sort(porHorario), [filtradas, hoje]);

  const semanas = useMemo(() => {
    const m = new Map<string, Map<string, Idea[]>>();
    const semData: Idea[] = [];
    filtradas.forEach((i) => {
      if (!i.suggested_date) { semData.push(i); return; }
      const sem = segundaDaSemana(i.suggested_date);
      const dias = m.get(sem) ?? new Map<string, Idea[]>();
      dias.set(i.suggested_date, [...(dias.get(i.suggested_date) ?? []), i]);
      m.set(sem, dias);
    });
    const lista = [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([sem, dias]) => ({
      sem,
      dias: [...dias.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, itens]) => ({ dia, itens: itens.sort(porHorario) })),
    }));
    return { lista, semData };
  }, [filtradas]);

  async function copiar(i: Idea) {
    try {
      await navigator.clipboard.writeText(i.body);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = i.body; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopiada(i.id);
    window.setTimeout(() => setCopiada((c) => (c === i.id ? null : c)), 1800);
    marcar.mutate({ ideaId: i.id, copiou: true, atual: estados.get(i.id) });
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (isError) return <p className="text-sm text-red-300">Não consegui carregar as ideias agora. Tente de novo em instantes.</p>;
  if (!data?.lotes.length) {
    return (
      <Card className="p-10 text-center">
        <p className="mx-auto max-w-md text-sm text-slate-300">Suas ideias chegam aqui. Assim que a Startip publicar o primeiro lote, você vê tudo nesta tela.</p>
      </Card>
    );
  }

  const cartao = (i: Idea) => (
    <CartaoIdeia key={i.id} ideia={i} estado={estados.get(i.id)} copiada={copiada === i.id}
      onCopiar={() => void copiar(i)}
      onStatus={(status) => marcar.mutate({ ideaId: i.id, status, atual: estados.get(i.id) })} />
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <Select label="Lote" value={loteId} onChange={(e) => setLoteSel(e.target.value)} options={data.lotes.map((l) => ({ value: l.id, label: mesTexto(l.reference_month, l.title) }))} />
        <Input label="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Palavra do texto ou do tema" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([{ value: 'todas', label: 'Todas' }, ...IDEA_TYPES.filter((t) => t.value !== 'outro')] as { value: IdeaType | 'todas'; label: string }[]).map((t) => (
          <button
            key={t.value} onClick={() => setTipo(t.value)} aria-pressed={tipo === t.value}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tipo === t.value ? 'bg-gradient-brand text-white' : 'border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'}`}
          >{t.label}</button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={ocultarUsadas} onChange={(e) => setOcultarUsadas(e.target.checked)} /> Ocultar usadas
        </label>
      </div>

      {paraHoje.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-brand-400/30 bg-brand-400/5 p-3">
          <h2 className="text-sm font-semibold text-white">Para hoje</h2>
          {paraHoje.map(cartao)}
        </section>
      )}

      {!filtradas.length && <p className="py-6 text-center text-sm text-slate-400">Nenhuma ideia com esses filtros.</p>}

      {semanas.lista.map(({ sem, dias }, n) => (
        <section key={sem} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Semana {n + 1}, a partir de {formatarDia(sem, true)}</h2>
          {dias.map(({ dia, itens }) => (
            <div key={dia} className="space-y-2">
              <h3 className="text-sm font-semibold capitalize text-slate-200">{formatarDia(dia)}</h3>
              {itens.map(cartao)}
            </div>
          ))}
        </section>
      ))}

      {semanas.semData.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Sem data definida</h2>
          {semanas.semData.map(cartao)}
        </section>
      )}
    </div>
  );
}

function CartaoIdeia({ ideia, estado, copiada, onCopiar, onStatus }: {
  ideia: Idea; estado?: IdeaClientState; copiada: boolean; onCopiar: () => void; onStatus: (s: 'nova' | 'salva' | 'usada') => void;
}) {
  const t = tipoInfo(ideia.type);
  const status = estado?.status ?? 'nova';
  return (
    <Card className={`p-4 ${status === 'usada' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <Badge tone={t.tone}>{t.label}</Badge>
        {ideia.suggested_date && <span className="capitalize">{formatarDia(ideia.suggested_date, true)}</span>}
        {ideia.suggested_time && <span>{ideia.suggested_time}</span>}
        {ideia.theme && <span>Tema: {ideia.theme}</span>}
        {status === 'salva' && <Badge tone="amber">Salva</Badge>}
        {status === 'usada' && <Badge tone="green">Usada</Badge>}
      </div>
      {ideia.title && <h4 className="mt-2 text-sm font-semibold text-white">{ideia.title}</h4>}
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-100">{ideia.body}</p>
      {ideia.media_suggestion && <p className="mt-2 text-xs text-slate-400">Mídia sugerida: {ideia.media_suggestion}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={onCopiar}>{copiada ? 'Texto copiado' : 'Copiar texto'}</Button>
        {status !== 'usada' && (
          <Button variant="secondary" onClick={() => onStatus(status === 'salva' ? 'nova' : 'salva')}>{status === 'salva' ? 'Remover dos salvos' : 'Salvar'}</Button>
        )}
        {status === 'usada'
          ? <Button variant="secondary" onClick={() => onStatus('nova')}>Desfazer</Button>
          : <Button variant="secondary" onClick={() => onStatus('usada')}>Marcar como usada</Button>}
      </div>
    </Card>
  );
}
