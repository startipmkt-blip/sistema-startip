// Dados iniciais das ideias de Stories (Black Friday 2026). Usados no Modo Demonstração
// e como fonte da migration 0087. Preços e condições são fictícios (R$ 0.000).
import type { StickerData, StickerType, StoryClientSettings, StoryIdeaDraft, StoryStep } from './types';

export type SeedKey = 'layfe' | 'xm' | 'igotup' | 'lg';

export const SEED_NOMES: Record<SeedKey, string> = {
  layfe: 'Layfe Imports', xm: 'XM Gravataí', igotup: 'iGotUp', lg: 'LG Internet',
};

export const SEED_SETTINGS: Record<SeedKey, Omit<StoryClientSettings, 'client_id'>> = {
  layfe: {
    display_name: 'Layfe Imports', instagram_handle: 'layfeimports', initials: 'L',
    accent_color: '#FF6300', accent_text_color: '#FFFFFF', bg_from: '#0b0b0b', bg_to: '#2a1608', font_family: 'poppins',
    rules: 'Preço grande e legível, sempre com a condição real.\nNovos: "revenda autorizada". Seminovos: "garantia de 6 meses". Nunca misturar.\nFoto real do produto. Nada de produto criado por IA.\nLaranja só como destaque, base preta e branca.',
  },
  xm: {
    display_name: 'XM Gravataí', instagram_handle: 'xmgravatai', initials: 'XM',
    accent_color: '#FFFFFF', accent_text_color: '#111111', bg_from: '#111111', bg_to: '#2b2b2b', font_family: 'poppins',
    rules: 'Base preta e branca, preço em destaque.\nSó falar de oferta com produto, preço e condição confirmados.\nDois modelos lado a lado funcionam bem para enquete.',
  },
  igotup: {
    display_name: 'iGotUp', instagram_handle: 'igotup', initials: 'iG',
    accent_color: '#4DFF00', accent_text_color: '#0a0a0a', bg_from: '#070707', bg_to: '#16210f', font_family: 'poppins',
    rules: 'Base preta, verde #4DFF00 só como destaque.\nScooter e assistência técnica são assuntos separados.\nNão misturar especificações entre modelos.\nSó o WhatsApp principal de vendas.',
  },
  lg: {
    display_name: 'LG Internet', instagram_handle: 'lginternet', initials: 'LG',
    accent_color: '#0085FF', accent_text_color: '#FFFFFF', bg_from: '#0085FF', bg_to: '#003ED5', font_family: 'montserrat',
    rules: 'Nunca abrir com pergunta. O gancho é uma afirmação.\nLogo no final da sequência, com "Fale com a gente".\nBotão minimalista: ASSINE JÁ.\nSó falar de plano e preço quando estiverem confirmados.',
  },
};

interface SeedIdea {
  s: StoryStep;
  title: string;
  photo: string;
  head: string;
  sub?: string;
  price?: { pre: string; val: string; post: string };
  st?: { t: StickerType } & StickerData;
  logo?: boolean;
  tip: string;
}

const SEED: Record<SeedKey, SeedIdea[]> = {
  layfe: [
    { s: 'interacao', title: 'iPhone ou Android?', photo: 'Dois aparelhos lado a lado em fundo preto', head: 'Seu próximo celular é qual?', st: { t: 'poll', q: 'Próximo celular', a: 'iPhone', b: 'Android' }, tip: 'Abre a conversa sem vender. A resposta mostra quem está pensando em trocar de aparelho, e esse grupo é o seu melhor público para a Black.' },
    { s: 'interacao', title: 'O que te impede?', photo: 'Mão segurando um iPhone na vitrine da loja', head: 'O que te impede de comprar um iPhone?', sub: 'Pode falar, a gente responde aqui.', st: { t: 'question', q: 'Me conta aqui', ph: 'Digite sua resposta' }, tip: 'Cada resposta vira conteúdo e quebra objeção. Responda em Story com a foto da loja e o nome de quem perguntou, se a pessoa deixar.' },
    { s: 'conexao', title: 'Unboxing de cliente', photo: 'Cliente abrindo a caixa de um iPhone, sorrindo', head: 'Esse sorriso é o melhor momento do dia', sub: 'Entrega de hoje na loja, em Gravataí.', tip: 'Gente real abrindo a caixa. Peça autorização da pessoa antes de postar.' },
    { s: 'conexao', title: 'Bastidor da loja', photo: 'Equipe organizando a vitrine na Golden Tower', head: 'Por trás da vitrine', sub: 'Tudo conferido antes de chegar em você.', tip: 'Mostra loja física e endereço real. Reduz o medo de golpe.' },
    { s: 'prova', title: 'Cliente satisfeito', photo: 'Print de elogio de cliente no WhatsApp', head: '+1000 clientes satisfeitos', sub: 'Alguns dos nossos, de verdade.', st: { t: 'button', label: 'Falar com a Layfe', wa: true }, tip: 'Use prints reais, com autorização. Cubra nome e número do cliente.' },
    { s: 'prova', title: 'Pergunta de cliente', photo: 'Resposta curta sobre procedência dentro da loja', head: '"É original?"', sub: 'Sim. Revenda autorizada em produtos novos.', st: { t: 'quiz', q: 'Tem garantia?', opts: ['Tem sim', 'Explica aí'] }, tip: 'Responde a maior dúvida do público. Para seminovos, troque a frase por "garantia de 6 meses".' },
    { s: 'oferta', title: 'Produto com preço grande', photo: 'Foto real do produto em fundo limpo', head: 'iPhone modelo exemplo', price: { pre: 'a partir de', val: 'R$ 0.000', post: 'parcelamento até 18x quando aplicável' }, st: { t: 'button', label: 'Chamar no WhatsApp', wa: true }, tip: 'Exemplo de estrutura: produto, preço, condição, botão. Troque pelo item e valor reais confirmados.' },
    { s: 'oferta', title: 'Contagem da Black', photo: 'Vitrine com iPhones e luz laranja', head: 'A Black da Layfe tem hora para acabar', sub: 'Condições válidas enquanto durar o estoque.', st: { t: 'countdown', label: 'Termina em' }, tip: 'Só use depois de confirmar a data final e as condições com o cliente.' },
  ],
  xm: [
    { s: 'interacao', title: 'Qual você levaria?', photo: 'Dois celulares Xiaomi lado a lado', head: 'Qual desses você levaria?', st: { t: 'poll', q: 'Escolha um', a: 'Modelo A', b: 'Modelo B' }, tip: 'Compare dois modelos reais da loja. A escolha mostra o que o público procura.' },
    { s: 'interacao', title: 'O que você procura?', photo: 'Close da câmera de um celular', head: 'O que você procura em um celular?', sub: 'Câmera, bateria ou preço?', st: { t: 'question', q: 'Responde aqui', ph: 'Escreva aqui' }, tip: 'Use as respostas para montar a oferta certa para cada perfil.' },
    { s: 'conexao', title: 'Quem atende você', photo: 'Atendente da loja segurando um aparelho', head: 'Quem cuida do seu atendimento', sub: 'Loja em Gravataí, atendimento direto.', tip: 'Rosto e nome do time aproximam. Poste a equipe real.' },
    { s: 'prova', title: 'Entrega feliz', photo: 'Cliente recebendo a caixa na loja', head: 'Mais uma entrega feita', sub: 'Obrigado pela confiança.', tip: 'Fotos reais de entrega, com autorização do cliente.' },
    { s: 'oferta', title: 'Preço em destaque', photo: 'Foto real do aparelho em fundo limpo', head: 'Modelo exemplo', price: { pre: 'por', val: 'R$ 0.000', post: 'condição a confirmar' }, st: { t: 'button', label: 'Chamar no WhatsApp', wa: true }, tip: 'Só publique com produto, preço e condição confirmados.' },
  ],
  igotup: [
    { s: 'interacao', title: 'Quanto você gasta?', photo: 'Rua movimentada com trânsito de manhã', head: 'Quanto você gasta por mês com Uber ou ônibus?', st: { t: 'poll', q: 'Por mês', a: 'Até R$ 200', b: 'Mais que isso' }, tip: 'Abre o assunto scooter sem vender. A conta de transporte vira o argumento depois.' },
    { s: 'conexao', title: 'Bastidor da assistência', photo: 'Técnico mexendo em uma scooter na bancada', head: 'Aqui a scooter é cuidada de perto', sub: 'Assistência técnica própria.', tip: 'Lembre: assistência e venda de scooter são assuntos separados. Use este Story só para mostrar a oficina.' },
    { s: 'prova', title: 'Cliente na rua', photo: 'Cliente na scooter saindo da loja', head: 'Foi de Uber, voltou de scooter', sub: 'Entrega de hoje.', tip: 'Cena real de entrega, com autorização.' },
    { s: 'oferta', title: 'Chamada para simular', photo: 'Scooter em fundo preto com luz verde', head: 'Veja a scooter que cabe no seu dia', sub: 'Fale com a gente e simule.', st: { t: 'button', label: 'WhatsApp de vendas', wa: true }, tip: 'Use somente o WhatsApp principal de vendas.' },
  ],
  lg: [
    { s: 'interacao', title: 'Prioridade da casa', photo: 'Família usando celular e TV na sala', head: 'Internet boa muda a rotina da casa', st: { t: 'poll', q: 'O que pesa mais?', a: 'Velocidade', b: 'Estabilidade' }, tip: 'O gancho é uma afirmação. A enquete vem como apoio, nunca como abertura.' },
    { s: 'conexao', title: 'Equipe em campo', photo: 'Técnico da LG instalando em uma casa em Viamão', head: 'Quem instala está perto de você', sub: 'Equipe local, em Viamão.', tip: 'Mostre a equipe real e uniformizada.' },
    { s: 'prova', title: 'Instalação concluída', photo: 'Cliente mostrando o roteador funcionando', head: 'Mais uma casa conectada', sub: 'Obrigado por escolher a LG.', tip: 'Cena real, com autorização do cliente.' },
    { s: 'oferta', title: 'A Black da LG chegou', photo: 'Casa com sinal de wi-fi em azul', head: 'A Black da LG chegou a Viamão', sub: 'Fale com a gente.', st: { t: 'button', label: 'ASSINE JÁ', wa: false, min: true }, logo: true, tip: 'Afirmativo, sem pergunta. Logo no fim. Só mencione plano e preço depois de confirmar.' },
  ],
};

export function seedIdeias(key: SeedKey): (StoryIdeaDraft & { sort_order: number })[] {
  return SEED[key].map((i, n) => {
    const { t, ...dados } = i.st ?? { t: 'none' as StickerType };
    return {
      step: i.s,
      title: i.title,
      photo_hint: i.photo,
      headline: i.head,
      subtext: i.sub ?? '',
      price_pre: i.price?.pre ?? null,
      price_value: i.price?.val ?? null,
      price_post: i.price?.post ?? null,
      sticker_type: t,
      sticker_data: dados,
      tip: i.tip,
      show_logo: Boolean(i.logo),
      active: true,
      sort_order: n,
    };
  });
}
