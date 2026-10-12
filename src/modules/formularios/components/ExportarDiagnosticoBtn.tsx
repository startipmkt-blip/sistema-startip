import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import type { Formulario } from '@/modules/formularios/types';
import { TIPO_LABEL } from '@/modules/formularios/types';
import { glassify } from '@/shared/ui/GlassIcon';

interface Props {
  formulario: Formulario;
  nomeCliente: string;
}

function montarTexto(f: Formulario, nomeCliente: string): string {
  const linhas: string[] = [];
  linhas.push(`### Formulário ${TIPO_LABEL[f.tipo]} — ${nomeCliente}`);
  if (f.preenchido_em) {
    linhas.push(`Preenchido em: ${new Date(f.preenchido_em).toLocaleString('pt-BR')}`);
  }
  linhas.push('');
  const respostas = f.respostas ?? {};
  for (const p of f.perguntas) {
    linhas.push(`**${p.label}**`);
    linhas.push(String(respostas[p.id] ?? '—').trim() || '—');
    linhas.push('');
  }
  return linhas.join('\n').trimEnd();
}

export function ExportarDiagnosticoBtn({ formulario, nomeCliente }: Props) {
  const [estado, setEstado] = useState<'idle' | 'copiado' | 'erro'>('idle');

  async function copiar() {
    const texto = montarTexto(formulario, nomeCliente);
    try {
      await navigator.clipboard.writeText(texto);
      setEstado('copiado');
      setTimeout(() => setEstado('idle'), 2500);
    } catch {
      // Fallback: baixar .txt
      const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagnostico-${nomeCliente}-${formulario.tipo}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setEstado('copiado');
      setTimeout(() => setEstado('idle'), 2500);
    }
  }

  return (
    <Button variant="secondary" onClick={copiar}>
      {glassify(estado === 'copiado' ? '✅ Copiado!' : '📋 Exportar p/ Diagnóstico')}
    </Button>
  );
}
