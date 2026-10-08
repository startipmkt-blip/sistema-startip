import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

export interface Reuniao {
  id: string;
  cliente_id: string;
  data: string; // 'YYYY-MM-DD'
  titulo: string;
  resumo: string;
  pdf_url: string | null; // nome/URL do PDF anexado
  created_at: string;
}

// Store demo (em memória).
let reunioes: Reuniao[] = [
  { id: 'rn1', cliente_id: 'c1', data: '2026-07-29', titulo: 'Alinhamento de julho', resumo: 'Revisamos os resultados de julho, definimos foco em conversão local e ajuste de criativos. Cliente aprovou aumento de verba.', pdf_url: null, created_at: '2026-07-29T15:00:00Z' },
  { id: 'rn2', cliente_id: 'c1', data: '2026-06-30', titulo: 'Reunião de onboarding', resumo: 'Apresentação da estratégia inicial e coleta de materiais. Definidas prioridades e calendário de conteúdo.', pdf_url: null, created_at: '2026-06-30T14:00:00Z' },
];

export type ReuniaoForm = Pick<Reuniao, 'data' | 'titulo' | 'resumo' | 'pdf_url'>;

async function fetchReunioes(clienteId: string): Promise<Reuniao[]> {
  if (IS_DEMO) {
    return reunioes
      .filter((r) => r.cliente_id === clienteId)
      .sort((a, b) => b.data.localeCompare(a.data)); // mais recente primeiro
  }
  const { data, error } = await supabase
    .from('reunioes')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('data', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Reuniao[];
}

export function useReunioes(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['reunioes', clienteId],
    queryFn: () => fetchReunioes(clienteId as string),
    enabled: Boolean(clienteId),
  });
}

export function useSalvarReuniao(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: ReuniaoForm }) => {
      if (IS_DEMO) {
        if (p.id) reunioes = reunioes.map((r) => (r.id === p.id ? { ...r, ...p.dados } : r));
        else reunioes = [...reunioes, { id: crypto.randomUUID(), cliente_id: clienteId, created_at: new Date().toISOString(), ...p.dados }];
        return;
      }
      const { error } = p.id
        ? await supabase.from('reunioes').update(p.dados as never).eq('id', p.id)
        : await supabase.from('reunioes').insert({ ...p.dados, cliente_id: clienteId } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reunioes', clienteId] }),
  });
}

// Envia resumo + PDF da reunião para a pasta de backup no Google Drive.
export function useBackupReuniaoDrive() {
  return useMutation({
    mutationFn: async (reuniaoId: string): Promise<{ pastaUrl: string | null }> => {
      if (IS_DEMO) {
        await new Promise((r) => setTimeout(r, 600));
        return { pastaUrl: 'https://drive.google.com/' };
      }
      const { data, error } = await supabase.functions.invoke('reuniao-backup-drive', { body: { reuniaoId } });
      if (error) {
        let msg = error.message;
        try {
          const j = await (error as unknown as { context: Response }).context.json();
          if (j?.erro) msg = j.erro;
        } catch { /* mantém a mensagem genérica */ }
        throw new Error(msg);
      }
      return { pastaUrl: (data as { pastaUrl?: string | null })?.pastaUrl ?? null };
    },
  });
}

export function useExcluirReuniao(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) { reunioes = reunioes.filter((r) => r.id !== id); return; }
      const { error } = await supabase.from('reunioes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reunioes', clienteId] }),
  });
}
