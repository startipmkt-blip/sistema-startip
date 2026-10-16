import { useState } from 'react';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';
import type { Pergunta } from '@/modules/formularios/types';

type Linha = Record<string, string>;

// A resposta vira texto legível ("1. Nome: X | Preço: Y"), então RespostasView,
// exportação e notificações continuam funcionando sem conhecer este tipo.
export function comporResposta(p: Pergunta, linhas: Linha[]): string {
  const campos = p.campos ?? [];
  const partes = linhas.map((l) =>
    campos
      .filter((c) => (l[c.id] ?? '').trim())
      .map((c) => `${c.label}: ${l[c.id].trim()}`),
  );
  if (!p.repetir) return (partes[0] ?? []).join('\n');
  return partes
    .filter((x) => x.length)
    .map((x, i) => `${i + 1}. ${x.join(' | ')}`)
    .join('\n');
}

interface Props {
  pergunta: Pergunta;
  onChange: (texto: string) => void;
}

export function CamposInput({ pergunta, onChange }: Props) {
  const [linhas, setLinhas] = useState<Linha[]>([{}]);
  const campos = pergunta.campos ?? [];

  function atualizar(novas: Linha[]) {
    setLinhas(novas);
    onChange(comporResposta(pergunta, novas));
  }

  return (
    <div className="space-y-3">
      {linhas.map((linha, i) => (
        <div
          key={i}
          className={pergunta.repetir ? 'space-y-2 rounded-md border border-white/10 bg-white/5 p-3' : 'space-y-2'}
        >
          {pergunta.repetir && (
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>{pergunta.rotuloItem ?? 'Item'} {i + 1}</span>
              {linhas.length > 1 && (
                <button
                  type="button"
                  className="text-red-300 hover:text-red-200"
                  onClick={() => atualizar(linhas.filter((_, j) => j !== i))}
                >
                  Remover
                </button>
              )}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {campos.map((c) => (
              <div key={c.id} className={c.longo ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-xs text-slate-300">{c.label}</label>
                {c.longo ? (
                  <Textarea
                    value={linha[c.id] ?? ''}
                    placeholder={c.placeholder}
                    className="min-h-[70px]"
                    onChange={(e) => atualizar(linhas.map((l, j) => (j === i ? { ...l, [c.id]: e.target.value } : l)))}
                  />
                ) : (
                  <Input
                    value={linha[c.id] ?? ''}
                    placeholder={c.placeholder}
                    onChange={(e) => atualizar(linhas.map((l, j) => (j === i ? { ...l, [c.id]: e.target.value } : l)))}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {pergunta.repetir && (
        <Button type="button" variant="secondary" onClick={() => atualizar([...linhas, {}])}>
          + Adicionar {pergunta.rotuloItem?.toLowerCase() ?? 'item'}
        </Button>
      )}
    </div>
  );
}
