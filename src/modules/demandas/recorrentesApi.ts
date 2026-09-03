import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type RecorrenciaTipo = 'diaria' | 'semanal';

export interface TarefaRecorrente {
  id: string;
  titulo: string;
  responsavel: string;
  tipo: RecorrenciaTipo;
  dia_semana: number; // 0=Dom ... 6=Sáb (usado quando semanal)
  horario: string; // opcional, ex.: '09:00-11:00'
  ultima_conclusao: string | null; // 'YYYY-MM-DD'
}

export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function hojeStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ehParaHoje(t: TarefaRecorrente): boolean {
  return t.tipo === 'diaria' || new Date().getDay() === t.dia_semana;
}
export function pendenteHoje(t: TarefaRecorrente): boolean {
  return ehParaHoje(t) && t.ultima_conclusao !== hojeStr();
}
export function recorrenciaLabel(t: TarefaRecorrente): string {
  const base = t.tipo === 'diaria' ? 'Todo dia' : `Toda ${DIAS[t.dia_semana].toLowerCase()}`;
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

// Store demo (em memória).
let tarefas: TarefaRecorrente[] = [
  { id: 't1', titulo: 'Análise de campanhas de todos os clientes', responsavel: 'Tráfego', tipo: 'semanal', dia_semana: 2, horario: '09:00-11:00', ultima_conclusao: null },
  { id: 't2', titulo: 'Postar stories dos clientes', responsavel: 'Social', tipo: 'diaria', dia_semana: 1, horario: '', ultima_conclusao: null },
  { id: 't3', titulo: 'Revisar metas da semana', responsavel: 'Sócios', tipo: 'semanal', dia_semana: 1, horario: '', ultima_conclusao: null },
];

export type RecorrenteForm = Pick<TarefaRecorrente, 'titulo' | 'responsavel' | 'tipo' | 'dia_semana' | 'horario'>;

export function useRecorrentes() {
  return useQuery({ queryKey: ['recorrentes'], queryFn: async () => [...tarefas] });
}
export function useSalvarRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: RecorrenteForm }) => {
      if (p.id) tarefas = tarefas.map((t) => (t.id === p.id ? { ...t, ...p.dados } : t));
      else tarefas = [...tarefas, { id: crypto.randomUUID(), ultima_conclusao: null, ...p.dados }];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recorrentes'] }),
  });
}
export function useConcluirRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; concluir: boolean }) => {
      tarefas = tarefas.map((t) => (t.id === p.id ? { ...t, ultima_conclusao: p.concluir ? hojeStr() : null } : t));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recorrentes'] }),
  });
}
export function useExcluirRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { tarefas = tarefas.filter((t) => t.id !== id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recorrentes'] }),
  });
}
