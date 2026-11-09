// =============================================================
// navigation.ts — Itens do menu lateral, agrupados por área.
// =============================================================
import type { GlassIconName } from '@/shared/ui/GlassIcon';
import type { IconName } from '@/shared/ui/Icon';

export interface NavItem {
  label: string;
  to: string;
  icon: GlassIconName | IconName;
  comingSoon: boolean;
  equipeOnly?: boolean;
}

export interface NavGrupo {
  titulo: string | null; // null = sem rótulo (item solto no topo)
  itens: NavItem[];
}

export const navGrupos: NavGrupo[] = [
  {
    titulo: null,
    itens: [{ label: 'Início', to: '/inicio', icon: 'home', comingSoon: false }],
  },
  {
    titulo: 'Comercial',
    itens: [
      { label: 'CRM', to: '/crm', icon: 'crm', comingSoon: false },
      { label: 'Contratos', to: '/contratos', icon: 'contratos', comingSoon: false },
      { label: 'Indicação', to: '/indicacao', icon: 'indicacao', comingSoon: false },
    ],
  },
  {
    titulo: 'Clientes',
    itens: [
      { label: 'Clientes', to: '/clientes', icon: 'clientes', comingSoon: false },
      { label: 'CS Clientes', to: '/cs-clientes', icon: 'star', comingSoon: false, equipeOnly: true },
      { label: 'Área do Cliente', to: '/area-cliente', icon: 'area-cliente', comingSoon: false },
      { label: 'Onboarding', to: '/onboarding', icon: 'onboarding', comingSoon: false },
    ],
  },
  {
    titulo: 'Produção',
    itens: [
      { label: 'Demandas', to: '/demandas', icon: 'demandas', comingSoon: false },
      { label: 'Designer', to: '/designer', icon: 'palette', comingSoon: false },
      { label: 'Gestão de Conteúdo', to: '/gestao-conteudo', icon: 'calendar', comingSoon: false },
      { label: 'Ideias/Anotações', to: '/ideias', icon: 'lightbulb', comingSoon: false },
      { label: 'Ideias de Stories', to: '/stories', icon: 'smartphone', comingSoon: false },
      { label: 'Processos', to: '/processos', icon: 'processos', comingSoon: false },
      { label: 'Mapa Mental', to: '/mapa-mental', icon: 'mindmap', comingSoon: false },
    ],
  },
  {
    titulo: 'Performance',
    itens: [
      { label: 'Tráfego Pago', to: '/trafego', icon: 'target', comingSoon: false, equipeOnly: true },
      { label: 'Painel do Gestor', to: '/painel-gestor', icon: 'bar-chart', comingSoon: false, equipeOnly: true },
      { label: 'Otimizações', to: '/otimizacoes', icon: 'trending-up', comingSoon: false, equipeOnly: true },
      { label: 'Alertas', to: '/alertas', icon: 'bell', comingSoon: false, equipeOnly: true },
    ],
  },
  {
    titulo: 'Agência',
    itens: [
      { label: 'Financeiro', to: '/financeiro', icon: 'financeiro', comingSoon: false, equipeOnly: true },
      { label: 'Painel TV', to: '/painel-tv', icon: 'tv', comingSoon: false, equipeOnly: true },
      { label: 'Usuários', to: '/usuarios', icon: 'usuarios', comingSoon: false },
    ],
  },
];

export const navItems: NavItem[] = navGrupos.flatMap((g) => g.itens);

export function moduloKey(item: NavItem): string {
  return item.to.replace('/', '');
}

// Atalhos da barra inferior do celular, em ordem de prioridade. Mostramos os 4
// primeiros que o usuário pode acessar; o 5º botão é sempre "Menu".
export const atalhosMobile: string[] = ['/inicio', '/crm', '/demandas', '/clientes', '/gestao-conteudo', '/designer', '/ideias'];

// Rótulos curtos para caber na barra inferior.
export const rotuloCurto: Record<string, string> = {
  '/gestao-conteudo': 'Conteúdo',
  '/ideias': 'Ideias',
};

export function itemDaRota(pathname: string): NavItem | undefined {
  return navItems
    .filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
}
