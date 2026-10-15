import type { GrupoAlerta, Pendencia, StatusVisual } from '@/modules/alertas/types';

const TZ = 'America/Sao_Paulo';

export function formatarDuracao(minutos: number | null | undefined): string {
  if (minutos == null || Number.isNaN(minutos)) return '—';
  const total = Math.max(0, Math.round(minutos));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h < 24) return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function formatarHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

// Brasil não tem horário de verão desde 2019: -03:00 fixo.
export function inicioDoDia(dataISO: string): string {
  return `${dataISO}T00:00:00-03:00`;
}
export function fimDoDia(dataISO: string): string {
  const d = new Date(`${dataISO}T00:00:00-03:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}
export function hojeSP(): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date());
  return p; // YYYY-MM-DD
}
export function somarDias(dataISO: string, dias: number): string {
  const d = new Date(`${dataISO}T12:00:00-03:00`);
  d.setDate(d.getDate() + dias);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function statusVisual(p: Pendencia, grupo: GrupoAlerta | undefined): StatusVisual {
  if (p.status === 'aguardando' && grupo && !grupo.monitorar) return 'desativado';
  if (p.status === 'respondida') return p.dentro_prazo === false ? 'respondido_atraso' : 'dentro_prazo';
  return (p.minutos_decorridos ?? 0) >= p.prazo_min ? 'atrasado' : 'aguardando';
}

export function esperaMinutos(p: Pendencia): number | null {
  if (p.status === 'aguardando') return p.minutos_decorridos;
  return p.tempo_resposta_seg == null ? null : p.tempo_resposta_seg / 60;
}

function celulaCsv(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV com ; e BOM para o Excel brasileiro reconhecer colunas e acentos.
export function baixarCsv(nome: string, cabecalho: string[], linhas: unknown[][]): void {
  const corpo = [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + corpo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
