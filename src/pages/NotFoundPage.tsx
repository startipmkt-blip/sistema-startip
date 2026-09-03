import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-4xl font-bold text-slate-100">404</h1>
      <p className="text-slate-400">Página não encontrada.</p>
      <Link to="/clientes" className="text-sm font-medium text-brand-300 hover:underline">
        Voltar para Clientes
      </Link>
    </div>
  );
}
