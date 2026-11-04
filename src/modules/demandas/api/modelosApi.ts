import { criarCrud, type Registro } from '@/shared/lib/crudTabela';
import type { DemandaFormData } from '@/modules/demandas/api/demandasApi';

/** Modelo de demanda: os campos do formulário guardados para reaproveitar. */
export interface DemandaModelo extends Registro {
  nome: string;
  dados: Partial<DemandaFormData>;
}

export const modelosDemanda = criarCrud<DemandaModelo>({
  tabela: 'demanda_modelos',
  chave: ['demandas', 'modelos'],
  ordem: [{ coluna: 'nome', asc: true }],
});
