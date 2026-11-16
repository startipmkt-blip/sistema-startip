import type { Profile } from '@/shared/types/database';
import type { DesignerDemanda } from '../api/demandasApi';

/** Designer da equipe (operador com cargo de designer). Sócios nunca são bloqueados. */
export function ehDesigner(profile: Profile | null): boolean {
  return !!profile && profile.papel !== 'admin' && /designer/i.test(profile.cargo ?? '');
}

/**
 * O designer só vê descrição, briefing, áudios e arquivos depois de passar a demanda
 * para "Em andamento" (isso também liga o cronômetro). Em A fazer e Alteração fica trancado.
 */
export function briefingBloqueado(d: Pick<DesignerDemanda, 'status'>, profile: Profile | null): boolean {
  return ehDesigner(profile) && (d.status === 'a_fazer' || d.status === 'alteracao');
}
