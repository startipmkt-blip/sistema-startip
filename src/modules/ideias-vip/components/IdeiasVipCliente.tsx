import { useMemo, useState } from 'react';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { useDadosPortal, useMarcarIdeia } from '@/modules/ideias-vip/api/ideiasVipApi';
import { dataLocal, formatarDia, segundaDaSemana } from '@/modules/ideias-vip/lib/importar';
import { IDEA_TYPES, tipoInfo } from '@/modules/ideias-vip/types';
import type { Idea, IdeaClientState, IdeaState, IdeaType } from '@/modules/ideias-vip/types';

const porHorario = (a: Idea, b: Idea) => (a.suggested_time ?? '99:99').localeCompare(b.suggested_time ?? '99:99') || a.position - b.position;

// 16px no celular evita o zoom automático do iOS ao tocar no campo.
const CAMPO = 'glass-field min-h-[44px] w-full px-3 py-2 text-base focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/50 sm:text-sm [&>option]:bg-slate-900';

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

  const doLote = useMemo(() => (data?.ideias ?? []).filter((i) => i.batch_id === loteId), [data, loteId]);
  const usadasNoLote = doLote.filter((i) => estados.get(i.id)?.status === 'usada').length;

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return doLote.filter((i) => {
      if (tipo !== 'todas' && i.type !== tipo) return false;
      if (ocultarUsadas && estados.get(i.id)?.status === 'usada') return false;
      if (q && !`${i.title ?? ''} ${i.body} ${i.theme ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [doLote, tipo, busca, ocultarUsadas, estados]);

  const paraHoje = useMemo(() => filtradas.filter((i) => i.suggested_date === hoje).sort(porHorario), [filtradas, hoje]);

  const semanas = useMemo(() => {
    const m = new Map<string, Map<string, Idea[]>>();
    const semData: Idea[] = [];
    const jaNoHoje = new Set(paraHoje.map((i) => i.id));
    filtradas.forEach((i) => {
      if (jaNoHoje.has(i.id)) return;
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
  }, [filtradas, paraHoje]);

  async function copiar(i: Idea) {
    try {
      await navigator.clipboard.writeText(i.body);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = i.body; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopiada(i.id);
    window.setTimeout(() => setCopiada((c) => (c === i.id ? null : c)), 2200);
    marcar.mutate({ ideaId: i.id, copiou: true, atual: estados.get(i.id) });
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (isError) return <p className="text-sm text-red-300">Não consegui carregar as ideias agora. Tente de novo em instantes.</p>;
  if (!data?.lotes.length) {
    return (
      <div className="glass p-8 text-center sm:p-10">
        <p className="mx-auto max-w-md text-base text-slate-300">Suas ideias chegam aqui. Assim que a Startip publicar o primeiro lote, você vê tudo nesta tela.</p>
      </div>
    );
  }

  const cartao = (i: Idea) => (
    <CartaoIdeia key={i.id} ideia={i} estado={estados.get(i.id)} copiada={copiada === i.id}
      onCopiar={() => void copiar(i)}
      onStatus={(status) => marcar.mutate({ ideaId: i.id, status, atual: estados.get(i.id) })} />
  );

  const chips = [{ value: 'todas', label: 'Todas' }, ...IDEA_TYPES.filter((t) => t.value !== 'outro')] as { value: IdeaType | 'todas'; label: string }[];

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-300">
        Toque em <strong className="text-white">Copiar texto</strong> e cole no seu grupo VIP. Depois toque em <strong className="text-white">Marcar como feito</strong> para saber o que já postou.
      </p>

      <div className="space-y-3">
        {data.lotes.length > 1 ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-300">Mês</span>
            <select className={CAMPO} value={loteId} onChange={(e) => setLoteSel(e.target.value)}>
              {data.lotes.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </label>
        ) : (
          <h2 className="text-lg font-semibold text-white">{data.lotes[0].title}</h2>
        )}
        <div>
          <p className="text-sm text-slate-300"><strong className="text-white">{usadasNoLote} de {doLote.length}</strong> ideias feitas</p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={doLote.length} aria-valuenow={usadasNoLote}>
            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${doLote.length ? (usadasNoLote / doLote.length) * 100 : 0}%` }} />
          </div>
        </div>
        <input
          className={CAMPO} type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por palavra" aria-label="Buscar ideias"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por tipo">
        {chips.map((t) => (
          <button
            key={t.value} onClick={() => setTipo(t.value)} aria-pressed={tipo === t.value}
            className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold ${tipo === t.value ? 'bg-gradient-brand text-white' : 'border border-white/15 bg-white/5 text-slate-200'}`}
          >{t.label}</button>
        ))}
        <button
          onClick={() => setOcultarUsadas(!ocultarUsadas)} aria-pressed={ocultarUsadas}
          className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold ${ocultarUsadas ? 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/40' : 'border border-dashed border-white/20 text-slate-300'}`}
        >Ocultar feitas</button>
      </div>

      {paraHoje.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-brand-400/40 bg-brand-400/10 p-3 sm:p-4">
          <h2 className="text-base font-semibold text-white">Para hoje</h2>
          {paraHoje.map(cartao)}
        </section>
      )}

      {!filtradas.length && <p className="py-8 text-center text-sm text-slate-400">Nenhuma ideia com esses filtros.</p>}

      {semanas.lista.map(({ sem, dias }, n) => (
        <section key={sem} className="space-y-4">
          <h2 className="border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Semana {n + 1} <span className="font-normal normal-case">· a partir de {formatarDia(sem, true)}</span>
          </h2>
          {dias.map(({ dia, itens }) => (
            <div key={dia} className="space-y-3">
              <h3 className="text-base font-semibold text-white first-letter:uppercase">{formatarDia(dia)}</h3>
              {itens.map(cartao)}
            </div>
          ))}
        </section>
      ))}

      {semanas.semData.length > 0 && (
        <section className="space-y-3">
          <h2 className="border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Sem data definida</h2>
          {semanas.semData.map(cartao)}
        </section>
      )}

      {copiada && (
        <div role="status" className="pointer-events-none fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
          Texto copiado. Agora é só colar no grupo.
        </div>
      )}
    </div>
  );
}

function CartaoIdeia({ ideia, estado, copiada, onCopiar, onStatus }: {
  ideia: Idea; estado?: IdeaClientState; copiada: boolean; onCopiar: () => void; onStatus: (s: IdeaState) => void;
}) {
  const t = tipoInfo(ideia.type);
  const status = estado?.status ?? 'nova';
  const usada = status === 'usada';
  return (
    <article className={`glass p-4 ${usada ? 'border-emerald-400/50 bg-emerald-500/5' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Badge tone={t.tone}>{t.label}</Badge>
        {usada && <Badge tone="green">✓ Feito</Badge>}
        {status === 'salva' && <Badge tone="amber">Salva</Badge>}
        {(ideia.suggested_date || ideia.suggested_time) && (
          <span className="ml-auto text-sm font-medium text-slate-200">
            {ideia.suggested_date && <span className="capitalize">{formatarDia(ideia.suggested_date, true)}</span>}
            {ideia.suggested_time && <span> às {ideia.suggested_time}</span>}
          </span>
        )}
      </div>
      {ideia.title && <h4 className="mt-3 text-base font-semibold text-white">{ideia.title}</h4>}
      {ideia.theme && <p className="mt-0.5 text-xs text-slate-400">Tema: {ideia.theme}</p>}
      <p className={`mt-3 whitespace-pre-wrap break-words rounded-2xl bg-emerald-500/10 px-4 py-3 text-base leading-relaxed text-slate-50 ${usada ? 'line-clamp-2' : ''}`}>{ideia.body}</p>
      {ideia.media_suggestion && (
        <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Acompanha:</span> {ideia.media_suggestion}
        </p>
      )}
      <div className="mt-4 space-y-2">
        <Button className={`min-h-[48px] w-full text-base ${copiada ? '!bg-emerald-500 !bg-none' : ''}`} onClick={onCopiar}>
          {copiada ? 'Texto copiado' : 'Copiar texto'}
        </Button>
        {usada ? (
          <Button variant="secondary" className="min-h-[44px] w-full" onClick={() => onStatus('nova')}>Desfazer, ainda não fiz</Button>
        ) : (
          <div className="grid grid-cols-[1fr,auto] gap-2">
            <Button className="min-h-[44px] !bg-emerald-600 !bg-none hover:!bg-emerald-500" onClick={() => onStatus('usada')}>✓ Marcar como feito</Button>
            <Button variant="secondary" className="min-h-[44px]" onClick={() => onStatus(status === 'salva' ? 'nova' : 'salva')}>
              {status === 'salva' ? 'Salva' : 'Salvar'}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
