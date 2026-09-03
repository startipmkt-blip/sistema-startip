import { useMemo, useState } from 'react';
import {
  useSalvarRelatorio,
  useExcluirRelatorio,
  type RelatorioFormData,
} from '@/modules/area-cliente/api/areaClienteApi';
import type { RelatorioMensalView } from '@/modules/area-cliente/types';
import { calcularRoi, inputsDoRelatorio } from '@/modules/area-cliente/lib/roiCalc';
import { ResultadosRoi } from '@/modules/area-cliente/components/ResultadosRoi';
import { parseMetaCsv } from '@/modules/area-cliente/lib/parseMetaCsv';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';
import { uploadArquivo } from '@/shared/lib/storage';

interface Props {
  open: boolean;
  onClose: () => void;
  relatorio?: RelatorioMensalView;
}

// Campos da calculadora (por cliente / mês).
const CAMPOS: { key: keyof RelatorioFormData; label: string; prefixo?: string; sufixo?: string }[] = [
  { key: 'faturamento', label: 'Faturamento do mês', prefixo: 'R$' },
  { key: 'margem', label: 'Margem (%)', sufixo: '%' },
  { key: 'investimento', label: 'Investimento tráfego', prefixo: 'R$' },
  { key: 'ticket_medio', label: 'Ticket médio', prefixo: 'R$' },
  { key: 'vendas_pago', label: 'Vendas tráfego pago' },
  { key: 'vendas_organico', label: 'Vendas orgânico' },
  { key: 'leads', label: 'Leads no WhatsApp' },
  { key: 'compras_por_cliente', label: 'Compras por cliente' },
];

export function RelatorioFormModal({ open, onClose, relatorio }: Props) {
  const salvar = useSalvarRelatorio();
  const excluir = useExcluirRelatorio();
  const { data: clientes } = useClientes('');

  async function handleExcluir() {
    if (!relatorio) return;
    if (!confirm('Excluir este relatório?')) return;
    await excluir.mutateAsync(relatorio.id);
    onClose();
  }
  const clienteOptions = (clientes ?? []).map((c) => ({ value: c.id, label: c.nome }));

  const [form, setForm] = useState<RelatorioFormData>({
    cliente_id: relatorio?.cliente_id ?? '',
    mes_referencia: relatorio?.mes_referencia ?? new Date().toISOString().slice(0, 7),
    faturamento: relatorio?.faturamento ?? 0,
    margem: relatorio?.margem ?? 30,
    investimento: relatorio?.investimento ?? 0,
    ticket_medio: relatorio?.ticket_medio ?? 0,
    vendas_pago: relatorio?.vendas_pago ?? 0,
    vendas_organico: relatorio?.vendas_organico ?? 0,
    leads: relatorio?.leads ?? 0,
    compras_por_cliente: relatorio?.compras_por_cliente ?? 1,
    resumo: relatorio?.resumo ?? '',
    pdf_url: relatorio?.pdf_url ?? null,
  });
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviandoPdf, setEnviandoPdf] = useState(false);

  function set<K extends keyof RelatorioFormData>(k: K, v: RelatorioFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const resultados = useMemo(() => calcularRoi(inputsDoRelatorio(form)), [form]);
  const clienteValor = form.cliente_id || clienteOptions[0]?.value || '';

  async function importarCsv(file: File) {
    const r = parseMetaCsv(await file.text());
    setForm((f) => ({ ...f, investimento: r.investimento, leads: r.leads }));
    setAviso(r.linhas > 0 ? `CSV lido (${r.linhas} linhas): investimento e leads preenchidos.` : 'Não consegui ler métricas do CSV.');
  }
  async function anexarPdf(file: File) {
    setAviso(null);
    if (file.type !== 'application/pdf') {
      setAviso('Aceita apenas PDF.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setAviso('PDF acima de 20 MB.');
      return;
    }
    if (!clienteValor) {
      setAviso('Escolha o cliente antes de anexar o PDF.');
      return;
    }
    setEnviandoPdf(true);
    try {
      const { path } = await uploadArquivo({ bucket: 'relatorios', clienteId: clienteValor, file });
      setForm((f) => ({ ...f, pdf_url: path }));
      setAviso(`PDF anexado.`);
    } catch (e) {
      setAviso((e as Error).message || 'Falha ao enviar o PDF.');
    } finally {
      setEnviandoPdf(false);
    }
  }

  async function handleSalvar() {
    await salvar.mutateAsync({ id: relatorio?.id, dados: { ...form, cliente_id: clienteValor } });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={relatorio ? 'Editar relatório do cliente' : 'Novo relatório do cliente'}
      footer={
        <div className="flex w-full items-center justify-between">
          <span>
            {relatorio && (
              <Button variant="ghost" onClick={handleExcluir} className="text-red-400">Excluir</Button>
            )}
          </span>
          <span className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvar.isPending}>
              {salvar.isPending ? 'Salvando…' : 'Salvar relatório'}
            </Button>
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Cliente + mês */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="cliente"
            label="Cliente"
            options={clienteOptions}
            value={clienteValor}
            onChange={(e) => set('cliente_id', e.target.value)}
          />
          <Input
            id="mes"
            type="month"
            label="Mês de referência"
            value={form.mes_referencia}
            onChange={(e) => set('mes_referencia', e.target.value)}
          />
        </div>

        {/* Importar */}
        <div className="flex flex-wrap gap-4 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <label className="cursor-pointer font-medium text-brand-300 hover:underline">
            ⬆️ Importar CSV do Meta
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importarCsv(e.target.files[0])} />
          </label>
          <label className="cursor-pointer font-medium text-brand-300 hover:underline">
            {enviandoPdf ? '⏳ Enviando…' : '📄 Anexar PDF do resumo'}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={enviandoPdf}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) anexarPdf(f); }}
            />
          </label>
          {form.pdf_url && <span className="text-slate-400">PDF: {form.pdf_url}</span>}
          {aviso && <span className="text-emerald-400">{aviso}</span>}
        </div>

        {/* Calculadora — entradas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CAMPOS.map((c) => (
            <div key={c.key} className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">{c.label}</label>
              <Input
                type="number"
                value={form[c.key] as number}
                onChange={(e) => set(c.key, Number(e.target.value) as never)}
              />
            </div>
          ))}
        </div>

        {/* Resultados calculados ao vivo */}
        <ResultadosRoi r={resultados} />

        <Textarea id="resumo" label="Resumo do mês (o que foi feito)" value={form.resumo} onChange={(e) => set('resumo', e.target.value)} />
      </div>
    </Modal>
  );
}
