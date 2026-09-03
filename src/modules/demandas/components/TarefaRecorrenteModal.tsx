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
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  tarefa?: TarefaRecorrente;
}

export function TarefaRecorrenteModal({ open, onClose, tarefa }: Props) {
  const salvar = useSalvarRecorrente();
  const [form, setForm] = useState<RecorrenteForm>({
    titulo: tarefa?.titulo ?? '',
    responsavel: tarefa?.responsavel ?? '',
    tipo: tarefa?.tipo ?? 'semanal',
    dia_semana: tarefa?.dia_semana ?? 1,
    horario: tarefa?.horario ?? '',
  });
  const set = <K extends keyof RecorrenteForm>(k: K, v: RecorrenteForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSalvar() {
    if (!form.titulo.trim()) return;
    await salvar.mutateAsync({ id: tarefa?.id, dados: form });
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
          <Button onClick={handleSalvar} disabled={salvar.isPending || !form.titulo.trim()}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input id="titulo" label="Tarefa" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="resp"
            label="Responsável"
            options={[{ value: '', label: '— selecionar —' }, ...RESPONSAVEIS.map((r) => ({ value: r, label: r }))]}
            value={form.responsavel}
            onChange={(e) => set('responsavel', e.target.value)}
          />
          <Select
            id="hora"
            label="Horário (opcional)"
            options={[{ value: '', label: 'Livre' }, ...HORARIOS_FAIXA.filter(Boolean).map((h) => ({ value: h, label: h }))]}
            value={form.horario}
            onChange={(e) => set('horario', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="tipo"
            label="Recorrência"
            options={[
              { value: 'diaria', label: 'Todo dia' },
              { value: 'semanal', label: 'Toda semana (dia fixo)' },
            ]}
            value={form.tipo}
            onChange={(e) => set('tipo', e.target.value as RecorrenciaTipo)}
          />
          {form.tipo === 'semanal' && (
            <Select
              id="dia"
              label="Dia da semana"
              options={DIAS.map((d, i) => ({ value: String(i), label: d }))}
              value={String(form.dia_semana)}
              onChange={(e) => set('dia_semana', Number(e.target.value))}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
