import { useEffect, useMemo, useState } from 'react';
import {
  CampoLink, Campo, Chips, Escolha, JanelaFormulario, OpcoesCartao, Rotulo, SeletorPrioridade, Texto,
} from '@/shared/ui/form/FormKit';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useOperadores } from '@/modules/crm/api/atendimentoApi';
import { AnexosDemanda } from './AnexosDemanda';
import { RegrasResumo } from '@/modules/cliente-perfil/components/RegrasResumo';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import {
  useSalvarDemanda, useExcluirDemanda,
  TIPO_LABEL, TIPO_LABEL_CRIATIVO, TIPOS_CRIATIVO, STATUS_COLUNAS,
  type DesignerDemanda, type DesignerTipo, type DesignerStatus, type DesignerCategoria, type DesignerPrioridade,
} from '../api/demandasApi';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { opcoesDeSemana } from '../lib/periodo';
import { RENOVACAO_OPTIONS, type Renovacao } from '@/modules/demandas/lib/renovacao';
import { confirmar } from '@/shared/ui/ConfirmDialog';
import { EditorRico } from '@/shared/ui/texto-rico/EditorRico';

interface Props {
  open: boolean;
  onClose: () => void;
  demanda: DesignerDemanda | null;
  // Coluna de onde veio o "Adicionar um cartão".
  statusInicial?: DesignerStatus;
  // Semana (início) já escolhida em demanda nova: a que está aberta no quadro.
  semanaSugerida?: string;
  // Demanda nova nasce na categoria que o quadro está filtrando.
  categoriaInicial?: DesignerCategoria;
}

export function DemandaFormModal({ open, onClose, demanda, statusInicial = 'a_fazer', semanaSugerida, categoriaInicial = 'organico' }: Props) {
  const salvar = useSalvarDemanda();
  const excluir = useExcluirDemanda();
  const { data: clientes } = useClientes('');
  const { data: operadores } = useOperadores();

  const [clienteId, setClienteId] = useState<string>('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [briefing, setBriefing] = useState('');
  const [tipo, setTipo] = useState<DesignerTipo>('post');
  const [categoria, setCategoria] = useState<DesignerCategoria>('organico');
  const [status, setStatus] = useState<DesignerStatus>('a_fazer');
  const [prioridade, setPrioridade] = useState<DesignerPrioridade>('normal');
  const [responsavel, setResponsavel] = useState<string>('');
  const [prazo, setPrazo] = useState<string>('');
  const [linkConteudo, setLinkConteudo] = useState('');
  const [semanaRef, setSemanaRef] = useState('');
  const [alteracaoObs, setAlteracaoObs] = useState('');
  const [renovacao, setRenovacao] = useState<Renovacao>('nenhuma');
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
    setCategoria(demanda?.categoria ?? categoriaInicial);
    setStatus(demanda?.status ?? statusInicial);
    setPrioridade(demanda?.prioridade ?? 'normal');
    setResponsavel(demanda?.responsavel_id ?? '');
    setPrazo(demanda?.prazo ?? '');
    setAlteracaoObs(demanda?.alteracao_obs ?? '');
    setRenovacao(demanda?.renovacao ?? 'nenhuma');
    setSemanaRef(demanda ? (demanda.semana_ref?.slice(0, 10) ?? '') : (semanaSugerida ?? ''));
    setLinkConteudo(demanda?.link_conteudo ?? '');
    setAnexos(demanda?.anexos ?? []);
    setNovos([]);
    setErro(null);
  }, [open, demanda, statusInicial, semanaSugerida, categoriaInicial]);

  const criativo = categoria === 'criativo';
  const tiposDisponiveis = criativo ? TIPOS_CRIATIVO : (Object.keys(TIPO_LABEL) as DesignerTipo[]);

  async function trocarCategoria(c: DesignerCategoria) {
    setCategoria(c);
    // Criativo só tem imagem, vídeo e carrossel.
    if (c === 'criativo' && !TIPOS_CRIATIVO.includes(tipo)) setTipo('post');
  }

  const opcoesSemana = useMemo(
    () => [
      { value: '', label: 'Automática (semana do prazo ou de hoje)' },
      ...opcoesDeSemana([semanaSugerida, demanda?.semana_ref]),
    ],
    [demanda, semanaSugerida],
  );

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
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
        tipo, categoria, status, prioridade,
        responsavel_id: responsavel || null,
        prazo: prazo || null,
        anexos,
        link_conteudo: link || null,
        semana_ref: semanaRef || null,
        alteracao_obs: alteracaoObs.trim() || null,
        renovacao,
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
    if (!(await confirmar(`Excluir "${demanda.titulo}"?`))) return;
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

  const tiposOpcoes = tiposDisponiveis.map((t) => ({
    id: t, label: (criativo ? TIPO_LABEL_CRIATIVO[t] : undefined) ?? TIPO_LABEL[t],
  }));

  return (
    <JanelaFormulario
      open={open}
      onClose={fechar}
      titulo={demanda ? 'Editar Tarefa' : 'Nova Tarefa'}
      subtitulo={criativo ? 'Criativo de tráfego pago' : 'Conteúdo orgânico (redes sociais)'}
      rodape={
        <div className="flex w-full flex-col gap-2">
          {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={salvar.isPending || !titulo.trim()}
            className="botao-principal flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <GlassIcon name="check" className="h-4 w-4" />
            {salvar.isPending ? 'Salvando…' : demanda ? 'Salvar alterações' : 'Criar Tarefa'}
          </button>
          {demanda && (
            <button type="button" onClick={handleExcluir} className="text-center text-xs font-semibold text-red-400 hover:underline">
              Excluir tarefa
            </button>
          )}
        </div>
      }
    >
      <Campo label="Tipo de trabalho" caixaAlta>
        <OpcoesCartao
          opcoes={[
            { id: 'organico', titulo: 'Orgânico', descricao: 'Conteúdo para redes sociais' },
            { id: 'criativo', titulo: 'Tráfego pago', descricao: 'Criativo com aprovação própria' },
          ]}
          valor={categoria}
          onChange={(v) => void trocarCategoria((v ?? 'organico') as DesignerCategoria)}
        />
      </Campo>
      {criativo && (
        <p className="-mt-2 text-xs text-orange-300">
          Ao ficar pronto, esta demanda aparece na aba <strong>Criativos</strong> da Gestão de Conteúdo, com link de aprovação próprio.
        </p>
      )}

      {demanda?.reprovado_em && (demanda.status === 'a_fazer' || demanda.status === 'alteracao' || demanda.status === 'em_andamento') && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
          <p className="mb-1 font-semibold">Reprovado pelo cliente: o que precisa ser refeito</p>
          <p className="whitespace-pre-line">{demanda.reprovado_justificativa || '(sem justificativa)'}</p>
          <p className="mt-1 text-xs text-red-300">
            em {new Date(demanda.reprovado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>
      )}

      {(status === 'alteracao' || ((status === 'a_fazer' || status === 'em_andamento') && alteracaoObs.trim())) && (
        <Campo label="Alteração: o que precisa ser alterado" caixaAlta>
          <EditorRico
            linhas={3}
            placeholder="Descreva o que deve mudar neste conteúdo (texto, corte, música, cor…). O designer vê isso em vermelho no cartão."
            value={alteracaoObs}
            onChange={setAlteracaoObs}
          />
        </Campo>
      )}

      <Campo label="Título" obrigatorio caixaAlta>
        <Texto placeholder="O que precisa ser feito?" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
      </Campo>

      <Campo label="Descrição" caixaAlta>
        <EditorRico linhas={3} placeholder="O que é a demanda, em poucas linhas." value={descricao} onChange={setDescricao} />
      </Campo>

      <Campo label="Briefing" caixaAlta>
        <EditorRico linhas={4} placeholder="Como fazer: texto da arte, formato, objetivo, o que não pode faltar." value={briefing} onChange={setBriefing} />
      </Campo>

      <Campo label="Cliente" caixaAlta>
        <Escolha
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          opcoes={[{ value: '', label: '— sem cliente —' }, ...((clientes ?? []).map((c) => ({ value: c.id, label: c.nome })))]}
        />
      </Campo>
      {clienteId && (
        <RegrasResumo clienteId={clienteId} clienteNome={(clientes ?? []).find((c) => c.id === clienteId)?.nome} />
      )}

      <Campo label={criativo ? 'Formato do criativo' : 'Tipo'} caixaAlta>
        <Chips multi={false} opcoes={tiposOpcoes} valores={[tipo]} onChange={(v) => { if (v[0]) setTipo(v[0] as DesignerTipo); }} />
      </Campo>

      <Campo label="Prioridade" caixaAlta>
        <SeletorPrioridade
          valor={prioridade === 'normal' ? 'media' : prioridade}
          onChange={(v) => setPrioridade((v === 'media' ? 'normal' : v) as DesignerPrioridade)}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Responsável" caixaAlta>
          <Escolha
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            opcoes={[{ value: '', label: 'ninguém' }, ...((operadores ?? []).map((op) => ({ value: op.id, label: op.nome })))]}
          />
        </Campo>
        <Campo label="Status" caixaAlta>
          <Escolha
            value={status}
            onChange={(e) => setStatus(e.target.value as DesignerStatus)}
            opcoes={STATUS_COLUNAS.map((c) => ({ value: c.id, label: c.label }))}
          />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Prazo" caixaAlta dica="opcional">
          <Texto type="date" prefixoIcone="calendar" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </Campo>
        <Campo label="Semana da demanda" caixaAlta>
          <Escolha value={semanaRef} onChange={(e) => setSemanaRef(e.target.value)} opcoes={opcoesSemana} />
        </Campo>
      </div>

      <Campo label="Recorrência" caixaAlta icone="repeat">
        <Escolha value={renovacao} onChange={(e) => setRenovacao(e.target.value as Renovacao)} opcoes={RENOVACAO_OPTIONS} />
        {renovacao !== 'nenhuma' && (
          <p className="text-xs text-slate-400">
            Ao concluir, o sistema cria a próxima demanda em A fazer, {renovacao === 'semanal' ? 'na semana seguinte' : 'no mês seguinte'}.
          </p>
        )}
      </Campo>

      <Campo label="Link do conteúdo pronto (Drive)" caixaAlta>
        <CampoLink
          placeholder="Cole o link depois de subir o arquivo. Vai junto para a Gestão de Conteúdo."
          value={linkConteudo}
          onChange={setLinkConteudo}
        />
      </Campo>

      <div className="flex flex-col gap-1.5">
        <Rotulo caixaAlta dica="vários">Arquivos</Rotulo>
        <AnexosDemanda anexos={anexos} onChange={setAnexos} novos={novos} onNovos={setNovos} />
      </div>
    </JanelaFormulario>
  );
}
