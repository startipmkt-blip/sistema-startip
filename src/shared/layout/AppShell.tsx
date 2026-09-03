import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/shared/layout/Sidebar';
import { Topbar } from '@/shared/layout/Topbar';
import { DemoBanner } from '@/shared/layout/DemoBanner';
import { CommandPalette } from '@/shared/layout/CommandPalette';
import { PwaInstallHint } from '@/shared/layout/PwaInstallHint';
import { useAuth } from '@/shared/auth/AuthProvider';

// Casca da aplicação interna (equipe). Menu lateral fixo no desktop e em
// gaveta (drawer) no mobile. Na tela inicial, a sidebar some — a navegação
// acontece pelos cards da própria página (estilo Central de Ferramentas).
export function AppShell() {
  const { isCliente } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();
  const semSidebar = pathname === '/inicio' || pathname === '/';
  if (isCliente) return <Navigate to="/portal" replace />;

  return (
    <div className="flex h-screen">
      {!semSidebar && <Sidebar aberto={menuAberto} onFechar={() => setMenuAberto(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onAbrirMenu={() => setMenuAberto(true)} ocultarHamburguer={semSidebar} />
        <DemoBanner />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <PwaInstallHint />
    </div>
  );
}
