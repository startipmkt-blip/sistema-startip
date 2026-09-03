import { useMemo, useState } from 'react';
import {
  useProcessosDocs,
  useExcluirProcessoDoc,
} from '@/modules/processos/api/processosApi';
import {
  CATEGORIA_LABEL,
  CATEGORIA_OPTIONS,
  type ProcessoDoc,
} from '@/modules/processos/types';
import { ProcessoFormModal } from '@/modules/processos/components/ProcessoFormModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { urlDoArquivo } from '@/shared/lib/storage';
import type { ProcessoAnexo } from '@/modules/processos/types';

function AnexosList({ anexos }: { anexos: ProcessoAnexo[] }) {
  async function abrir(a: ProcessoAnexo) {
    try {
      const url = await urlDoArquivo('anexos-internos', a.path);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      alert((e as Error).message || 'Falha ao abrir.');
    }
  }
  return (
    <ul className="space-y-1">
      {anexos.map((a) => {
        const icone = a.type.startsWith('image/') ? '🖼️'
          : a.type === 'application/pdf' ? '📄'
          : /word|\.docx?$/.test(a.type + a.name) ? '📝' : '📎';
        return (
          <li key={a.path} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5 text-xs">
            <span>{icone}</span>
            <button onClick={() => void abrir(a)} className="min-w-0 flex-1 truncate text-left text-brand-300 hover:underline" type="button">
              {a.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ProcessosPage() {
  const { data: docs, isLoading } = useProcessosDocs();
  const excluir = useExcluirProcessoDoc();

  const [categoria, setCategoria] = useState('');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<ProcessoDoc | undefined>();

  const lista = useMemo(
    () => (docs ?? []).filter((d) => !categoria || d.categoria === categoria),
    [docs, categoria],
  );
  const selecionado = (docs ?? []).find((d) => d.id === selecionadoId) ?? lista[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Processos"
        subtitle="Documentação e procedimentos da agência para a equipe."
      >
        <Select
          options={[{ value: '', label: 'Todas as categorias' }, ...CATEGORIA_OPTIONS]}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        />
        <Button
          onClick={() => {
            setEditando(undefined);
            setFormOpen(true);
          }}
        >
          + Novo documento
        </Button>
      </PageHeader>

      {isLoading ? (
        <Card className="flex justify-center p-12"><Spinner /></Card>
      ) : lista.length === 0 ? (
        <Card><EmptyState message="Nenhum documento nesta categoria." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Lista de documentos */}
          <Card className="divide-y divide-white/10 lg:col-span-1">
            {lista.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelecionadoId(d.id)}
                className={`block w-full px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                  selecionado?.id === d.id ? 'bg-brand-500/10' : ''
                }`}
              >
                <div className="text-sm font-medium text-slate-100">{d.titulo}</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="blue">{CATEGORIA_LABEL[d.categoria]}</Badge>
                  <span className="text-xs text-slate-400">
                    atualizado {formatDate(d.updated_at)}
                  </span>
                </div>
              </button>
            ))}
          </Card>

          {/* Leitor do documento */}
          <Card className="p-6 lg:col-span-2">
            {selecionado ? (
              <article>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {selecionado.titulo}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {CATEGORIA_LABEL[selecionado.categoria]} · por {selecionado.autor} ·
                      atualizado {formatDate(selecionado.updated_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditando(selecionado);
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Excluir este documento?')) {
                          excluir.mutate(selecionado.id);
                          setSelecionadoId(null);
                        }
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {selecionado.conteudo}
                </div>
                {(selecionado.anexos?.length ?? 0) > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      📎 Anexos ({selecionado.anexos!.length})
                    </h3>
                    <AnexosList anexos={selecionado.anexos!} />
                  </div>
                )}
              </article>
            ) : (
              <EmptyState message="Selecione um documento." />
            )}
          </Card>
        </div>
      )}

      {formOpen && (
        <ProcessoFormModal open={formOpen} onClose={() => setFormOpen(false)} doc={editando} />
      )}
    </div>
  );
}
