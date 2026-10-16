import type { FormularioTipo } from '@/modules/formularios/types';

export function mensagemWhatsapp(tipo: FormularioTipo, link: string): string {
  switch (tipo) {
    case 'icp':
      return `Conforme prometido, estamos te enviando abaixo o formulário para preenchimento do ICP para termos informações para trabalharmos nos anúncios e redes sociais: ${link}`;
    case 'nicho':
      return `Segue também o formulário adaptado para o teu mercado para preenchimento integral: ${link}`;
    case 'padrao':
      return `Conforme prometido, segue o briefing para preenchimento com as informações do seu negócio. Quanto mais completo, menos ida e volta depois: ${link}`;
    case 'unificado':
      return `Conforme prometido, segue o formulário para preenchimento com as informações do seu negócio para trabalharmos nos anúncios e redes sociais: ${link}`;
  }
}
