// Lista fixa dos clientes de tráfego pago (13 contas).
// Slug é a chave estável usada no banco (otimizacoes_diarias.cliente_slug).
// Nome é o que aparece na UI e no PDF.

export interface ClienteOtim {
  slug: string;
  nome: string;
}

export const CLIENTES_OTIMIZACAO: ClienteOtim[] = [
  { slug: 'layfe-imports',     nome: 'Layfe Imports' },
  { slug: 'matcheria',         nome: 'Matchêria' },
  { slug: 'casas-paranaense',  nome: 'Casas Paranaense' },
  { slug: 'igotup',            nome: 'Igotup' },
  { slug: 'lg-cell',           nome: 'LG Cell' },
  { slug: 'netconnect',        nome: 'NetConnect' },
  { slug: 'tork',              nome: 'Tork' },
  { slug: 'xm-gravatai',       nome: 'XM Gravataí' },
  { slug: 'maria',             nome: 'Maria' },
  { slug: 'casa-mundi',        nome: 'Casa Mundi' },
  { slug: 'creative',          nome: 'Creative' },
  { slug: 'rosales',           nome: 'Rosales' },
  { slug: '4newtax',           nome: '4newtax' },
];

export function clientePorSlug(slug: string): ClienteOtim | undefined {
  return CLIENTES_OTIMIZACAO.find((c) => c.slug === slug);
}
