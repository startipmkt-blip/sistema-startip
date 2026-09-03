import { useState } from 'react';
import { useRoteiro, useExcluirEtapaRoteiro } from '@/modules/onboarding/api/roteiroApi';
import { EtapaRoteiroModal } from '@/modules/onboarding/components/EtapaRoteiroModal';
import type { EtapaRoteiro } from '@/modules/onboarding/roteiro';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';

// Mapa visual do roteiro de onboarding. Com `editavel`, permite gerir as etapas.
export function RoteiroMapa({ editavel = false }: { editavel?: boolean }) {
  const { data: roteiro, isLoading } = useRoteiro();
  const excluir = useExcluirEtapaRoteiro();
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<EtapaRoteiro | undefined>();

  if (isLoading) return <Spinner />;

  return (
    <div>
      {editavel && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => { setEditando(undefined); setFormOpen(true); }}>
            + Adicionar etapa
          </Button>
        </div>
      )}

      <div className="relative">
        <div className="absolute bottom-0 left-4 top-2 w-px bg-brand-500/20" aria-hidden />
        <ol className="space-y-4">
          {(roteiro ?? []).map((e) => (
            <li key={e.numero} className="relative pl-12">
              <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {e.numero}
              </span>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-100">{e.titulo}</h3>
                  <div className="flex items-center gap-2">
                    {e.tempo && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                        ⏱ {e.tempo}
                      </span>
                    )}
                    {editavel && (
                      <>
                        <button
                          className="text-xs font-medium text-brand-300 hover:underline"
                          onClick={() => { setEditando(e); setFormOpen(true); }}
                        >
                          Editar
                        </button>
                        <button
                          className="text-xs font-medium text-red-400 hover:underline"
                          onClick={() => { if (confirm(`Excluir "${e.titulo}"?`)) excluir.mutate(e.numero); }}
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {e.itens.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="mt-1 text-brand-400" aria-hidden>›</span>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {formOpen && (
        <EtapaRoteiroModal open={formOpen} onClose={() => setFormOpen(false)} etapa={editando} />
      )}
    </div>
  );
}
