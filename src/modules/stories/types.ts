export type StoryStep = 'interacao' | 'conexao' | 'prova' | 'oferta';
export type StickerType = 'poll' | 'question' | 'quiz' | 'countdown' | 'button' | 'none';
export type StoryFont = 'poppins' | 'montserrat';

export const STORY_STEPS: { id: StoryStep; n: number; label: string; desc: string }[] = [
  { id: 'interacao', n: 1, label: 'Interação', desc: 'Faz a pessoa participar' },
  { id: 'conexao', n: 2, label: 'Conexão', desc: 'Mostra quem está por trás' },
  { id: 'prova', n: 3, label: 'Prova', desc: 'Gera confiança' },
  { id: 'oferta', n: 4, label: 'Oferta', desc: 'Só depois, a venda' },
];

export const STICKER_LABEL: Record<StickerType, string> = {
  none: 'Sem sticker',
  poll: 'Enquete',
  question: 'Caixinha de perguntas',
  quiz: 'Quiz',
  countdown: 'Contagem regressiva',
  button: 'Botão',
};

export interface StickerData {
  q?: string;
  a?: string;
  b?: string;
  opts?: string[];
  ph?: string;
  label?: string;
  wa?: boolean;
  min?: boolean;
}

export interface StoryIdea {
  id: string;
  client_id: string;
  step: StoryStep;
  title: string;
  photo_hint: string;
  headline: string;
  subtext: string;
  price_pre: string | null;
  price_value: string | null;
  price_post: string | null;
  sticker_type: StickerType;
  sticker_data: StickerData;
  tip: string;
  show_logo: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export type StoryIdeaDraft = Omit<StoryIdea, 'id' | 'client_id' | 'created_at' | 'sort_order'>;

export interface StoryClientSettings {
  client_id: string;
  display_name: string;
  instagram_handle: string;
  initials: string;
  accent_color: string;
  accent_text_color: string;
  bg_from: string;
  bg_to: string;
  font_family: StoryFont;
  rules: string;
}

export function regrasDe(s: Pick<StoryClientSettings, 'rules'>): string[] {
  return s.rules.split('\n').map((r) => r.trim()).filter(Boolean);
}

type TextoStory = Pick<StoryIdea, 'headline' | 'subtext' | 'price_pre' | 'price_value' | 'price_post' | 'sticker_type' | 'sticker_data'>;

export function textoDoStory(i: TextoStory): string {
  const d = i.sticker_data;
  const preco = i.price_value ? [i.price_pre, i.price_value, i.price_post].filter(Boolean).join(' ') : '';
  const sticker = i.sticker_type === 'button' && d.label
    ? `Botão: ${d.label}`
    : i.sticker_type !== 'none' && i.sticker_type !== 'countdown' && d.q
      ? `Sticker: ${d.q}`
      : '';
  return [i.headline, i.subtext, preco, sticker].filter(Boolean).join('\n');
}

export function configPadrao(clientId: string, nome: string): StoryClientSettings {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  const iniciais = (palavras.length > 1 ? palavras.slice(0, 2).map((p) => p[0]).join('') : nome.slice(0, 2)).toUpperCase();
  return {
    client_id: clientId,
    display_name: nome,
    instagram_handle: nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''),
    initials: iniciais,
    accent_color: '#1e9be0',
    accent_text_color: '#ffffff',
    bg_from: '#0b0b0b',
    bg_to: '#1f2937',
    font_family: 'poppins',
    rules: '',
  };
}

export function ideiaVazia(): StoryIdeaDraft {
  return {
    step: 'interacao', title: '', photo_hint: '', headline: '', subtext: '',
    price_pre: null, price_value: null, price_post: null,
    sticker_type: 'none', sticker_data: {}, tip: '', show_logo: false, active: true,
  };
}
