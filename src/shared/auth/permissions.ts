// =============================================================
// Catálogo de módulos e helper de permissões.
// Cargos:
//   - admin (sócios): acesso total.
//   - operador (funcionários): acesso só aos módulos em `permissoes`.
//   - cliente: acesso externo restrito (portal do cliente — futuro).
// =============================================================
import type { Profile } from '@/shared/types/database';

export interface ModuloInfo {
  key: string;
  label: string;
}

// Módulos que podem ser liberados por permissão (Início é sempre liberado).
export const MODULOS: ModuloInfo[] = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'crm', label: 'CRM' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'area-cliente', label: 'Área do Cliente' },
  { key: 'processos', label: 'Processos' },
  { key: 'indicacao', label: 'Indicação' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'conteudo', label: 'Conteúdo' },
  { key: 'aprovacao-conteudo', label: 'Aprovação de conteúdo' },
  { key: 'datas-comemorativas', label: 'Datas comemorativas' },
  { key: 'painel-tv', label: 'Painel TV' },
  { key: 'demandas', label: 'Demandas' },
  { key: 'ideias', label: 'Ideias' },
  { key: 'anotacoes', label: 'Anotações' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'social-media', label: 'Social Media' },
  { key: 'diretoria', label: 'Tráfego Pago' },
  { key: 'otimizacoes', label: 'Otimização de Campanhas' },
  { key: 'usuarios', label: 'Usuários' },
];

// Regra central de acesso a um módulo.
export function podeAcessarModulo(profile: Profile | null, modulo: string): boolean {
  if (!profile || profile.status === 'pendente') return false;
  if (modulo === 'inicio') return true; // início é sempre visível
  if (profile.tipo === 'cliente') {
    // Portal do cliente (futuro): por ora, sem acesso à navegação interna.
    return false;
  }
  if (profile.papel === 'admin') return true; // sócios veem tudo
  // 'usuarios' é exclusivo de admin.
  if (modulo === 'usuarios') return false;
  return (profile.permissoes ?? []).includes(modulo);
}
