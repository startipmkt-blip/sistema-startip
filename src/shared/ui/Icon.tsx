// Ícones SVG (linha) leves, sem dependência externa. Estilo lucide.
export type IconName =
  | 'home' | 'clientes' | 'crm' | 'financeiro' | 'area-cliente' | 'processos'
  | 'indicacao' | 'onboarding' | 'conteudo' | 'aprovacao' | 'demandas' | 'usuarios'
  | 'contratos' | 'calendario'
  | 'plus' | 'search' | 'logout' | 'chevron-right' | 'sparkles' | 'link' | 'bell';

const paths: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
  clientes: 'M3 21V7l6-4 6 4v14M9 21v-5h4v5M21 21V11l-6-3',
  crm: 'M4 5h16M4 5v14M4 19h16M9 5v14M14 9h5M14 13h5',
  financeiro: 'M3 7h18v10H3zM3 11h18M7 15h2',
  'area-cliente': 'M4 19V5m0 14h16M8 15l3-4 3 3 4-6',
  processos: 'M7 3h7l4 4v14H7zM14 3v4h4M9 12h6M9 16h6',
  indicacao: 'M12 3v6m0 0 3-3m-3 3L9 6M4 21a8 8 0 0 1 16 0',
  onboarding: 'M12 3c3 3 4 6 4 9l-4 3-4-3c0-3 1-6 4-9zM8 15l-3 4m11-4 3 4',
  conteudo: 'M4 20h16M6 16l9-9 3 3-9 9H6z',
  aprovacao: 'M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  demandas: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  usuarios: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11',
  contratos: 'M9 12h6M9 16h6M8 3h8l4 4v14H4V3zM16 3v4h4',
  calendario: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M12 14v4M10 16h4',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  'chevron-right': 'M9 18l6-6-6-6',
  sparkles: 'M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
};

interface Props {
  name: IconName;
  className?: string;
}

export function Icon({ name, className = 'h-5 w-5' }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
