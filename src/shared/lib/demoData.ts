// =============================================================
// demoData.ts — Dados de exemplo do Modo Demonstração.
// Usados APENAS quando IS_DEMO é true (sem chaves do Supabase).
// Nada aqui vai para produção com Supabase configurado.
// =============================================================
import type { Cliente, ContaAnuncio, Profile } from '@/shared/types/database';

// Usuários de exemplo (equipe da agência) para o Modo Demonstração.
export const demoUsuarios: Profile[] = [
  { id: 'u-iuri', nome: 'Iuri (sócio)', tipo: 'equipe', papel: 'admin', cargo: 'Sócio-fundador', permissoes: [], status: 'ativo', cliente_id: null, created_at: '2025-01-01T10:00:00Z' },
  { id: 'u-socio2', nome: 'Sócio 2', tipo: 'equipe', papel: 'admin', cargo: 'Sócio', permissoes: [], status: 'ativo', cliente_id: null, created_at: '2025-01-01T10:00:00Z' },
  { id: 'u-trafego', nome: 'Gestor de Tráfego', tipo: 'equipe', papel: 'operador', cargo: 'Gestor de tráfego pago', permissoes: ['clientes', 'area-cliente', 'onboarding', 'demandas'], status: 'ativo', cliente_id: null, created_at: '2025-06-01T10:00:00Z' },
  { id: 'u-designer', nome: 'Designer', tipo: 'equipe', papel: 'operador', cargo: 'Designer gráfico', permissoes: ['clientes', 'conteudo', 'aprovacao-conteudo', 'onboarding', 'demandas'], status: 'ativo', cliente_id: null, created_at: '2025-06-01T10:00:00Z' },
  { id: 'u-pendente', nome: 'Novo Funcionário', tipo: 'equipe', papel: 'operador', cargo: 'Aguardando definição', permissoes: [], status: 'pendente', cliente_id: null, created_at: '2026-08-01T10:00:00Z' },
  // Usuário do tipo CLIENTE (acesso externo ao portal) — vinculado à Padaria (c1).
  { id: 'u-cliente1', nome: 'Padaria do Bairro (portal)', tipo: 'cliente', papel: null, cargo: null, permissoes: [], status: 'ativo', cliente_id: 'c1', created_at: '2025-11-10T10:00:00Z' },
];

// Usuário "logado" no modo demo (impersonação para testar cargos).
let demoUsuarioAtualId = 'u-iuri';
export function getDemoProfile(): Profile {
  return demoUsuarios.find((u) => u.id === demoUsuarioAtualId) ?? demoUsuarios[0];
}
export function setDemoUsuarioAtual(id: string): void {
  demoUsuarioAtualId = id;
}

// Compat: perfil padrão (primeiro admin).
export const demoProfile: Profile = demoUsuarios[0];

// ---- CRUD de usuários (demo, em memória) ----
export function demoAddUsuario(u: Omit<Profile, 'id' | 'created_at'>): Profile {
  const novo: Profile = { ...u, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  demoUsuarios.push(novo);
  return novo;
}
export function demoUpdateUsuario(id: string, dados: Partial<Profile>): void {
  const u = demoUsuarios.find((x) => x.id === id);
  if (u) Object.assign(u, dados);
}
export function demoDeleteUsuario(id: string): void {
  const i = demoUsuarios.findIndex((x) => x.id === id);
  if (i >= 0) demoUsuarios.splice(i, 1);
}

export const demoClientes: Cliente[] = [
  {
    id: 'c1',
    nome: 'Padaria do Bairro',
    logo_url: null,
    tipo_negocio: 'local',
    status: 'ativo',
    servicos: ['social_midia', 'trafego_pago', 'google_meu_negocio'],
    conteudos_por_semana: 3,
    data_entrada: '2025-11-10',
    created_at: '2025-11-10T12:00:00Z',
    updated_at: '2025-11-10T12:00:00Z',
  },
  {
    id: 'c2',
    nome: 'Loja Online XYZ',
    logo_url: null,
    tipo_negocio: 'ecommerce',
    status: 'ativo',
    servicos: ['trafego_pago'],
    conteudos_por_semana: 2,
    data_entrada: '2026-01-05',
    created_at: '2026-01-05T12:00:00Z',
    updated_at: '2026-01-05T12:00:00Z',
  },
  {
    id: 'c3',
    nome: 'Studio Pilates Vida',
    logo_url: null,
    tipo_negocio: 'local',
    status: 'prospect',
    servicos: ['social_midia', 'google_meu_negocio'],
    conteudos_por_semana: 2,
    data_entrada: '2026-07-20',
    created_at: '2026-07-20T12:00:00Z',
    updated_at: '2026-07-20T12:00:00Z',
  },
  {
    id: 'c4',
    nome: 'Moda Fitness BR',
    logo_url: null,
    tipo_negocio: 'ecommerce',
    status: 'inativo',
    servicos: ['trafego_pago', 'social_midia'],
    conteudos_por_semana: 4,
    data_entrada: '2025-03-15',
    created_at: '2025-03-15T12:00:00Z',
    updated_at: '2025-03-15T12:00:00Z',
  },
];

export const demoContas: ContaAnuncio[] = [
  { id: 'ca1', cliente_id: 'c1', plataforma: 'meta', id_externo: 'act_1029384756', nome_exibicao: 'Padaria — Meta Ads', created_at: '2025-11-11T10:00:00Z' },
  { id: 'ca2', cliente_id: 'c1', plataforma: 'google', id_externo: '123-456-7890', nome_exibicao: 'Padaria — Google Ads', created_at: '2025-11-11T10:00:00Z' },
  { id: 'ca3', cliente_id: 'c2', plataforma: 'meta', id_externo: 'act_5647382910', nome_exibicao: 'Loja XYZ — Meta Ads', created_at: '2026-01-06T10:00:00Z' },
  { id: 'ca4', cliente_id: 'c3', plataforma: 'meta', id_externo: 'act_1122334455', nome_exibicao: 'Studio — Meta Ads', created_at: '2026-07-21T10:00:00Z' },
];

export function demoFindCliente(id: string): Cliente | null {
  return demoClientes.find((c) => c.id === id) ?? null;
}

// ---- Mutações de clientes no Modo Demonstração (em memória) ----
type NovoCliente = Pick<Cliente, 'nome' | 'tipo_negocio' | 'status'> &
  Partial<Pick<Cliente, 'logo_url' | 'data_entrada' | 'servicos' | 'conteudos_por_semana'>>;

export function demoAddCliente(dados: NovoCliente): Cliente {
  const agora = new Date().toISOString();
  const novo: Cliente = {
    id: crypto.randomUUID(),
    nome: dados.nome,
    logo_url: dados.logo_url ?? null,
    tipo_negocio: dados.tipo_negocio,
    status: dados.status,
    servicos: dados.servicos ?? [],
    conteudos_por_semana: dados.conteudos_por_semana ?? 0,
    data_entrada: dados.data_entrada ?? agora.slice(0, 10),
    created_at: agora,
    updated_at: agora,
  };
  demoClientes.unshift(novo);
  return novo;
}

export function demoUpdateCliente(id: string, dados: Partial<Cliente>): void {
  const c = demoClientes.find((x) => x.id === id);
  if (c) Object.assign(c, dados, { updated_at: new Date().toISOString() });
}

export function demoDeleteCliente(id: string): void {
  const i = demoClientes.findIndex((x) => x.id === id);
  if (i >= 0) demoClientes.splice(i, 1);
}

export function demoContasDoCliente(clienteId: string): ContaAnuncio[] {
  return demoContas.filter((c) => c.cliente_id === clienteId);
}

export function demoClienteNome(id: string | null): string {
  if (!id) return '—';
  return demoClientes.find((c) => c.id === id)?.nome ?? '—';
}

// Opções para filtros/selects de cliente nos painéis (com "Todos").
export const demoClienteOptions = [
  { value: '', label: 'Todos os clientes' },
  ...demoClientes.map((c) => ({ value: c.id, label: c.nome })),
];
