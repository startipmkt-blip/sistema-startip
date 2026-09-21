import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';
import { podeAcessarModulo } from '@/shared/auth/permissions';

interface ModuloCard {
  numero: string;
  label: string;
  emoji: string;
  to: string;
  modulo: string;
}

const OPERACIONAL: ModuloCard[] = [
  { numero: '01', label: 'Gestão de Clientes', emoji: '👥', to: '/clientes',           modulo: 'clientes' },
  { numero: '02', label: 'Gestor de Tráfego',  emoji: '🎯', to: '/trafego',            modulo: 'diretoria' },
  { numero: '03', label: 'CRM · WhatsApp',     emoji: '💬', to: '/crm',                modulo: 'crm' },
  { numero: '04', label: 'Designer',           emoji: '🎨', to: '/designer',           modulo: 'conteudo' },
  { numero: '05', label: 'Demandas',           emoji: '📋', to: '/demandas',           modulo: 'demandas' },
  { numero: '06', label: 'Aprovação',          emoji: '✅', to: '/aprovacao-conteudo', modulo: 'aprovacao-conteudo' },
  { numero: '07', label: 'Financeiro',         emoji: '💰', to: '/financeiro',         modulo: 'financeiro' },
];

const GERENCIAL: ModuloCard[] = [
  { numero: '08', label: 'Empresas (PIN)',     emoji: '🏢', to: '/empresas-admin',     modulo: 'empresas-admin' },
  { numero: '09', label: 'Agenda',             emoji: '📅', to: '/agenda',             modulo: 'agenda' },
  { numero: '10', label: 'Diretoria',          emoji: '📊', to: '/diretoria',          modulo: 'diretoria' },
  { numero: '11', label: 'Video Maker',        emoji: '🎬', to: '/video-maker',        modulo: 'video-maker' },
  { numero: '12', label: 'Webdesigner',        emoji: '🖌️', to: '/webdesigner',        modulo: 'webdesigner' },
  { numero: '13', label: 'Turbo AI',           emoji: '✨', to: '/turbo-ai',           modulo: 'turbo-ai' },
  { numero: '14', label: 'Marketplace',        emoji: '🛒', to: '/marketplace-admin',  modulo: 'marketplace-admin' },
  { numero: '15', label: 'Contratos',          emoji: '📄', to: '/contratos',          modulo: 'contratos' },
  { numero: '16', label: 'Links de cadastro',  emoji: '🔗', to: '/links-cadastro',     modulo: 'links-cadastro' },
];

function GridSecao({ titulo, itens, profile }: { titulo: string; itens: ModuloCard[]; profile: Parameters<typeof podeAcessarModulo>[0] }) {
  const visiveis = itens.filter((m) => podeAcessarModulo(profile, m.modulo));
  if (visiveis.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
        {titulo}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {visiveis.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:bg-brand-500/5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 text-lg group-hover:bg-brand-500/20">
              {m.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                {m.numero} · ÁREA
              </div>
              <div className="mt-0.5 truncate text-sm font-medium text-slate-100">{m.label}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-brand-300 opacity-0 transition-opacity group-hover:opacity-100">
                Acessar →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function InicioPage() {
  const { profile } = useAuth();
  const nome = profile?.nome?.split(' ')[0] ?? 'equipe';

  return (
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(260px,320px)_1fr]">
      {/* Coluna esquerda — identidade */}
      <aside className="flex flex-col justify-between gap-6">
        <div>
          <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
            <span className="text-4xl">🚀</span>
          </div>
          <span className="inline-flex rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            Central de Ferramentas
          </span>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-100">
            Olá, {nome}. <br />
            Toda a operação.
            <br />
            <span className="text-brand-300">Num só lugar.</span>
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
            Selecione uma área para acessar as ferramentas da equipe Startip —
            atendimento, mídia, produção, financeiro e diretoria, todas integradas.
          </p>
        </div>
        <footer className="hidden lg:block">
          <div className="text-xs font-semibold text-slate-300">Startip OS</div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Sistema ativo
          </div>
        </footer>
      </aside>

      {/* Coluna direita — grid de módulos */}
      <div className="space-y-6">
        <GridSecao titulo="Operacional" itens={OPERACIONAL} profile={profile} />
        <GridSecao titulo="Gerencial"   itens={GERENCIAL}   profile={profile} />
      </div>
    </div>
  );
}
