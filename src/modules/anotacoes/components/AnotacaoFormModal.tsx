import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSalvarAnotacao, useExcluirAnotacao, useVirarDemanda, type AnotacaoFormData } from '@/modules/anotacoes/api/anotacoesApi';
import { PRIORIDADE_LABEL, type AnotacaoView } from '@/modules/anotacoes/types';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useAuth } from '@/shared/auth/AuthProvider';
import { supabase } from '@/shared/lib/supabaseClient';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { AnexoUploader, type Anexo } from '@/shared/ui/AnexoUploader';

// Lista de profiles da equipe (para o seletor "De quem é").
function useProfilesEquipe() {
  return useQuery({
    queryKey: ['profiles', 'equipe-anotacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('tipo', 'equipe')
        .order('nome');
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });
}

interface Props {
  open: boolean;
  onClose: () => void;
  anotacao?: AnotacaoView;
  clienteIdInicial?: string | null;
}

export function AnotacaoFormModal({ open, onClose, anotacao, clienteIdInicial }: Props) {
  const salvar = useSalvarAnotacao();
  const excluir = useExcluirAnotacao();
  const virarDemanda = useVirarDemanda();
  const { profile } = useAuth();
  const { data: clientes } = useClientes('');
  const { data: equipe } = useProfilesEquipe();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autorOpts = useMemo(
    () => (equipe ?? []).map((p) => ({ value: p.id, label: p.nome })),
    [equipe],
  );

  const clienteOpts = useMemo(
    () => [
      { value: '', label: 'Geral (sem cliente)' },
      ...(clientes ?? []).filter((c) => c.status === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome))
        .map((c) => ({ value: c.id, label: c.nome })),
    ],
    [clientes],
  );

  const [form, setForm] = useState<AnotacaoFormData>({
    texto: anotacao?.texto ?? '',
    cliente_id: anotacao?.cliente_id ?? clienteIdInicial ?? null,
    autor_id: anotacao?.autor_id ?? profile?.id ?? null,
    prazo: anotacao?.prazo ?? null,
    prioridade: anotacao?.prioridade ?? 'normal',
    anexos: anotacao?.anexos ?? [],
  });

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [open]);

  async function handleSalvar() {
    if (!form.texto.trim()) return;
    await salvar.mutateAsync({ id: anotacao?.id, dados: form });
    onClose();
  }

  async function handleExcluir() {
    if (!anotacao) return;
    if (!confirm('Excluir essa anotação?')) return;
    await excluir.mutateAsync(anotacao.id);
    onClose();
  }

  async function handleVirarDemanda() {
    if (!anotacao) return;
    if (!confirm('Transformar essa anotação em demanda? A anotação será marcada como feita.')) return;
    await virarDemanda.mutateAsync(anotacao);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleSalvar();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={anotacao ? 'Editar anotação' : 'Nova anotação'}
      footer={
        <div className="flex w-full items-center justify-between">
          <span>
            {anotacao && (
              <>
                <Button variant="ghost" onClick={handleExcluir} className="text-red-400">Excluir</Button>
                <Button variant="ghost" onClick={handleVirarDemanda} className="text-brand-300">↗ Virar demanda</Button>
              </>
            )}
          </span>
          <span className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvar.isPending || !form.texto.trim()}>
              {salvar.isPending ? 'Salvando…' : 'Salvar anotação'}
            </Button>
          </span>
        </div>
      }
    >
      <div className="space-y-4" onKeyDown={onKeyDown}>
        <label className="block text-xs text-slate-300">
          Anotação <span className="text-slate-500">(Ctrl+Enter salva)</span>
          <textarea
            ref={textareaRef}
            value={form.texto}
            onChange={(e) => setForm({ ...form, texto: e.target.value })}
            placeholder="Ex: Subir campanha da Matcheria, revisar o público e o criativo"
            rows={6}
            className="mt-1 w-full resize-y rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Select
            id="cliente"
            label="Cliente"
            options={clienteOpts}
            value={form.cliente_id ?? ''}
            onChange={(e) => setForm({ ...form, cliente_id: e.target.value || null })}
          />
          <Select
            id="prio"
            label="Prioridade"
            options={(['normal', 'importante', 'urgente'] as const).map((p) => ({ value: p, label: PRIORIDADE_LABEL[p] }))}
            value={form.prioridade}
            onChange={(e) => setForm({ ...form, prioridade: e.target.value as AnotacaoFormData['prioridade'] })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="prazo"
            type="date"
            label="Prazo / lembrete (opcional)"
            value={form.prazo ?? ''}
            onChange={(e) => setForm({ ...form, prazo: e.target.value || null })}
          />
          <Select
            id="autor"
            label="De quem é"
            options={autorOpts}
            value={form.autor_id ?? ''}
            onChange={(e) => setForm({ ...form, autor_id: e.target.value || null })}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-300">Anexos (opcional)</label>
          <AnexoUploader
            bucket="anexos-internos"
            anexos={(form.anexos ?? []) as Anexo[]}
            onChange={(a) => setForm({ ...form, anexos: a })}
          />
        </div>
      </div>
    </Modal>
  );
}
