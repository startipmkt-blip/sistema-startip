import { useState } from 'react';
import { useSalvarLead, useExcluirLead, useEtapasCrm, type CrmLeadFormData } from '@/modules/crm/api/crmApi';
import { CRM_ETIQUETAS, type CrmLead } from '@/modules/crm/types';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  lead?: CrmLead;
}

export function LeadFormModal({ open, onClose, lead }: Props) {
  const salvar = useSalvarLead();
  const excluir = useExcluirLead();
  const { data: etapas } = useEtapasCrm();

  async function handleExcluir() {
    if (!lead) return;
    if (!confirm(`Excluir o lead "${lead.nome}"?`)) return;
    await excluir.mutateAsync(lead.id);
    onClose();
  }
  const [form, setForm] = useState<CrmLeadFormData>({
    nome: lead?.nome ?? '',
    empresa: lead?.empresa ?? '',
    telefone: lead?.telefone ?? '',
    origem: lead?.origem ?? '',
    etapa: lead?.etapa ?? 'novo',
    valor: lead?.valor ?? 0,
    etiquetas: lead?.etiquetas ?? [],
  });

  function set<K extends keyof CrmLeadFormData>(k: K, v: CrmLeadFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleEtiqueta(id: string) {
    setForm((f) => ({
      ...f,
      etiquetas: f.etiquetas.includes(id)
        ? f.etiquetas.filter((e) => e !== id)
        : [...f.etiquetas, id],
    }));
  }

  async function handleSalvar() {
    if (!form.nome.trim()) return;
    await salvar.mutateAsync({ id: lead?.id, dados: form });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead ? 'Editar lead' : 'Novo lead'}
      footer={
        <div className="flex w-full items-center justify-between">
          <span>
            {lead && (
              <Button variant="ghost" onClick={handleExcluir} className="text-red-400">
                Excluir
              </Button>
            )}
          </span>
          <span className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvar.isPending || !form.nome.trim()}>
              {salvar.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input id="nome" label="Nome do contato" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          <Input id="empresa" label="Empresa" value={form.empresa} onChange={(e) => set('empresa', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input id="telefone" label="Telefone / WhatsApp" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
          <Input id="origem" label="Origem" value={form.origem} onChange={(e) => set('origem', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="etapa"
            label="Etapa do funil"
            options={(etapas ?? []).map((e) => ({ value: e.id, label: e.label }))}
            value={form.etapa}
            onChange={(e) => set('etapa', e.target.value)}
          />
          <Input id="valor" type="number" label="Valor (R$)" value={form.valor} onChange={(e) => set('valor', Number(e.target.value))} />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium text-slate-200">Etiquetas</div>
          <div className="flex flex-wrap gap-2">
            {CRM_ETIQUETAS.map((et) => {
              const ativo = form.etiquetas.includes(et.id);
              return (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => toggleEtiqueta(et.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    ativo
                      ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                      : 'border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  {et.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
