import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { TOCADORES, type Tocador } from '@/modules/demandas/api/cronometroApi';

interface Props {
  titulo: string;
  onEscolher: (tocador: Tocador) => void;
  onCancelar: () => void;
}

// Sem opção padrão de propósito: o cronômetro precisa saber quem está tocando.
export function TocadorModal({ titulo, onEscolher, onCancelar }: Props) {
  return (
    <Modal
      open
      onClose={onCancelar}
      title="Quem vai tocar essa demanda?"
      footer={<Button variant="secondary" onClick={onCancelar}>Cancelar</Button>}
    >
      <p className="mb-1 text-sm text-slate-300">
        <span className="font-medium text-slate-100">{titulo}</span>
      </p>
      <p className="mb-4 text-xs text-slate-400">
        Escolha a pessoa para iniciar o cronômetro. A demanda só vai para "Em andamento" depois disso.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {TOCADORES.map((nome) => (
          <button
            key={nome}
            type="button"
            onClick={() => onEscolher(nome)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm font-semibold text-slate-100 transition-colors hover:border-brand-400/60 hover:bg-brand-500/10"
          >
            ⏱ {nome}
          </button>
        ))}
      </div>
    </Modal>
  );
}
