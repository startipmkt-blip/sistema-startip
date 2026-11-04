import type { Caixa } from './layout';
import { CORES_ESCURAS, STATUS_NO } from './types';

const RAIO = { retangulo: 4, arredondado: 12, pilula: 999 } as const;

/** Desenha o mapa (linhas + nós) num canvas e baixa como PNG. Fundo branco, 2x para ficar nítido. */
export function exportarPng(caixas: Caixa[], nomeArquivo: string) {
  if (caixas.length === 0) return;
  const margem = 40;
  const minX = Math.min(...caixas.map((c) => c.x));
  const minY = Math.min(...caixas.map((c) => c.y));
  const maxX = Math.max(...caixas.map((c) => c.x + c.w));
  const maxY = Math.max(...caixas.map((c) => c.y + c.h));
  const escala = 2;
  const canvas = document.createElement('canvas');
  canvas.width = (maxX - minX + margem * 2) * escala;
  canvas.height = (maxY - minY + margem * 2) * escala;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(escala, escala);
  ctx.translate(margem - minX, margem - minY);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(minX - margem, minY - margem, canvas.width, canvas.height);

  const porId = new Map(caixas.map((c) => [c.no.id, c]));
  ctx.strokeStyle = '#9ccbea';
  ctx.lineWidth = 2;
  for (const c of caixas) {
    const pai = c.no.pai ? porId.get(c.no.pai) : undefined;
    if (!pai) continue;
    const x1 = pai.x + pai.w, y1 = pai.y + pai.h / 2, x2 = c.x, y2 = c.y + c.h / 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2);
    ctx.stroke();
  }

  for (const c of caixas) {
    const r = Math.min(RAIO[c.no.formato], c.h / 2);
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.w, c.h, r);
    ctx.fillStyle = c.no.cor;
    ctx.fill();
    ctx.strokeStyle = c.no.cor === '#ffffff' ? '#dbe3ea' : c.no.cor;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (c.no.cor === '#ffffff') {
      ctx.fillStyle = '#1e9be0';
      ctx.fillRect(c.x, c.y + 6, 3, c.h - 12);
    }
    const escura = CORES_ESCURAS.has(c.no.cor);
    ctx.fillStyle = escura ? '#ffffff' : '#0e1a24';
    ctx.font = `${c.no.negrito || c.no.pai === null ? 700 : 500} 14px Montserrat, system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    c.linhas.forEach((l, i) => ctx.fillText(l, c.x + 14, c.y + 10 + i * 20));
    const st = STATUS_NO.find((s) => s.id === c.no.status);
    if (c.no.status && st) {
      ctx.font = '600 11px Montserrat, system-ui, sans-serif';
      ctx.fillStyle = st.cor;
      ctx.fillText(`● ${st.label}${c.no.data ? `  ·  ${c.no.data.split('-').reverse().join('/')}` : ''}`, c.x + 14, c.y + c.h - 20);
    }
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeArquivo.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'mapa-mental'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}
