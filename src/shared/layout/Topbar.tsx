import { useAuth } from '@/shared/auth/AuthProvider';
import { DemoUserSwitcher } from '@/shared/layout/DemoUserSwitcher';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Icon } from '@/shared/ui/Icon';
import { TemaToggle } from '@/shared/layout/TemaToggle';

export function Topbar({ onAbrirMenu, ocultarHamburguer = false }: { onAbrirMenu: () => void; ocultarHamburguer?: boolean }) {
  const { profile, session, isAdmin, isCliente, signOut } = useAuth();

  const papelLabel = isCliente ? 'Cliente' : isAdmin ? 'Admin' : 'Funcionário';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3 backdrop-blur-xl sm:px-6">
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
        <div className="hidden sm:block">
          <DemoUserSwitcher />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <div className="max-w-[140px] truncate text-sm font-medium text-slate-100">
            {profile?.nome || session?.user.email}
          </div>
          <div className="flex items-center justify-end gap-1">
            {profile?.cargo && <span className="hidden text-xs text-slate-400 md:inline">{profile.cargo}</span>}
            <Badge tone={isCliente ? 'blue' : isAdmin ? 'green' : 'slate'}>{papelLabel}</Badge>
          </div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event('commandpalette:open'))}
          className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10 sm:flex"
          title="Busca universal (Ctrl+K)"
        >
          <span>🔎</span>
          <span className="hidden md:inline">Buscar…</span>
          <kbd className="rounded border border-white/10 bg-white/5 px-1 text-[10px] text-slate-400">Ctrl K</kbd>
        </button>
        <TemaToggle />
        <Button variant="secondary" onClick={() => void signOut()} className="px-3">
          <Icon name="logout" className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
