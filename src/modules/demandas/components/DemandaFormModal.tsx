import { useEffect, useState } from 'react';
import {
  useSalvarDemanda,
  useExcluirDemanda,
  type DemandaFormData,
} from '@/modules/demandas/api/demandasApi';
import {
  DEMANDA_COLUNAS,
  DEMANDA_SETORES,
  PRIORIDADE_LABEL,
  RESPONSAVEIS,
  type DemandaPrioridade,
  type DemandaSetor,
  type DemandaView,
} from '@/modules/demandas/types';
import { RENOVACAO_OPTIONS, type Renovacao } from '@/modules/demandas/lib/renovacao';
import { TOCADORES, type Tocador } from '@/modules/demandas/api/cronometroApi';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { AnexosCriativo } from '@/modules/ideias/criativos/components/AnexosCriativo';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';

interface Props {
  open: boolean;
  onClose: () => void;
  demanda?: DemandaView;
  setorInicial?: DemandaSetor;
}

const PRIORIDADE_OPTIONS = (Object.keys(PRIORIDADE_LABEL) as DemandaPrioridade[]).map((p) => ({
  value: p,
  label: PRIORIDADE_LABEL[p],
}));

const RASCUNHO_KEY = 'startip:demanda-rascunho';

function lerRascunho(): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem(RASCUNHO_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function limparRascunho() {
  try { sessionStorage.removeItem(RASCUNHO_KEY); } catch { /* sem storage */ }
}

export function DemandaFormModal({ open, onClose, demanda, setorInicial }: Props) {
  const salvar = useSalvarDemanda();
  const excluir = useExcluirDemanda();

  async function handleExcluir() {
    if (!demanda) return;
    if (!confirm(`Excluir "${demanda.titulo}"?`)) return;
    await excluir.mutateAsync(demanda.id);
    for (const a of demanda.anexos ?? []) void descartarAnexo(a.path);
    onClose();
  }
  const { data: clientes } = useClientes('');
  // '' = demanda interna (sem cliente).
  const clienteOptions = [
    { value: '', label: 'Interna (sem cliente)' },
    ...(clientes ?? []).map((c) => ({ value: c.id, label: c.nome })),
  ];

  const [form, setForm] = useState(() => {
    const base = {
      cliente_id: demanda?.cliente_id ?? '',
      setor: demanda?.setor ?? setorInicial ?? 'geral',
      privada: demanda?.privada ?? setorInicial === 'socios',
      titulo: demanda?.titulo ?? '',
      descricao: demanda?.descricao ?? '',
      responsavel: demanda?.responsavel ?? '',
      prioridade: demanda?.prioridade ?? 'media',
      status: demanda?.status ?? 'aberta',
      prazo: demanda?.prazo ?? new Date().toISOString().slice(0, 10),
      renovacao: (demanda?.renovacao ?? 'nenhuma') as Renovacao,
    };
    if (demanda) return base;
    const rascunho = lerRascunho();
    const setorNovo = setorInicial ?? (rascunho.setor as DemandaSetor | undefined) ?? 'geral';
    return { ...base, ...rascunho, setor: setorNovo, privada: setorNovo === 'socios' };
  });

  // Rascunho de demanda nova: sobrevive a recarregar a página ou trocar de aba.
  useEffect(() => {
    if (demanda) return;
    try { sessionStorage.setItem(RASCUNHO_KEY, JSON.stringify(form)); } catch { /* sem storage */ }
  }, [form, demanda]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const [anexos, setAnexos] = useState<CriativoAnexo[]>(demanda?.anexos ?? []);
  // Enviados nesta abertura do formulário: se cancelar, somem do storage.
  const [novos, setNovos] = useState<string[]>([]);

  function fechar() {
    for (const p of novos) void descartarAnexo(p);
    setNovos([]);
    onClose();
  }

  function cancelar() {
    limparRascunho();
    fechar();
  }

  // Entrar em "Em andamento" liga o cronômetro, que precisa saber quem está tocando.
  const [tocador, setTocador] = useState<Tocador | ''>('');
  const precisaTocador = form.status === 'fazendo' && demanda?.status !== 'fazendo';
  const faltaTocador = precisaTocador && !tocador;

  async function handleSalvar() {
    if (!form.titulo.trim() || faltaTocador) return;
    const dados: DemandaFormData = {
      ...form,
      cliente_id: form.cliente_id || null, // vazio => interna
      setor: form.setor as DemandaSetor,
      prioridade: form.prioridade as DemandaPrioridade,
      status: form.status as DemandaFormData['status'],
      anexos,
    };
    const r = await salvar.mutateAsync({
      id: demanda?.id,
      dados,
      de: demanda?.status,
      tocador: tocador || undefined,
    });
    // Anexos que existiam e foram removidos agora saem do storage.
    const mantidos = new Set(anexos.map((a) => a.path));
    for (const a of demanda?.anexos ?? []) if (!mantidos.has(a.path)) void descartarAnexo(a.path);
    setNovos([]);
    limparRascunho();
    onClose();
    if (r?.cronometroErro) {
      alert(`A demanda foi salva, mas o cronômetro não acompanhou:\n\n${r.cronometroErro}`);
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={demanda ? 'Editar demanda' : 'Nova demanda'}
      footer={
        <div className="flex w-full items-center justify-between">
          <span>
            {demanda && (
              <Button variant="ghost" onClick={handleExcluir} className="text-red-400">Excluir</Button>
            )}
          </span>
          <span className="flex gap-2">
            <Button variant="secondary" onClick={cancelar}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvar.isPending || !form.titulo.trim() || faltaTocador}>
              {salvar.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {demanda && (
          <p className="text-xs text-slate-400">
            Criada em {new Date(demanda.created_at).toLocaleDateString('pt-BR')} às{' '}
            {new Date(demanda.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <Input id="titulo" label="Título" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
        <Textarea
          id="descricao"
          label="Descrição"
          value={form.descricao}
          onChange={(e) => set('descricao', e.target.value)}
          placeholder="Detalhes, contexto ou orientações sobre a demanda (opcional)"
        />
        <div>
          <p className="mb-1 text-xs font-medium text-slate-300">Prints e anexos</p>
          <AnexosCriativo anexos={anexos} onChange={setAnexos} novos={novos} onNovos={setNovos} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="setor"
            label="Setor"
            options={DEMANDA_SETORES.map((s) => ({ value: s.id, label: s.label }))}
            value={form.setor}
            onChange={(e) => {
              const novoSetor = e.target.value as DemandaSetor;
              setForm((f) => ({ ...f, setor: novoSetor, privada: novoSetor === 'socios' }));
            }}
          />
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.privada}
              onChange={(e) => set('privada', e.target.checked)}
            />
            Privada (só sócios)
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="cliente"
            label="Cliente"
            options={clienteOptions}
            value={form.cliente_id ?? ''}
            onChange={(e) => set('cliente_id', e.target.value)}
          />
          <Select
            id="responsavel"
            label="Responsável"
            options={[{ value: '', label: '— selecionar —' }, ...RESPONSAVEIS.map((r) => ({ value: r, label: r }))]}
            value={form.responsavel ?? ''}
            onChange={(e) => set('responsavel', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Select
            id="prioridade"
            label="Prioridade"
            options={PRIORIDADE_OPTIONS}
            value={form.prioridade}
            onChange={(e) => set('prioridade', e.target.value as DemandaPrioridade)}
          />
          <Select
            id="status"
            label="Status"
            options={DEMANDA_COLUNAS.map((c) => ({ value: c.id, label: c.label }))}
            value={form.status}
            onChange={(e) => set('status', e.target.value as typeof form.status)}
          />
          <Input id="prazo" type="date" label="Prazo" value={form.prazo ?? ''} onChange={(e) => set('prazo', e.target.value)} />
        </div>
        <div>
          <Select
            id="renovacao"
            label="Renovação"
            options={RENOVACAO_OPTIONS}
            value={form.renovacao}
            onChange={(e) => set('renovacao', e.target.value as Renovacao)}
          />
          {form.renovacao !== 'nenhuma' && (
            <p className="mt-1 text-[11px] text-slate-400">
              Ao concluir, o sistema cria a próxima demanda sozinho, com o prazo {form.renovacao === 'semanal' ? '7 dias' : '1 mês'} depois.
            </p>
          )}
        </div>
        {precisaTocador && (
          <Select
            id="tocador"
            label="Quem vai tocar essa demanda? (obrigatório — inicia o cronômetro)"
            options={[{ value: '', label: '— selecionar —' }, ...TOCADORES.map((t) => ({ value: t, label: t }))]}
            value={tocador}
            onChange={(e) => setTocador(e.target.value as Tocador | '')}
          />
        )}
      </div>
    </Modal>
  );
}
