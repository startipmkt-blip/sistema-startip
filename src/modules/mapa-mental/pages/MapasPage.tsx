import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { confirmar } from '@/shared/ui/ConfirmDialog';
import { formatDate } from '@/shared/lib/format';
import { mapaInicial, mapas, type MapaMental } from '../types';

/** Lista de mapas mentais da agência (processos, campanhas, funis). */
export function MapasPage() {
  const navigate = useNavigate();
  const lista = mapas.useLista();
  const salvar = mapas.useSalvar();
  const excluir = mapas.useExcluir();

  async function criar(base?: MapaMental) {
    const novo = await salvar.mutateAsync({
      dados: base
        ? { titulo: `${base.titulo} (cópia)`, cliente_id: base.cliente_id, dados: base.dados }
        : { titulo: 'Novo Mapa Mental', cliente_id: null, dados: mapaInicial() },
    });
    navigate(`/mapa-mental/${novo.id}`);
  }

  const itens = lista.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Mapa Mental" subtitle="Organize processos, campanhas e ideias de forma visual.">
        <Button onClick={() => void criar()} disabled={salvar.isPending}><GlassIcon name="plus" className="h-4 w-4" /> Novo mapa</Button>
      </PageHeader>

      {lista.isLoading ? (
        <Card className="flex justify-center p-12"><Spinner /></Card>
      ) : lista.error ? (
        <Card className="p-4 text-sm text-red-300">Erro ao carregar: {(lista.error as Error).message}. Se citar "mapas_mentais", aplique a migration 0091.</Card>
      ) : itens.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="chip-icone h-12 w-12 bg-brand-500/10"><GlassIcon name="mindmap" tone="brand" className="h-6 w-6" /></span>
          <div className="mt-1 text-sm font-semibold text-slate-100">Nenhum mapa mental ainda</div>
          <p className="text-xs text-slate-400">Crie um mapa para desenhar um processo, uma campanha ou o funil de um cliente.</p>
          <Button size="sm" className="mt-2" onClick={() => void criar()}><GlassIcon name="plus" className="h-4 w-4" /> Criar o primeiro mapa</Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {itens.map((m) => {
            const nos = m.dados?.nos?.length ?? 0;
            const raiz = m.dados?.nos?.find((n) => n.pai === null);
            return (
              <Card key={m.id} className="group flex flex-col p-0 transition-colors hover:border-brand-400">
                <button onClick={() => navigate(`/mapa-mental/${m.id}`)} className="flex flex-1 flex-col gap-3 p-5 text-left">
                  <span className="chip-icone h-10 w-10 bg-brand-500/10"><GlassIcon name="mindmap" tone="brand" className="h-5 w-5" /></span>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-100">{m.titulo}</h3>
                    {raiz && raiz.texto !== m.titulo && <p className="truncate text-xs text-slate-400">{raiz.texto}</p>}
                  </div>
                  <div className="mt-auto text-xs text-slate-400">{nos} {nos === 1 ? 'nó' : 'nós'} · atualizado {formatDate(m.updated_at ?? m.created_at)}</div>
                </button>
                <div className="flex items-center justify-end gap-1 border-t border-white/[0.08] px-3 py-2">
                  <button onClick={() => void criar(m)} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10">Duplicar</button>
                  <button
                    onClick={async () => { if (await confirmar(`Excluir o mapa "${m.titulo}"?`)) excluir.mutate(m.id); }}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                  >
                    Excluir
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
