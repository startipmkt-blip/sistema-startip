import { useEffect, useState } from 'react';
import {
  useSalvarDemanda,
  useExcluirDemanda,
  type DemandaFormData,
} from '@/modules/demandas/api/demandasApi';
import { modelosDemanda } from '@/modules/demandas/api/modelosApi';
import {
  DEMANDA_CATEGORIAS,
  DEMANDA_COLUNAS,
  DEMANDA_SETORES,
  RESPONSAVEIS,
  type DemandaPrioridade,
  type DemandaQuem,
  type DemandaSetor,
  type DemandaView,
  type Subtarefa,
} from '@/modules/demandas/types';
import { RENOVACAO_OPTIONS, type Renovacao } from '@/modules/demandas/lib/renovacao';
import { TOCADORES, type Tocador } from '@/modules/demandas/api/cronometroApi';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { AnexosCriativo } from '@/modules/ideias/criativos/components/AnexosCriativo';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import { confirmar } from '@/shared/ui/ConfirmDialog';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import {
  Campo, Chips, Escolha, JanelaFormulario, ListaItens, ListaLinks, OpcoesCartao,
  Rotulo, SeletorPrioridade, Texto,
} from '@/shared/ui/form/FormKit';
import { EditorRico } from '@/shared/ui/texto-rico/EditorRico';

interface Props {
  open: boolean;
  onClose: () => void;
  demanda?: DemandaView;
  setorInicial?: DemandaSetor;
}

const RASCUNHO_KEY = 'startip:demanda-rascunho-v2';

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

function iniciais(nome: string) {
  return nome.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

/** Escolha de pessoas por avatar (responsável principal: um; secundários: vários). */
function SeletorPessoas({ valores, onChange, multi, excluir }: {
  valores: string[]; onChange: (v: string[]) => void; multi: boolean; excluir?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {RESPONSAVEIS.filter((r) => r !== excluir).map((r) => {
        const ativo = valores.includes(r);
        return (
          <button
            key={r}
            type="button"
            aria-pressed={ativo}
            title={r}
            onClick={() => onChange(multi ? (ativo ? valores.filter((v) => v !== r) : [...valores, r]) : (ativo ? [] : [r]))}
            className={`pessoa-form inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition-colors ${
              ativo ? 'border-brand-400 bg-brand-500/10 text-brand-300' : 'border-white/10 text-slate-300 hover:border-white/25'}`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${ativo ? 'bg-brand-500 text-white' : 'bg-white/10 text-slate-400'}`}>
              {iniciais(r)}
            </span>
            {r}
          </button>
        );
      })}
    </div>
  );
}

export function DemandaFormModal({ open, onClose, demanda, setorInicial }: Props) {
  const salvar = useSalvarDemanda();
  const excluir = useExcluirDemanda();
  const modelos = modelosDemanda.useLista();
  const salvarModelo = modelosDemanda.useSalvar();
  const [avisoModelo, setAvisoModelo] = useState('');

  async function handleExcluir() {
    if (!demanda) return;
    if (!(await confirmar(`Excluir "${demanda.titulo}"?`))) return;
    await excluir.mutateAsync(demanda.id);
    for (const a of demanda.anexos ?? []) void descartarAnexo(a.path);
    onClose();
  }
  const { data: clientes } = useClientes('');
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
      quem_responsavel: (demanda?.quem_responsavel ?? 'agencia') as DemandaQuem,
      responsaveis_secundarios: demanda?.responsaveis_secundarios ?? [],
      categoria: demanda?.categoria ?? '',
      tempo_estimado_min: demanda?.tempo_estimado_min != null ? String(demanda.tempo_estimado_min) : '',
      links: demanda?.links ?? [],
      subtarefas: demanda?.subtarefas ?? [],
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
    limparRascunho();
    onClose();
  }

  // Entrar em "Em andamento" liga o cronômetro, que precisa saber quem está tocando.
  const [tocador, setTocador] = useState<Tocador | ''>('');
  const precisaTocador = form.status === 'fazendo' && demanda?.status !== 'fazendo';
  const faltaTocador = precisaTocador && !tocador;

  function montarDados(): DemandaFormData {
    const minutos = parseInt(form.tempo_estimado_min, 10);
    return {
      cliente_id: form.cliente_id || null, // vazio => interna
      setor: form.setor as DemandaSetor,
      privada: form.privada,
      titulo: form.titulo.trim(),
      descricao: form.descricao,
      responsavel: form.responsavel,
      prioridade: form.prioridade as DemandaPrioridade,
      status: form.status as DemandaFormData['status'],
      prazo: form.prazo,
      renovacao: form.renovacao,
      quem_responsavel: form.quem_responsavel,
      responsaveis_secundarios: form.responsaveis_secundarios,
      categoria: form.categoria || null,
      tempo_estimado_min: Number.isFinite(minutos) ? minutos : null,
      links: form.links,
      subtarefas: form.subtarefas,
      anexos,
    };
  }

  async function handleSalvar() {
    if (!form.titulo.trim() || faltaTocador) return;
    const r = await salvar.mutateAsync({
      id: demanda?.id,
      dados: montarDados(),
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

  async function handleSalvarModelo() {
    const nome = form.titulo.trim();
    if (!nome) { setAvisoModelo('Dê um título para salvar como modelo.'); return; }
    // Anexos e status não entram no modelo: cada demanda nova começa aberta e sem arquivos.
    const { anexos: _a, status: _s, ...dados } = montarDados();
    void _a; void _s;
    await salvarModelo.mutateAsync({ dados: { nome, dados } });
    setAvisoModelo(`Modelo "${nome}" salvo. Ele aparece em "Usar modelo" na próxima demanda.`);
  }

  function aplicarModelo(id: string) {
    const m = (modelos.data ?? []).find((x) => x.id === id);
    if (!m) return;
    const d = m.dados;
    setForm((f) => ({
      ...f,
      titulo: d.titulo ?? f.titulo,
      descricao: d.descricao ?? f.descricao,
      cliente_id: d.cliente_id ?? f.cliente_id,
      setor: (d.setor as DemandaSetor | undefined) ?? f.setor,
      privada: d.privada ?? f.privada,
      responsavel: d.responsavel ?? f.responsavel,
      prioridade: (d.prioridade as DemandaPrioridade | undefined) ?? f.prioridade,
      renovacao: (d.renovacao as Renovacao | undefined) ?? f.renovacao,
      quem_responsavel: d.quem_responsavel ?? f.quem_responsavel,
      responsaveis_secundarios: d.responsaveis_secundarios ?? f.responsaveis_secundarios,
      categoria: d.categoria ?? f.categoria,
      tempo_estimado_min: d.tempo_estimado_min != null ? String(d.tempo_estimado_min) : f.tempo_estimado_min,
      links: d.links ?? f.links,
      subtarefas: (d.subtarefas ?? f.subtarefas).map((t) => ({ ...t, feita: false })),
    }));
  }

  const setores = DEMANDA_SETORES;
  const podeSalvar = Boolean(form.titulo.trim()) && !faltaTocador && !salvar.isPending;

  return (
    <JanelaFormulario
      open={open}
      onClose={fechar}
      titulo={demanda ? 'Editar Tarefa' : 'Nova Tarefa'}
      subtitulo={demanda
        ? `Criada em ${new Date(demanda.created_at).toLocaleDateString('pt-BR')} às ${new Date(demanda.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        : undefined}
      rodape={
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={handleSalvar}
            disabled={!podeSalvar}
            className="botao-principal flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <GlassIcon name="check" className="h-4 w-4" />
            {salvar.isPending ? 'Salvando…' : demanda ? 'Salvar alterações' : 'Criar Tarefa'}
          </button>
          <button
            type="button"
            onClick={handleSalvarModelo}
            disabled={salvarModelo.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10"
          >
            <GlassIcon name="save" className="h-4 w-4" /> Salvar como Modelo
          </button>
          {avisoModelo && <p className="text-center text-xs text-slate-400">{avisoModelo}</p>}
          {demanda && (
            <button type="button" onClick={handleExcluir} className="text-center text-xs font-semibold text-red-400 hover:underline">
              Excluir tarefa
            </button>
          )}
        </div>
      }
    >
      {!demanda && (modelos.data ?? []).length > 0 && (
        <Campo label="Usar modelo" caixaAlta>
          <Escolha
            opcoes={[{ value: '', label: 'Começar em branco' }, ...(modelos.data ?? []).map((m) => ({ value: m.id, label: m.nome }))]}
            defaultValue=""
            onChange={(e) => e.target.value && aplicarModelo(e.target.value)}
          />
        </Campo>
      )}

      <Campo label="Título" obrigatorio caixaAlta>
        <Texto placeholder="O que precisa ser feito?" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} autoFocus />
      </Campo>

      <Campo label="Descrição" caixaAlta>
        <EditorRico
          placeholder="Descreva o que precisa ser feito, contexto, critérios de conclusão..."
          value={form.descricao}
          onChange={(v) => set('descricao', v)}
        />
      </Campo>

      <Campo label="Quem é responsável?" caixaAlta>
        <OpcoesCartao
          opcoes={[
            { id: 'agencia', titulo: 'Agência', descricao: 'Tarefa interna da equipe' },
            { id: 'cliente', titulo: 'Cliente', descricao: 'Tarefa pendente do cliente' },
          ]}
          valor={form.quem_responsavel}
          onChange={(v) => set('quem_responsavel', (v ?? 'agencia') as DemandaQuem)}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Cliente" caixaAlta>
          <Escolha opcoes={clienteOptions} value={form.cliente_id ?? ''} onChange={(e) => set('cliente_id', e.target.value)} />
        </Campo>
        <Campo label="Setor" caixaAlta>
          <Escolha
            opcoes={setores.map((s) => ({ value: s.id, label: s.label }))}
            value={form.setor}
            onChange={(e) => {
              const novoSetor = e.target.value as DemandaSetor;
              setForm((f) => ({ ...f, setor: novoSetor, privada: novoSetor === 'socios' }));
            }}
          />
        </Campo>
      </div>
      <label className="-mt-2 flex items-center gap-2 text-xs font-medium text-slate-300">
        <input type="checkbox" checked={form.privada} onChange={(e) => set('privada', e.target.checked)} />
        Privada (só sócios veem)
      </label>

      <Campo label="Responsável principal" caixaAlta>
        <SeletorPessoas
          multi={false}
          valores={form.responsavel ? [form.responsavel] : []}
          onChange={(v) => setForm((f) => ({
            ...f, responsavel: v[0] ?? '', responsaveis_secundarios: f.responsaveis_secundarios.filter((x) => x !== v[0]),
          }))}
        />
      </Campo>

      <div className="flex flex-col gap-1.5">
        <Rotulo caixaAlta dica="opcional, vários">Responsáveis secundários</Rotulo>
        <SeletorPessoas
          multi
          excluir={form.responsavel}
          valores={form.responsaveis_secundarios}
          onChange={(v) => set('responsaveis_secundarios', v)}
        />
      </div>

      <Campo label="Prioridade" caixaAlta>
        <SeletorPrioridade valor={form.prioridade} onChange={(v) => set('prioridade', v)} />
      </Campo>

      <Campo label="Categoria" caixaAlta>
        <Chips
          multi={false}
          opcoes={DEMANDA_CATEGORIAS}
          valores={form.categoria ? [form.categoria] : []}
          onChange={(v) => set('categoria', v[0] ?? '')}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Prazo" caixaAlta>
          <Texto type="date" prefixoIcone="calendar" value={form.prazo ?? ''} onChange={(e) => set('prazo', e.target.value)} />
        </Campo>
        <Campo label="Tempo estimado" caixaAlta>
          <Texto
            type="number" min={0} inputMode="numeric" prefixoIcone="clock" sufixo="min" placeholder="Ex: 60"
            value={form.tempo_estimado_min}
            onChange={(e) => set('tempo_estimado_min', e.target.value)}
          />
        </Campo>
      </div>

      {demanda && (
        <Campo label="Status" caixaAlta>
          <Escolha
            opcoes={DEMANDA_COLUNAS.map((c) => ({ value: c.id, label: c.label }))}
            value={form.status}
            onChange={(e) => set('status', e.target.value as typeof form.status)}
          />
        </Campo>
      )}
      {precisaTocador && (
        <Campo label="Quem vai tocar essa demanda? (inicia o cronômetro)" obrigatorio caixaAlta>
          <Escolha
            opcoes={[{ value: '', label: '— selecionar —' }, ...TOCADORES.map((t) => ({ value: t, label: t }))]}
            value={tocador}
            onChange={(e) => setTocador(e.target.value as Tocador | '')}
          />
        </Campo>
      )}

      <Campo label="Recorrência" caixaAlta icone="repeat">
        <Escolha opcoes={RENOVACAO_OPTIONS} value={form.renovacao} onChange={(e) => set('renovacao', e.target.value as Renovacao)} />
        {form.renovacao !== 'nenhuma' && (
          <p className="text-xs text-slate-400">
            Ao concluir, o sistema cria a próxima tarefa sozinho, com o prazo {form.renovacao === 'semanal' ? '7 dias' : '1 mês'} depois.
          </p>
        )}
      </Campo>

      <div className="flex flex-col gap-1.5">
        <Rotulo caixaAlta dica="vários">Links</Rotulo>
        <ListaLinks valores={form.links} onChange={(v) => set('links', v)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Rotulo caixaAlta dica="vários">Arquivos</Rotulo>
        <AnexosCriativo anexos={anexos} onChange={setAnexos} novos={novos} onNovos={setNovos} />
      </div>

      <Campo label="Subtarefas" caixaAlta>
        <ListaItens
          placeholder="Adicionar subtarefa..."
          comCheck
          valores={form.subtarefas.map((t) => t.texto)}
          marcados={form.subtarefas.map((t) => t.feita)}
          onMarcar={(i, v) => set('subtarefas', form.subtarefas.map((t, k) => (k === i ? { ...t, feita: v } : t)))}
          onChange={(textos) => {
            // Mantém o "feita" de quem continuou na lista (remoção ou inclusão no fim).
            const restantes: Subtarefa[] = [];
            let k = 0;
            for (const texto of textos) {
              while (k < form.subtarefas.length && form.subtarefas[k].texto !== texto) k++;
              restantes.push(k < form.subtarefas.length ? form.subtarefas[k++] : { texto, feita: false });
            }
            set('subtarefas', restantes);
          }}
        />
      </Campo>
    </JanelaFormulario>
  );
}
