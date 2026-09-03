import { useMemo, useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useContractTemplates, useSalvarContrato } from '@/modules/contratos/api/contratosApi';
import type { Contract, ContractorType } from '@/modules/contratos/types';
import { preencherTemplate } from '@/modules/contratos/lib/preencherTemplate';

interface Props {
  open: boolean;
  onClose: () => void;
  contrato: Contract | null;
}

// Calcula end_date = start_date + duration_months.
function calcularFim(inicio: string, meses: number): string {
  const d = new Date(inicio);
  if (isNaN(d.getTime())) return inicio;
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

export function NovoContratoModal({ open, onClose, contrato }: Props) {
  const { data: templates } = useContractTemplates();
  const clientesQ = useClientes('');
  const salvar = useSalvarContrato();

  const [templateId, setTemplateId] = useState<string>(contrato?.template_id ?? '');
  const [clienteId, setClienteId] = useState<string | null>(contrato?.cliente_id ?? null);
  const [titulo, setTitulo] = useState(contrato?.titulo ?? 'Contrato de Prestação de Serviços');
  const [contractorType, setContractorType] = useState<ContractorType>(contrato?.contractor_type ?? 'pj');
  const [razaoSocial, setRazaoSocial] = useState(contrato?.razao_social ?? '');
  const [cnpjCpf, setCnpjCpf] = useState(contrato?.cnpj_cpf ?? '');
  const [endereco, setEndereco] = useState(contrato?.endereco ?? '');
  const [signerName, setSignerName] = useState(contrato?.signer_name ?? '');
  const [signerEmail, setSignerEmail] = useState(contrato?.signer_email ?? '');
  const [signerPhone, setSignerPhone] = useState(contrato?.signer_phone ?? '');
  const [onboarding, setOnboarding] = useState(String(contrato?.onboarding_value ?? 0));
  const [monthly, setMonthly] = useState(String(contrato?.monthly_value ?? 0));
  const [duration, setDuration] = useState(String(contrato?.duration_months ?? 12));
  const [start, setStart] = useState(contrato?.start_date ?? new Date().toISOString().slice(0, 10));
  const [bodyText, setBodyText] = useState(contrato?.body_text ?? '');
  const [modoPreview, setModoPreview] = useState(false);

  // Ao trocar template, injeta corpo (se ainda vazio ou marcado com "usar template").
  useEffect(() => {
    if (!templateId) return;
    const t = templates?.find((x) => x.id === templateId);
    if (t && (!bodyText || bodyText === '')) setBodyText(t.body_text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, templates]);

  const endDate = useMemo(() => calcularFim(start, parseInt(duration || '0', 10)), [start, duration]);

  const dadosAtuais: Partial<Contract> = {
    titulo, contractor_type: contractorType, razao_social: razaoSocial, cnpj_cpf: cnpjCpf,
    endereco, signer_name: signerName, signer_email: signerEmail, signer_phone: signerPhone,
    onboarding_value: Number(onboarding), monthly_value: Number(monthly),
    duration_months: parseInt(duration || '12', 10), start_date: start, end_date: endDate,
    body_text: bodyText,
  };

  async function handleSalvar() {
    await salvar.mutateAsync({
      id: contrato?.id,
      dados: {
        ...dadosAtuais,
        template_id: templateId || null,
        cliente_id: clienteId,
        status: contrato?.status ?? 'rascunho',
      } as Contract,
    });
    onClose();
  }

  function preencherDoTemplate() {
    const t = templates?.find((x) => x.id === templateId);
    if (t) setBodyText(t.body_text);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contrato ? 'Editar contrato' : 'Novo contrato'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" onClick={() => setModoPreview((v) => !v)}>
            {modoPreview ? '✎ Editar' : '👁 Preview'}
          </Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending || !titulo.trim()}>
            {salvar.isPending ? 'Salvando…' : 'Salvar rascunho'}
          </Button>
        </>
      }
    >
      {!modoPreview ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="col-span-full text-xs text-slate-300">
            Modelo
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark] focus:border-brand-400 focus:outline-none"
            >
              <option value="">— nenhum —</option>
              {(templates ?? []).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>

          <label className="col-span-full text-xs text-slate-300">
            Cliente vinculado (opcional)
            <select
              value={clienteId ?? ''}
              onChange={(e) => {
                const id = e.target.value || null;
                setClienteId(id);
                const cli = (clientesQ.data ?? []).find((c) => c.id === id);
                if (cli && !razaoSocial) setRazaoSocial(cli.nome);
              }}
              className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark] focus:border-brand-400 focus:outline-none"
            >
              <option value="">— nenhum —</option>
              {(clientesQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>

          <Input id="titulo" label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <label className="text-xs text-slate-300">
            Tipo de contratante
            <select
              value={contractorType}
              onChange={(e) => setContractorType(e.target.value as ContractorType)}
              className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]"
            >
              <option value="pj">Pessoa Jurídica</option>
              <option value="pf">Pessoa Física</option>
            </select>
          </label>

          <Input id="razao" label="Razão social / Nome" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
          <Input id="cnpj" label="CNPJ / CPF" value={cnpjCpf} onChange={(e) => setCnpjCpf(e.target.value)} />
          <Input id="end" label="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          <Input id="signer" label="Responsável que assina" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
          <Input id="email" label="E-mail" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
          <Input id="phone" label="Telefone/WhatsApp" value={signerPhone} onChange={(e) => setSignerPhone(e.target.value)} placeholder="+55 27 99999-9999" />
          <Input id="onb" label="Onboarding (R$)" type="number" value={onboarding} onChange={(e) => setOnboarding(e.target.value)} />
          <Input id="mon" label="Mensalidade (R$)" type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
          <Input id="dur" label="Duração (meses)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          <label className="text-xs text-slate-300">
            Início
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]"
            />
            <span className="mt-1 block text-[10px] text-slate-500">Fim: {new Date(endDate).toLocaleDateString('pt-BR')}</span>
          </label>

          <div className="col-span-full">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Corpo do contrato (editável)</span>
              {templateId && (
                <button onClick={preencherDoTemplate} className="text-[11px] text-brand-300 hover:underline">
                  Preencher do modelo
                </button>
              )}
            </div>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={10}
              className="mt-1 w-full resize-y rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-100 focus:border-brand-400 focus:outline-none"
              placeholder="Se vazio, ao gerar PDF será usado o corpo do modelo selecionado."
            />
          </div>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-200">
          {preencherTemplate(bodyText || (templates?.find((t) => t.id === templateId)?.body_text ?? ''), dadosAtuais)}
        </div>
      )}
    </Modal>
  );
}
