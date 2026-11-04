import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from '@/shared/layout/Sidebar';
import { Topbar } from '@/shared/layout/Topbar';
import { DemoBanner } from '@/shared/layout/DemoBanner';
import { CommandPalette } from '@/shared/layout/CommandPalette';
import { PwaInstallHint } from '@/shared/layout/PwaInstallHint';
import { useAuth } from '@/shared/auth/AuthProvider';
import { AlertasAoVivo } from '@/modules/alertas/components/AlertasAoVivo';

// Casca da aplicação interna (equipe). Menu lateral fixo no desktop (em todas
// as telas, inclusive o Início) e em gaveta (drawer) no mobile.
export function AppShell() {
  const { isCliente } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const semSidebar = false;
  if (isCliente) return <Navigate to="/portal" replace />;

  return (
    <div className="flex h-screen">
      {!semSidebar && <Sidebar aberto={menuAberto} onFechar={() => setMenuAberto(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onAbrirMenu={() => setMenuAberto(true)} ocultarHamburguer={semSidebar} />
        <DemoBanner />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <PwaInstallHint />
      <AlertasAoVivo />
    </div>
  );
}
