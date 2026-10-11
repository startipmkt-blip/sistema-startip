import { useMemo, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { useCriarFormulario } from '@/modules/formularios/api/formulariosApi';
import { parsePerguntasTextarea } from '@/modules/formularios/lib/parsePerguntasTextarea';
import type { FormularioTipo } from '@/modules/formularios/types';

interface Props {
  clienteId: string;
  open: boolean;
  onClose: () => void;
  onCriado?: (slug: string) => void;
}

export function GerarFormularioModal({ clienteId, open, onClose, onCriado }: Props) {
  const criar = useCriarFormulario(clienteId);
  const [tipo, setTipo] = useState<FormularioTipo>('icp');
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string>('');

  const preview = useMemo(
    () => (tipo === 'icp' ? [] : parsePerguntasTextarea(texto)),
    [tipo, texto],
  );

  async function handleGerar() {
    setErro('');
    try {
      const perguntasNicho = tipo === 'icp' ? undefined : preview;
      const r = await criar.mutateAsync({ tipo, perguntasNicho });
      onCriado?.(r.slug);
      resetar();
      onClose();
    } catch (e) {
      setErro((e as Error).message ?? 'Erro ao gerar formulário.');
    }
  }
  function resetar() {
    setTipo('icp');
    setTexto('');
    setErro('');
  }

  return (
    <Modal
      open={open}
      onClose={() => { resetar(); onClose(); }}
      title="Gerar novo formulário"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => { resetar(); onClose(); }}>Cancelar</Button>
          <Button
            onClick={handleGerar}
            disabled={criar.isPending || (tipo !== 'icp' && preview.length === 0)}
          >
            {criar.isPending ? 'Gerando…' : 'Gerar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-slate-200">Tipo de formulário</legend>
          {([
            { v: 'icp' as const, titulo: 'ICP Padrão', desc: 'Perguntas padrão já cadastradas no sistema' },
            { v: 'nicho' as const, titulo: 'Adaptado ao Nicho', desc: 'Cole perguntas específicas deste cliente' },
            { v: 'unificado' as const, titulo: 'Unificado (ICP + Nicho)', desc: 'Junta perguntas padrão + nicho em um só link' },
          ]).map((o) => (
            <label
              key={o.v}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                tipo === o.v ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="tipo-form"
                value={o.v}
                checked={tipo === o.v}
                onChange={() => setTipo(o.v)}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-white">{o.titulo}</div>
                <div className="text-xs text-slate-400">{o.desc}</div>
              </div>
            </label>
          ))}
        </fieldset>

        {tipo !== 'icp' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">
              Perguntas do nicho (uma por linha; adicione <code className="rounded bg-white/5 px-1"> *</code> no fim para obrigatória)
            </label>
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="min-h-[220px] font-mono text-sm"
              placeholder={`Qual o seu principal canal de venda hoje? *\nDescreva seu funil atual em 2-3 frases *\nQuanto você gasta por mês com tráfego pago?`}
            />
            {preview.length > 0 && (
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                <div className="mb-1 font-medium text-slate-200">Pré-visualização ({preview.length} perguntas):</div>
                <ol className="list-decimal space-y-0.5 pl-5">
                  {preview.map((p) => (
                    <li key={p.id}>
                      {p.label} {p.obrigatoria && <span className="text-brand-300">*</span>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {erro && <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">{erro}</div>}
      </div>
    </Modal>
  );
}
