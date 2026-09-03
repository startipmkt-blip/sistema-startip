// Tipos específicos do módulo de clientes.
// Os tipos de linha do banco vêm de shared/types (fonte única).
import type {
  Cliente,
  ClienteStatus,
  ServicoCliente,
  TipoNegocio,
} from '@/shared/types/database';

export type { Cliente, ClienteStatus, ServicoCliente, TipoNegocio };

export const SERVICO_LABEL: Record<ServicoCliente, string> = {
  social_midia: 'Social mídia',
  trafego_pago: 'Tráfego pago',
  google_meu_negocio: 'Google Meu Negócio',
};

export const SERVICO_OPTIONS = (
  Object.keys(SERVICO_LABEL) as ServicoCliente[]
).map((s) => ({ value: s, label: SERVICO_LABEL[s] }));

export const STATUS_LABEL: Record<ClienteStatus, string> = {
  prospect: 'Prospect',
  ativo: 'Ativo',
  inativo: 'Inativo',
};

export const TIPO_NEGOCIO_LABEL: Record<TipoNegocio, string> = {
  local: 'Negócio local',
  ecommerce: 'E-commerce',
};
