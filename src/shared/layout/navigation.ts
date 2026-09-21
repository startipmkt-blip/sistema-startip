// =============================================================
// navigation.ts — Itens do menu lateral.
// =============================================================
import type { IconName } from '@/shared/ui/Icon';

export interface NavItem {
  label: string;
  to: string;
  icon: IconName;
  comingSoon: boolean;
  equipeOnly?: boolean;
}

export const navItems: NavItem[] = [
  { label: 'Início', to: '/inicio', icon: 'home', comingSoon: false },
  { label: 'Clientes', to: '/clientes', icon: 'clientes', comingSoon: false },
  { label: 'CRM', to: '/crm', icon: 'crm', comingSoon: false },
  { label: 'Financeiro', to: '/financeiro', icon: 'financeiro', comingSoon: false, equipeOnly: true },
  { label: 'Área do Cliente', to: '/area-cliente', icon: 'area-cliente', comingSoon: false },
  { label: 'Painel do Cliente', to: '/painel-cliente', icon: 'area-cliente', comingSoon: false, equipeOnly: true },
  { label: 'Processos', to: '/processos', icon: 'processos', comingSoon: false },
  { label: 'Indicação', to: '/indicacao', icon: 'indicacao', comingSoon: false },
  { label: 'Onboarding', to: '/onboarding', icon: 'onboarding', comingSoon: false },
  { label: 'Designer', to: '/designer', icon: 'conteudo', comingSoon: false },
  { label: 'Aprovação de conteúdo', to: '/aprovacao-conteudo', icon: 'aprovacao', comingSoon: false },
  { label: 'Demandas', to: '/demandas', icon: 'demandas', comingSoon: false },
  { label: 'Contratos', to: '/contratos', icon: 'contratos', comingSoon: false },
  { label: 'Links de cadastro', to: '/links-cadastro', icon: 'link', comingSoon: false, equipeOnly: true },
  { label: 'Turbo AI', to: '/turbo-ai', icon: 'sparkles', comingSoon: false, equipeOnly: true },
  { label: 'Agenda', to: '/agenda', icon: 'processos', comingSoon: false },
  { label: 'Video Maker', to: '/video-maker', icon: 'conteudo', comingSoon: false },
  { label: 'Webdesigner', to: '/webdesigner', icon: 'conteudo', comingSoon: false },
  { label: 'Diretoria', to: '/diretoria', icon: 'financeiro', comingSoon: false, equipeOnly: true },
  { label: 'Tráfego Pago', to: '/trafego', icon: 'financeiro', comingSoon: false, equipeOnly: true },
  { label: 'Marketplace', to: '/marketplace-admin', icon: 'clientes', comingSoon: false, equipeOnly: true },
  { label: 'Empresas (PIN)', to: '/empresas-admin', icon: 'clientes', comingSoon: false, equipeOnly: true },
  { label: 'Usuários', to: '/usuarios', icon: 'usuarios', comingSoon: false },
];

export function moduloKey(item: NavItem): string {
  return item.to.replace('/', '');
}
