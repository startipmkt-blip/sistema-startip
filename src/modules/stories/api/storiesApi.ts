import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClientes } from '@/shared/lib/demoData';
import { SEED_SETTINGS, seedIdeias, type SeedKey } from '@/modules/stories/seed';
import type { StoryClientSettings, StoryIdea, StoryIdeaDraft } from '@/modules/stories/types';

// Tabelas novas ainda não estão no tipo Database gerado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (nome: string) => (supabase.from as any)(nome);

const keys = {
  settings: ['stories', 'settings'] as const,
  ideias: (clientId: string) => ['stories', 'ideias', clientId] as const,
  todas: ['stories', 'ideias'] as const,
};

// ---- Modo Demonstração: os 4 primeiros clientes demo recebem os dados iniciais ----
const SEED_KEYS: SeedKey[] = ['layfe', 'xm', 'igotup', 'lg'];
const demoSettings: StoryClientSettings[] = [];
const demoIdeias: StoryIdea[] = [];
if (IS_DEMO) {
  SEED_KEYS.forEach((k, n) => {
    const cliente = demoClientes[n];
    if (!cliente) return;
    demoSettings.push({ client_id: cliente.id, ...SEED_SETTINGS[k] });
    seedIdeias(k).forEach((s) => {
      demoIdeias.push({ ...s, id: crypto.randomUUID(), client_id: cliente.id, created_at: new Date().toISOString() });
    });
  });
}

// ---- Configurações visuais por cliente ----
async function fetchSettings(): Promise<StoryClientSettings[]> {
  if (IS_DEMO) return [...demoSettings];
  const { data, error } = await tbl('story_client_settings').select('*');
  if (error) throw error;
  return (data ?? []) as StoryClientSettings[];
}

export function useStorySettings() {
  return useQuery({ queryKey: keys.settings, queryFn: fetchSettings });
}

async function saveSettings(s: StoryClientSettings): Promise<void> {
  if (IS_DEMO) {
    const i = demoSettings.findIndex((x) => x.client_id === s.client_id);
    if (i >= 0) demoSettings[i] = s; else demoSettings.push(s);
    return;
  }
  const { error } = await tbl('story_client_settings').upsert({ ...s, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export function useSalvarStorySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.settings }),
  });
}

// ---- Ideias ----
async function fetchIdeias(clientId: string): Promise<StoryIdea[]> {
  if (IS_DEMO) {
    return demoIdeias.filter((i) => i.client_id === clientId).sort((a, b) => a.sort_order - b.sort_order);
  }
  const { data, error } = await tbl('story_ideas')
    .select('*')
    .eq('client_id', clientId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as StoryIdea[];
}

export function useStoryIdeias(clientId: string) {
  return useQuery({
    queryKey: keys.ideias(clientId),
    queryFn: () => fetchIdeias(clientId),
    enabled: Boolean(clientId),
  });
}

async function saveIdeia(p: { id?: string; clientId: string; dados: StoryIdeaDraft; sortOrder?: number }): Promise<void> {
  if (IS_DEMO) {
    if (p.id) {
      const i = demoIdeias.find((x) => x.id === p.id);
      if (i) Object.assign(i, p.dados);
    } else {
      const max = Math.max(-1, ...demoIdeias.filter((x) => x.client_id === p.clientId).map((x) => x.sort_order));
      demoIdeias.push({ ...p.dados, id: crypto.randomUUID(), client_id: p.clientId, sort_order: p.sortOrder ?? max + 1, created_at: new Date().toISOString() });
    }
    return;
  }
  const { error } = p.id
    ? await tbl('story_ideas').update({ ...p.dados, updated_at: new Date().toISOString() }).eq('id', p.id)
    : await tbl('story_ideas').insert({ ...p.dados, client_id: p.clientId, sort_order: p.sortOrder ?? Date.now() % 1000000 });
  if (error) throw error;
}

export function useSalvarStoryIdeia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveIdeia,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.todas }),
  });
}

async function copiarConjunto(p: { origem: string; destino: string; configDestino: StoryClientSettings | null }): Promise<number> {
  const ideias = await fetchIdeias(p.origem);
  const linhas = ideias.map((i) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, client_id, created_at, ...resto } = i;
    return { ...resto, client_id: p.destino };
  });
  if (p.configDestino) await saveSettings(p.configDestino);
  if (IS_DEMO) {
    linhas.forEach((l) => demoIdeias.push({ ...l, id: crypto.randomUUID(), created_at: new Date().toISOString() }));
    return linhas.length;
  }
  if (linhas.length) {
    const { error } = await tbl('story_ideas').insert(linhas);
    if (error) throw error;
  }
  return linhas.length;
}

export function useDuplicarConjunto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: copiarConjunto,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.todas });
      void qc.invalidateQueries({ queryKey: keys.settings });
    },
  });
}
