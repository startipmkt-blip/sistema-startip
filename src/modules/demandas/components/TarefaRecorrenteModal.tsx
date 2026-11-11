import { useState } from 'react';
import {
  useSalvarRecorrente,
  CAMPOS_DEMANDA_PADRAO,
  DIAS,
  type RecorrenteForm,
  type TarefaRecorrente,
  type RecorrenciaTipo,
} from '@/modules/demandas/recorrentesApi';
import {
  RESPONSAVEIS, HORARIOS_FAIXA, DEMANDA_COLUNAS, DEMANDA_SETORES,
  type DemandaPrioridade, type DemandaQuem, type DemandaSetor, type Subtarefa,
} from '@/modules/demandas/types';
import { RESPONSAVEIS_SOCIOS, SeletorPessoas } from '@/modules/demandas/components/DemandaFormModal';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { AnexosCriativo } from '@/modules/ideias/criativos/components/AnexosCriativo';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import {
  Campo, Chips, Escolha, JanelaFormulario, ListaItens, ListaLinks, OpcoesCartao,
  Rotulo, SeletorPrioridade, Texto,
} from '@/shared/ui/form/FormKit';
import { EditorRico } from '@/shared/ui/texto-rico/EditorRico';

interface Props {
  open: boolean;
  onClose: () => void;
  tarefa?: TarefaRecorrente;
}

const TIPOS: { id: RecorrenciaTipo; titulo: string; descricao: string }[] = [
  { id: 'diaria', titulo: 'Todo dia', descricao: 'Aparece em todos os dias' },
  { id: 'semanal', titulo: 'Toda semana', descricao: 'Em dias fixos da semana' },
  { id: 'mensal', titulo: 'Todo mês', descricao: 'Em um dia fixo do mês' },
];

export function TarefaRecorrenteModal({ open, onClose, tarefa }: Props) {
  const salvar = useSalvarRecorrente();
  const [erro, setErro] = useState('');
  const [form, setForm] = useState<RecorrenteForm>({
    titulo: tarefa?.titulo ?? '',
    descricao: tarefa?.descricao ?? '',
    responsaveis: tarefa?.responsaveis ?? [],
    tipo: tarefa?.tipo ?? 'semanal',
    dias_semana: tarefa?.dias_semana ?? [1],
    dia_mes: tarefa?.dia_mes ?? new Date().getDate(),
    horario: tarefa?.horario ?? '',
    quem_responsavel: tarefa?.quem_responsavel ?? CAMPOS_DEMANDA_PADRAO.quem_responsavel,
    cliente_id: tarefa?.cliente_id ?? null,
    setor: tarefa?.setor ?? CAMPOS_DEMANDA_PADRAO.setor,
    privada: tarefa?.privada ?? false,
    prioridade: tarefa?.prioridade ?? CAMPOS_DEMANDA_PADRAO.prioridade,
    tempo_estimado_min: tarefa?.tempo_estimado_min ?? null,
    status_destino: tarefa?.status_destino ?? 'auto',
    links: tarefa?.links ?? [],
    anexos: tarefa?.anexos ?? [],
    subtarefas: tarefa?.subtarefas ?? [],
  });
  const { data: clientes } = useClientes('');
  const clienteOptions = [
    { value: '', label: 'Interna (sem cliente)' },
    ...(clientes ?? []).map((c) => ({ value: c.id, label: c.nome })),
  ];
  // Anexos enviados nesta abertura: se cancelar, somem do storage.
  const [novos, setNovos] = useState<string[]>([]);
  const anexos = form.anexos;
  function fechar() {
    for (const p of novos) void descartarAnexo(p);
    setNovos([]);
    onClose();
  }
  const set = <K extends keyof RecorrenteForm>(k: K, v: RecorrenteForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const semDia = form.tipo === 'semanal' && form.dias_semana.length === 0;
  const semDiaMes = form.tipo === 'mensal' && !(form.dia_mes && form.dia_mes >= 1 && form.dia_mes <= 31);
  const invalido = !form.titulo.trim() || semDia || semDiaMes;

  async function handleSalvar() {
    if (invalido) return;
    setErro('');
    try {
      await salvar.mutateAsync({
        id: tarefa?.id,
        dados: { ...form, titulo: form.titulo.trim(), descricao: form.descricao.trim() },
      });
      const mantidos = new Set(form.anexos.map((a) => a.path));
      for (const a of tarefa?.anexos ?? []) if (!mantidos.has(a.path)) void descartarAnexo(a.path);
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <JanelaFormulario
      open={open}
      onClose={fechar}
      titulo={tarefa ? 'Editar Tarefa Recorrente' : 'Nova Tarefa Recorrente'}
      rodape={
        <div className="flex w-full flex-col gap-2">
          {erro && <p role="alert" className="text-center text-xs text-red-400">{erro}</p>}
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvar.isPending || invalido}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <GlassIcon name="check" className="h-4 w-4" />
            {salvar.isPending ? 'Salvando…' : tarefa ? 'Salvar alterações' : 'Criar Tarefa Recorrente'}
          </button>
        </div>
      }
    >
      <Campo label="Tarefa" obrigatorio caixaAlta>
        <Texto placeholder="O que precisa ser feito sempre?" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} autoFocus />
      </Campo>
      <Campo label="Descrição" caixaAlta>
        <EditorRico placeholder="Detalhes, passo a passo ou links da tarefa…" value={form.descricao} onChange={(v) => set('descricao', v)} />
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
          <Escolha opcoes={clienteOptions} value={form.cliente_id ?? ''} onChange={(e) => set('cliente_id', e.target.value || null)} />
        </Campo>
        <Campo label="Setor" caixaAlta>
          <Escolha
            opcoes={DEMANDA_SETORES.map((s) => ({ value: s.id, label: s.label }))}
            value={form.setor}
            onChange={(e) => {
              const novoSetor = e.target.value as DemandaSetor;
              setForm((f) => ({
                ...f,
                setor: novoSetor,
                privada: novoSetor === 'socios',
                status_destino: novoSetor !== 'socios' && (f.status_destino === 'iuri' || f.status_destino === 'domini') ? 'auto' : f.status_destino,
              }));
            }}
          />
        </Campo>
      </div>
      <label className="-mt-2 flex items-center gap-2 text-xs font-medium text-slate-300">
        <input type="checkbox" checked={form.privada} onChange={(e) => set('privada', e.target.checked)} />
        Privada (só sócios veem)
      </label>

      <Campo label="Responsáveis" caixaAlta dica="vários">
        <SeletorPessoas
          multi
          opcoes={form.setor === 'socios' ? RESPONSAVEIS_SOCIOS : RESPONSAVEIS}
          valores={form.responsaveis}
          onChange={(v) => set('responsaveis', v)}
        />
      </Campo>

      <Campo label="Prioridade" caixaAlta>
        <SeletorPrioridade valor={form.prioridade} onChange={(v) => set('prioridade', v as DemandaPrioridade)} />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Vai para a coluna" caixaAlta>
          <Escolha
            opcoes={[
              { value: 'auto', label: 'Automática (pelo responsável)' },
              ...DEMANDA_COLUNAS.filter((c) => c.id !== 'concluida' && (!c.socios_only || form.setor === 'socios'))
                .map((c) => ({ value: c.id, label: c.label })),
            ]}
            value={form.status_destino}
            onChange={(e) => set('status_destino', e.target.value as RecorrenteForm['status_destino'])}
          />
        </Campo>
        <Campo label="Tempo estimado" caixaAlta>
          <Texto
            type="number" min={0} inputMode="numeric" prefixoIcone="clock" sufixo="min" placeholder="Ex: 60"
            value={form.tempo_estimado_min ?? ''}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              set('tempo_estimado_min', Number.isFinite(n) ? n : null);
            }}
          />
        </Campo>
      </div>

      <Campo label="Recorrência" caixaAlta icone="repeat">
        <div className="grid gap-2 sm:grid-cols-3">
          {TIPOS.map((t) => {
            const ativo = form.tipo === t.id;
            return (
              <button key={t.id} type="button" aria-pressed={ativo} onClick={() => set('tipo', t.id)}
                className={`opcao-cartao rounded-xl border px-3 py-2.5 text-left transition-colors ${ativo ? 'opcao-ativa border-brand-400 bg-brand-500/10' : 'border-white/10 hover:border-white/25'}`}>
                <div className="text-sm font-semibold text-slate-100">{t.titulo}</div>
                <div className="text-xs text-slate-400">{t.descricao}</div>
              </button>
            );
          })}
        </div>
      </Campo>
      {form.tipo === 'semanal' && (
        <Campo label="Dias da semana" caixaAlta>
          <Chips
            opcoes={DIAS.map((d, i) => ({ id: String(i), label: d }))}
            valores={form.dias_semana.map(String)}
            onChange={(v) => set('dias_semana', v.map(Number).sort((a, b) => a - b))}
          />
          {semDia && <p className="text-xs text-red-400">Selecione ao menos um dia.</p>}
        </Campo>
      )}
      {form.tipo === 'mensal' && (
        <Campo label="Dia do mês" caixaAlta>
          <Escolha
            opcoes={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Dia ${i + 1}` }))}
            value={String(form.dia_mes ?? '')}
            onChange={(e) => set('dia_mes', Number(e.target.value))}
          />
          {(form.dia_mes ?? 0) > 28 && <p className="text-xs text-slate-400">Em meses com menos dias, a tarefa cai no último dia do mês.</p>}
        </Campo>
      )}
      <Campo label="Horário" caixaAlta dica="opcional" icone="clock">
        <Escolha
          opcoes={[{ value: '', label: 'Livre' }, ...HORARIOS_FAIXA.filter(Boolean).map((h) => ({ value: h, label: h }))]}
          value={form.horario}
          onChange={(e) => set('horario', e.target.value)}
        />
      </Campo>
      <div className="flex flex-col gap-1.5">
        <Rotulo caixaAlta dica="vários">Links</Rotulo>
        <ListaLinks valores={form.links} onChange={(v) => set('links', v)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Rotulo caixaAlta dica="vários">Arquivos</Rotulo>
        <AnexosCriativo anexos={anexos} onChange={(a: CriativoAnexo[]) => set('anexos', a)} novos={novos} onNovos={setNovos} />
      </div>

      <Campo label="Subtarefas" caixaAlta>
        <ListaItens
          placeholder="Adicionar subtarefa..."
          comCheck={false}
          valores={form.subtarefas.map((t) => t.texto)}
          onChange={(textos) => set('subtarefas', textos.map((texto): Subtarefa => ({ texto, feita: false })))}
        />
      </Campo>
    </JanelaFormulario>
  );
}
