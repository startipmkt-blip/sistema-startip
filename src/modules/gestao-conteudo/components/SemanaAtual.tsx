import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { LogoCliente } from '@/shared/ui/LogoCliente';
import { usePostsDoMes } from '@/modules/gestao-conteudo/api/gestaoApi';
import { ETAPAS, type Etapa, type Post } from '@/modules/gestao-conteudo/types';
import { COR_ETAPA, contar, type ClienteGestao } from '@/modules/gestao-conteudo/utils';
import { semanasRotuladas } from '@/modules/gestao-conteudo/lib/semanas';
import { hojeLocal, mesDaSemana } from '@/modules/designer/lib/periodo';

interface Props {
  clientes: ClienteGestao[];
  onAbrir: (clienteId: string) => void;
}

/** O que ainda precisa de ação da equipe, na ordem do fluxo. */
const PENDENCIAS: { etapas: Etapa[]; texto: string }[] = [
  { etapas: ['em_edicao', 'reprovado'], texto: 'a editar' },
  { etapas: ['editado'], texto: 'a enviar p/ aprovação' },
  { etapas: ['aprovado'], texto: 'a programar' },
];

export function SemanaAtual({ clientes, onAbrir }: Props) {
  const hoje = hojeLocal();
  const mes = mesDaSemana(hoje);
  const semana = useMemo(
    () => semanasRotuladas(mes).find((s) => hoje >= s.ini && hoje <= s.fim),
    [mes, hoje],
  );
  const postsQ = usePostsDoMes(mes);
  const [filtro, setFiltro] = useState<Etapa | ''>('');

  const postsDaSemana = useMemo(
    () => (postsQ.data ?? []).filter((p) => p.semana === semana?.numero),
    [postsQ.data, semana],
  );

  const linhas = useMemo(() => {
    const ids = new Set(clientes.map((c) => c.id));
    const doGrupo = postsDaSemana.filter((p) => ids.has(p.cliente_id));
    return clientes
      .map((c) => {
        const meus = doGrupo.filter((p) => p.cliente_id === c.id);
        const pend = PENDENCIAS
          .map((x) => ({ texto: x.texto, qtd: meus.filter((p) => x.etapas.includes(p.etapa)).length }))
          .filter((x) => x.qtd > 0);
        const meta = c.conteudos_por_semana ?? 0;
        const faltam = Math.max(0, meta - meus.length);
        return { c, meus, n: contar(meus), pend, meta, faltam, peso: pend.reduce((s, x) => s + x.qtd, 0) + faltam };
      })
      .filter((l) => !filtro || l.meus.some((p) => p.etapa === filtro))
      .sort((a, b) => b.peso - a.peso || a.c.nome.localeCompare(b.c.nome));
  }, [clientes, postsDaSemana, filtro]);

  const totais = contar(postsDaSemana.filter((p) => clientes.some((c) => c.id === p.cliente_id)));

  if (!semana) {
    return <Card className="p-6 text-sm text-slate-400">Hoje não cai em nenhuma semana do mês {mes}.</Card>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-white">{semana.label}</h2>
        <span className="text-xs text-slate-400">mesma semana do Designer · só os posts desta semana</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {ETAPAS.map((e) => {
          const ativo = filtro === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setFiltro(ativo ? '' : e.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                ativo ? 'border-brand-400/70 bg-brand-500/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
            >
              <div className="text-[11px] text-slate-400"><GlassIcon emoji={e.emoji} /> {e.label}</div>
              <div className="mt-1 text-2xl font-semibold text-white">{totais[e.id]}</div>
            </button>
          );
        })}
      </div>

      {postsQ.isLoading && <div className="flex justify-center py-10"><Spinner /></div>}
      {postsQ.error && <Card className="p-4 text-sm text-red-300">Erro ao carregar: {(postsQ.error as Error).message}</Card>}

      {!postsQ.isLoading && (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-xs">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-2 py-2 text-center">Semana</th>
                {ETAPAS.map((e) => (
                  <th key={e.id} className="px-2 py-2 text-left"><GlassIcon emoji={e.emoji} /> {e.label}</th>
                ))}
                <th className="px-3 py-2 text-left">O que falta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {linhas.map(({ c, meus, n, pend, meta, faltam }) => (
                <tr key={c.id} className="cursor-pointer align-top hover:bg-white/5" onClick={() => onAbrir(c.id)}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {c.logo_url
                        ? <LogoCliente src={c.logo_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                        : <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/5"><GlassIcon name="building" /></span>}
                      <span className="font-medium text-slate-100">{c.nome}</span>
                    </div>
                  </td>
                  <td className={`px-2 py-2 text-center ${meta && meus.length < meta ? 'text-amber-300' : 'text-slate-200'}`}>
                    {meus.length}{meta ? ` / ${meta}` : ''}
                  </td>
                  {ETAPAS.map((e) => (
                    <td key={e.id} className="px-2 py-2">
                      {n[e.id] === 0 ? <span className="text-slate-600">·</span> : (
                        <ul className="space-y-0.5">
                          {meus.filter((p: Post) => p.etapa === e.id).map((p) => (
                            <li key={p.id} className="flex max-w-[11rem] items-center gap-1.5 text-slate-200" title={p.titulo}>
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COR_ETAPA[e.id]}`} />
                              <span className="truncate">{p.titulo}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {pend.length === 0 && faltam === 0
                      ? <Badge tone="green">Em dia</Badge>
                      : (
                        <div className="flex flex-wrap gap-1">
                          {pend.map((x) => <Badge key={x.texto} tone="amber">{x.qtd} {x.texto}</Badge>)}
                          {faltam > 0 && <Badge tone="red">{faltam} sem planejar</Badge>}
                        </div>
                      )}
                  </td>
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr><td colSpan={ETAPAS.length + 3} className="px-3 py-8 text-center text-slate-400">Nenhum cliente com posts nessa etapa na semana.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
