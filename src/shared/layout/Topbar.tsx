import { useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';
import { DemoUserSwitcher } from '@/shared/layout/DemoUserSwitcher';
import { Icon } from '@/shared/ui/Icon';
import { TemaToggle } from '@/shared/layout/TemaToggle';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { BrandMark } from '@/shared/ui/BrandMark';
import { itemDaRota } from '@/shared/layout/navigation';

const abrirBusca = () => window.dispatchEvent(new Event('commandpalette:open'));

export function Topbar({ onAbrirMenu, ocultarHamburguer = false }: { onAbrirMenu: () => void; ocultarHamburguer?: boolean }) {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const atual = itemDaRota(pathname);

  return (
    <header className="topbar-clean pt-seguro flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-[#0e151d] px-2 sm:px-6 lg:px-8">
      <div className="flex h-14 min-w-0 flex-1 items-center gap-1.5">
        {/* Hambúrguer só no tablet (md): no celular o menu fica na barra inferior. */}
        <button
          onClick={onAbrirMenu}
          className={`h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 ${
            ocultarHamburguer ? 'hidden' : 'hidden md:flex lg:hidden'
          }`}
          aria-label="Abrir menu"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Celular: marca + nome da tela atual */}
        <div className="flex min-w-0 items-center gap-2 pl-1 md:hidden">
          {atual && atual.to !== '/inicio' ? (
            <span className="truncate font-display text-[17px] font-semibold text-white">{atual.label}</span>
          ) : (
            <BrandMark sub="OS" />
          )}
        </div>

        <button
          onClick={abrirBusca}
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

      <div className="flex h-14 shrink-0 items-center gap-0.5">
        <button
          onClick={abrirBusca}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Buscar"
        >
          <GlassIcon name="search" className="h-[19px] w-[19px]" tone="slate" />
        </button>
        <TemaToggle />
        <button
          onClick={() => void signOut()}
          className="hidden h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white sm:flex"
          title="Sair"
          aria-label="Sair"
        >
          <Icon name="logout" className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
