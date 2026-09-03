import { useState } from 'react';
import {
  useUsuarios,
  useExcluirUsuario,
  useSalvarUsuario,
} from '@/modules/usuarios/api/usuariosApi';
import { UsuarioFormModal } from '@/modules/usuarios/components/UsuarioFormModal';
import { MODULOS } from '@/shared/auth/permissions';
import type { Profile } from '@/shared/types/database';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { Table, type Column } from '@/shared/ui/Table';

const MODULO_LABEL = Object.fromEntries(MODULOS.map((m) => [m.key, m.label]));

export function UsuariosPage() {
  const { data: usuarios, isLoading } = useUsuarios();
  const excluir = useExcluirUsuario();
  const salvar = useSalvarUsuario();

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Profile | undefined>();

  function editar(u: Profile) {
    setEditando(u);
    setFormOpen(true);
  }

  const columns: Column<Profile>[] = [
    {
      header: 'Nome',
      render: (u) => (
        <div>
          <div className="font-medium text-slate-100">{u.nome}</div>
          <div className="text-xs text-slate-400">{u.cargo || '—'}</div>
        </div>
      ),
    },
    {
      header: 'Nível',
      render: (u) => (
        <Badge tone={u.papel === 'admin' ? 'green' : 'blue'}>
          {u.papel === 'admin' ? 'Administrador' : 'Funcionário'}
        </Badge>
      ),
    },
    {
      header: 'Acesso',
      render: (u) =>
        u.papel === 'admin' ? (
          <span className="text-xs text-slate-400">Todos os módulos</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {u.permissoes.length === 0 ? (
              <span className="text-xs text-slate-400">Nenhum</span>
            ) : (
              u.permissoes.map((p) => (
                <Badge key={p} tone="slate">{MODULO_LABEL[p] ?? p}</Badge>
              ))
            )}
          </div>
        ),
    },
    {
      header: 'Status',
      render: (u) =>
        u.status === 'pendente' ? (
          <Badge tone="amber">Pendente</Badge>
        ) : (
          <Badge tone="green">Ativo</Badge>
        ),
    },
    {
      header: '',
      className: 'text-right whitespace-nowrap',
      render: (u) => (
        <div className="flex justify-end gap-3">
          {u.status === 'pendente' && (
            <button
              className="text-xs font-medium text-emerald-400 hover:underline"
              onClick={() => salvar.mutate({ id: u.id, dados: { nome: u.nome, cargo: u.cargo ?? '', papel: u.papel ?? 'operador', permissoes: u.permissoes, status: 'ativo' } })}
            >
              Aprovar
            </button>
          )}
          <button className="text-xs font-medium text-brand-300 hover:underline" onClick={() => editar(u)}>
            Editar
          </button>
          <button
            className="text-xs font-medium text-red-400 hover:underline"
            onClick={() => {
              if (confirm(`Excluir o usuário "${u.nome}"?`)) excluir.mutate(u.id);
            }}
          >
            Excluir
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários e acessos"
        subtitle="Equipe da agência, cargos e permissões por módulo."
      >
        <Button
          onClick={() => {
            setEditando(undefined);
            setFormOpen(true);
          }}
        >
          + Novo usuário
        </Button>
      </PageHeader>

      <div className="rounded-md border border-dashed border-white/15 bg-white/5 px-4 py-2 text-xs text-slate-400">
        🔐 Sistema privado. Funcionários entram por login (Google ou e-mail/senha).
        Ao se cadastrar, a conta fica <strong>pendente</strong> até um administrador
        aprovar e definir os módulos liberados.
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : (
          <Table columns={columns} data={usuarios ?? []} keyOf={(u) => u.id} />
        )}
      </Card>

      {formOpen && (
        <UsuarioFormModal open={formOpen} onClose={() => setFormOpen(false)} usuario={editando} />
      )}
    </div>
  );
}
