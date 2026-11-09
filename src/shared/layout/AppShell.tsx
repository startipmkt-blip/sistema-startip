import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/shared/layout/Sidebar';
import { Topbar } from '@/shared/layout/Topbar';
import { BottomNav } from '@/shared/layout/BottomNav';
import { DemoBanner } from '@/shared/layout/DemoBanner';
import { CommandPalette } from '@/shared/layout/CommandPalette';
import { PwaInstallHint } from '@/shared/layout/PwaInstallHint';
import { useAuth } from '@/shared/auth/AuthProvider';
import { AlertasAoVivo } from '@/modules/alertas/components/AlertasAoVivo';

// Casca da aplicação interna (equipe). Desktop (lg+): menu lateral fixo.
// Celular/tablet: barra de navegação inferior + menu completo em gaveta.
export function AppShell() {
  const { isCliente } = useAuth();
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const fecharMenu = useCallback(() => setMenuAberto(false), []);
  const abrirMenu = useCallback(() => setMenuAberto(true), []);

  useEffect(() => { setMenuAberto(false); }, [pathname]);

  if (isCliente) return <Navigate to="/portal" replace />;

  return (
    // 100dvh: no celular o 100vh conta a barra de endereço e corta o rodapé.
    <div className="flex h-screen h-[100dvh]">
      <Sidebar aberto={menuAberto} onFechar={fecharMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onAbrirMenu={abrirMenu} />
        <DemoBanner />
        <main
          id="conteudo"
          className="flex-1 overflow-y-auto overscroll-y-contain p-4 pb-[calc(var(--nav-inferior)+1rem)] sm:p-6 sm:pb-[calc(var(--nav-inferior)+1.5rem)] lg:p-8"
        >
          <Outlet />
        </main>
      </div>
      <BottomNav onAbrirMenu={abrirMenu} menuAberto={menuAberto} />
      <CommandPalette />
      <PwaInstallHint />
      <AlertasAoVivo />
    </div>
  );
}
