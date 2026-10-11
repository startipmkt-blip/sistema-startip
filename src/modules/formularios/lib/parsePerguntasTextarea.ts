import type { Pergunta } from '@/modules/formularios/types';

// Formato aceito na textarea (uma pergunta por linha):
//   Qual o seu principal canal de venda hoje? *
//   Descreva seu funil atual em 2-3 frases *
//   Quanto você gasta por mês com tráfego pago?
// Sufixo " *" marca a pergunta como obrigatória.
export function parsePerguntasTextarea(texto: string, prefixoId = 'n'): Pergunta[] {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  return linhas.map((linha, i) => {
    const obrigatoria = /\s\*\s*$/.test(linha);
    const label = linha.replace(/\s\*\s*$/, '').trim();
    return {
      id: `${prefixoId}${i + 1}`,
      tipo: 'longo',
      label,
      obrigatoria,
    };
  });
}
