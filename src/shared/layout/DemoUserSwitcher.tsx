import { useAuth } from '@/shared/auth/AuthProvider';
import { IS_DEMO } from '@/shared/lib/env';
import { demoUsuarios } from '@/shared/lib/demoData';

// Seletor de usuário (só no modo demo) para testar cargos e o portal do cliente.
export function DemoUserSwitcher() {
  const { profile, trocarUsuarioDemo } = useAuth();
  if (!IS_DEMO || !trocarUsuarioDemo) return null;

  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="hidden sm:inline">Ver como:</span>
      <select
        className="glass-field px-2 py-1 text-xs [&>option]:bg-slate-900 [&>option]:text-slate-100"
        value={profile?.id}
        onChange={(e) => trocarUsuarioDemo(e.target.value)}
      >
        {demoUsuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome} — {u.tipo === 'cliente' ? 'Cliente' : u.papel === 'admin' ? 'Admin' : 'Funcionário'}
          </option>
        ))}
      </select>
    </label>
  );
}
