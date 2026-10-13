export const MARCADOR_LINK = '{link}';

export const MSG_SEMANAL_PADRAO =
  'Olá pessoal, tudo bem?\n\n' +
  'Passando para desejar uma ótima sexta-feira. Queremos um feedback da semana: quais foram as maiores ' +
  'dificuldades e o que vocês notaram em relação aos anúncios e ao negócio de vocês, para a gente oferecer uma solução.\n\n' +
  `É só responder por este link:\n${MARCADOR_LINK}`;

export function linkCs(slug: string): string {
  return `${window.location.origin}/cs/${slug}`;
}

/** Troca {link} pelo endereço do cliente; se o modelo não tiver o marcador, põe o link no fim. */
export function montarMensagem(modelo: string, link: string): string {
  const texto = modelo.trim();
  return texto.includes(MARCADOR_LINK) ? texto.split(MARCADOR_LINK).join(link) : `${texto}\n\n${link}`;
}

export function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}

export function dataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

/** Verdadeiro se o envio foi nos últimos 6 dias (mesma "rodada" semanal). */
export function enviadoNestaSemana(iso: string | undefined): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < 6 * 24 * 60 * 60 * 1000;
}
