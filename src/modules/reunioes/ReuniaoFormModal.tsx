import { useState } from 'react';
import { useSalvarReuniao, type Reuniao, type ReuniaoForm } from '@/modules/reunioes/reunioesApi';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';
import { uploadArquivo } from '@/shared/lib/storage';
import { AnexoLink } from '@/shared/ui/AnexoLink';

interface Props {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  reuniao?: Reuniao;
}

export function ReuniaoFormModal({ open, onClose, clienteId, reuniao }: Props) {
  const salvar = useSalvarReuniao(clienteId);
  const [form, setForm] = useState<ReuniaoForm>({
    data: reuniao?.data ?? new Date().toISOString().slice(0, 10),
    titulo: reuniao?.titulo ?? '',
    resumo: reuniao?.resumo ?? '',
    pdf_url: reuniao?.pdf_url ?? null,
  });
  const set = <K extends keyof ReuniaoForm>(k: K, v: ReuniaoForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const [enviandoPdf, setEnviandoPdf] = useState(false);
  const [erroPdf, setErroPdf] = useState<string | null>(null);

  async function anexarPdf(file: File) {
    setErroPdf(null);
    if (file.type !== 'application/pdf') {
      setErroPdf('Aceita apenas PDF.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErroPdf('PDF acima de 20 MB.');
      return;
    }
    setEnviandoPdf(true);
    try {
      const { path } = await uploadArquivo({ bucket: 'reunioes', clienteId, file });
      set('pdf_url', path);
    } catch (e) {
      setErroPdf((e as Error).message || 'Falha ao enviar o PDF.');
    } finally {
      setEnviandoPdf(false);
    }
  }

  async function handleSalvar() {
    if (!form.titulo.trim()) return;
    await salvar.mutateAsync({ id: reuniao?.id, dados: form });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reuniao ? 'Editar reunião' : 'Nova reunião'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending || !form.titulo.trim()}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input id="data" type="date" label="Data da reunião" value={form.data} onChange={(e) => set('data', e.target.value)} />
          <Input id="titulo" label="Título / assunto" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
        </div>
        <Textarea id="resumo" label="Resumo (texto)" className="min-h-[140px]" value={form.resumo} onChange={(e) => set('resumo', e.target.value)} />
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <label className="cursor-pointer font-medium text-brand-300 hover:underline">
            {enviandoPdf ? '⏳ Enviando…' : '📎 Anexar PDF da reunião'}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={enviandoPdf}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) anexarPdf(f); }}
            />
          </label>
          {form.pdf_url && (
            <span className="flex items-center gap-2 text-slate-400">
              <AnexoLink bucket="reunioes" path={form.pdf_url} prefixo="" className="hover:underline" />
              <button type="button" className="text-red-400 hover:underline" onClick={() => set('pdf_url', null)}>remover</button>
            </span>
          )}
          {erroPdf && <span className="text-red-400">{erroPdf}</span>}
        </div>
      </div>
    </Modal>
  );
}
