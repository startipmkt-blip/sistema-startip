import { useEffect, useMemo, useRef, useState } from 'react';
import './stories.css';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import type { StoryClientSettings, StoryIdea } from '@/modules/stories/types';

const W = 1080;
const H = 1920;

interface Estado {
  headline: string;
  subtext: string;
  pre: string;
  value: string;
  post: string;
  btn: string;
  showBtn: boolean;
  size: number;
  y: number;
  dark: number;
  color: string;
  align: 'left' | 'center' | 'right';
}

function retArredondado(x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

function quebrar(x: CanvasRenderingContext2D, texto: string, fonte: string, maxW: number): string[] {
  x.font = fonte;
  const linhas: string[] = [];
  texto.split('\n').forEach((par) => {
    let atual = '';
    par.split(' ').forEach((w) => {
      const n = atual ? `${atual} ${w}` : w;
      if (x.measureText(n).width > maxW && atual) { linhas.push(atual); atual = w; } else atual = n;
    });
    linhas.push(atual);
  });
  return linhas;
}

function desenhar(cv: HTMLCanvasElement, e: Estado, img: HTMLImageElement | null, cfg: StoryClientSettings) {
  const x = cv.getContext('2d');
  if (!x) return;
  const fam = cfg.font_family === 'montserrat' ? 'Montserrat' : 'Poppins';
  x.clearRect(0, 0, W, H);
  if (img) {
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    x.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, cfg.bg_from);
    g.addColorStop(1, cfg.bg_to);
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.font = `500 44px ${fam}`;
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    x.fillText('Anexe sua foto de fundo', W / 2, H * 0.38);
  }
  x.fillStyle = `rgba(0,0,0,${e.dark / 100})`;
  x.fillRect(0, 0, W, H);

  const maxW = 900;
  const hf = `800 ${e.size}px ${fam}`;
  const lh = e.size * 1.1;
  const hL = e.headline ? quebrar(x, e.headline, hf, maxW) : [];
  const sL = e.subtext ? quebrar(x, e.subtext, `500 46px ${fam}`, maxW) : [];
  x.font = `700 40px ${fam}`;
  const bw = e.showBtn && e.btn ? Math.min(maxW, x.measureText(e.btn).width + 150) : 0;

  // Blocos empilhados: cada um informa a altura e como se desenha a partir de y.
  const ax = e.align === 'left' ? 90 : e.align === 'right' ? W - 90 : W / 2;
  const blocos: { h: number; fn: (y: number) => void }[] = [];
  if (hL.length) blocos.push({ h: hL.length * lh, fn: (y) => { x.font = hf; hL.forEach((l, k) => x.fillText(l, ax, y + k * lh)); } });
  if (sL.length) blocos.push({ h: 30 + sL.length * 62, fn: (y) => { x.font = `500 46px ${fam}`; sL.forEach((l, k) => x.fillText(l, ax, y + 30 + k * 62)); } });
  if (e.value) {
    const h = 20 + (e.pre ? 56 : 0) + 170 + (e.post ? 58 : 0);
    blocos.push({ h, fn: (y) => {
      let cy = y + 20;
      if (e.pre) { x.font = `600 40px ${fam}`; x.fillText(e.pre, ax, cy); cy += 56; }
      x.font = `800 150px ${fam}`; x.fillText(e.value, ax, cy); cy += 170;
      if (e.post) { x.font = `500 38px ${fam}`; x.fillText(e.post, ax, cy); }
    } });
  }
  if (bw) {
    blocos.push({ h: 150, fn: (y) => {
      const by = y + 30;
      const bx = e.align === 'left' ? 90 : e.align === 'right' ? W - 90 - bw : (W - bw) / 2;
      x.save();
      x.shadowColor = 'transparent';
      x.fillStyle = cfg.accent_color;
      retArredondado(x, bx, by, bw, 120, 60);
      x.fill();
      x.fillStyle = cfg.accent_text_color;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.font = `700 40px ${fam}`;
      x.fillText(e.btn, bx + bw / 2, by + 62);
      x.restore();
    } });
  }
  const total = blocos.reduce((s, b) => s + b.h, 0);
  let y = 80 + (H - 160 - total) * (e.y / 100);
  x.textAlign = e.align;
  x.textBaseline = 'top';
  x.fillStyle = e.color;
  x.shadowColor = 'rgba(0,0,0,.35)';
  x.shadowBlur = 12;
  blocos.forEach((b) => { b.fn(y); y += b.h; x.textAlign = e.align; x.textBaseline = 'top'; x.fillStyle = e.color; });
  x.shadowBlur = 0;
}

interface Props {
  ideia: StoryIdea;
  config: StoryClientSettings;
  onVoltar: () => void;
}

export function StoryEditor({ ideia, config, onVoltar }: Props) {
  const temBotao = ideia.sticker_type === 'button';
  const [e, setE] = useState<Estado>({
    headline: ideia.headline,
    subtext: ideia.subtext,
    pre: ideia.price_pre ?? '',
    value: ideia.price_value ?? '',
    post: ideia.price_post ?? '',
    btn: temBotao ? ideia.sticker_data.label ?? '' : '',
    showBtn: temBotao,
    size: ideia.price_value ? 78 : 96,
    y: 72,
    dark: 40,
    color: '#ffffff',
    align: 'left',
  });
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fontesProntas, setFontesProntas] = useState(0);
  const [resultado, setResultado] = useState<{ url: string; nome: string } | null>(null);
  const [erro, setErro] = useState('');
  const cvRef = useRef<HTMLCanvasElement>(null);
  const urlFoto = useRef<string | null>(null);

  const fam = config.font_family === 'montserrat' ? 'Montserrat' : 'Poppins';

  useEffect(() => {
    let vivo = true;
    Promise.all(['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 40px ${fam}`)))
      .then(() => { if (vivo) setFontesProntas((n) => n + 1); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [fam]);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const id = requestAnimationFrame(() => desenhar(cv, e, img, config));
    return () => cancelAnimationFrame(id);
  }, [e, img, config, fontesProntas]);

  useEffect(() => () => {
    if (urlFoto.current) URL.revokeObjectURL(urlFoto.current);
    if (resultado) URL.revokeObjectURL(resultado.url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => setE((s) => ({ ...s, [k]: v }));

  function escolherFoto(file: File | undefined) {
    if (!file) return;
    if (urlFoto.current) URL.revokeObjectURL(urlFoto.current);
    const url = URL.createObjectURL(file);
    urlFoto.current = url;
    const im = new Image();
    im.onload = () => { setErro(''); setImg(im); };
    im.onerror = () => setErro('Não foi possível ler essa imagem. Tente outro arquivo.');
    im.src = url;
  }

  const nomeArquivo = useMemo(() => `story-${config.instagram_handle || 'cliente'}-${ideia.step}.png`, [config.instagram_handle, ideia.step]);

  function exportar() {
    const cv = cvRef.current;
    if (!cv) return;
    desenhar(cv, e, img, config);
    cv.toBlob((blob) => {
      if (!blob) { setErro('Não foi possível exportar. Tente com outra imagem.'); return; }
      if (resultado) URL.revokeObjectURL(resultado.url);
      const url = URL.createObjectURL(blob);
      setResultado({ url, nome: nomeArquivo });
      setErro('');
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      a.click();
    }, 'image/png');
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-[260px] md:max-w-none">
        <canvas ref={cvRef} width={W} height={H} className="st-canvas" aria-label="Prévia do Story em 1080 por 1920" />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Editor</div>
          <h3 className="text-lg font-semibold text-white">{ideia.title}</h3>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Foto de fundo (cobre 1080 x 1920)
          <input
            type="file"
            accept="image/*"
            onChange={(ev) => escolherFoto(ev.target.files?.[0])}
            className="glass-field cursor-pointer px-3 py-2 text-sm"
          />
        </label>
        <Textarea label="Título" value={e.headline} onChange={(ev) => set('headline', ev.target.value)} className="!min-h-[56px]" semLinks />
        <Textarea label="Subtexto" value={e.subtext} onChange={(ev) => set('subtext', ev.target.value)} className="!min-h-[56px]" semLinks />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Antes do preço" value={e.pre} onChange={(ev) => set('pre', ev.target.value)} />
          <Input label="Preço" value={e.value} onChange={(ev) => set('value', ev.target.value)} />
        </div>
        <Input label="Condição" value={e.post} onChange={(ev) => set('post', ev.target.value)} />
        <Input label="Texto do botão" value={e.btn} onChange={(ev) => set('btn', ev.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={e.showBtn} onChange={(ev) => set('showBtn', ev.target.checked)} />
          Mostrar botão
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">Tamanho do texto
            <input type="range" min={50} max={150} value={e.size} onChange={(ev) => set('size', +ev.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">Posição vertical
            <input type="range" min={0} max={100} value={e.y} onChange={(ev) => set('y', +ev.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">Escurecer a foto
            <input type="range" min={0} max={80} value={e.dark} onChange={(ev) => set('dark', +ev.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">Cor do texto
            <input type="color" value={e.color} onChange={(ev) => set('color', ev.target.value)} className="h-9 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent p-0.5" />
          </label>
        </div>
        <Select
          label="Alinhamento"
          value={e.align}
          onChange={(ev) => set('align', ev.target.value as Estado['align'])}
          options={[{ value: 'left', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Direita' }]}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportar}>Exportar imagem</Button>
          <Button variant="secondary" onClick={onVoltar}>Voltar</Button>
        </div>
        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
        {resultado && (
          <div className="flex flex-col gap-2">
            <img src={resultado.url} alt="Prévia da imagem exportada" className="w-36 rounded-xl border border-white/15" />
            <a href={resultado.url} download={resultado.nome} className="text-sm text-brand-300 underline">Baixar PNG de novo</a>
            <span className="text-xs text-slate-400">Se o download não iniciar, clique com o botão direito (ou segure) na imagem e escolha salvar.</span>
          </div>
        )}
        <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          Enquete, caixinha e contagem não vão na imagem. Adicione esses stickers no próprio Instagram, por cima da imagem exportada em 1080 x 1920.
        </p>
      </div>
    </div>
  );
}
