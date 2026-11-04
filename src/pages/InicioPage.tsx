import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';
import { podeAcessarModulo } from '@/shared/auth/permissions';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface ModuloCard {
  numero: string;
  label: string;
  icone: string;
  to: string;
  modulo: string;
  desc: string;
}

const OPERACIONAL: ModuloCard[] = [
  { numero: '01', label: 'Gestão de Clientes', icone: 'clientes', to: '/clientes',           modulo: 'clientes', desc: 'Cadastro, materiais e workspace de cada cliente.' },
  { numero: '02', label: 'Gestor de Tráfego',  icone: 'target', to: '/trafego',            modulo: 'diretoria', desc: 'Contas de anúncio, campanhas e resultados.' },
  { numero: '16', label: 'Painel do Gestor',   icone: 'bar-chart', to: '/painel-gestor',      modulo: 'diretoria', desc: 'Visão consolidada de performance por gestor.' },
  { numero: '03', label: 'CRM · WhatsApp',     icone: 'crm', to: '/crm',                modulo: 'crm', desc: 'Inbox do WhatsApp, leads e funil comercial.' },
  { numero: '04', label: 'Designer',           icone: 'palette', to: '/designer',           modulo: 'conteudo', desc: 'Fila de artes e vídeos com prioridade.' },
  { numero: '05', label: 'Demandas',           icone: 'demandas', to: '/demandas',           modulo: 'demandas', desc: 'Tarefas da equipe por setor e responsável.' },
  { numero: '07', label: 'Financeiro',         icone: 'financeiro', to: '/financeiro',         modulo: 'financeiro', desc: 'MRR, despesas, contas a pagar e saldo.' },
  { numero: '08', label: 'Otimizações',        icone: 'trending-up', to: '/otimizacoes',        modulo: 'otimizacoes', desc: 'Registro das otimizações feitas nas contas.' },
  { numero: '10', label: 'Painel TV',          icone: 'tv', to: '/painel-tv',          modulo: 'painel-tv', desc: 'Indicadores da agência para a TV do escritório.' },
  { numero: '11', label: 'Ideias/Anotações',   icone: 'lightbulb', to: '/ideias',            modulo: 'ideias', desc: 'Anotações e ideias soltas da equipe.' },
  { numero: '12', label: 'Gestão de Conteúdo', icone: 'calendar', to: '/gestao-conteudo',   modulo: 'gestao-conteudo', desc: 'Calendário editorial, pautas e aprovação.' },
  { numero: '14', label: 'CS Clientes',        icone: 'star', to: '/cs-clientes',        modulo: 'cs-clientes', desc: 'Saúde dos clientes e acompanhamento de CS.' },
];

const GERENCIAL: ModuloCard[] = [
  { numero: '15', label: 'Contratos',         icone: 'contratos', to: '/contratos',          modulo: 'contratos', desc: 'Contratos ativos, vigência e renovação.' },
];

function GridSecao({ titulo, itens, profile }: { titulo: string; itens: ModuloCard[]; profile: Parameters<typeof podeAcessarModulo>[0] }) {
  const visiveis = itens.filter((m) => podeAcessarModulo(profile, m.modulo));
  if (visiveis.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-[17px] font-semibold text-slate-100">{titulo}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {visiveis.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="glass group flex items-center gap-3.5 p-4 transition-colors hover:border-brand-400"
          >
            <span className="chip-icone icone-area h-10 w-10 bg-brand-500/10">
              <GlassIcon name={m.icone} tone="brand" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-100">{m.label}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">{m.desc}</div>
            </div>
            <span className="text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function InicioPage() {
  const { profile } = useAuth();
  const nome = profile?.nome?.split(' ')[0] ?? 'equipe';
  const hoje = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 pb-8">
      <header className="flex flex-col items-center gap-3 pt-4 text-center">
        <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold capitalize text-brand-300">
          {hoje}
        </span>
        <h1 className="text-[40px] font-bold leading-tight tracking-[-0.035em] text-slate-100 sm:text-5xl">
          Olá, <span className="text-brand-400">{nome}</span>.
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-slate-400">
          Toda a operação da Startip num só lugar: atendimento, mídia, produção, financeiro e diretoria.
          Escolha uma área para começar.
        </p>
      </header>

      <GridSecao titulo="Operacional" itens={OPERACIONAL} profile={profile} />
      <GridSecao titulo="Gerencial" itens={GERENCIAL} profile={profile} />
    </div>
  );
}
