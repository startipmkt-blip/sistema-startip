import { pilaresEditoriais } from '@/modules/gestao-conteudo/api/pilaresApi';
import { GerenciarCategorias } from '@/shared/ui/form/GerenciarCategorias';

/** "Gerenciar Pilares Editoriais": usado pela linha editorial e pelos roteiros. */
export function GerenciarPilares({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lista = pilaresEditoriais.useLista();
  const salvar = pilaresEditoriais.useSalvar();
  const excluir = pilaresEditoriais.useExcluir();
  const itens = lista.data ?? [];
  return (
    <GerenciarCategorias
      open={open}
      onClose={onClose}
      titulo="Gerenciar Pilares Editoriais"
      rotuloNovo="Novo pilar"
      placeholder="Ex: Bastidores, Prova Social..."
      itens={itens}
      avisoExcluir="Os conteúdos que usavam esse pilar ficam sem pilar."
      onCriar={(nome, cor) => salvar.mutateAsync({ dados: { nome, cor, ordem: itens.length + 1, cliente_id: null } })}
      onSalvar={(id, nome, cor) => salvar.mutateAsync({ id, dados: { nome, cor } })}
      onExcluir={(id) => excluir.mutateAsync(id)}
    />
  );
}
