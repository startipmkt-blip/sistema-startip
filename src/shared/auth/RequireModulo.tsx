import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';

// Protege uma rota por módulo: bloqueia quem não tem permissão no cargo.
export function RequireModulo({ modulo, children }: { modulo: string; children: ReactNode }) {
  const { podeAcessar } = useAuth();
  if (podeAcessar(modulo)) return <>{children}</>;

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="text-3xl">🔒</div>
      <h1 className="mt-3 text-lg font-semibold text-slate-800">Sem permissão</h1>
      <p className="mt-1 text-sm text-slate-500">
        Seu cargo não tem acesso a este módulo. Fale com um administrador da
        agência se precisar de acesso.
      </p>
      <Link to="/inicio" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
        ← Voltar para o início
      </Link>
    </div>
  );
}
