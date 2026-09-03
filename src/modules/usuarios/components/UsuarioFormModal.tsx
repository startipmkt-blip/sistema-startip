import { useState } from 'react';
import { useSalvarUsuario, type UsuarioFormData } from '@/modules/usuarios/api/usuariosApi';
import { supabase } from '@/shared/lib/supabaseClient';
import { MODULOS } from '@/shared/auth/permissions';
import type { Profile, ProfilePapel } from '@/shared/types/database';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  usuario?: Profile;
}

export function UsuarioFormModal({ open, onClose, usuario }: Props) {
  const salvar = useSalvarUsuario();
  const [form, setForm] = useState<UsuarioFormData>({
    nome: usuario?.nome ?? '',
    cargo: usuario?.cargo ?? '',
    papel: usuario?.papel ?? 'operador',
    permissoes: usuario?.permissoes ?? [],
    status: usuario?.status ?? 'ativo',
  });
  // Só usados quando é NOVO usuário (não em edição):
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function set<K extends keyof UsuarioFormData>(k: K, v: UsuarioFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function togglePermissao(key: string) {
    setForm((f) => ({
      ...f,
      permissoes: f.permissoes.includes(key)
        ? f.permissoes.filter((p) => p !== key)
        : [...f.permissoes, key],
    }));
  }

  async function handleSalvar() {
    setErro(null);
    if (!form.nome.trim()) return;

    if (usuario) {
      // Edição: só atualiza profile existente.
      await salvar.mutateAsync({ id: usuario.id, dados: form });
      onClose();
      return;
    }

    // Criação: precisa email + senha, chama Edge Function admin.
    if (!email.trim() || !senha.trim()) {
      setErro('Preencha email e senha para criar o acesso.');
      return;
    }
    setEnviando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-usuario`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          senha,
          nome: form.nome.trim(),
          cargo: form.cargo,
          papel: form.papel,
          permissoes: form.permissoes,
          status: form.status,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error ?? 'Falha ao criar');
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const isAdmin = form.papel === 'admin';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={usuario ? 'Editar usuário' : 'Novo usuário'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSalvar}
            disabled={salvar.isPending || enviando || !form.nome.trim()}
          >
            {enviando || salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!usuario && (
          <div className="rounded-md border border-brand-500/30 bg-brand-500/5 p-3">
            <div className="mb-2 text-xs font-semibold text-brand-200">
              📧 Credenciais de acesso
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input id="email" type="email" label="Email de login *" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@startipmkt.com" />
              <Input id="senha" type="password" label="Senha inicial *" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mín. 6 caracteres" />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              A pessoa poderá logar com esses dados imediatamente e mudar a senha depois.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input id="nome" label="Nome *" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          <Input id="cargo" label="Cargo" placeholder="Ex.: Gestor de tráfego" value={form.cargo} onChange={(e) => set('cargo', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="papel"
            label="Nível de acesso"
            options={[
              { value: 'admin', label: 'Administrador (sócio) — acesso total' },
              { value: 'operador', label: 'Funcionário — acesso limitado' },
            ]}
            value={form.papel}
            onChange={(e) => set('papel', e.target.value as ProfilePapel)}
          />
          <Select
            id="status"
            label="Status"
            options={[
              { value: 'ativo', label: 'Ativo' },
              { value: 'pendente', label: 'Pendente (aguardando aprovação)' },
            ]}
            value={form.status}
            onChange={(e) => set('status', e.target.value as UsuarioFormData['status'])}
          />
        </div>

        <div>
          <div className="mb-2 text-sm font-medium text-slate-200">Módulos liberados</div>
          {isAdmin ? (
            <p className="rounded-md bg-white/5 px-3 py-2 text-xs text-slate-400">
              Administrador tem acesso a todos os módulos automaticamente.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {MODULOS.filter((m) => m.key !== 'usuarios').map((m) => (
                <label
                  key={m.key}
                  className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.permissoes.includes(m.key)}
                    onChange={() => togglePermissao(m.key)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {erro && <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-300">⚠️ {erro}</div>}
      </div>
    </Modal>
  );
}
