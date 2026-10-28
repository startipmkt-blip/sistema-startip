import type { CSSProperties, KeyboardEvent } from 'react';
import './stories.css';
import { STORY_STEPS } from '@/modules/stories/types';
import type { StoryClientSettings, StoryIdeaDraft, StickerType, StickerData } from '@/modules/stories/types';

type Conteudo = Pick<StoryIdeaDraft,
  'step' | 'photo_hint' | 'headline' | 'subtext' | 'price_pre' | 'price_value' | 'price_post' |
  'sticker_type' | 'sticker_data' | 'show_logo'>;

function Sticker({ tipo, d }: { tipo: StickerType; d: StickerData }) {
  if (tipo === 'poll') {
    return <div className="st-stk"><div className="st-q">{d.q}</div><div className="st-opts"><span>{d.a}</span><span>{d.b}</span></div></div>;
  }
  if (tipo === 'question') {
    return <div className="st-stk qb"><div className="st-q">{d.q}</div><div className="st-fake">{d.ph}</div></div>;
  }
  if (tipo === 'quiz') {
    return <div className="st-stk"><div className="st-q">{d.q}</div><div className="st-opts col">{(d.opts ?? []).map((o, k) => <span key={k}>{o}</span>)}</div></div>;
  }
  if (tipo === 'countdown') {
    return <div className="st-stk"><div className="st-cd"><div className="t">{d.label}</div><div className="n"><span>02</span><span>14</span><span>37</span></div></div></div>;
  }
  if (tipo === 'button') {
    return <div className={`st-cta ${d.min ? 'min' : ''}`}>{d.wa && <i className="st-wa" />}{d.label}</div>;
  }
  return null;
}

interface Props {
  conteudo: Conteudo;
  config: StoryClientSettings;
  /** posição na barra de progresso */
  indice?: number;
  total?: number;
}

export function StoryView({ conteudo: c, config, indice, total = 4 }: Props) {
  const idx = indice ?? STORY_STEPS.findIndex((s) => s.id === c.step);
  const temPreco = Boolean(c.price_value);
  const estilo = {
    '--acc': config.accent_color,
    '--accfg': config.accent_text_color,
    background: `linear-gradient(160deg, ${config.bg_from}, ${config.bg_to})`,
  } as CSSProperties;
  const hl = temPreco ? 'pr' : c.headline.length < 34 ? 'xl' : '';

  return (
    <div className={`st-story st-${config.font_family}`} style={estilo}>
      <div className="st-photo"><i /><b>Foto: {c.photo_hint}</b></div>
      <div className="st-shade" />
      <div className="st-top">
        <div className="st-prog">{Array.from({ length: total }, (_, k) => <span key={k} className={k <= idx ? 'on' : ''} />)}</div>
        <div className="st-who">
          <span className="st-av" style={{ background: config.accent_color, color: config.accent_text_color }}>{config.initials}</span>
          {config.instagram_handle}<em>agora</em>
        </div>
      </div>
      <div className="st-body">
        <div className={`st-hl ${hl}`}>{c.headline}</div>
        {c.subtext && <div className="st-sub">{c.subtext}</div>}
        {temPreco && (
          <div className="st-price">
            {c.price_pre && <small>{c.price_pre}</small>}
            {c.price_value}
            {c.price_post && <small className="post">{c.price_post}</small>}
          </div>
        )}
        <Sticker tipo={c.sticker_type} d={c.sticker_data} />
        {c.show_logo && <span className="st-logo">{config.display_name}</span>}
      </div>
    </div>
  );
}

interface CardProps extends Props {
  titulo: string;
  onAbrir?: () => void;
  inativa?: boolean;
}

/** Story dentro da moldura de celular; focável e aberto com Enter/Espaço quando clicável. */
export function StoryCard({ titulo, onAbrir, inativa, ...resto }: CardProps) {
  const etapa = STORY_STEPS.find((s) => s.id === resto.conteudo.step);
  function tecla(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir?.(); }
  }
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${inativa ? 'opacity-50' : ''}`}>
      <div
        className={`st-phone ${onAbrir ? 'st-click' : ''}`}
        {...(onAbrir ? { tabIndex: 0, role: 'button', 'aria-label': `Abrir ideia ${titulo}`, onClick: onAbrir, onKeyDown: tecla } : {})}
      >
        <StoryView {...resto} />
      </div>
      <div className="px-0.5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{etapa?.n}. {etapa?.label}</div>
        <h3 className="text-sm font-semibold text-slate-100">{titulo}</h3>
      </div>
    </div>
  );
}
