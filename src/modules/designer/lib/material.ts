import type { DesignerDemanda } from '../api/demandasApi';

/** A demanda já tem algo para o designer trabalhar (texto, link, áudio ou arquivo)? */
export function temMaterial(d: DesignerDemanda): boolean {
  const texto = `${d.descricao ?? ''}\n${d.briefing ?? ''}`;
  return (
    texto.trim().length > 0 ||
    (Array.isArray(d.anexos) && d.anexos.length > 0)
  );
}

/** Pedido de alteração do cliente (com justificativa) também conta como informação. */
export function temInformacao(d: DesignerDemanda): boolean {
  return temMaterial(d) || !!(d.reprovado_em && d.reprovado_justificativa?.trim());
}
