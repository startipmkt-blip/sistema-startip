import { useState } from 'react';
import { useCriarTemplate, useOnboardingTemplates } from '@/modules/onboarding/api/onboardingApi';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';

export function NovoTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const criar = useCriarTemplate();
  const { data: templates } = useOnboardingTemplates();
  const [nome, setNome] = useState('');
  const [etapasTexto, setEtapasTexto] = useState('');
  const [templateBase, setTemplateBase] = useState('');

  function puxarBase(templateId: string) {
    setTemplateBase(templateId);
    const t = (templates ?? []).find((x) => x.id === templateId);
    if (t) setEtapasTexto(t.etapas.join('\n'));
  }

  async function handleSalvar() {
    const etapas = etapasTexto.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!nome.trim() || etapas.length === 0) return;
    await criar.mutateAsync({ nome, etapas });
    setNome(''); setEtapasTexto(''); setTemplateBase('');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo template de onboarding"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={criar.isPending || !nome.trim()}>
            {criar.isPending ? 'Salvando…' : 'Criar template'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          id="nome"
          label="Nome do template"
          placeholder="Ex.: Onboarding padrão"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        {(templates ?? []).length > 0 && (
          <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-3">
            <label className="mb-1 block text-xs text-slate-300">
              📋 Começar a partir de um template existente (opcional)
            </label>
            <select
              value={templateBase}
              onChange={(e) => puxarBase(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]"
            >
              <option value="">— criar do zero —</option>
              {templates!.map((t) => (
                <option key={t.id} value={t.id}>{t.nome} ({t.etapas.length} etapas)</option>
              ))}
            </select>
            {templateBase && (
              <p className="mt-1 text-[11px] text-emerald-300">
                ✓ Etapas do template base foram carregadas — pode editar abaixo.
              </p>
            )}
          </div>
        )}

        <Textarea
          id="etapas"
          label="Etapas (uma por linha, na ordem)"
          className="min-h-[200px]"
          placeholder={'Contrato assinado\nAcessos recebidos\nICP e persona definidos\n...'}
          value={etapasTexto}
          onChange={(e) => setEtapasTexto(e.target.value)}
        />
      </div>
    </Modal>
  );
}
