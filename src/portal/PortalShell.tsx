import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';
import { DemoUserSwitcher } from '@/shared/layout/DemoUserSwitcher';
import { demoFindCliente } from '@/shared/lib/demoData';
import { Button } from '@/shared/ui/Button';
import { BrandMark } from '@/shared/ui/BrandMark';

const NAV = [
  { to: '/portal', label: 'Meus relatórios', end: true },
  { to: '/portal/andamento', label: 'Andamento', end: false },
  { to: '/portal/reunioes', label: 'Reuniões', end: false },
  { to: '/portal/aprovacao', label: 'Aprovar conteúdo', end: false },
  { to: '/portal/indicacoes', label: 'Minhas indicações', end: false },
];

// Layout do PORTAL EXTERNO do cliente (acesso restrito ao próprio cliente).
export function PortalShell() {
  const { profile, isCliente, signOut } = useAuth();

  // Só usuários do tipo cliente entram no portal.
  if (!isCliente) return <Navigate to="/inicio" replace />;

  const cliente = profile?.cliente_id ? demoFindCliente(profile.cliente_id) : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <BrandMark sub="Área do Cliente" />
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block"><DemoUserSwitcher /></div>
            <div className="text-right">
              <div className="max-w-[130px] truncate text-sm font-medium text-slate-100 sm:max-w-none">
                {cliente?.nome ?? profile?.nome}
              </div>
              <div className="text-xs text-slate-400">Portal do cliente</div>
            </div>
            <Button variant="secondary" onClick={() => void signOut()} className="px-3">Sair</Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                  isActive
                    ? 'border-brand-600 text-brand-300'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
