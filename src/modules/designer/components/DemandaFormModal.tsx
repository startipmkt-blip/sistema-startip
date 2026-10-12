import { useEffect, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useOperadores } from '@/modules/crm/api/atendimentoApi';
import { AnexosDemanda } from './AnexosDemanda';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import {
  useSalvarDemanda, useExcluirDemanda,
  TIPO_LABEL, STATUS_COLUNAS,
  type DesignerDemanda, type DesignerTipo, type DesignerStatus,
} from '../api/demandasApi';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  demanda: DesignerDemanda | null;
}

export function DemandaFormModal({ open, onClose, demanda }: Props) {
  const salvar = useSalvarDemanda();
  const excluir = useExcluirDemanda();
  const { data: clientes } = useClientes('');
  const { data: operadores } = useOperadores();

  const [clienteId, setClienteId] = useState<string>('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<DesignerTipo>('post');
  const [status, setStatus] = useState<DesignerStatus>('a_fazer');
  const [responsavel, setResponsavel] = useState<string>('');
  const [prazo, setPrazo] = useState<string>('');
  const [anexos, setAnexos] = useState<CriativoAnexo[]>([]);
  // Enviados nesta abertura do formulário: se cancelar, somem do storage.
  const [novos, setNovos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClienteId(demanda?.cliente_id ?? '');
    setTitulo(demanda?.titulo ?? '');
    setDescricao(demanda?.descricao ?? '');
    setTipo(demanda?.tipo ?? 'post');
    setStatus(demanda?.status ?? 'a_fazer');
    setResponsavel(demanda?.responsavel_id ?? '');
    setPrazo(demanda?.prazo ?? '');
    setAnexos(demanda?.anexos ?? []);
    setNovos([]);
    setErro(null);
  }, [open, demanda]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!titulo.trim()) { setErro('Título é obrigatório.'); return; }
    try {
      const respNome = (operadores ?? []).find((op) => op.id === responsavel)?.nome ?? null;
      const r = await salvar.mutateAsync({
        id: demanda?.id,
        de: demanda?.status,
        iniciado_em: demanda?.iniciado_em ?? null,
        responsavel_nome: respNome,
        cliente_id: clienteId || null,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        tipo, status,
        responsavel_id: responsavel || null,
        prazo: prazo || null,
        anexos,
      });
      // Anexos que existiam e foram removidos agora saem do storage.
      const mantidos = new Set(anexos.map((a) => a.path));
      for (const a of demanda?.anexos ?? []) if (!mantidos.has(a.path)) void descartarAnexo(a.path);
      setNovos([]);
      onClose();
      if (r?.cronometroErro) {
        alert(`A demanda foi salva, mas o cronômetro não acompanhou:

${r.cronometroErro}`);
      }
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function handleExcluir() {
    if (!demanda?.id) return;
    if (!confirm(`Excluir "${demanda.titulo}"?`)) return;
    try {
      await excluir.mutateAsync(demanda.id);
      for (const a of demanda.anexos ?? []) void descartarAnexo(a.path);
      onClose();
    }
    catch (e) { setErro((e as Error).message); }
  }

  function fechar() {
    for (const p of novos) void descartarAnexo(p);
    setNovos([]);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={demanda ? 'Editar demanda' : 'Nova demanda'}
      size="lg"
      footer={
        <>
          {demanda && (
            <Button variant="secondary" className="mr-auto text-red-300 hover:bg-red-500/10" onClick={handleExcluir}>
              <GlassIcon name="trash" /> Excluir
            </Button>
          )}
          <Button variant="secondary" onClick={fechar}>Cancelar</Button>
          <Button onClick={submit} disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            id="cli"
            label="Cliente"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            options={[
              { value: '', label: '— sem cliente —' },
              ...((clientes ?? []).map((c) => ({ value: c.id, label: c.nome }))),
            ]}
          />
          <Select
            id="tipo"
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as DesignerTipo)}
            options={(Object.keys(TIPO_LABEL) as DesignerTipo[]).map((t) => ({ value: t, label: TIPO_LABEL[t] }))}
          />
        </div>

        <Input id="tit" label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />

        <Textarea id="desc" label="Descrição / briefing" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} />

        <div className="grid gap-3 md:grid-cols-3">
          <Select
            id="st"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as DesignerStatus)}
            options={STATUS_COLUNAS.map((c) => ({ value: c.id, label: c.label }))}
          />
          <Select
            id="resp"
            label="Responsável"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            options={[
              { value: '', label: 'ninguém' },
              ...((operadores ?? []).map((op) => ({ value: op.id, label: op.nome }))),
            ]}
          />
          <Input id="pz" type="date" label="Prazo" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>

        <AnexosDemanda anexos={anexos} onChange={setAnexos} novos={novos} onNovos={setNovos} />

        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
      </form>
    </Modal>
  );
}
