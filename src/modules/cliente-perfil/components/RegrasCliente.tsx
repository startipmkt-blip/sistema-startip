import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';
import {
  REGRA_TIPOS, useExcluirRegra, useRegras, useSalvarRegra,
  type RegraCliente, type RegraTipo,
} from '../api/regrasApi';

const COR: Record<RegraTipo, string> = {
  gosta: 'border-emerald-500/30 bg-emerald-500/5',
  nao_aprova: 'border-red-500/30 bg-red-500/5',
  obrigatorio: 'border-amber-500/30 bg-amber-500/5',
  prefere: 'border-blue-500/30 bg-blue-500/5',
};

function NovaRegra({ tipo, ajuda, clienteId }: { tipo: RegraTipo; ajuda: string; clienteId: string }) {
  const salvar = useSalvarRegra(clienteId);
  const [texto, setTexto] = useState('');
  const [critica, setCritica] = useState(false);

  function adicionar() {
    const t = texto.trim();
    if (!t) return;
    salvar.mutate(
      { tipo, texto: t, critica },
      {
        onSuccess: () => { setTexto(''); setCritica(false); },
        onError: (e) => alert(`Não foi possível salvar: ${(e as Error).message}`),
      },
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') adicionar(); }}
        placeholder={ajuda}
        disabled={salvar.isPending}
        className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
      />
      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-400">
        <input type="checkbox" checked={critica} onChange={(e) => setCritica(e.target.checked)} />
        Regra crítica (não pode ser quebrada)
      </label>
    </div>
  );
}

function ItemRegra({ regra, clienteId }: { regra: RegraCliente; clienteId: string }) {
  const salvar = useSalvarRegra(clienteId);
  const excluir = useExcluirRegra(clienteId);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(regra.texto);
  const erro = (e: unknown) => alert(`Não foi possível salvar: ${(e as Error).message}`);

  if (editando) {
    return (
      <li className="flex gap-1">
        <input
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setTexto(regra.texto); setEditando(false); }
            if (e.key === 'Enter' && texto.trim()) {
              salvar.mutate(
                { id: regra.id, tipo: regra.tipo, texto: texto.trim(), critica: regra.critica },
                { onSuccess: () => setEditando(false), onError: erro },
              );
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-brand-400/50 bg-white/5 px-2 py-1 text-xs text-slate-100 focus:outline-none"
        />
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-2 text-xs">
      <span className={`min-w-0 flex-1 ${regra.critica ? 'font-semibold text-amber-200' : 'text-slate-200'}`}>
        {regra.critica && <span title="Regra crítica">★ </span>}
        {regra.texto}
      </span>
      <span className="flex shrink-0 gap-1.5 opacity-60 group-hover:opacity-100">
        <button
          title={regra.critica ? 'Tirar destaque' : 'Marcar como crítica'}
          className="text-slate-400 hover:text-amber-300"
          onClick={() => salvar.mutate({ id: regra.id, tipo: regra.tipo, texto: regra.texto, critica: !regra.critica }, { onError: erro })}
        >
          ★
        </button>
        <button title="Editar" className="text-slate-400 hover:text-brand-300" onClick={() => setEditando(true)}>✎</button>
        <button
          title="Excluir"
          className="text-slate-400 hover:text-red-400"
          onClick={() => {
            if (confirm(`Excluir a regra "${regra.texto}"?`)) {
              excluir.mutate(regra.id, { onError: (e) => alert(`Não foi possível excluir: ${(e as Error).message}`) });
            }
          }}
        >
          ✕
        </button>
      </span>
    </li>
  );
}

/** Briefing do cliente: o que ele gosta, o que não aprova, o que é obrigatório e como prefere. */
export function RegrasCliente({ clienteId }: { clienteId: string }) {
  const { data: regras, isLoading, error } = useRegras(clienteId);

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">
          <GlassIcon name="clipboard" /> Regras do cliente (briefing)
        </h2>
        <p className="text-xs text-slate-400">
          Como este cliente gosta das coisas. A equipe e o designer consultam antes de criar. Use ★ nas que não podem ser quebradas.
        </p>
      </div>

      {isLoading && <div className="flex justify-center py-4"><Spinner /></div>}
      {error && <p className="text-sm text-red-300">Erro ao carregar as regras: {(error as Error).message}</p>}

      {!isLoading && !error && (
        <div className="grid gap-3 md:grid-cols-2">
          {REGRA_TIPOS.map((t) => {
            const itens = (regras ?? []).filter((r) => r.tipo === t.id);
            return (
              <section key={t.id} className={`rounded-xl border p-3 ${COR[t.id]}`}>
                <h3 className="text-xs font-semibold text-slate-100">
                  {glassify(t.emoji)} {t.label}
                  <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-normal text-slate-300">{itens.length}</span>
                </h3>
                {itens.length === 0 ? (
                  <p className="mt-1.5 text-[11px] text-slate-500">Nada cadastrado.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {itens.map((r) => <ItemRegra key={r.id} regra={r} clienteId={clienteId} />)}
                  </ul>
                )}
                <NovaRegra tipo={t.id} ajuda={t.ajuda} clienteId={clienteId} />
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}
