import { NavLink } from 'react-router-dom';
import { navItems, moduloKey } from '@/shared/layout/navigation';
import { useAuth } from '@/shared/auth/AuthProvider';
import { Icon } from '@/shared/ui/Icon';
import { BrandMark } from '@/shared/ui/BrandMark';
import { Badge } from '@/shared/ui/Badge';

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

export function Sidebar({ aberto, onFechar }: Props) {
  const { isEquipe, podeAcessar } = useAuth();

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {navItems.map((item) => {
        if (item.equipeOnly && !isEquipe) return null;
        if (!item.comingSoon && !podeAcessar(moduloKey(item))) return null;

        if (item.comingSoon) {
          return (
            <div
              key={item.to}
              className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-500"
              title="Em breve"
            >
              <span className="flex items-center gap-3">
                <Icon name={item.icon} />
                {item.label}
              </span>
              <Badge tone="slate">em breve</Badge>
            </div>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onFechar}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-brand text-white shadow-glow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon name={item.icon} className="h-5 w-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop: menu fixo */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-white/[0.03] backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <BrandMark sub="OS" />
        </div>
        {nav}
      </aside>

      {/* Mobile: gaveta (só quando aberta) */}
      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60" onClick={onFechar} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col border-r border-white/10 bg-slate-950/95 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
              <BrandMark sub="OS" />
              <button
                onClick={onFechar}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
