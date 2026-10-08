import { useState } from 'react';
import { useReunioes, useExcluirReuniao, useBackupReuniaoDrive, type Reuniao } from '@/modules/reunioes/reunioesApi';
import { ReuniaoFormModal } from '@/modules/reunioes/ReuniaoFormModal';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { AnexoLink } from '@/shared/ui/AnexoLink';

interface Props {
  clienteId: string;
  somenteLeitura?: boolean; // portal do cliente = só ver/baixar
}

export function ReunioesPanel({ clienteId, somenteLeitura = false }: Props) {
  const { data: lista, isLoading } = useReunioes(clienteId);
  const excluir = useExcluirReuniao(clienteId);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Reuniao | undefined>();
  const [aberta, setAberta] = useState<string | null>(null);
  const backup = useBackupReuniaoDrive();
  const [drive, setDrive] = useState<Record<string, { estado: 'enviando' | 'ok' | 'erro'; url?: string | null; msg?: string }>>({});

  function enviarParaDrive(id: string) {
    setDrive((d) => ({ ...d, [id]: { estado: 'enviando' } }));
    backup.mutate(id, {
      onSuccess: (r) => setDrive((d) => ({ ...d, [id]: { estado: 'ok', url: r.pastaUrl } })),
      onError: (e) => setDrive((d) => ({ ...d, [id]: { estado: 'erro', msg: (e as Error).message } })),
    });
  }

  if (isLoading) return <Spinner />;
  const reunioes = lista ?? [];

  return (
    <div className="space-y-4">
      {!somenteLeitura && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-400">Reuniões realizadas com o cliente (mais recentes primeiro).</p>
          <Button onClick={() => { setEditando(undefined); setFormOpen(true); }}>+ Nova reunião</Button>
        </div>
      )}

      {reunioes.length === 0 ? (
        <Card><EmptyState message="Nenhuma reunião registrada ainda." /></Card>
      ) : (
        <ul className="space-y-3">
          {reunioes.map((r) => {
            const expandida = aberta === r.id;
            return (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-100">{r.titulo}</div>
                    <div className="text-xs text-slate-400">📅 {formatDate(r.data)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {r.pdf_url && (
                      <AnexoLink
                        bucket="reunioes"
                        path={r.pdf_url}
                        prefixo="📎"
                        className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-brand-300 hover:underline"
                      />
                    )}
                    {r.resumo && (
                      <button className="text-xs font-medium text-brand-300 hover:underline" onClick={() => setAberta(expandida ? null : r.id)}>
                        {expandida ? 'Ocultar resumo' : 'Ler resumo'}
                      </button>
                    )}
                    {!somenteLeitura && (
                      <>
                        {drive[r.id]?.estado === 'enviando' ? (
                          <span className="text-xs text-slate-400">⏳ Enviando ao Drive…</span>
                        ) : drive[r.id]?.estado === 'ok' ? (
                          <span className="flex items-center gap-2 text-xs">
                            <a
                              href={drive[r.id]?.url ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-emerald-300 hover:underline"
                            >
                              ✅ Salvo no Drive · abrir pasta
                            </a>
                            <button className="text-slate-400 hover:underline" onClick={() => enviarParaDrive(r.id)}>reenviar</button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-xs">
                            <button
                              className="font-medium text-sky-300 hover:underline"
                              title="Salva o resumo e o PDF na pasta de backup do Drive"
                              onClick={() => enviarParaDrive(r.id)}
                            >
                              ☁ Enviar p/ Drive
                            </button>
                            {drive[r.id]?.estado === 'erro' && (
                              <span className="max-w-[260px] text-red-400" title={drive[r.id]?.msg}>⚠ {drive[r.id]?.msg}</span>
                            )}
                          </span>
                        )}
                        <button className="text-xs font-medium text-slate-300 hover:underline" onClick={() => { setEditando(r); setFormOpen(true); }}>Editar</button>
                        <button className="text-xs font-medium text-red-400 hover:underline" onClick={() => { if (confirm('Excluir esta reunião?')) excluir.mutate(r.id); }}>Excluir</button>
                      </>
                    )}
                  </div>
                </div>
                {expandida && r.resumo && (
                  <p className="mt-3 whitespace-pre-wrap border-t border-white/10 pt-3 text-sm text-slate-200">{r.resumo}</p>
                )}
              </Card>
            );
          })}
        </ul>
      )}

      {formOpen && (
        <ReuniaoFormModal open={formOpen} onClose={() => setFormOpen(false)} clienteId={clienteId} reuniao={editando} />
      )}
    </div>
  );
}
