import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalvarCliente, useExcluirCliente, type ClienteFormData } from '@/modules/clientes/api/clientesApi';
import { SERVICO_OPTIONS } from '@/modules/clientes/types';
import type { Cliente, ServicoCliente } from '@/shared/types/database';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { uploadArquivo } from '@/shared/lib/storage';

interface Props {
  open: boolean;
  onClose: () => void;
  cliente?: Cliente; // se presente, é edição
  /**
   * Pré-preenche o form ao abrir (usado quando convertemos um lead do CRM em
   * cliente da agência — pega o nome/telefone do lead pra facilitar).
   */
  preencher?: Partial<ClienteFormData>;
}

export function ClienteFormModal({ open, onClose, cliente, preencher }: Props) {
  const salvar = useSalvarCliente();
  const excluir = useExcluirCliente();
  const navigate = useNavigate();

  async function handleExcluir() {
    if (!cliente) return;
    if (!confirm(`Excluir o cliente "${cliente.nome}"? Isso remove o cadastro central dele.`)) return;
    await excluir.mutateAsync(cliente.id);
    onClose();
    navigate('/clientes');
  }
  const [form, setForm] = useState<ClienteFormData>({
    nome: preencher?.nome ?? cliente?.nome ?? '',
    tipo_negocio: preencher?.tipo_negocio ?? cliente?.tipo_negocio ?? 'local',
    status: preencher?.status ?? cliente?.status ?? 'prospect',
    servicos: preencher?.servicos ?? cliente?.servicos ?? [],
    conteudos_por_semana: preencher?.conteudos_por_semana ?? cliente?.conteudos_por_semana ?? 0,
    logo_url: preencher?.logo_url ?? cliente?.logo_url ?? '',
    data_entrada: preencher?.data_entrada ?? cliente?.data_entrada ?? new Date().toISOString().slice(0, 10),
  });

  function set<K extends keyof ClienteFormData>(key: K, value: ClienteFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState<string | null>(null);

  async function enviarLogo(file: File) {
    setErroLogo(null);
    if (file.size > 5 * 1024 * 1024) {
      setErroLogo('Logo acima de 5 MB.');
      return;
    }
    setEnviandoLogo(true);
    try {
      const { url } = await uploadArquivo({ bucket: 'logos-clientes', clienteId: cliente?.id, file });
      set('logo_url', url);
    } catch (e) {
      setErroLogo((e as Error).message || 'Falha ao enviar o logo.');
    } finally {
      setEnviandoLogo(false);
    }
  }

  function toggleServico(s: ServicoCliente) {
    setForm((f) => {
      const atual = f.servicos ?? [];
      return {
        ...f,
        servicos: atual.includes(s) ? atual.filter((x) => x !== s) : [...atual, s],
      };
    });
  }

  async function handleSalvar() {
    if (!form.nome.trim()) return;
    await salvar.mutateAsync({ id: cliente?.id, dados: form });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cliente ? 'Editar cliente' : 'Novo cliente'}
      footer={
        <div className="flex w-full items-center justify-between">
          <span>
            {cliente && (
              <Button variant="ghost" onClick={handleExcluir} className="text-red-400">Excluir</Button>
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
        <Input
          id="nome"
          label="Nome do cliente"
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="tipo"
            label="Tipo de negócio"
            options={[
              { value: 'local', label: 'Negócio local' },
              { value: 'ecommerce', label: 'E-commerce' },
            ]}
            value={form.tipo_negocio}
            onChange={(e) => set('tipo_negocio', e.target.value as ClienteFormData['tipo_negocio'])}
          />
          <Select
            id="status"
            label="Status"
            options={[
              { value: 'prospect', label: 'Prospect' },
              { value: 'ativo', label: 'Ativo' },
              { value: 'inativo', label: 'Inativo' },
            ]}
            value={form.status}
            onChange={(e) => set('status', e.target.value as ClienteFormData['status'])}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="data_entrada"
            type="date"
            label="Data de entrada"
            value={form.data_entrada}
            onChange={(e) => set('data_entrada', e.target.value)}
          />
          <Input
            id="conteudos_semana"
            type="number"
            min={0}
            label="Conteúdos por semana"
            value={form.conteudos_por_semana ?? 0}
            onChange={(e) => set('conteudos_por_semana', Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Input
            id="logo_url"
            label="URL do logo (opcional)"
            value={form.logo_url ?? ''}
            onChange={(e) => set('logo_url', e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs">
            <label className="cursor-pointer font-medium text-brand-300 hover:underline">
              {enviandoLogo ? '⏳ Enviando…' : '🖼️ Enviar arquivo do logo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                disabled={enviandoLogo}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarLogo(f); }}
              />
            </label>
            {erroLogo && <span className="text-red-400">{erroLogo}</span>}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-medium text-slate-200">Serviços contratados</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SERVICO_OPTIONS.map((s) => (
              <label
                key={s.value}
                className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={(form.servicos ?? []).includes(s.value as ServicoCliente)}
                  onChange={() => toggleServico(s.value as ServicoCliente)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
