import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-publico`;

export interface OnboardingLink {
  id: string;
  slug: string;
  cliente_id: string | null;
  criado_em: string;
  expira_em: string | null;
  preenchido_em: string | null;
  status: 'pendente' | 'preenchido' | 'revisado' | 'arquivado';
  observacoes: string | null;
  dados: Record<string, unknown>;
}

const keys = { all: ['onboarding-links'] as const, lista: ['onboarding-links', 'lista'] as const };

async function fetchLinks(): Promise<OnboardingLink[]> {
  if (IS_DEMO) return [];
  const { data, error } = await supabase
    .from('onboarding_forms')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as OnboardingLink[];
}
export function useOnboardingLinks() {
  return useQuery({ queryKey: keys.lista, queryFn: fetchLinks });
}

function slugAleatorio(): string {
  // 6 blocos base32 sem 0/O/1/I para colar bonito em URL.
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => abc[n % abc.length]).join('');
}

export function useCriarLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { clienteId?: string | null; expiraDias?: number | null }) => {
      const slug = slugAleatorio().toLowerCase();
      const expira = p.expiraDias
        ? new Date(Date.now() + p.expiraDias * 86400_000).toISOString()
        : null;
      const { data, error } = await supabase
        .from('onboarding_forms')
        .insert({ slug, cliente_id: p.clienteId ?? null, expira_em: expira } as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as OnboardingLink;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useMudarStatusLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; status: OnboardingLink['status'] }) => {
      const { error } = await supabase
        .from('onboarding_forms')
        .update({ status: p.status } as never)
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

// ------------- API PÚBLICA (usa a Edge Function, não o supabase-js) --------
export async function carregarFormularioPublico(slug: string): Promise<{
  ok: true;
  slug: string;
  status: string;
  preenchido: boolean;
  dados: Record<string, unknown>;
} | { ok: false; error: string; status: number }> {
  const r = await fetch(`${FN_URL}?slug=${encodeURIComponent(slug)}`);
  const body = await r.json().catch(() => ({}));
  if (r.ok) return { ok: true, ...body };
  return { ok: false, error: body?.error ?? 'erro', status: r.status };
}

export async function enviarFormularioPublico(
  slug: string,
  dados: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug, dados }),
  });
  const body = await r.json().catch(() => ({}));
  if (r.ok) return { ok: true };
  return { ok: false, error: body?.error ?? 'erro' };
}
