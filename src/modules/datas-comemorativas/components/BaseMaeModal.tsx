import { useMemo, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import {
  PRIORIDADES, useDatasBase, useExcluirDataBase, useSalvarDataBase, type DataBaseForm,
} from '@/modules/datas-comemorativas/api/datasApi';
import {
  anoDe, descreverRegra, formatarData, hojeSaoPaulo, ocorrenciaNoAno,
} from '@/modules/datas-comemorativas/lib/recorrencia';
import {
  DIAS_SEMANA, MESES, PRIORIDADE_LABEL, PRIORIDADE_TONE, REGRA_LABEL,
  type DataBase, type Marco, type RegraRecorrencia,
} from '@/modules/datas-comemorativas/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const VAZIO: DataBaseForm = {
  nome: '', categoria: '', prioridade: 'media', opcional: false, regra: 'fixa',
  mes: 1, dia: 1, dia_semana: 0, ordem_semana: 1, dias_offset: 0, relativa_a: null,
  data_unica: null, angulos: [], observacao: '', marcos: [],
};

export function BaseMaeModal({ open, onClose }: Props) {
  const { data: base, isLoading } = useDatasBase();
  const excluir = useExcluirDataBase();
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<DataBase | 'nova' | null>(null);
  const hoje = hojeSaoPaulo();
  const mapa = useMemo(() => new Map((base ?? []).map((b) => [b.id, b])), [base]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (base ?? [])
      .filter((b) => !q || b.nome.toLowerCase().includes(q) || b.categoria.toLowerCase().includes(q))
      .map((b) => {
        const esteAno = ocorrenciaNoAno(b, anoDe(hoje), mapa);
        const proxima = esteAno && esteAno >= hoje ? esteAno : ocorrenciaNoAno(b, anoDe(hoje) + 1, mapa);
        return { b, proxima };
      })
      .sort((x, y) => (x.proxima ?? '9999').localeCompare(y.proxima ?? '9999'));
  }, [base, busca, hoje, mapa]);

  async function remover(b: DataBase) {
    if (!confirm(`Excluir "${b.nome}" da Base Mãe?`)) return;
    try {
      await excluir.mutateAsync(b.id);
    } catch (e) {
      alert((e as Error).message === 'em uso'
        ? 'Esta data está em uso por algum cliente (ou por outra data relativa). Remova-a dos clientes antes de excluir.'
        : (e as Error).message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editando ? (editando === 'nova' ? 'Nova data na Base Mãe' : `Editar: ${editando.nome}`) : '📚 Base Mãe de datas comemorativas'} size="xl">
      {editando ? (
        <DataBaseEditor
          inicial={editando === 'nova' ? undefined : editando}
          base={base ?? []}
          onDone={() => setEditando(null)}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Cada data tem uma <strong>regra de recorrência</strong>: o sistema calcula sozinho o dia em cada ano
            (2026, 2027, …). Alterações aqui valem para todos os clientes que usam a data.
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input placeholder="Buscar por nome ou categoria…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Button onClick={() => setEditando('nova')}>+ Nova data</Button>
          </div>
          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10">
              {lista.map(({ b, proxima }) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-100">{b.nome}</div>
                    <div className="text-[11px] text-slate-500">
                      {descreverRegra(b, mapa)}
                      {proxima && <> · próxima: {formatarData(proxima)}</>}
                    </div>
                  </div>
                  <Badge tone={PRIORIDADE_TONE[b.prioridade]}>{PRIORIDADE_LABEL[b.prioridade]}</Badge>
                  <button onClick={() => setEditando(b)} className="text-xs font-medium text-brand-300 hover:underline">✎ Editar</button>
                  <button onClick={() => void remover(b)} className="text-xs text-slate-500 hover:text-red-300">Excluir</button>
                </li>
              ))}
              {lista.length === 0 && <li className="p-6 text-center text-xs text-slate-500">Nenhuma data encontrada.</li>}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

function marcosParaTexto(marcos: Marco[]): string {
  return marcos.map((m) => `${m.dias} | ${m.titulo}`).join('\n');
}

function textoParaMarcos(txt: string): Marco[] {
  return txt
    .split('\n')
    .map((l) => l.split('|'))
    .filter((p) => p.length >= 2 && p[1].trim() && !Number.isNaN(parseInt(p[0], 10)))
    .map((p) => ({ dias: parseInt(p[0], 10), titulo: p.slice(1).join('|').trim() }));
}

function DataBaseEditor({ inicial, base, onDone }: { inicial?: DataBase; base: DataBase[]; onDone: () => void }) {
  const salvar = useSalvarDataBase();
  const [f, setF] = useState<DataBaseForm>(() => (inicial ? { ...VAZIO, ...inicial } : VAZIO));
  const [angulosTxt, setAngulosTxt] = useState((inicial?.angulos ?? []).join('\n'));
  const [marcosTxt, setMarcosTxt] = useState(marcosParaTexto(inicial?.marcos ?? []));
  const [erro, setErro] = useState<string | null>(null);
  const set = <K extends keyof DataBaseForm>(k: K, v: DataBaseForm[K]) => setF((x) => ({ ...x, [k]: v }));

  const hoje = hojeSaoPaulo();
  const mapa = useMemo(() => new Map(base.map((b) => [b.id, b])), [base]);
  const ancoras = base.filter((b) => b.id !== inicial?.id && b.regra !== 'relativa');
  const previa = [anoDe(hoje), anoDe(hoje) + 1, anoDe(hoje) + 2].map((ano) => ({
    ano,
    data: ocorrenciaNoAno({ ...f, id: inicial?.id ?? 'previa' }, ano, mapa),
  }));

  async function enviar() {
    setErro(null);
    if (!f.nome.trim()) { setErro('Informe o nome.'); return; }
    if (f.regra === 'relativa' && !f.relativa_a) { setErro('Escolha a data de referência.'); return; }
    if (f.regra === 'unica' && !f.data_unica) { setErro('Informe a data.'); return; }
    if (f.regra === 'fixa' && previa.every((p) => !p.data)) { setErro('Dia/mês inválidos.'); return; }
    const dados: DataBaseForm = {
      nome: f.nome.trim(),
      categoria: f.categoria.trim(),
      prioridade: f.prioridade,
      opcional: f.opcional,
      regra: f.regra,
      mes: f.regra === 'fixa' || f.regra === 'semana_do_mes' ? f.mes : null,
      dia: f.regra === 'fixa' ? f.dia : null,
      dia_semana: f.regra === 'semana_do_mes' ? f.dia_semana : null,
      ordem_semana: f.regra === 'semana_do_mes' ? f.ordem_semana : null,
      dias_offset: f.regra === 'pascoa' || f.regra === 'relativa' ? (f.dias_offset ?? 0) : null,
      relativa_a: f.regra === 'relativa' ? f.relativa_a : null,
      data_unica: f.regra === 'unica' ? f.data_unica : null,
      angulos: angulosTxt.split('\n').map((a) => a.trim()).filter(Boolean),
      observacao: f.observacao.trim(),
      marcos: textoParaMarcos(marcosTxt),
    };
    try {
      await salvar.mutateAsync({ id: inicial?.id, dados });
      onDone();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const num = (v: string) => (v === '' ? null : Number(v));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input id="db-nome" label="Nome" value={f.nome} onChange={(e) => set('nome', e.target.value)} />
        <Input id="db-cat" label="Categoria" placeholder="Ex.: Comercial / Tecnologia" value={f.categoria} onChange={(e) => set('categoria', e.target.value)} />
        <Select
          id="db-prio" label="Prioridade padrão" value={f.prioridade}
          onChange={(e) => set('prioridade', e.target.value as DataBaseForm['prioridade'])}
          options={PRIORIDADES.map((p) => ({ value: p, label: PRIORIDADE_LABEL[p] }))}
        />
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
          <input type="checkbox" checked={f.opcional} onChange={(e) => set('opcional', e.target.checked)} />
          Uso opcional (não é obrigatório gerar conteúdo)
        </label>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <Select
          id="db-regra" label="Regra de recorrência" value={f.regra}
          onChange={(e) => {
            const regra = e.target.value as RegraRecorrencia;
            setF((x) => ({
              ...x, regra,
              mes: x.mes ?? 1, dia: x.dia ?? 1, dia_semana: x.dia_semana ?? 0,
              ordem_semana: x.ordem_semana ?? 1, dias_offset: x.dias_offset ?? 0,
            }));
          }}
          options={(Object.keys(REGRA_LABEL) as RegraRecorrencia[]).map((r) => ({ value: r, label: REGRA_LABEL[r] }))}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {f.regra === 'fixa' && (
            <>
              <Input id="db-dia" label="Dia" type="number" min={1} max={31} value={f.dia ?? ''} onChange={(e) => set('dia', num(e.target.value))} />
              <Select id="db-mes" label="Mês" value={String(f.mes ?? 1)} onChange={(e) => set('mes', Number(e.target.value))}
                options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} />
            </>
          )}
          {f.regra === 'semana_do_mes' && (
            <>
              <Select id="db-ord" label="Qual" value={String(f.ordem_semana ?? 1)} onChange={(e) => set('ordem_semana', Number(e.target.value))}
                options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}º` })).concat([{ value: '-1', label: 'Último(a)' }])} />
              <Select id="db-dsem" label="Dia da semana" value={String(f.dia_semana ?? 0)} onChange={(e) => set('dia_semana', Number(e.target.value))}
                options={DIAS_SEMANA.map((d, i) => ({ value: String(i), label: d }))} />
              <Select id="db-mes2" label="Mês" value={String(f.mes ?? 1)} onChange={(e) => set('mes', Number(e.target.value))}
                options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} />
            </>
          )}
          {f.regra === 'pascoa' && (
            <Input id="db-off" label="Dias em relação à Páscoa (negativo = antes)" type="number" value={f.dias_offset ?? 0} onChange={(e) => set('dias_offset', num(e.target.value))} />
          )}
          {f.regra === 'relativa' && (
            <>
              <Select id="db-ancora" label="Data de referência" value={f.relativa_a ?? ''} onChange={(e) => set('relativa_a', e.target.value || null)}
                options={[{ value: '', label: 'Escolha…' }, ...ancoras.map((b) => ({ value: b.id, label: b.nome }))]} />
              <Input id="db-off2" label="Dias depois (negativo = antes)" type="number" value={f.dias_offset ?? 0} onChange={(e) => set('dias_offset', num(e.target.value))} />
            </>
          )}
          {f.regra === 'unica' && (
            <Input id="db-unica" label="Data" type="date" value={f.data_unica ?? ''} onChange={(e) => set('data_unica', e.target.value || null)} className="[color-scheme:dark]" />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
          Prévia:
          {previa.map((p) => (
            <span key={p.ano} className="rounded-full bg-white/5 px-2 py-0.5 text-slate-200">
              {p.ano}: {p.data ? formatarData(p.data, { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—'}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Textarea id="db-ang" label="Possíveis ângulos (um por linha)" value={angulosTxt} onChange={(e) => setAngulosTxt(e.target.value)} />
        <Textarea
          id="db-marcos" label="Marcos de planejamento (dias | título)"
          placeholder={'-31 | Definição da campanha\n-7 | Início da comunicação'}
          value={marcosTxt} onChange={(e) => setMarcosTxt(e.target.value)}
        />
      </div>
      <Textarea id="db-obs" label="Observação" value={f.observacao} onChange={(e) => set('observacao', e.target.value)} className="min-h-[60px]" />

      {erro && <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-300">{erro}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>Voltar</Button>
        <Button onClick={() => void enviar()} disabled={salvar.isPending}>Salvar</Button>
      </div>
    </div>
  );
}
