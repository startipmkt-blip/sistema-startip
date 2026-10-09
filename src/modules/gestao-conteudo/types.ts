import type { ConteudoTipo } from '@/modules/conteudo/types';

export type Etapa =
  | 'em_edicao' | 'editado' | 'enviado' | 'aprovado' | 'reprovado' | 'programado' | 'publicado';

export interface EtapaInfo {
  id: Etapa;
  label: string;
  emoji: string;
  tone: 'slate' | 'blue' | 'amber' | 'green' | 'red';
}

/** Ordem do fluxo de trabalho de um post. */
export const ETAPAS: EtapaInfo[] = [
  { id: 'em_edicao',  label: 'Em edição',           emoji: '✂️', tone: 'slate' },
  { id: 'editado',    label: 'Editado',             emoji: '🎬', tone: 'blue'  },
  { id: 'enviado',    label: 'Enviado p/ aprovação', emoji: '📤', tone: 'amber' },
  { id: 'reprovado',  label: 'Reprovado',           emoji: '↩️', tone: 'red'   },
  { id: 'aprovado',   label: 'Aprovado',            emoji: '✅', tone: 'green' },
  { id: 'programado', label: 'Programado',          emoji: '🗓️', tone: 'blue'  },
  { id: 'publicado',  label: 'Publicado',           emoji: '🚀', tone: 'green' },
];

export const ETAPA_INFO: Record<Etapa, EtapaInfo> = Object.fromEntries(
  ETAPAS.map((e) => [e.id, e]),
) as Record<Etapa, EtapaInfo>;

export interface Post {
  id: string;
  cliente_id: string;
  mes_referencia: string;
  semana: number;
  titulo: string;
  descricao: string;
  formato: ConteudoTipo;
  dia_postagem: string | null;
  link_drive: string | null;
  etapa: Etapa;
  status: 'pendente' | 'aprovado' | 'reprovado';
  justificativa: string;
  visivel_cliente: boolean;
  enviado_em: string | null;
  decidido_em: string | null;
  lembrete_em: string | null;
  lembretes_enviados: number;
  created_at: string;
}

export interface ConfigGestao {
  whatsapp_equipe: string | null;
  avisar_reprovacao: boolean;
  lembrete_ativo: boolean;
  lembrete_horas: number;
  lembrete_maximo: number;
}

export const CONFIG_PADRAO: ConfigGestao = {
  whatsapp_equipe: null, avisar_reprovacao: true,
  lembrete_ativo: true, lembrete_horas: 48, lembrete_maximo: 3,
};

export type Visao = 'carteira' | 'tabela' | 'semana';

// ---------- datas ----------
export const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function isoData(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Segunda-feira da semana de `d`, deslocada em `semanas`. */
export function segundaDaSemana(d: Date, semanas = 0): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (r.getDay() + 6) % 7; // segunda = 0
  r.setDate(r.getDate() - dow + semanas * 7);
  return r;
}

/** Leva um dia 'YYYY-MM-DD' para o mesmo dia do mês `destino` ('YYYY-MM'), limitando ao fim do mês. */
export function mesmoDiaEmOutroMes(dia: string | null, destino: string): string | null {
  if (!dia) return null;
  const d = Number(dia.slice(8, 10));
  const [y, m] = destino.split('-').map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return `${destino}-${String(Math.min(d, ultimo)).padStart(2, '0')}`;
}

export function formatarDuracao(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const dias = Math.floor(h / 24);
  const resto = h % 24;
  return resto ? `${dias}d ${resto}h` : `${dias}d`;
}

export type PostForm = Pick<
  Post,
  'titulo' | 'descricao' | 'formato' | 'semana' | 'dia_postagem' | 'link_drive'
>;

export const FORMATO_OPCOES: { value: ConteudoTipo; label: string }[] = [
  { value: 'reels', label: 'Reels / Vídeo' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'estatico', label: 'Estático' },
];

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function mesRef(ano: number, mesIdx: number): string {
  return `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
}

export function mesAtualRef(): string {
  const d = new Date();
  return mesRef(d.getFullYear(), d.getMonth());
}

export function mesLabel(ref: string): string {
  const [y, m] = ref.split('-').map(Number);
  return `${MESES[m - 1]} de ${y}`;
}

export function deslocarMes(ref: string, delta: number): string {
  const [y, m] = ref.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return mesRef(d.getFullYear(), d.getMonth());
}

// ---------- Google Drive ----------
export interface DriveInfo {
  tipo: 'arquivo' | 'pasta' | 'invalido';
  id?: string;
  /** URL para embutir em iframe (vídeo ou imagem). */
  previewUrl?: string;
  /** Miniatura estática, boa para listas. */
  thumbUrl?: string;
  /** Link para abrir no próprio Drive. */
  abrirUrl: string;
}

export function driveInfo(url: string | null | undefined): DriveInfo {
  const bruto = (url ?? '').trim();
  if (!bruto) return { tipo: 'invalido', abrirUrl: '' };
  const pasta = bruto.match(/\/folders\/([\w-]{10,})/);
  if (pasta) return { tipo: 'pasta', id: pasta[1], abrirUrl: bruto };
  const arquivo =
    bruto.match(/\/file\/d\/([\w-]{10,})/) ??
    bruto.match(/[?&]id=([\w-]{10,})/);
  if (arquivo && /drive\.google\.com|docs\.google\.com/.test(bruto)) {
    const id = arquivo[1];
    return {
      tipo: 'arquivo',
      id,
      previewUrl: `https://drive.google.com/file/d/${id}/preview`,
      thumbUrl: `https://drive.google.com/thumbnail?id=${id}&sz=w640`,
      abrirUrl: `https://drive.google.com/file/d/${id}/view`,
    };
  }
  return { tipo: 'invalido', abrirUrl: bruto };
}

/** Texto do lembrete manual enviado ao cliente. */
export function mensagemLembrete(p: { clienteNome: string; qtd: number; link: string }): string {
  return (
    `Olá, ${p.clienteNome}! 👋

` +
    `Passando para lembrar que ${p.qtd === 1 ? 'há 1 conteúdo aguardando' : `há ${p.qtd} conteúdos aguardando`} ` +
    `a sua aprovação.

É rapidinho — veja a prévia e aprove por aqui:
${p.link}

Obrigado!`
  );
}

/** Texto padrão enviado ao cliente no WhatsApp. */
export function mensagemAprovacao(p: {
  clienteNome: string;
  mes: string;
  qtd: number;
  link: string;
}): string {
  return (
    `Olá, ${p.clienteNome}! 👋\n\n` +
    `Seus conteúdos de ${mesLabel(p.mes)} estão prontos para aprovação ` +
    `(${p.qtd} ${p.qtd === 1 ? 'conteúdo' : 'conteúdos'}).\n\n` +
    `Veja a prévia e aprove ou peça ajustes por aqui:\n${p.link}\n\n` +
    `Se pedir ajuste, é só contar o que deseja alterar. Obrigado!`
  );
}
