import { useEffect, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { TextareaExpansivel } from '@/shared/ui/TextareaExpansivel';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useOperadores } from '@/modules/crm/api/atendimentoApi';
import { AnexosDemanda } from './AnexosDemanda';
import { RegrasResumo } from '@/modules/cliente-perfil/components/RegrasResumo';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import {
  useSalvarDemanda, useExcluirDemanda,
  TIPO_LABEL, STATUS_COLUNAS,
  type DesignerDemanda, type DesignerTipo, type DesignerStatus,
} from '../api/demandasApi';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { labelMes, mesDaSemana, semanaDe } from '../lib/periodo';

interface Props {
  open: boolean;
  onClose: () => void;
  demanda: DesignerDemanda | null;
  // Coluna de onde veio o "Adicionar um cartão".
  statusInicial?: DesignerStatus;
  // Prazo pré-preenchido em demanda nova (ex.: semana futura aberta no quadro).
  prazoSugerido?: string;
}

export function DemandaFormModal({ open, onClose, demanda, statusInicial = 'a_fazer', prazoSugerido }: Props) {
  const salvar = useSalvarDemanda();
  const excluir = useExcluirDemanda();
  const { data: clientes } = useClientes('');
  const { data: operadores } = useOperadores();

  const [clienteId, setClienteId] = useState<string>('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [briefing, setBriefing] = useState('');
  const [tipo, setTipo] = useState<DesignerTipo>('post');
  const [status, setStatus] = useState<DesignerStatus>('a_fazer');
  const [responsavel, setResponsavel] = useState<string>('');
  const [prazo, setPrazo] = useState<string>('');
  const [linkConteudo, setLinkConteudo] = useState('');
  const [anexos, setAnexos] = useState<CriativoAnexo[]>([]);
  // Enviados nesta abertura do formulário: se cancelar, somem do storage.
  const [novos, setNovos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClienteId(demanda?.cliente_id ?? '');
    setTitulo(demanda?.titulo ?? '');
    setDescricao(demanda?.descricao ?? '');
    setBriefing(demanda?.briefing ?? '');
    setTipo(demanda?.tipo ?? 'post');
    setStatus(demanda?.status ?? statusInicial);
    setResponsavel(demanda?.responsavel_id ?? '');
    setPrazo(demanda?.prazo ?? (demanda ? '' : prazoSugerido ?? ''));
    setLinkConteudo(demanda?.link_conteudo ?? '');
    setAnexos(demanda?.anexos ?? []);
    setNovos([]);
    setErro(null);
  }, [open, demanda, statusInicial, prazoSugerido]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!titulo.trim()) { setErro('Título é obrigatório.'); return; }
    const link = linkConteudo.trim();
    if (link && !/^https?:\/\//i.test(link)) { setErro('O link do conteúdo deve começar com http:// ou https://'); return; }
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
        briefing: briefing.trim() || null,
        tipo, status,
        responsavel_id: responsavel || null,
        prazo: prazo || null,
        anexos,
        link_conteudo: link || null,
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
      fecharSoPorBotao
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

        {clienteId && (
          <RegrasResumo
            clienteId={clienteId}
            clienteNome={(clientes ?? []).find((c) => c.id === clienteId)?.nome}
          />
        )}

        {demanda?.reprovado_em && (demanda.status === 'a_fazer' || demanda.status === 'alteracao' || demanda.status === 'em_andamento') && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
            <p className="mb-1 font-semibold">↩ Reprovado pelo cliente — o que precisa ser refeito</p>
            <p className="whitespace-pre-line">{demanda.reprovado_justificativa || '(sem justificativa)'}</p>
            <p className="mt-1 text-[11px] text-red-300">
              em {new Date(demanda.reprovado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        )}

        <Input id="tit" label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />

        <TextareaExpansivel
          id="desc"
          label="Descrição"
          placeholder="O que é a demanda, em poucas linhas."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <TextareaExpansivel
          id="brief"
          label="Briefing"
          placeholder="Como fazer: texto da arte, formato, objetivo, o que não pode faltar."
          value={briefing}
          onChange={(e) => setBriefing(e.target.value)}
        />

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
        <p className="-mt-1 text-[11px] text-slate-400">
          {prazo
            ? `Aparece na semana ${semanaDe(mesDaSemana(prazo), prazo).numero} de ${labelMes(mesDaSemana(prazo))} (${semanaDe(mesDaSemana(prazo), prazo).label}). Mude o prazo para mudar a semana.`
            : 'Sem prazo, a demanda aparece na semana em que foi criada. Defina um prazo para colocá-la em outra semana.'}
        </p>

        <Input
          id="lnk"
          type="url"
          label="Link do conteúdo pronto (Drive)"
          placeholder="Cole aqui o link depois de subir o arquivo. Vai junto para a Gestão de Conteúdo."
          value={linkConteudo}
          onChange={(e) => setLinkConteudo(e.target.value)}
        />

        <AnexosDemanda anexos={anexos} onChange={setAnexos} novos={novos} onNovos={setNovos} />

        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
      </form>
    </Modal>
  );
}
