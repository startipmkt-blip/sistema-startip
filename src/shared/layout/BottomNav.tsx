import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { atalhosMobile, itemDaRota, moduloKey, navItems, rotuloCurto } from '@/shared/layout/navigation';
import { useAuth } from '@/shared/auth/AuthProvider';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface Props {
  onAbrirMenu: () => void;
  menuAberto: boolean;
}

const CAMPO_DE_TEXTO = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=color]), textarea, select, [contenteditable="true"]';

// Barra de navegação inferior (celular e tablet). Some no desktop (lg+), onde o
// menu lateral fixo assume.
export function BottomNav({ onAbrirMenu, menuAberto }: Props) {
  const { isEquipe, podeAcessar } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('com-nav-inferior');
    // Com o teclado aberto a barra só rouba espaço da digitação: escondemos.
    const onFocusIn = (e: FocusEvent) => {
      if ((e.target as Element | null)?.matches?.(CAMPO_DE_TEXTO)) html.classList.add('teclado-aberto');
    };
    const onFocusOut = () => {
      // Espera o próximo foco: pular de um campo para outro não deve piscar a barra.
      window.setTimeout(() => {
        if (!document.activeElement?.matches?.(CAMPO_DE_TEXTO)) html.classList.remove('teclado-aberto');
      }, 50);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      html.classList.remove('com-nav-inferior', 'teclado-aberto');
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const atalhos = atalhosMobile
    .map((to) => navItems.find((i) => i.to === to))
    .filter((i): i is NonNullable<typeof i> => !!i && !(i.equipeOnly && !isEquipe) && podeAcessar(moduloKey(i)))
    .slice(0, 4);

  const atual = itemDaRota(pathname);
  const foraDosAtalhos = !atual || !atalhos.some((a) => a.to === atual.to);

  return (
    <nav
      aria-label="Navegação principal"
      className="nav-inferior fixed inset-x-0 bottom-0 z-40 border-t pb-seguro lg:hidden [html.teclado-aberto_&]:hidden"
    >
      <div className="mx-auto flex h-[3.75rem] max-w-xl items-stretch justify-around px-1">
        {atalhos.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="item-nav group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-400 aria-[current=page]:text-white"
          >
            {({ isActive }) => (
              <>
                <span className={`pilula-nav flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-brand-500/20' : ''}`}>
                  <GlassIcon name={item.icon} tone={isActive ? 'brand' : 'slate'} className="h-[20px] w-[20px]" />
                </span>
                <span className="max-w-full truncate px-0.5">{rotuloCurto[item.to] ?? item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onAbrirMenu}
          aria-expanded={menuAberto}
          aria-current={foraDosAtalhos && !menuAberto && atual ? 'page' : undefined}
          className="item-nav flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-400 aria-[current=page]:text-white"
        >
          <span className={`pilula-nav flex h-7 w-12 items-center justify-center rounded-full ${foraDosAtalhos && atual ? 'bg-brand-500/20' : ''}`}>
            <GlassIcon name="grid" tone={foraDosAtalhos && atual ? 'brand' : 'slate'} className="h-[20px] w-[20px]" />
          </span>
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
