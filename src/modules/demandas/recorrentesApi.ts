import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import {
  CATEGORIA_RECORRENTE,
  type DemandaPrioridade,
  type DemandaQuem,
  type DemandaSetor,
  type Subtarefa,
} from '@/modules/demandas/types';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';

export type RecorrenciaTipo = 'diaria' | 'semanal' | 'mensal';

export interface TarefaRecorrente {
  id: string;
  titulo: string;
  descricao: string;
  responsaveis: string[];
  tipo: RecorrenciaTipo;
  dias_semana: number[]; // 0=Dom ... 6=Sáb (usado quando semanal; vários dias permitidos)
  dia_mes: number | null; // 1–31 (usado quando mensal; mês curto cai no último dia)
  horario: string; // opcional, ex.: '09:00-11:00'
  ultima_conclusao: string | null; // 'YYYY-MM-DD'
  ultima_geracao?: string | null; // último dia em que virou demanda no quadro
  // Mesmas opções de uma demanda — copiadas para o card criado no quadro.
  quem_responsavel: DemandaQuem;
  cliente_id: string | null;
  setor: DemandaSetor;
  privada: boolean;
  prioridade: DemandaPrioridade;
  tempo_estimado_min: number | null;
  /** 'auto' = coluna pelo responsável (Iuri / Dhomini / Aberta). */
  status_destino: 'auto' | 'aberta' | 'iuri' | 'domini' | 'fazendo';
  links: string[];
  anexos: CriativoAnexo[];
  subtarefas: Subtarefa[];
}

export const CAMPOS_DEMANDA_PADRAO: Pick<TarefaRecorrente, 'quem_responsavel' | 'cliente_id' | 'setor' | 'privada' | 'prioridade' | 'tempo_estimado_min' | 'status_destino' | 'links' | 'anexos' | 'subtarefas'> = {
  quem_responsavel: 'agencia', cliente_id: null, setor: 'geral', privada: false, prioridade: 'media',
  tempo_estimado_min: null, status_destino: 'auto', links: [], anexos: [], subtarefas: [],
};

export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function hojeStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Dia do mês em que a tarefa mensal vence no mês de `ref` (dia 31 em fevereiro → 28/29).
function diaMensalEfetivo(diaMes: number, ref: Date): number {
  const ultimo = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  return Math.min(diaMes, ultimo);
}

export function ehParaHoje(t: TarefaRecorrente): boolean {
  const hoje = new Date();
  if (t.tipo === 'diaria') return true;
  if (t.tipo === 'mensal') return t.dia_mes !== null && hoje.getDate() === diaMensalEfetivo(t.dia_mes, hoje);
  return t.dias_semana.includes(hoje.getDay());
}
export function pendenteHoje(t: TarefaRecorrente): boolean {
  return ehParaHoje(t) && t.ultima_conclusao !== hojeStr();
}
function listaPt(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}
export function recorrenciaLabel(t: TarefaRecorrente): string {
  const dias = [...t.dias_semana].sort((a, b) => a - b);
  let base: string;
  if (t.tipo === 'mensal') base = t.dia_mes ? `Todo dia ${t.dia_mes} do mês` : 'Mensal (sem dia definido)';
  else if (t.tipo === 'diaria' || dias.length === 7) base = 'Todo dia';
  else if (dias.length === 0) base = 'Sem dia definido';
  else {
    const nomes = dias.map((d) => DIAS[d].toLowerCase());
    base = `Toda ${listaPt(nomes)}`;
  }
  return t.horario ? `${base} · ${t.horario}` : base;
}

// Passou do horário programado e a tarefa não foi concluída hoje.
export function estaAtrasada(t: TarefaRecorrente): boolean {
  if (!pendenteHoje(t) || !t.horario) return false;
  const fim = t.horario.split('-')[1] || t.horario;
  const [h, m] = fim.split(':').map(Number);
  if (Number.isNaN(h)) return false;
  const agora = new Date();
  const hRef = new Date();
  hRef.setHours(h, m || 0, 0, 0);
  return agora > hRef;
}

// Store demo (em memória) — só usado quando IS_DEMO.
let demoTarefas: TarefaRecorrente[] = [
  { id: 't1', titulo: 'Análise de campanhas de todos os clientes', descricao: '', responsaveis: ['Gestor de tráfego'], tipo: 'semanal', dias_semana: [2], dia_mes: null, horario: '09:00-11:00', ultima_conclusao: null, ...CAMPOS_DEMANDA_PADRAO },
  { id: 't2', titulo: 'Postar stories dos clientes', descricao: '', responsaveis: ['Social media'], tipo: 'diaria', dias_semana: [], dia_mes: null, horario: '', ultima_conclusao: null, ...CAMPOS_DEMANDA_PADRAO },
  { id: 't3', titulo: 'Revisar metas da semana', descricao: '', responsaveis: ['Iuri', 'Domini'], tipo: 'semanal', dias_semana: [1], dia_mes: null, horario: '', ultima_conclusao: null, ...CAMPOS_DEMANDA_PADRAO },
];

export type RecorrenteForm = Pick<
  TarefaRecorrente,
  'titulo' | 'descricao' | 'responsaveis' | 'tipo' | 'dias_semana' | 'dia_mes' | 'horario'
  | 'quem_responsavel' | 'cliente_id' | 'setor' | 'privada' | 'prioridade' | 'tempo_estimado_min'
  | 'status_destino' | 'links' | 'anexos' | 'subtarefas'
>;

const KEY = ['recorrentes'] as const;

async function fetchRecorrentes(): Promise<TarefaRecorrente[]> {
  if (IS_DEMO) return [...demoTarefas];
  const { data, error } = await supabase
    .from('tarefas_recorrentes')
    .select('id, titulo, descricao, responsaveis, tipo, dias_semana, dia_mes, horario, ultima_conclusao, ultima_geracao, quem_responsavel, cliente_id, setor, privada, prioridade, tempo_estimado_min, status_destino, links, anexos, subtarefas')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as unknown as TarefaRecorrente[];
}

async function saveRecorrente(id: string | undefined, dados: RecorrenteForm): Promise<void> {
  if (IS_DEMO) {
    if (id) demoTarefas = demoTarefas.map((t) => (t.id === id ? { ...t, ...dados } : t));
    else demoTarefas = [...demoTarefas, { id: crypto.randomUUID(), ultima_conclusao: null, ...dados }];
    return;
  }
  const payload = {
    ...dados,
    dias_semana: dados.tipo === 'semanal' ? dados.dias_semana : [],
    dia_mes: dados.tipo === 'mensal' ? dados.dia_mes : null,
  };
  const { error } = id
    ? await supabase.from('tarefas_recorrentes').update({ ...payload, updated_at: new Date().toISOString() } as never).eq('id', id)
    : await supabase.from('tarefas_recorrentes').insert(payload as never);
  if (error) throw error;
}

async function concluirRecorrente(id: string, concluir: boolean): Promise<void> {
  const ultima_conclusao = concluir ? hojeStr() : null;
  if (IS_DEMO) {
    demoTarefas = demoTarefas.map((t) => (t.id === id ? { ...t, ultima_conclusao } : t));
    return;
  }
  const { error } = await supabase.from('tarefas_recorrentes').update({ ultima_conclusao } as never).eq('id', id);
  if (error) throw error;
}

async function excluirRecorrente(id: string): Promise<void> {
  if (IS_DEMO) {
    demoTarefas = demoTarefas.filter((t) => t.id !== id);
    return;
  }
  const { error } = await supabase.from('tarefas_recorrentes').delete().eq('id', id);
  if (error) throw error;
}

// Coluna do quadro conforme quem faz: só Iuri → "iuri"; só Dhomini → "domini"; ninguém/ambos/outros → "aberta".
export function colunaDaRecorrente(responsaveis: string[]): 'aberta' | 'iuri' | 'domini' {
  const norm = responsaveis.map((r) => r.trim().toLowerCase());
  const iuri = norm.includes('iuri');
  const domini = norm.some((r) => r === 'domini' || r === 'dhomini');
  if (iuri && !domini) return 'iuri';
  if (domini && !iuri) return 'domini';
  return 'aberta';
}

// Cria no quadro de Demandas as recorrentes que vencem hoje (uma vez por dia).
// O update condicional em ultima_geracao é atômico: se dois usuários abrirem a tela ao mesmo tempo, só um cria.
// Retorna quantas demandas foram criadas.
export async function gerarDemandasRecorrentesDeHoje(): Promise<number> {
  if (IS_DEMO) return 0;
  const hoje = hojeStr();
  const lista = await fetchRecorrentes();
  let criadas = 0;
  for (const t of lista) {
    if (!ehParaHoje(t) || t.ultima_geracao === hoje) continue;
    const { data: claim, error: errClaim } = await supabase
      .from('tarefas_recorrentes')
      .update({ ultima_geracao: hoje } as never)
      .eq('id', t.id)
      .or(`ultima_geracao.is.null,ultima_geracao.lt.${hoje}`)
      .select('id');
    if (errClaim) throw errClaim;
    if (!claim || claim.length === 0) continue; // outro usuário já gerou hoje
    const desc = [t.horario ? `Horário: ${t.horario}` : '', t.descricao].filter(Boolean).join('\n\n');
    // As colunas Iuri/Dhomini só existem no setor Sócios (privado); nas demais, vale o setor escolhido na tarefa.
    const status = t.status_destino && t.status_destino !== 'auto' ? t.status_destino : colunaDaRecorrente(t.responsaveis);
    const dosSocios = status === 'iuri' || status === 'domini';
    const { error: errIns } = await supabase.from('demandas').insert({
      cliente_id: t.cliente_id, setor: dosSocios ? 'socios' : t.setor, privada: dosSocios || t.privada,
      titulo: t.titulo, descricao: desc,
      responsavel: t.responsaveis.join(', ') || 'Equipe', prioridade: t.prioridade,
      status, prazo: hoje, renovacao: 'nenhuma', categoria: CATEGORIA_RECORRENTE,
      quem_responsavel: t.quem_responsavel, responsaveis_secundarios: [],
      tempo_estimado_min: t.tempo_estimado_min, links: t.links ?? [], anexos: t.anexos ?? [],
      subtarefas: (t.subtarefas ?? []).map((x) => ({ ...x, feita: false })),
    } as never);
    if (errIns) {
      await supabase.from('tarefas_recorrentes').update({ ultima_geracao: t.ultima_geracao ?? null } as never).eq('id', t.id);
      throw errIns;
    }
    criadas++;
  }
  return criadas;
}

export function useRecorrentes() {
  return useQuery({ queryKey: KEY, queryFn: fetchRecorrentes });
}
export function useSalvarRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: RecorrenteForm }) => saveRecorrente(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
export function useConcluirRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; concluir: boolean }) => concluirRecorrente(p.id, p.concluir),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
export function useExcluirRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirRecorrente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
