import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';
import { Spinner } from '@/shared/ui/Spinner';

// Protege as rotas internas: exige sessão + profile válido.
// Usuário autenticado mas SEM profile é tratado como "sem acesso".
export function ProtectedRoute() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-semibold text-slate-800">Sem acesso</h1>
        <p className="max-w-md text-sm text-slate-500">
          Sua conta está autenticada mas ainda não tem um perfil liberado.
          Peça a um administrador da Startip para liberar seu acesso.
        </p>
      </div>
    );
  }

  if (profile.status === 'pendente') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-3xl">⏳</div>
        <h1 className="text-lg font-semibold text-slate-800">Aguardando aprovação</h1>
        <p className="max-w-md text-sm text-slate-500">
          Sua conta foi criada e está pendente. Um administrador da agência
          precisa aprovar seu acesso e definir os módulos liberados.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
