import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { AUTOR_LABEL, IMPORTANCIA_LABEL, IMPORTANCIA_TONE } from '@/modules/ideias/types';
import { MiniaturaAnexo, abrirAnexo } from './AnexosCriativo';
import { useDuplicarCriativo, useExcluirCriativo } from '@/modules/ideias/criativos/criativosApi';
import {
  FORMATO_LABEL, OBJETIVO_LABEL, STATUS_LABEL, STATUS_TONE, formatarData, formatarTamanho,
  type Criativo,
} from '@/modules/ideias/criativos/types';

interface Props {
  open: boolean;
  onClose: () => void;
  criativo: Criativo | null;
  onEditar: (c: Criativo) => void;
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{rotulo}</p>
      <div className="mt-1 text-sm text-slate-200">{children}</div>
    </div>
  );
}

export function CriativoDetalheModal({ open, onClose, criativo, onEditar }: Props) {
  const { data: clientes = [] } = useClientes('');
  const excluir = useExcluirCriativo();
  const duplicar = useDuplicarCriativo();
  const [erro, setErro] = useState<string | null>(null);

  if (!criativo) return null;
  const nomes = criativo.cliente_ids.map((id) => clientes.find((c) => c.id === id)?.nome ?? 'Cliente');

  function handleExcluir() {
    if (!criativo || !confirm(`Excluir a ideia "${criativo.titulo}"? Os anexos também serão apagados.`)) return;
    setErro(null);
    excluir.mutate(criativo, {
      onSuccess: onClose,
      onError: (e) => setErro((e as Error).message || 'Falha ao excluir.'),
    });
  }

  function handleDuplicar() {
    if (!criativo) return;
    setErro(null);
    duplicar.mutate(criativo, {
      onSuccess: onClose,
      onError: (e) => setErro((e as Error).message || 'Falha ao duplicar.'),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ideia de criativo"
      size="lg"
      footer={
        <>
          <Button variant="ghost" className="mr-auto text-red-400 hover:text-red-300" onClick={handleExcluir} disabled={excluir.isPending}>
            {excluir.isPending ? 'Excluindo…' : 'Excluir'}
          </Button>
          <Button variant="secondary" onClick={handleDuplicar} disabled={duplicar.isPending}>
            {duplicar.isPending ? 'Duplicando…' : 'Duplicar'}
          </Button>
          <Button onClick={() => { onClose(); onEditar(criativo); }}>Editar</Button>
        </>
      }
    >
      <div className="space-y-5">
        {erro && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}

        <div>
          <h3 className="text-lg font-semibold text-white">{criativo.titulo}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={STATUS_TONE[criativo.status]}>{STATUS_LABEL[criativo.status]}</Badge>
            <Badge tone={IMPORTANCIA_TONE[criativo.importancia]}>{IMPORTANCIA_LABEL[criativo.importancia]}</Badge>
            <Badge tone="slate">{AUTOR_LABEL[criativo.autor]}</Badge>
            <Badge tone="slate">{formatarData(criativo.data_ideia)}</Badge>
          </div>
        </div>

        {criativo.descricao && (
          <Campo rotulo="Descrição"><p className="whitespace-pre-wrap leading-relaxed">{criativo.descricao}</p></Campo>
        )}

        <Campo rotulo="Clientes">
          {criativo.geral ? (
            <Badge tone="blue">Ideia geral</Badge>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {nomes.map((n, i) => <Badge key={`${n}-${i}`} tone="green">{n}</Badge>)}
            </div>
          )}
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Formato">{criativo.formato ? FORMATO_LABEL[criativo.formato] : '—'}</Campo>
          <Campo rotulo="Objetivo">{criativo.objetivo ? OBJETIVO_LABEL[criativo.objetivo] : '—'}</Campo>
        </div>

        {criativo.link_referencia && (
          <Campo rotulo="Link de referência">
            <a href={criativo.link_referencia} target="_blank" rel="noreferrer noopener" className="break-all text-brand-300 hover:underline">
              {criativo.link_referencia}
            </a>
          </Campo>
        )}

        <Campo rotulo={`Anexos (${criativo.anexos.length})`}>
          {criativo.anexos.length === 0 ? (
            <span className="text-slate-500">Nenhum anexo.</span>
          ) : (
            <ul className="space-y-2">
              {criativo.anexos.map((a) => (
                <li key={a.path} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2">
                  <button type="button" onClick={() => void abrirAnexo(a)} className="shrink-0" title="Visualizar">
                    <MiniaturaAnexo anexo={a} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{a.name}</p>
                    <p className="text-[11px] text-slate-500">{formatarTamanho(a.size)}</p>
                  </div>
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => void abrirAnexo(a)}>Ver</Button>
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => void abrirAnexo(a, true)}>Baixar</Button>
                </li>
              ))}
            </ul>
          )}
        </Campo>
      </div>
    </Modal>
  );
}
