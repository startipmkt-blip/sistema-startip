import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { navGrupos, moduloKey, type NavItem } from '@/shared/layout/navigation';
import { useAuth } from '@/shared/auth/AuthProvider';
import { BrandMark } from '@/shared/ui/BrandMark';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

export function Sidebar({ aberto, onFechar }: Props) {
  const { isEquipe, podeAcessar, profile, isAdmin, signOut } = useAuth();

  // Gaveta aberta: Esc fecha e o conteúdo atrás não rola junto com o dedo.
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflowAntes;
      window.removeEventListener('keydown', onKey);
    };
  }, [aberto, onFechar]);

  const visivel = (item: NavItem) =>
    !(item.equipeOnly && !isEquipe) && (item.comingSoon || podeAcessar(moduloKey(item)));

  const nav = (
    <nav className="nav-dark flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
      {navGrupos.map((grupo) => {
        const itens = grupo.itens.filter(visivel);
        if (itens.length === 0) return null;
        return (
          <div key={grupo.titulo ?? 'topo'}>
            {grupo.titulo && (
              <div className="nav-grupo mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400/80">
                {grupo.titulo}
              </div>
            )}
            <div className="space-y-0.5">
              {itens.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onFechar}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors lg:py-2 lg:text-sm ${
                      isActive
                        ? 'nav-ativo bg-brand-500/15 text-white'
                        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <GlassIcon name={item.icon} tone={isActive ? 'brand' : 'slate'} className="h-[18px] w-[18px]" />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );

  const nome = profile?.nome ?? 'Equipe Startip';
  const iniciais = nome.replace(/\(.*?\)/g, '').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const rodape = (
    <div className="side-user flex items-center gap-3 border-t border-white/[0.08] px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#12324a] font-display text-xs font-bold">
        {iniciais}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{nome}</div>
        <div className="side-user-sub truncate text-xs">{profile?.cargo ?? (isAdmin ? 'Admin' : 'Equipe')}</div>
      </div>
      {/* No celular o "Sair" mora aqui (o topo fica só com busca e tema). */}
      <button
        onClick={() => void signOut()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
        aria-label="Sair"
        title="Sair"
      >
        <Icon name="logout" className="h-[18px] w-[18px]" />
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop: menu fixo */}
      <aside className="sidebar-dark hidden w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#0e151d] lg:flex">
        <div className="flex h-16 items-center px-5">
          <BrandMark sub="OS" />
        </div>
        {nav}
        {rodape}
      </aside>

      {/* Mobile: gaveta (só quando aberta) */}
      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="fundo-escuro anim-fundo absolute inset-0 bg-slate-950/70" onClick={onFechar} aria-hidden />
          <aside className="sidebar-dark anim-gaveta pt-seguro pb-seguro absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-white/10 bg-[#0e151d]">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] px-5">
              <BrandMark sub="OS" />
              <button
                onClick={onFechar}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Fechar menu"
              >
                <GlassIcon name="x" />
              </button>
            </div>
            {nav}
            {rodape}
          </aside>
        </div>
      )}
    </>
  );
}
