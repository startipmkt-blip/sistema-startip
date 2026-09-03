import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';

interface Props { clienteId: string; }

async function fetchSlug(clienteId: string): Promise<string | null> {
  const { data } = await supabase
    .from('clientes')
    .select('central_slug')
    .eq('id', clienteId)
    .maybeSingle();
  return (data as { central_slug: string | null } | null)?.central_slug ?? null;
}

export function CentralLinkCard({ clienteId }: Props) {
  const qc = useQueryClient();
  const [copiado, setCopiado] = useState(false);
  const { data: slug } = useQuery({
    queryKey: ['cliente-slug', clienteId],
    queryFn: () => fetchSlug(clienteId),
  });

  const gerar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('_gerar_central_slug');
      if (error) throw error;
      const novoSlug = data as string;
      const { error: uErr } = await supabase
        .from('clientes')
        .update({ central_slug: novoSlug } as never)
        .eq('id', clienteId);
      if (uErr) throw uErr;
      return novoSlug;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cliente-slug', clienteId] }),
  });

  const revogar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('clientes')
        .update({ central_slug: null } as never)
        .eq('id', clienteId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cliente-slug', clienteId] }),
  });

  const url = slug ? `${window.location.origin}/central/${slug}` : null;

  async function copiar() {
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => { /* clipboard bloqueado */ });
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <Card className="p-5">
      <h3 className="mb-2 text-sm font-semibold text-slate-200">Central do Cliente</h3>
      <p className="mb-3 text-xs text-slate-400">
        Link público que o cliente abre pra ver saúde, contratos e serviços da conta dele.
      </p>
      {url ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-xs text-brand-200">{url}</code>
            <button
              onClick={copiar}
              className="rounded-md px-2 text-xs text-slate-300 hover:bg-white/10"
              title="Copiar"
            >
              {copiado ? '✓' : '📋'}
            </button>
          </div>
          <div className="flex justify-between gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
            >
              Abrir
            </a>
            <button
              onClick={() => { if (confirm('Revogar link? A URL atual deixa de funcionar.')) revogar.mutate(); }}
              className="rounded-md px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
            >
              Revogar
            </button>
          </div>
        </div>
      ) : (
        <Button onClick={() => gerar.mutate()} disabled={gerar.isPending}>
          {gerar.isPending ? 'Gerando…' : '🔗 Gerar link exclusivo'}
        </Button>
      )}
    </Card>
  );
}
