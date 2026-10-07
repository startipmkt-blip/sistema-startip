import { Modal } from '@/shared/ui/Modal';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { useExcluirIdeia } from '@/modules/ideias/api/ideiasApi';
import { TIPO_LABEL, TIPO_TONE, IMPORTANCIA_LABEL, IMPORTANCIA_TONE, AUTOR_LABEL } from '@/modules/ideias/types';
import type { Ideia } from '@/modules/ideias/types';

interface Props {
  open: boolean;
  onClose: () => void;
  ideia: Ideia | null;
  onEditar: (ideia: Ideia) => void;
}

function formatarData(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function IdeiaDetalheModal({ open, onClose, ideia, onEditar }: Props) {
  const excluir = useExcluirIdeia();

  if (!ideia) return null;

  function handleExcluir() {
    if (!ideia || !confirm('Tem certeza que deseja excluir esta ideia?')) return;
    excluir.mutate(ideia.id, { onSuccess: onClose });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ideia.titulo}
      size="lg"
      footer={
        <>
          <Button variant="ghost" className="mr-auto text-red-400 hover:text-red-300" onClick={handleExcluir}>
            Excluir
          </Button>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          <Button onClick={() => { onClose(); onEditar(ideia); }}>Editar</Button>
        </>
      }
    >
      <div className="space-y-5">
        {ideia.descricao && (
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Descrição</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{ideia.descricao}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo</h3>
            <Badge tone={TIPO_TONE[ideia.tipo]}>{TIPO_LABEL[ideia.tipo]}</Badge>
          </div>

          {ideia.tipo === 'cliente' && ideia.cliente_nome && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Cliente</h3>
              <span className="text-sm text-slate-200">{ideia.cliente_nome}</span>
            </div>
          )}

          {ideia.tipo === 'projeto' && ideia.projeto_nome && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Projeto</h3>
              <span className="text-sm text-slate-200">{ideia.projeto_nome}</span>
            </div>
          )}

          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Autor</h3>
            <span className="text-sm text-slate-200">{AUTOR_LABEL[ideia.autor]}</span>
          </div>

          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Data</h3>
            <span className="text-sm text-slate-200">{formatarData(ideia.data_ideia)}</span>
          </div>

          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Importância</h3>
            <Badge tone={IMPORTANCIA_TONE[ideia.importancia]}>{IMPORTANCIA_LABEL[ideia.importancia]}</Badge>
          </div>
        </div>
      </div>
    </Modal>
  );
}
