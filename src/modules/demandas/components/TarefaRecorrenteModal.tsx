import { useState } from 'react';
import {
  useSalvarRecorrente,
  DIAS,
  type RecorrenteForm,
  type TarefaRecorrente,
  type RecorrenciaTipo,
} from '@/modules/demandas/recorrentesApi';
import { RESPONSAVEIS, HORARIOS_FAIXA } from '@/modules/demandas/types';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { AreaTexto, Campo, Chips, Escolha, JanelaFormulario, Texto } from '@/shared/ui/form/FormKit';

interface Props {
  open: boolean;
  onClose: () => void;
  tarefa?: TarefaRecorrente;
}

const TIPOS: { id: RecorrenciaTipo; titulo: string; descricao: string }[] = [
  { id: 'diaria', titulo: 'Todo dia', descricao: 'Aparece em todos os dias' },
  { id: 'semanal', titulo: 'Toda semana', descricao: 'Em dias fixos da semana' },
  { id: 'mensal', titulo: 'Todo mês', descricao: 'Em um dia fixo do mês' },
];

export function TarefaRecorrenteModal({ open, onClose, tarefa }: Props) {
  const salvar = useSalvarRecorrente();
  const [erro, setErro] = useState('');
  const [form, setForm] = useState<RecorrenteForm>({
    titulo: tarefa?.titulo ?? '',
    descricao: tarefa?.descricao ?? '',
    responsaveis: tarefa?.responsaveis ?? [],
    tipo: tarefa?.tipo ?? 'semanal',
    dias_semana: tarefa?.dias_semana ?? [1],
    dia_mes: tarefa?.dia_mes ?? new Date().getDate(),
    horario: tarefa?.horario ?? '',
  });
  const set = <K extends keyof RecorrenteForm>(k: K, v: RecorrenteForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const semDia = form.tipo === 'semanal' && form.dias_semana.length === 0;
  const semDiaMes = form.tipo === 'mensal' && !(form.dia_mes && form.dia_mes >= 1 && form.dia_mes <= 31);
  const invalido = !form.titulo.trim() || semDia || semDiaMes;

  async function handleSalvar() {
    if (invalido) return;
    setErro('');
    try {
      await salvar.mutateAsync({
        id: tarefa?.id,
        dados: { ...form, titulo: form.titulo.trim(), descricao: form.descricao.trim() },
      });
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <JanelaFormulario
      open={open}
      onClose={onClose}
      titulo={tarefa ? 'Editar Tarefa Recorrente' : 'Nova Tarefa Recorrente'}
      rodape={
        <div className="flex w-full flex-col gap-2">
          {erro && <p role="alert" className="text-center text-xs text-red-400">{erro}</p>}
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvar.isPending || invalido}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <GlassIcon name="check" className="h-4 w-4" />
            {salvar.isPending ? 'Salvando…' : tarefa ? 'Salvar alterações' : 'Criar Tarefa Recorrente'}
          </button>
        </div>
      }
    >
      <Campo label="Tarefa" obrigatorio caixaAlta>
        <Texto placeholder="O que precisa ser feito sempre?" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} autoFocus />
      </Campo>
      <Campo label="Descrição" caixaAlta>
        <AreaTexto placeholder="Detalhes, passo a passo ou links da tarefa…" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
      </Campo>
      <Campo label="Responsáveis" caixaAlta dica="vários">
        <Chips opcoes={RESPONSAVEIS.map((r) => ({ id: r, label: r }))} valores={form.responsaveis} onChange={(v) => set('responsaveis', v)} />
      </Campo>
      <Campo label="Recorrência" caixaAlta icone="repeat">
        <div className="grid gap-2 sm:grid-cols-3">
          {TIPOS.map((t) => {
            const ativo = form.tipo === t.id;
            return (
              <button key={t.id} type="button" aria-pressed={ativo} onClick={() => set('tipo', t.id)}
                className={`opcao-cartao rounded-xl border px-3 py-2.5 text-left transition-colors ${ativo ? 'opcao-ativa border-brand-400 bg-brand-500/10' : 'border-white/10 hover:border-white/25'}`}>
                <div className="text-sm font-semibold text-slate-100">{t.titulo}</div>
                <div className="text-xs text-slate-400">{t.descricao}</div>
              </button>
            );
          })}
        </div>
      </Campo>
      {form.tipo === 'semanal' && (
        <Campo label="Dias da semana" caixaAlta>
          <Chips
            opcoes={DIAS.map((d, i) => ({ id: String(i), label: d }))}
            valores={form.dias_semana.map(String)}
            onChange={(v) => set('dias_semana', v.map(Number).sort((a, b) => a - b))}
          />
          {semDia && <p className="text-xs text-red-400">Selecione ao menos um dia.</p>}
        </Campo>
      )}
      {form.tipo === 'mensal' && (
        <Campo label="Dia do mês" caixaAlta>
          <Escolha
            opcoes={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Dia ${i + 1}` }))}
            value={String(form.dia_mes ?? '')}
            onChange={(e) => set('dia_mes', Number(e.target.value))}
          />
          {(form.dia_mes ?? 0) > 28 && <p className="text-xs text-slate-400">Em meses com menos dias, a tarefa cai no último dia do mês.</p>}
        </Campo>
      )}
      <Campo label="Horário" caixaAlta dica="opcional" icone="clock">
        <Escolha
          opcoes={[{ value: '', label: 'Livre' }, ...HORARIOS_FAIXA.filter(Boolean).map((h) => ({ value: h, label: h }))]}
          value={form.horario}
          onChange={(e) => set('horario', e.target.value)}
        />
      </Campo>
    </JanelaFormulario>
  );
}
