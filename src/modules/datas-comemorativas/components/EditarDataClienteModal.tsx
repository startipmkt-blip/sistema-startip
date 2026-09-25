import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { PRIORIDADES, useAtualizarDataCliente } from '@/modules/datas-comemorativas/api/datasApi';
import { PRIORIDADE_LABEL, type DataBase, type DataCliente, type Prioridade } from '@/modules/datas-comemorativas/types';

interface Props {
  item: DataCliente;
  base: DataBase;
  onClose: () => void;
}

export function EditarDataClienteModal({ item, base, onClose }: Props) {
  const atualizar = useAtualizarDataCliente();
  const [prioridade, setPrioridade] = useState<Prioridade | ''>(item.prioridade ?? '');
  const [relevancia, setRelevancia] = useState(item.relevancia);
  const [usarAngulosProprios, setUsarAngulosProprios] = useState(item.angulos !== null);
  const [angulosTxt, setAngulosTxt] = useState((item.angulos ?? base.angulos).join('\n'));
  const [visivel, setVisivel] = useState(item.visivel_cliente ?? true);

  async function salvar() {
    await atualizar.mutateAsync({
      id: item.id,
      dados: {
        prioridade: prioridade || null,
        relevancia: relevancia.trim(),
        angulos: usarAngulosProprios ? angulosTxt.split('\n').map((a) => a.trim()).filter(Boolean) : null,
        visivel_cliente: visivel,
      },
    });
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`${base.nome} — ajustes deste cliente`}>
      <div className="space-y-3">
        <Select
          id="dc-prio" label="Prioridade para este cliente" value={prioridade}
          onChange={(e) => setPrioridade(e.target.value as Prioridade | '')}
          options={[
            { value: '', label: `Padrão da Base Mãe (${PRIORIDADE_LABEL[base.prioridade]})` },
            ...PRIORIDADES.map((p) => ({ value: p, label: PRIORIDADE_LABEL[p] })),
          ]}
        />
        <Textarea
          id="dc-rel" label="Relevância para o cliente" value={relevancia}
          placeholder="Por que esta data faz sentido para este cliente?"
          onChange={(e) => setRelevancia(e.target.value)} className="min-h-[70px]"
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={usarAngulosProprios} onChange={(e) => setUsarAngulosProprios(e.target.checked)} />
          Usar ângulos próprios para este cliente
        </label>
        {usarAngulosProprios ? (
          <Textarea id="dc-ang" label="Ângulos (um por linha)" value={angulosTxt} onChange={(e) => setAngulosTxt(e.target.value)} />
        ) : (
          <p className="text-[11px] text-slate-500">Usando os ângulos da Base Mãe{base.angulos.length ? `: ${base.angulos.join(', ')}` : ' (nenhum)'}.</p>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} />
          Mostrar esta data no link do cliente
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void salvar()} disabled={atualizar.isPending}>Salvar</Button>
        </div>
      </div>
    </Modal>
  );
}
