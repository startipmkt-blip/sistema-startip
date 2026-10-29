export type IdeaType = 'bom_dia' | 'valor' | 'enquete' | 'enredo' | 'oferta' | 'teaser' | 'boa_noite' | 'outro';
export type BatchStatus = 'rascunho' | 'publicado';
export type IdeaState = 'nova' | 'salva' | 'usada';

export const IDEA_TYPES: { value: IdeaType; label: string; tone: 'blue' | 'green' | 'amber' | 'red' | 'slate' }[] = [
  { value: 'bom_dia', label: 'Bom dia', tone: 'amber' },
  { value: 'valor', label: 'Valor', tone: 'green' },
  { value: 'enquete', label: 'Enquete', tone: 'blue' },
  { value: 'enredo', label: 'Enredo', tone: 'green' },
  { value: 'oferta', label: 'Oferta', tone: 'red' },
  { value: 'teaser', label: 'Teaser', tone: 'blue' },
  { value: 'boa_noite', label: 'Boa noite', tone: 'slate' },
  { value: 'outro', label: 'Outro', tone: 'slate' },
];

export const tipoInfo = (t: IdeaType) => IDEA_TYPES.find((x) => x.value === t) ?? IDEA_TYPES[IDEA_TYPES.length - 1];

export interface IdeaBatch {
  id: string;
  client_id: string;
  title: string;
  reference_month: string | null;
  status: BatchStatus;
  created_by: string | null;
  created_at: string;
}

export interface Idea {
  id: string;
  batch_id: string;
  client_id: string;
  type: IdeaType;
  title: string | null;
  body: string;
  media_suggestion: string | null;
  theme: string | null;
  suggested_date: string | null;
  suggested_time: string | null;
  channel: string;
  position: number;
  source: 'startip' | 'ia';
  created_at: string;
  updated_at: string;
}

export type IdeaDraft = Pick<Idea, 'type' | 'title' | 'body' | 'media_suggestion' | 'theme' | 'suggested_date' | 'suggested_time'>;

export interface IdeaClientState {
  id: string;
  idea_id: string;
  client_id: string;
  status: IdeaState;
  copied_count: number;
  updated_at: string;
}

export const ideaVazia = (): IdeaDraft => ({
  type: 'valor', title: null, body: '', media_suggestion: null, theme: null, suggested_date: null, suggested_time: null,
});
