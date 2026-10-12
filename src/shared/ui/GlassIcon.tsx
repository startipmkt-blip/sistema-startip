// Ícones "vidro" (glass) da Startip OS. Substituem os emojis da interface.
//
// Como funciona: cada glifo é um SVG 24x24 desenhado em contorno. Por cima aplicamos
// um preenchimento translúcido em degradê, borda com brilho especular (branco no topo)
// e um glow suave da cor do tom. Os degradês ficam num <GlassSprite /> montado uma vez
// só (App) e são referenciados por url(#id) — por isso o sprite precisa estar no DOM.
//
// Uso:
//   <GlassIcon name="paperclip" />            glifo por nome
//   <GlassIcon emoji={item.icone} />          a partir de um emoji guardado em dado
//   {glassify('📎 Anexar arquivo')}            troca emojis dentro de uma string
import { Fragment, type ReactNode } from 'react';

export type GlassTone =
  | 'brand' | 'emerald' | 'amber' | 'red' | 'violet' | 'pink' | 'orange' | 'slate' | 'white';

const TONES: Record<GlassTone, { light: string; mid: string; deep: string }> = {
  brand:   { light: '#d5eefb', mid: '#40b0e9', deep: '#1580bf' },
  emerald: { light: '#d1fae5', mid: '#34d399', deep: '#059669' },
  amber:   { light: '#fef3c7', mid: '#fbbf24', deep: '#d97706' },
  red:     { light: '#fee2e2', mid: '#f87171', deep: '#dc2626' },
  violet:  { light: '#ede9fe', mid: '#a78bfa', deep: '#7c3aed' },
  pink:    { light: '#fce7f3', mid: '#f472b6', deep: '#db2777' },
  orange:  { light: '#ffedd5', mid: '#fb923c', deep: '#ea580c' },
  slate:   { light: '#f1f5f9', mid: '#a3b1c6', deep: '#64748b' },
  white:   { light: '#ffffff', mid: '#f1f5f9', deep: '#cbd5e1' },
};

interface Glyph {
  /** Formas fechadas: recebem preenchimento de vidro + borda. */
  body?: string;
  /** Traços abertos: só borda. */
  lines?: string;
  tone: GlassTone;
  /** Esfera de vidro (indicadores de status), ignora body/lines. */
  orb?: boolean;
}

const CIRCLE = 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z';

const G = {
  // —— documentos e objetos ——
  paperclip: { tone: 'slate', lines: 'M21.4 11l-9.2 9.2a6 6 0 0 1-8.5-8.5l8.6-8.6a4 4 0 1 1 5.7 5.7l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.5-8.5' },
  calendar: { tone: 'brand', body: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', lines: 'M3 10h18M8 3v4M16 3v4' },
  clipboard: { tone: 'brand', body: 'M7 4h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 2h6v4H9z', lines: 'M9 12h6M9 16h4' },
  file: { tone: 'brand', body: 'M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z', lines: 'M14 2v5h5' },
  note: { tone: 'amber', body: 'M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z', lines: 'M14 2v5h5M9 13h6M9 17h6M9 9h2' },
  pencil: { tone: 'amber', body: 'M4 20l1-4L17 4a2.1 2.1 0 0 1 3 3L8 19z', lines: 'M15 6l3 3' },
  folder: { tone: 'amber', body: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  layers: { tone: 'brand', body: 'M12 2l10 5-10 5L2 7z', lines: 'M2 12l10 5 10-5M2 17l10 5 10-5' },
  'id-card': { tone: 'brand', body: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', lines: 'M9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 16c.5-1.5 5.5-1.5 6 0M15 9h3M15 13h3' },
  archive: { tone: 'orange', body: 'M20 8v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8zM2 3h20v5H2z', lines: 'M10 12h4' },
  inbox: { tone: 'brand', body: 'M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.2a2 2 0 0 0-1.7 1.1z', lines: 'M22 12h-6l-2 3h-4l-2-3H2' },
  upload: { tone: 'brand', lines: 'M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3' },
  download: { tone: 'brand', lines: 'M12 4v12M7 11l5 5 5-5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3' },
  'bar-chart': { tone: 'brand', body: 'M4 12h4v8H4zM10 5h4v15h-4zM16 9h4v11h-4z' },
  'trending-up': { tone: 'emerald', lines: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
  target: { tone: 'red', body: CIRCLE, lines: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
  lightbulb: { tone: 'amber', body: 'M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z', lines: 'M9.5 19h5M10.5 21.5h3' },
  zap: { tone: 'amber', body: 'M13 2L4 14h7l-1 8 9-12h-7z' },
  link: { tone: 'brand', lines: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7' },
  lock: { tone: 'slate', body: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z', lines: 'M8 11V7a4 4 0 0 1 8 0v4' },
  unlock: { tone: 'slate', body: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z', lines: 'M8 11V7a4 4 0 0 1 7.5-2' },
  bell: { tone: 'amber', body: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z', lines: 'M13.7 21a2 2 0 0 1-3.4 0' },
  'bell-off': { tone: 'slate', lines: 'M13.7 21a2 2 0 0 1-3.4 0M3 3l18 18M8.7 3A6 6 0 0 1 18 8c0 2.6.4 4.5 1 6M6.3 6.3C6.1 6.8 6 7.4 6 8c0 7-3 9-3 9h14' },
  volume: { tone: 'brand', body: 'M11 5L6 9H3v6h3l5 4z', lines: 'M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13' },
  mic: { tone: 'red', body: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z', lines: 'M19 10v1a7 7 0 0 1-14 0v-1M12 18v4' },
  headphones: { tone: 'violet', body: 'M18 11h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1zM6 11H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1z', lines: 'M3 14v-2a9 9 0 0 1 18 0v2' },
  music: { tone: 'violet', body: 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', lines: 'M9 18V5l12-2v13' },
  clapperboard: { tone: 'violet', body: 'M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM20.2 6L3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z', lines: 'M6.2 5.3l3.1 3.9M12.4 3.4l3.1 4' },
  palette: { tone: 'pink', body: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.7 1.7-1.7 0-.4-.2-.8-.5-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7H17c2.8 0 5-2.2 5-5 0-4.9-4.5-9-10-9z', lines: 'M7.5 12.5h.01M10.5 7.5h.01M15.5 8.5h.01' },
  image: { tone: 'brand', body: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', lines: 'M21 15l-5-5L5 21M9 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
  camera: { tone: 'brand', body: 'M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z', lines: 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  film: { tone: 'violet', body: 'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', lines: 'M7 3v18M17 3v18M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4' },
  tv: { tone: 'brand', body: 'M4 7h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z', lines: 'M17 2l-5 5-5-5M8 22h8' },
  smartphone: { tone: 'brand', body: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', lines: 'M11 18h2' },
  phone: { tone: 'emerald', body: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z' },
  mail: { tone: 'brand', body: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', lines: 'M3 7l9 6 9-6' },
  'map-pin': { tone: 'red', body: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', lines: 'M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' },
  map: { tone: 'emerald', body: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z', lines: 'M9 4v14M15 6v14' },
  building: { tone: 'brand', body: 'M6 3h12a1 1 0 0 1 1 1v17H5V4a1 1 0 0 1 1-1z', lines: 'M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3' },
  landmark: { tone: 'violet', body: 'M3 9l9-6 9 6z', lines: 'M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 21h18M3 18h18' },
  user: { tone: 'brand', body: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', lines: 'M4 21a8 8 0 0 1 16 0' },
  'user-plus': { tone: 'brand', body: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', lines: 'M2 21a8 8 0 0 1 16 0M19 8v6M16 11h6' },
  users: { tone: 'brand', body: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', lines: 'M2 21a7 7 0 0 1 14 0M16 4.2a4 4 0 0 1 0 7.6M18 14.5a7 7 0 0 1 4 6.5' },
  crown: { tone: 'amber', body: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z' },
  bot: { tone: 'violet', body: 'M7 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z', lines: 'M12 8V4M12 3.5h.01M2 14h3M19 14h3M9 13v2M15 13v2' },
  rocket: { tone: 'brand', body: 'M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1zM12 15l-3-3a22 22 0 0 1 2-4A13 13 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z', lines: 'M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5' },
  star: { tone: 'amber', body: 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z' },
  sparkles: { tone: 'amber', body: 'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.500 9.5l4.700-1.800z', lines: 'M19 15v4M17 17h4M5 16v3M3.500 17.500h3' },
  party: { tone: 'pink', body: 'M5.8 11.3L2 22l10.7-3.8M11 13c1.9 1.900 2.800 4.200 2 5-.8.800-3.100-.1-5-2-1.900-1.900-2.800-4.200-2-5 .8-.8 3.100.1 5 2z', lines: 'M4 3h.01M22 8h.01M15 2h.01M22 20h.01M22 2l-2.2.8a2.900 2.900 0 0 0-2 3.100c.1.900-.6 1.600-1.400 1.600h-.4c-.9 0-1.600.6-1.800 1.400L14 10M22 13l-.8-.3c-.9-.3-1.800.2-2 1.100-.1.700-.7 1.200-1.400 1.200H17M11 2l.3.8c.3.900-.2 1.800-1.100 2C9.500 4.900 9 5.500 9 6.200V7' },
  refresh: { tone: 'brand', lines: 'M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5' },
  search: { tone: 'brand', body: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', lines: 'M21 21l-4.300-4.300' },
  eye: { tone: 'brand', body: 'M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z', lines: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  'eye-off': { tone: 'slate', lines: 'M3 3l18 18M10.600 5.100A10.500 10.500 0 0 1 12 5c6.400 0 10 7 10 7a17 17 0 0 1-3 3.800M6.600 6.600A16.600 16.600 0 0 0 2 12s3.600 7 10 7a10 10 0 0 0 5.400-1.600M9.900 9.900a3 3 0 0 0 4.200 4.200' },
  // —— estados e ações ——
  'check-circle': { tone: 'emerald', body: CIRCLE, lines: 'M8 12.500l2.700 2.700L16 9.500' },
  check: { tone: 'emerald', lines: 'M5 12.500l4.500 4.500L19 7.500' },
  'check-check': { tone: 'emerald', lines: 'M2 13l4.500 4.500L15 9M9 15l1.500 1.500L21 7' },
  'x-circle': { tone: 'red', body: CIRCLE, lines: 'M9 9l6 6M15 9l-6 6' },
  x: { tone: 'slate', lines: 'M6 6l12 12M18 6L6 18' },
  alert: { tone: 'amber', body: 'M10.300 3.900L2 18a2 2 0 0 0 1.700 3h16.600a2 2 0 0 0 1.700-3L13.700 3.900a2 2 0 0 0-3.400 0z', lines: 'M12 9v4M12 17h.01' },
  siren: { tone: 'red', body: 'M7 18v-6a5 5 0 0 1 10 0v6z', lines: 'M5 21h14M12 2v2M3.500 6.500L5 8M20.500 6.500L19 8M2 12h2M20 12h2' },
  ban: { tone: 'red', body: CIRCLE, lines: 'M5.600 5.600l12.800 12.800' },
  hourglass: { tone: 'amber', body: 'M7 2h10v4.500a5 5 0 0 1-2 4L12 12l-3-1.500a5 5 0 0 1-2-4zM7 22h10v-4.500a5 5 0 0 0-2-4L12 12l-3 1.500a5 5 0 0 0-2 4z', lines: 'M6 2h12M6 22h12' },
  timer: { tone: 'brand', body: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', lines: 'M12 9v4l2 2M10 2h4M12 5V2' },
  clock: { tone: 'brand', body: CIRCLE, lines: 'M12 7v5l3 2' },
  alarm: { tone: 'orange', body: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', lines: 'M12 9v4l2 1M4 3.500L2 6M20 3.500L22 6' },
  pause: { tone: 'amber', body: 'M7 5h3v14H7zM14 5h3v14h-3z' },
  play: { tone: 'emerald', body: 'M7 4l13 8-13 8z' },
  stop: { tone: 'red', body: 'M6 6h12v12H6z' },
  plus: { tone: 'brand', lines: 'M12 5v14M5 12h14' },
  trash: { tone: 'red', body: 'M6 7h12l-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z', lines: 'M4 7h16M9 7V4h6v3M10 11v6M14 11v6' },
  message: { tone: 'brand', body: 'M7.900 20A9 9 0 1 0 4 16.100L2 22z' },
  dollar: { tone: 'amber', body: CIRCLE, lines: 'M15 9.500a3 3 0 0 0-3-1.500c-1.700 0-3 .8-3 2s1.300 1.800 3 2 3 .8 3 2-1.300 2-3 2a3 3 0 0 1-3-1.500M12 6v2M12 16v2' },
  save: { tone: 'brand', body: 'M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', lines: 'M7 3v5h8V3M7 21v-7h10v7' },
  settings: { tone: 'slate', body: 'M10.300 2.700l-.5 2.100a7 7 0 0 0-1.700 1l-2-.7-1.700 2.900 1.500 1.400a7 7 0 0 0 0 2l-1.500 1.400 1.700 2.900 2-.7a7 7 0 0 0 1.700 1l.5 2.100h3.400l.5-2.100a7 7 0 0 0 1.700-1l2 .7 1.700-2.900-1.500-1.400a7 7 0 0 0 0-2l1.500-1.400-1.700-2.900-2 .7a7 7 0 0 0-1.700-1l-.5-2.100z', lines: 'M12 15.500a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7z' },
  plug: { tone: 'slate', body: 'M6 8h12v4a6 6 0 0 1-12 0z', lines: 'M9 2v6M15 2v6M12 18v4' },
  'shopping-bag': { tone: 'pink', body: 'M5 8h14l1 13H4z', lines: 'M9 8V6a3 3 0 0 1 6 0v2' },
  ticket: { tone: 'pink', body: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z', lines: 'M14 8.500v1M14 11.500v1M14 14.500v1' },
  pointer: { tone: 'brand', body: 'M5 3l14 7-6 2-2 6z' },
  filter: { tone: 'brand', body: 'M3 4h18l-7 8.500V19l-4 2v-8.500z' },
  pickaxe: { tone: 'slate', lines: 'M5 21l9-9M12 5c4-2 8 0 9 4-3-3-6-3-9-2M11 6l7 7' },
  scissors: { tone: 'slate', body: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', lines: 'M8.100 8.100L20 20M8.100 15.900L20 4' },
  globe: { tone: 'brand', body: CIRCLE, lines: 'M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18' },
  cloud: { tone: 'brand', body: 'M7 18a5 5 0 1 1 1-9.900A6 6 0 0 1 19.500 11 3.700 3.700 0 0 1 18 18z' },
  hand: { tone: 'amber', lines: 'M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.500V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.800 0-4.500-.9-5.900-2.400L3.400 16a2 2 0 0 1 3.200-2.400L8 15' },
  handshake: { tone: 'emerald', lines: 'M11 17l2 2a1 1 0 1 0 3-3M14 14l2.500 2.500a1 1 0 1 0 3-3l-3.900-3.900a3 3 0 0 0-4.200 0l-.9.900a1 1 0 1 1-3-3l2.800-2.800a5.800 5.800 0 0 1 7.100-.9l.5.3a2 2 0 0 0 1.400.2L21 4M21 3l1 11h-2M3 3L2 14l6.500 6.500a1 1 0 1 0 3-3M3 4h8' },
  send: { tone: 'brand', body: 'M22 2l-7 20-4-9-9-4z', lines: 'M22 2L11 13' },
  'arrow-right': { tone: 'brand', lines: 'M5 12h14M13 6l6 6-6 6' },
  maximize: { tone: 'brand', lines: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' },
  sun: { tone: 'amber', body: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', lines: 'M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400' },
  moon: { tone: 'violet', body: 'M21 12.800A9 9 0 1 1 11.200 3a7 7 0 0 0 9.800 9.800z' },
  pin: { tone: 'red', body: 'M9 10.800a2 2 0 0 1-1.100 1.800l-1.800.9A2 2 0 0 0 5 15.200V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.100-1.800l-1.800-.9a2 2 0 0 1-1.100-1.800V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z', lines: 'M12 17v5' },
  megaphone: { tone: 'orange', body: 'M3 10v4a1 1 0 0 0 1 1h3l8 5V4L7 9H4a1 1 0 0 0-1 1z', lines: 'M19 9a4 4 0 0 1 0 6' },
  book: { tone: 'violet', body: 'M5 3h13a1 1 0 0 1 1 1v15H6a2 2 0 0 0-2 2V4a1 1 0 0 1 1-1z', lines: 'M4 21a2 2 0 0 1 2-2h13M9 7h6' },
  smile: { tone: 'amber', body: CIRCLE, lines: 'M8 14s1.500 2 4 2 4-2 4-2M9 9.500h.01M15 9.500h.01' },
  home: { tone: 'brand', body: 'M3 10.500L12 3l9 7.500V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z', lines: 'M9 21v-6h6v6' },
  kanban: { tone: 'brand', body: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', lines: 'M9 8v8M15 8v4' },
  card: { tone: 'emerald', body: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', lines: 'M3 10h18M7 15h3' },
  'check-square': { tone: 'brand', body: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', lines: 'M8 12l3 3 5-6' },
  logout: { tone: 'slate', lines: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9' },
  // —— esferas de status ——
  'orb-green': { tone: 'emerald', orb: true },
  'orb-red': { tone: 'red', orb: true },
  'orb-orange': { tone: 'orange', orb: true },
  'orb-yellow': { tone: 'amber', orb: true },
  'orb-white': { tone: 'white', orb: true },
  'orb-gray': { tone: 'slate', orb: true },
} satisfies Record<string, Glyph>;

export type GlassIconName = keyof typeof G;

// Aliases: nomes do <Icon> de linha usados no menu lateral (navigation.ts).
const ALIASES: Record<string, GlassIconName> = {
  clientes: 'building',
  crm: 'kanban',
  financeiro: 'card',
  'area-cliente': 'trending-up',
  processos: 'note',
  indicacao: 'user-plus',
  onboarding: 'rocket',
  conteudo: 'pencil',
  aprovacao: 'check-circle',
  demandas: 'check-square',
  usuarios: 'users',
  contratos: 'file',
  calendario: 'calendar',
};

// Emoji → ícone. Tudo o que NÃO está aqui (reações do WhatsApp 👍❤️😂…) fica como emoji,
// porque é conteúdo do usuário e não decoração da interface.
const EMOJI_TO_ICON: Record<string, GlassIconName> = {
  '📎': 'paperclip', '📅': 'calendar', '🗓': 'calendar', '📋': 'clipboard',
  '📄': 'file', '📕': 'book', '📚': 'book', '📝': 'note', '✎': 'pencil', '✏': 'pencil', '✍': 'pencil',
  '📁': 'folder', '🗂': 'layers', '📇': 'id-card', '📦': 'archive', '📥': 'inbox',
  '📤': 'upload', '⬆': 'upload', '⬇': 'download', '📊': 'bar-chart', '📈': 'trending-up',
  '🎯': 'target', '💡': 'lightbulb', '⚡': 'zap', '🔗': 'link', '🔒': 'lock', '🔐': 'lock', '🔓': 'unlock',
  '🔔': 'bell', '🔕': 'bell-off', '🔊': 'volume', '🎙': 'mic', '🎤': 'mic', '🎧': 'headphones',
  '🎵': 'music', '🎬': 'clapperboard', '🎨': 'palette', '🖼': 'image', '📷': 'camera', '📸': 'camera',
  '📽': 'film', '📺': 'tv', '📱': 'smartphone', '📲': 'smartphone', '📞': 'phone', '📧': 'mail',
  '📍': 'map-pin', '🗺': 'map', '🏢': 'building', '🏛': 'landmark', '👤': 'user', '🧑': 'user',
  '👥': 'users', '👑': 'crown', '🤖': 'bot', '🚀': 'rocket', '⭐': 'star', '🌟': 'star', '✨': 'sparkles',
  '🎉': 'party', '🙌': 'sparkles', '🔄': 'refresh', '🔍': 'search', '🔎': 'search', '👁': 'eye', '👀': 'eye',
  '🙈': 'eye-off', '✅': 'check-circle', '✓✓': 'check-check', '✓': 'check', '❌': 'x-circle',
  '✕': 'x', '⚠': 'alert', '🚨': 'siren', '🚫': 'ban', '⏳': 'hourglass', '⏱': 'timer', '🕒': 'clock',
  '⏰': 'alarm', '⏸': 'pause', '▶': 'play', '⏹': 'stop', '➕': 'plus', '🗑': 'trash',
  '💬': 'message', '💭': 'message', '💰': 'dollar', '💸': 'dollar', '💾': 'save', '⚙': 'settings',
  '🔌': 'plug', '🛍': 'shopping-bag', '🎟': 'ticket', '🖱': 'pointer', '🔽': 'filter', '⛏': 'pickaxe',
  '✂': 'scissors', '🌐': 'globe', '☁': 'cloud', '🙋': 'hand', '👋': 'hand', '🤝': 'handshake',
  '➤': 'send', '➜': 'arrow-right', '⛶': 'maximize', '☀': 'sun', '🌙': 'moon', '📌': 'pin',
  '📢': 'megaphone', '😊': 'smile',
  '🟢': 'orb-green', '🔴': 'orb-red', '🟠': 'orb-orange', '🟡': 'orb-yellow', '⚪': 'orb-white', '🔘': 'orb-gray',
};

const VS16 = '️';
const EMOJI_RE = new RegExp(
  `(${Object.keys(EMOJI_TO_ICON)
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})${VS16}?`,
  'gu',
);

export function emojiToGlass(emoji: string | null | undefined): GlassIconName | undefined {
  if (!emoji) return undefined;
  return EMOJI_TO_ICON[emoji.replace(new RegExp(VS16, 'g'), '').trim()];
}

function resolveName(name: string): GlassIconName | undefined {
  if (name in G) return name as GlassIconName;
  return ALIASES[name];
}

interface GlassIconProps {
  name?: GlassIconName | string;
  /** Emoji vindo de dado (ex.: `item.icone`). Se não houver ícone equivalente, renderiza o próprio emoji. */
  emoji?: string | null;
  tone?: GlassTone;
  className?: string;
  title?: string;
  /** Coloca o ícone numa placa de vidro — para destaques (cabeçalhos, estados vazios). */
  plate?: boolean;
}

export function GlassIcon({ name, emoji, tone, className = '', title, plate }: GlassIconProps) {
  const resolved = name ? resolveName(name) : emojiToGlass(emoji);
  if (!resolved) return emoji ? <span className={className}>{emoji}</span> : null;

  const glyph: Glyph = G[resolved];
  const t: GlassTone = tone ?? glyph.tone;
  const palette = TONES[t];
  const sized = /(^|\s)(h|w|size)-/.test(className);
  const sizeCls = sized ? '' : 'h-[1.15em] w-[1.15em] align-[-0.2em]';

  const svg = (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block shrink-0 ${plate ? 'h-[62%] w-[62%]' : `${sizeCls} ${className}`}`}
      style={{ filter: `drop-shadow(0 1px 2px ${palette.mid}80)` }}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {glyph.orb ? (
        <>
          <circle cx="12" cy="12" r="8.5" fill={`url(#sgo-${t})`} stroke={`url(#sgs-${t})`} strokeWidth="1" />
          <ellipse cx="9.2" cy="8.2" rx="3.6" ry="2.2" fill="#fff" fillOpacity="0.65" transform="rotate(-25 9.2 8.2)" />
        </>
      ) : (
        <>
          {glyph.body && (
            <path d={glyph.body} fill={`url(#sgf-${t})`} stroke={`url(#sgs-${t})`} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {glyph.lines && (
            <path d={glyph.lines} fill="none" stroke={`url(#sgs-${t})`} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {/* brilho especular: borda branca que some em direção ao centro */}
          {glyph.body && (
            <path d={glyph.body} fill="none" stroke="url(#sgg)" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {glyph.lines && (
            <path d={glyph.lines} fill="none" stroke="url(#sgg)" strokeWidth="0.7" strokeLinejoin="round" strokeLinecap="round" />
          )}
        </>
      )}
    </svg>
  );

  if (!plate) return svg;

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[28%] border border-white/25 bg-gradient-to-br from-white/25 via-white/10 to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_18px_rgba(2,6,23,0.35)] backdrop-blur-md ${
        /(^|\s)(h|w|size)-/.test(className) ? className : `h-[2.2em] w-[2.2em] ${className}`
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[28%] bg-gradient-to-b from-white/35 to-transparent"
      />
      {svg}
    </span>
  );
}

/** Troca, dentro de texto, cada emoji conhecido por um <GlassIcon>. Aceita qualquer ReactNode. */
export function glassify(node: ReactNode): ReactNode {
  if (typeof node === 'string') {
    EMOJI_RE.lastIndex = 0;
    if (!EMOJI_RE.test(node)) return node;
    EMOJI_RE.lastIndex = 0;
    const out: ReactNode[] = [];
    let last = 0;
    let i = 0;
    for (const m of node.matchAll(EMOJI_RE)) {
      const idx = m.index ?? 0;
      if (idx > last) out.push(node.slice(last, idx));
      const name = EMOJI_TO_ICON[m[1]];
      out.push(<GlassIcon key={i++} name={name} />);
      last = idx + m[0].length;
    }
    if (last < node.length) out.push(node.slice(last));
    return <Fragment>{out}</Fragment>;
  }
  if (Array.isArray(node)) {
    return node.map((n, i) => <Fragment key={i}>{glassify(n)}</Fragment>);
  }
  return node;
}

/** Remove emojis conhecidos de uma string (para atributos que não aceitam JSX: placeholder, title…). */
export function stripEmoji(text: string): string {
  return text.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Degradês referenciados pelos ícones. Montar UMA vez, perto da raiz do app. */
export function GlassSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="sgg" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="16">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {(Object.keys(TONES) as GlassTone[]).map((k) => {
          const c = TONES[k];
          return (
            <Fragment key={k}>
              <linearGradient id={`sgf-${k}`} gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">
                <stop offset="0" stopColor={c.light} stopOpacity="0.85" />
                <stop offset="1" stopColor={c.mid} stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id={`sgs-${k}`} gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">
                <stop offset="0" stopColor={c.light} />
                <stop offset="0.55" stopColor={c.mid} />
                <stop offset="1" stopColor={k === 'white' ? c.deep : c.mid} />
              </linearGradient>
              <radialGradient id={`sgo-${k}`} gradientUnits="userSpaceOnUse" cx="9.5" cy="8.5" r="13">
                <stop offset="0" stopColor={c.light} />
                <stop offset="0.5" stopColor={c.mid} />
                <stop offset="1" stopColor={c.deep} />
              </radialGradient>
            </Fragment>
          );
        })}
      </defs>
    </svg>
  );
}
