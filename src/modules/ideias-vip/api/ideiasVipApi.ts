import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { BatchStatus, Idea, IdeaBatch, IdeaClientState, IdeaDraft, IdeaState } from '@/modules/ideias-vip/types';

// Tabelas novas ainda não estão no tipo Database gerado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (nome: string) => (supabase.from as any)(nome);

const K = {
  todos: ['ideias-vip'] as const,
  lotes: (clientId: string) => ['ideias-vip', 'lotes', clientId] as const,
  ideias: (batchId: string) => ['ideias-vip', 'ideias', batchId] as const,
  contagem: (clientId: string) => ['ideias-vip', 'contagem', clientId] as const,
  portal: (clientId: string) => ['ideias-vip', 'portal', clientId] as const,
};

// ---- Modo demonstração: tudo em memória ----
const demoLotes: IdeaBatch[] = [];
const demoIdeias: Idea[] = [];
const demoEstados: IdeaClientState[] = [];
const agora = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

// ---- Lotes (equipe) ----
export function useLotes(clientId: string) {
  return useQuery({
    queryKey: K.lotes(clientId),
    enabled: Boolean(clientId),
    queryFn: async (): Promise<IdeaBatch[]> => {
      if (IS_DEMO) return demoLotes.filter((l) => l.client_id === clientId).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const { data, error } = await tbl('idea_batches').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IdeaBatch[];
    },
  });
}

export interface ResumoLote { total: number; usadas: number; pendentes: number }

// Totais por lote: ideias, usadas pelo cliente e ideias com campo entre colchetes.
export function useResumoLotes(clientId: string) {
  return useQuery({
    queryKey: K.contagem(clientId),
    enabled: Boolean(clientId),
    queryFn: async (): Promise<Record<string, ResumoLote>> => {
      const ideias: Idea[] = IS_DEMO
        ? demoIdeias.filter((i) => i.client_id === clientId)
        : ((await tbl('ideas').select('id,batch_id,body').eq('client_id', clientId)).data ?? []);
      const estados: IdeaClientState[] = IS_DEMO
        ? demoEstados.filter((e) => e.client_id === clientId)
        : ((await tbl('idea_client_state').select('idea_id,status').eq('client_id', clientId)).data ?? []);
      const usadas = new Set(estados.filter((e) => e.status === 'usada').map((e) => e.idea_id));
      const out: Record<string, ResumoLote> = {};
      ideias.forEach((i) => {
        const r = (out[i.batch_id] ??= { total: 0, usadas: 0, pendentes: 0 });
        r.total += 1;
        if (usadas.has(i.id)) r.usadas += 1;
        if (/\[[^\]]+\]/.test(i.body)) r.pendentes += 1;
      });
      return out;
    },
  });
}

// O que o cliente marcou em cada ideia (feita, salva, quantas vezes copiou), para a equipe acompanhar.
export function useEstadosDoCliente(clientId: string) {
  return useQuery({
    queryKey: [...K.todos, 'estados', clientId] as const,
    enabled: Boolean(clientId),
    queryFn: async (): Promise<Map<string, IdeaClientState>> => {
      const lista: IdeaClientState[] = IS_DEMO
        ? demoEstados.filter((e) => e.client_id === clientId)
        : ((await tbl('idea_client_state').select('*').eq('client_id', clientId)).data ?? []);
      return new Map(lista.map((e) => [e.idea_id, e]));
    },
  });
}

export function useIdeiasDoLote(batchId: string | null) {
  return useQuery({
    queryKey: K.ideias(batchId ?? ''),
    enabled: Boolean(batchId),
    queryFn: async (): Promise<Idea[]> => {
      if (IS_DEMO) return demoIdeias.filter((i) => i.batch_id === batchId).sort((a, b) => a.position - b.position);
      const { data, error } = await tbl('ideas').select('*').eq('batch_id', batchId).order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Idea[];
    },
  });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: K.todos });
}

export function useCriarLote() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: async (p: { clientId: string; title: string; referenceMonth: string | null; ideias: IdeaDraft[] }): Promise<string> => {
      const lote: IdeaBatch = {
        id: uid(), client_id: p.clientId, title: p.title, reference_month: p.referenceMonth,
        status: 'rascunho', created_by: null, created_at: agora(),
      };
      const linhas = p.ideias.map((d, n): Idea => ({
        ...d, id: uid(), batch_id: lote.id, client_id: p.clientId, channel: 'grupo_vip_whatsapp',
        position: n, source: 'startip', created_at: agora(), updated_at: agora(),
      }));
      if (IS_DEMO) { demoLotes.push(lote); demoIdeias.push(...linhas); return lote.id; }
      const { data, error } = await tbl('idea_batches')
        .insert({ client_id: p.clientId, title: p.title, reference_month: p.referenceMonth, status: 'rascunho' })
        .select('id').single();
      if (error) throw error;
      if (linhas.length) {
        const { error: e2 } = await tbl('ideas').insert(linhas.map((l) => ({
          batch_id: data.id, client_id: p.clientId, type: l.type, title: l.title, body: l.body,
          media_suggestion: l.media_suggestion, theme: l.theme, suggested_date: l.suggested_date,
          suggested_time: l.suggested_time, position: l.position,
        })));
        if (e2) throw e2;
      }
      return data.id as string;
    },
    onSuccess: inv,
  });
}

export function useAtualizarLote() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: async (p: { id: string; status?: BatchStatus; title?: string; referenceMonth?: string | null }) => {
      const patch: Record<string, unknown> = {};
      if (p.status) patch.status = p.status;
      if (p.title !== undefined) patch.title = p.title;
      if (p.referenceMonth !== undefined) patch.reference_month = p.referenceMonth;
      if (IS_DEMO) { Object.assign(demoLotes.find((l) => l.id === p.id) ?? {}, patch); return; }
      const { error } = await tbl('idea_batches').update(patch).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useExcluirLote() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) {
        const i = demoLotes.findIndex((l) => l.id === id);
        if (i >= 0) demoLotes.splice(i, 1);
        for (let n = demoIdeias.length - 1; n >= 0; n--) if (demoIdeias[n].batch_id === id) demoIdeias.splice(n, 1);
        return;
      }
      const { error } = await tbl('idea_batches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

// Copia o lote (sempre como rascunho) para outros clientes.
export function useDuplicarLote() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: async (p: { lote: IdeaBatch; ideias: Idea[]; clientIds: string[] }) => {
      for (const cid of p.clientIds) {
        const draft: IdeaDraft[] = p.ideias.map((i) => ({
          type: i.type, title: i.title, body: i.body, media_suggestion: i.media_suggestion,
          theme: i.theme, suggested_date: i.suggested_date, suggested_time: i.suggested_time,
        }));
        const lote: IdeaBatch = { id: uid(), client_id: cid, title: p.lote.title, reference_month: p.lote.reference_month, status: 'rascunho', created_by: null, created_at: agora() };
        if (IS_DEMO) {
          demoLotes.push(lote);
          draft.forEach((d, n) => demoIdeias.push({ ...d, id: uid(), batch_id: lote.id, client_id: cid, channel: 'grupo_vip_whatsapp', position: n, source: 'startip', created_at: agora(), updated_at: agora() }));
          continue;
        }
        const { data, error } = await tbl('idea_batches')
          .insert({ client_id: cid, title: p.lote.title, reference_month: p.lote.reference_month, status: 'rascunho' })
          .select('id').single();
        if (error) throw error;
        if (draft.length) {
          const { error: e2 } = await tbl('ideas').insert(draft.map((d, n) => ({ ...d, batch_id: data.id, client_id: cid, position: n })));
          if (e2) throw e2;
        }
      }
    },
    onSuccess: inv,
  });
}

// ---- Ideias (equipe) ----
export function useSalvarIdeia() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: async (p: { id?: string; batchId: string; clientId: string; dados: IdeaDraft; position?: number }) => {
      if (IS_DEMO) {
        if (p.id) Object.assign(demoIdeias.find((i) => i.id === p.id) ?? {}, p.dados, { updated_at: agora() });
        else {
          const pos = Math.max(-1, ...demoIdeias.filter((i) => i.batch_id === p.batchId).map((i) => i.position)) + 1;
          demoIdeias.push({ ...p.dados, id: uid(), batch_id: p.batchId, client_id: p.clientId, channel: 'grupo_vip_whatsapp', position: pos, source: 'startip', created_at: agora(), updated_at: agora() });
        }
        return;
      }
      if (p.id) {
        const { error } = await tbl('ideas').update({ ...p.dados, updated_at: agora() }).eq('id', p.id);
        if (error) throw error;
      } else {
        const { data } = await tbl('ideas').select('position').eq('batch_id', p.batchId).order('position', { ascending: false }).limit(1);
        const pos = ((data?.[0]?.position as number | undefined) ?? -1) + 1;
        const { error } = await tbl('ideas').insert({ ...p.dados, batch_id: p.batchId, client_id: p.clientId, position: pos });
        if (error) throw error;
      }
    },
    onSuccess: inv,
  });
}

export function useExcluirIdeia() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) {
        const i = demoIdeias.findIndex((x) => x.id === id);
        if (i >= 0) demoIdeias.splice(i, 1);
        return;
      }
      const { error } = await tbl('ideas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

// Troca a ordem de duas ideias vizinhas.
export function useReordenar() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: async (p: { a: Idea; b: Idea }) => {
      if (IS_DEMO) {
        const x = demoIdeias.find((i) => i.id === p.a.id); const y = demoIdeias.find((i) => i.id === p.b.id);
        if (x && y) [x.position, y.position] = [y.position, x.position];
        return;
      }
      const r1 = await tbl('ideas').update({ position: p.b.position }).eq('id', p.a.id);
      const r2 = await tbl('ideas').update({ position: p.a.position }).eq('id', p.b.id);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
    },
    onSuccess: inv,
  });
}

// ---- Cliente (portal) ----
export interface DadosPortal { lotes: IdeaBatch[]; ideias: Idea[]; estados: IdeaClientState[] }

export function useDadosPortal(clientId: string) {
  return useQuery({
    queryKey: K.portal(clientId),
    enabled: Boolean(clientId),
    queryFn: async (): Promise<DadosPortal> => {
      if (IS_DEMO) {
        const lotes = demoLotes.filter((l) => l.client_id === clientId && l.status === 'publicado');
        const ids = new Set(lotes.map((l) => l.id));
        return {
          lotes: lotes.sort((a, b) => (b.reference_month ?? '').localeCompare(a.reference_month ?? '') || b.created_at.localeCompare(a.created_at)),
          ideias: demoIdeias.filter((i) => ids.has(i.batch_id)).sort((a, b) => a.position - b.position),
          estados: demoEstados.filter((e) => e.client_id === clientId),
        };
      }
      const [l, i, e] = await Promise.all([
        tbl('idea_batches').select('*').eq('client_id', clientId).eq('status', 'publicado'),
        tbl('ideas').select('*').eq('client_id', clientId).order('position', { ascending: true }),
        tbl('idea_client_state').select('*').eq('client_id', clientId),
      ]);
      if (l.error) throw l.error;
      if (i.error) throw i.error;
      if (e.error) throw e.error;
      const lotes = ((l.data ?? []) as IdeaBatch[]).sort((a, b) => (b.reference_month ?? '').localeCompare(a.reference_month ?? '') || b.created_at.localeCompare(a.created_at));
      return { lotes, ideias: (i.data ?? []) as Idea[], estados: (e.data ?? []) as IdeaClientState[] };
    },
  });
}

export function useMarcarIdeia(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { ideaId: string; status?: IdeaState; copiou?: boolean; atual?: IdeaClientState }) => {
      const status = p.status ?? p.atual?.status ?? 'nova';
      const copied = (p.atual?.copied_count ?? 0) + (p.copiou ? 1 : 0);
      if (IS_DEMO) {
        const ex = demoEstados.find((e) => e.idea_id === p.ideaId && e.client_id === clientId);
        if (ex) Object.assign(ex, { status, copied_count: copied, updated_at: agora() });
        else demoEstados.push({ id: uid(), idea_id: p.ideaId, client_id: clientId, status, copied_count: copied, updated_at: agora() });
        return;
      }
      const { error } = await tbl('idea_client_state').upsert(
        { idea_id: p.ideaId, client_id: clientId, status, copied_count: copied, updated_at: agora() },
        { onConflict: 'idea_id,client_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: K.todos }),
  });
}
