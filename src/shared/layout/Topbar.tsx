import { useAuth } from '@/shared/auth/AuthProvider';
import { DemoUserSwitcher } from '@/shared/layout/DemoUserSwitcher';
import { Icon } from '@/shared/ui/Icon';
import { TemaToggle } from '@/shared/layout/TemaToggle';
import { GlassIcon } from '@/shared/ui/GlassIcon';

export function Topbar({ onAbrirMenu, ocultarHamburguer = false }: { onAbrirMenu: () => void; ocultarHamburguer?: boolean }) {
  const { signOut } = useAuth();

  return (
    <header className="topbar-clean flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-[#0e151d] px-3 sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        {/* Botão hambúrguer — só no mobile e quando há sidebar */}
        <button
          onClick={onAbrirMenu}
          className={`h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 lg:hidden ${
            ocultarHamburguer ? 'hidden' : 'flex'
          }`}
          aria-label="Abrir menu"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event('commandpalette:open'))}
          className="busca-topo hidden h-9 w-64 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-400 hover:bg-white/[0.07] md:flex lg:w-72"
          title="Busca universal (Ctrl+K)"
        >
          <GlassIcon name="search" className="h-4 w-4" tone="slate" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="rounded border border-white/10 px-1.5 text-xs text-slate-400">Ctrl K</kbd>
        </button>
        <div className="hidden sm:block">
          <DemoUserSwitcher />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <TemaToggle />
        <button
          onClick={() => void signOut()}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
          title="Sair"
          aria-label="Sair"
        >
          <Icon name="logout" className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
