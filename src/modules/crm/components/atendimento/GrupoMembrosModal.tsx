import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Badge } from '@/shared/ui/Badge';
import { useAtualizarGrupoMembros, useGrupoMembros } from '@/modules/crm/api/grupoMetadataApi';

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
  nomeGrupo: string;
}

function formatarTelefone(t: string): string {
  const so = t.replace(/\D/g, '');
  if (so.length >= 12) {
    const dd = so.slice(-11, -9);
    const p1 = so.slice(-9, -4);
    const p2 = so.slice(-4);
    return `+${so.slice(0, -11)} (${dd}) ${p1}-${p2}`;
  }
  return t;
}

export function GrupoMembrosModal({ open, onClose, leadId, nomeGrupo }: Props) {
  const { data, isLoading, isError, error } = useGrupoMembros(leadId, true);
  const atualizar = useAtualizarGrupoMembros();

  const total = data?.total ?? 0;
  const atualizadoEm = data?.grupo?.atualizado_em;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Membros de ${nomeGrupo}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button
            onClick={() => atualizar.mutate(leadId)}
            disabled={atualizar.isPending}
          >
            {atualizar.isPending ? 'Sincronizando…' : '↻ Sincronizar com WhatsApp'}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span>{total} {total === 1 ? 'participante' : 'participantes'}</span>
        {atualizadoEm && (
          <span>
            Atualizado em{' '}
            {new Date(atualizadoEm).toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : isError ? (
        <EmptyState message={(error as Error)?.message ?? 'Falha ao buscar membros.'} />
      ) : total === 0 ? (
        <EmptyState message="Nenhum membro registrado. Clique em Sincronizar." />
      ) : (
        <ul className="divide-y divide-white/5">
          {data!.participantes.map((p) => (
            <li key={p.telefone} className="flex items-center gap-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-200">
                {(p.nome ?? '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-slate-100">
                    {p.nome ?? 'Sem nome'}
                  </span>
                  {p.is_super_admin && <Badge tone="amber">Dono</Badge>}
                  {p.is_admin && !p.is_super_admin && <Badge tone="green">Admin</Badge>}
                </div>
                <div className="text-xs text-slate-500">{formatarTelefone(p.telefone)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
