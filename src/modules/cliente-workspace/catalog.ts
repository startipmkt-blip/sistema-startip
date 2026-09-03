// =============================================================
// Workspace do cliente — espelha a estrutura usada no Notino:
// dois grupos de "documentos" preenchíveis por cliente.
// Para adicionar um material novo: acrescente um item aqui.
// =============================================================

export type DocGrupo = 'materiais' | 'fluxo';

export interface DocItem {
  chave: string; // identificador estável (usado como chave no banco)
  titulo: string;
  icon: string;
  grupo: DocGrupo;
}

export const GRUPO_LABEL: Record<DocGrupo, string> = {
  materiais: 'Materiais de referência',
  fluxo: 'Fluxo de trabalho',
};

export const DOC_ITENS: DocItem[] = [
  // Materiais de referência
  { chave: 'info', titulo: 'Informações importantes', icon: '💡', grupo: 'materiais' },
  { chave: 'persona', titulo: 'Mapeamento de Persona', icon: '🧑', grupo: 'materiais' },
  { chave: 'icp', titulo: 'ICP', icon: '🎯', grupo: 'materiais' },
  { chave: 'referencias', titulo: 'Referências', icon: '🔗', grupo: 'materiais' },
  { chave: 'dores', titulo: 'Dores / mecanismo único / diferenciais', icon: '⚡', grupo: 'materiais' },
  { chave: 'reunioes', titulo: 'Reuniões (PDFs e resumos)', icon: '📁', grupo: 'materiais' },
  // Fluxo de trabalho
  { chave: 'funil', titulo: 'Funil de Marketing', icon: '🔽', grupo: 'fluxo' },
  { chave: 'mineracao', titulo: 'Lista de mineração', icon: '⛏️', grupo: 'fluxo' },
  { chave: 'ideias', titulo: 'Ideias de conteúdo', icon: '💭', grupo: 'fluxo' },
  { chave: 'pilares', titulo: 'Pilares de conteúdo', icon: '🏛️', grupo: 'fluxo' },
  { chave: 'calendario', titulo: 'Calendário editorial', icon: '🗓️', grupo: 'fluxo' },
  { chave: 'instagram', titulo: 'Estrutura de Instagram', icon: '📸', grupo: 'fluxo' },
  { chave: 'gmn', titulo: 'Google Meu Negócio (GMN)', icon: '📍', grupo: 'fluxo' },
];

export function itensDoGrupo(grupo: DocGrupo): DocItem[] {
  return DOC_ITENS.filter((i) => i.grupo === grupo);
}
