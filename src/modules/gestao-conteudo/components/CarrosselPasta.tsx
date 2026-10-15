import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';

export interface ArquivoPasta { id: string; nome: string }

export function useArquivosPasta(pastaId: string | undefined) {
  return useQuery({
    queryKey: ['drive-pasta', pastaId],
    enabled: !!pastaId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ArquivoPasta[]> => {
      const { data, error } = await supabase.functions.invoke('drive-pasta', { body: { id: pastaId } });
      if (error) throw error;
      return ((data as { arquivos?: ArquivoPasta[] })?.arquivos ?? []);
    },
  });
}

export const miniaturaDrive = (id: string, largura = 1000) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w${largura}`;

/** Imagens da pasta uma abaixo da outra, na ordem do nome; cai para a grade do Drive se não listar. */
export function CarrosselPasta({ pastaId, titulo }: { pastaId: string; titulo: string }) {
  const q = useArquivosPasta(pastaId);
  const arquivos = q.data ?? [];

  if (q.isLoading) return <p className="py-10 text-center text-sm text-slate-400">Carregando imagens…</p>;

  if (arquivos.length === 0) {
    return (
      <iframe
        src={`https://drive.google.com/embeddedfolderview?id=${pastaId}#grid`}
        title={titulo}
        className="h-[65vh] w-full rounded-xl border border-white/10 bg-black"
      />
    );
  }

  return (
    <div className="max-h-[65vh] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-3">
      <p className="text-[11px] text-slate-400">{arquivos.length} imagem(ns) do carrossel</p>
      {arquivos.map((a, i) => (
        <div key={a.id} className="space-y-1">
          <span className="text-[11px] text-slate-500">{i + 1}/{arquivos.length}</span>
          <img
            src={miniaturaDrive(a.id)}
            alt={`${titulo} — imagem ${i + 1}`}
            loading="lazy"
            className="mx-auto max-h-[60vh] w-auto max-w-full rounded-lg"
          />
        </div>
      ))}
    </div>
  );
}
