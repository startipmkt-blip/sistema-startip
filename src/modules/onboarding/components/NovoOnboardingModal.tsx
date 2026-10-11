import { useState } from 'react';
import {
  linkPublicoOnboarding,
  useIniciarOnboarding,
  useOnboardingAndamentos,
  useOnboardingTemplates,
} from '@/modules/onboarding/api/onboardingApi';
import { CopiarLinkButton } from '@/modules/onboarding/components/CopiarLinkButton';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';

interface Props {
  onClose: () => void;
  templateIdInicial?: string;
}

// Montado só enquanto aberto, para o estado nascer limpo a cada uso.
export function NovoOnboardingModal({ onClose, templateIdInicial }: Props) {
  const iniciar = useIniciarOnboarding();
  const { data: templates } = useOnboardingTemplates();
  const { data: andamentos } = useOnboardingAndamentos();
  const { data: clientes } = useClientes('');
  const [clienteId, setClienteId] = useState('');
  const [templateId, setTemplateId] = useState(templateIdInicial ?? '');
  const [erro, setErro] = useState('');
  const [link, setLink] = useState('');

  const comOnboarding = new Set((andamentos ?? []).map((a) => a.cliente_id));
  const clienteOptions = (clientes ?? [])
    .filter((c) => !comOnboarding.has(c.id))
    .map((c) => ({ value: c.id, label: c.nome }));
  const templateOptions = (templates ?? []).map((t) => ({
    value: t.id,
    label: `${t.nome} (${t.etapas.length} etapas)`,
  }));

  const cliente = clienteId || clienteOptions[0]?.value || '';
  const template = templateId || templateOptions[0]?.value || '';

  async function handleCriar() {
    setErro('');
    try {
      const token = await iniciar.mutateAsync({ templateId: template, clienteId: cliente });
      setLink(linkPublicoOnboarding(token));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o onboarding.');
    }
  }

  if (link) {
    return (
      <Modal open onClose={onClose} title="Onboarding criado" footer={<Button onClick={onClose}>Fechar</Button>}>
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            A página do cliente está pronta. Envie o link abaixo: ela mostra todo o
            processo e se atualiza sozinha conforme as etapas são concluídas.
          </p>
          <div className="break-all rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-brand-200">
            {link}
          </div>
          <div className="flex flex-wrap gap-2">
            <CopiarLinkButton link={link} />
            <a href={link} target="_blank" rel="noreferrer">
              <Button variant="secondary">Abrir página do cliente</Button>
            </a>
          </div>
        </div>
      </Modal>
    );
  }

  const semModelos = templates !== undefined && templateOptions.length === 0;
  const semClientes = clientes !== undefined && andamentos !== undefined && clienteOptions.length === 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Novo onboarding"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCriar} disabled={iniciar.isPending || !cliente || !template}>
            {iniciar.isPending ? 'Criando…' : 'Criar onboarding'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          Escolha o cliente e o modelo. As etapas do modelo viram o andamento do
          cliente e é gerada a página para ele acompanhar o processo.
        </p>
        {semClientes ? (
          <p className="text-sm text-amber-300">Todos os clientes cadastrados já têm onboarding.</p>
        ) : (
          <Select
            id="onb-cliente"
            label="Cliente"
            options={clienteOptions}
            value={cliente}
            onChange={(e) => setClienteId(e.target.value)}
          />
        )}
        {semModelos ? (
          <p className="text-sm text-amber-300">Nenhum modelo cadastrado. Crie um na aba Modelos.</p>
        ) : (
          <Select
            id="onb-modelo"
            label="Modelo de onboarding"
            options={templateOptions}
            value={template}
            onChange={(e) => setTemplateId(e.target.value)}
          />
        )}
        {erro && <p className="text-sm text-red-300">{erro}</p>}
      </div>
    </Modal>
  );
}
