import { useState } from 'react';
import {
  useSalvarRecorrente,
  DIAS,
  type RecorrenteForm,
  type TarefaRecorrente,
  type RecorrenciaTipo,
} from '@/modules/demandas/recorrentesApi';
import { RESPONSAVEIS, HORARIOS_FAIXA } from '@/modules/demandas/types';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  tarefa?: TarefaRecorrente;
}

interface ChipsProps<T extends string | number> {
  label: string;
  opcoes: { value: T; label: string }[];
  selecionados: T[];
  onToggle: (v: T) => void;
}

function Chips<T extends string | number>({ label, opcoes, selecionados, onToggle }: ChipsProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => {
          const ativo = selecionados.includes(o.value);
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={ativo}
              onClick={() => onToggle(o.value)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                ativo ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function alternar<T>(lista: T[], v: T): T[] {
  return lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];
}

export function TarefaRecorrenteModal({ open, onClose, tarefa }: Props) {
  const salvar = useSalvarRecorrente();
  const [form, setForm] = useState<RecorrenteForm>({
    titulo: tarefa?.titulo ?? '',
    descricao: tarefa?.descricao ?? '',
    responsaveis: tarefa?.responsaveis ?? [],
    tipo: tarefa?.tipo ?? 'semanal',
    dias_semana: tarefa?.dias_semana ?? [1],
    horario: tarefa?.horario ?? '',
  });
  const set = <K extends keyof RecorrenteForm>(k: K, v: RecorrenteForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const semDia = form.tipo === 'semanal' && form.dias_semana.length === 0;
  const invalido = !form.titulo.trim() || semDia;

  async function handleSalvar() {
    if (invalido) return;
    await salvar.mutateAsync({
      id: tarefa?.id,
      dados: { ...form, titulo: form.titulo.trim(), descricao: form.descricao.trim() },
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tarefa ? 'Editar tarefa recorrente' : 'Nova tarefa recorrente'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending || invalido}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input id="titulo" label="Tarefa" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
        <Textarea
          id="descricao"
          label="Descrição (opcional)"
          placeholder="Detalhes, passo a passo ou links da tarefa…"
          value={form.descricao}
          onChange={(e) => set('descricao', e.target.value)}
        />
        <Chips
          label="Responsáveis"
          opcoes={RESPONSAVEIS.map((r) => ({ value: r as string, label: r }))}
          selecionados={form.responsaveis}
          onToggle={(r) => set('responsaveis', alternar(form.responsaveis, r))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="tipo"
            label="Recorrência"
            options={[
              { value: 'diaria', label: 'Todo dia' },
              { value: 'semanal', label: 'Toda semana (dias fixos)' },
            ]}
            value={form.tipo}
            onChange={(e) => set('tipo', e.target.value as RecorrenciaTipo)}
          />
          <Select
            id="hora"
            label="Horário (opcional)"
            options={[{ value: '', label: 'Livre' }, ...HORARIOS_FAIXA.filter(Boolean).map((h) => ({ value: h, label: h }))]}
            value={form.horario}
            onChange={(e) => set('horario', e.target.value)}
          />
        </div>
        {form.tipo === 'semanal' && (
          <div className="space-y-1">
            <Chips
              label="Dias da semana"
              opcoes={DIAS.map((d, i) => ({ value: i, label: d }))}
              selecionados={form.dias_semana}
              onToggle={(d) => set('dias_semana', alternar(form.dias_semana, d).sort((a, b) => a - b))}
            />
            {semDia && <p className="text-xs text-red-300">Selecione ao menos um dia.</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
