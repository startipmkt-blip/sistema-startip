import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import {
  useExcluirPauta, usePautas, useSalvarPauta, type Pauta, type PautaForm,
} from '../api/pautasApi';

interface Props {
  clienteId: string;
  clienteNome: string;
}

function PautaEditor({ inicial, salvando, onSalvar, onCancelar }: {
  inicial?: PautaForm;
  salvando: boolean;
  onSalvar: (d: PautaForm) => void;
  onCancelar?: () => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const vazio = !titulo.trim();

  function enviar() {
    if (vazio) return;
    onSalvar({ titulo: titulo.trim(), descricao: descricao.trim() });
    if (!inicial) { setTitulo(''); setDescricao(''); }
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <Input
        placeholder="Pauta (ex.: Dicas de manutenção da moto)"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !descricao) enviar(); }}
      />
      <Textarea
        rows={2}
        placeholder="Detalhes, tom de voz, o que não pode faltar… (opcional)"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        {onCancelar && <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>}
        <Button onClick={enviar} disabled={vazio || salvando}>
          {inicial ? 'Salvar' : '+ Adicionar pauta'}
        </Button>
      </div>
    </div>
  );
}

/** Pautas de conteúdo do cliente: o que o social media deve criar ao buscar ideias. */
export function PautasCliente({ clienteId, clienteNome }: Props) {
  const { data: pautas, isLoading, error } = usePautas(clienteId);
  const salvar = useSalvarPauta(clienteId);
  const excluir = useExcluirPauta(clienteId);
  const [aberto, setAberto] = useState(true);
  const [editando, setEditando] = useState<Pauta | null>(null);

  const total = pautas?.length ?? 0;
  const falha = (e: unknown) => alert(`Não foi possível salvar: ${(e as Error).message}`);

  return (
    <Card className="space-y-3 p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={aberto}
      >
        <span className="text-sm font-semibold text-slate-100">
          <GlassIcon name="lightbulb" /> Pautas de conteúdo · {clienteNome}
          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-normal text-slate-300">{total}</span>
        </span>
        <span className="text-xs text-slate-400">{aberto ? 'Recolher ▲' : 'Ver pautas ▼'}</span>
      </button>

      {aberto && (
        <>
          <p className="text-xs text-slate-400">
            O que deve ser criado para este cliente. Consulte antes de buscar ou criar ideias.
          </p>

          {isLoading && <div className="flex justify-center py-4"><Spinner /></div>}
          {error && <p className="text-sm text-red-300">Erro ao carregar as pautas: {(error as Error).message}</p>}

          {!isLoading && !error && total === 0 && (
            <p className="rounded-md border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
              Nenhuma pauta cadastrada para este cliente ainda.
            </p>
          )}

          {total > 0 && (
            <ul className="space-y-2">
              {pautas!.map((p) => (
                <li key={p.id}>
                  {editando?.id === p.id ? (
                    <PautaEditor
                      inicial={{ titulo: p.titulo, descricao: p.descricao }}
                      salvando={salvar.isPending}
                      onCancelar={() => setEditando(null)}
                      onSalvar={(dados) => salvar.mutate({ id: p.id, dados }, { onSuccess: () => setEditando(null), onError: falha })}
                    />
                  ) : (
                    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-100">{p.titulo}</p>
                        {p.descricao && (
                          <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-slate-300">{p.descricao}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-3 text-xs">
                        <button className="font-medium text-brand-300 hover:underline" onClick={() => setEditando(p)}>Editar</button>
                        <button
                          className="font-medium text-red-400 hover:underline"
                          onClick={() => {
                            if (confirm(`Excluir a pauta "${p.titulo}"?`)) {
                              excluir.mutate(p.id, { onError: (e) => alert(`Não foi possível excluir: ${(e as Error).message}`) });
                            }
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!editando && (
            <PautaEditor
              salvando={salvar.isPending}
              onSalvar={(dados) => salvar.mutate({ dados }, { onError: falha })}
            />
          )}
        </>
      )}
    </Card>
  );
}
