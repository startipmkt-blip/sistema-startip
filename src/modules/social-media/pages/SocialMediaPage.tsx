import { useMemo, useState } from 'react';
import { useProgressoMensal, useSalvarMetaMensal, type ProgressoMensal } from '@/modules/producao/api/producaoApi';
import { useProfilesEquipe } from '@/modules/social-media/api/socialMediaApi';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Badge } from '@/shared/ui/Badge';
import { StatCard } from '@/shared/ui/StatCard';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

interface AtribMensal {
  cliente_id: string;
  meta_video: number;
  meta_post: number;
  videomaker_id: string | null;
  webdesigner_id: string | null;
}

export function SocialMediaPage() {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const { data: progresso, isLoading } = useProgressoMensal();
  const clientesQ = useClientes('');
  const equipeQ = useProfilesEquipe();
  const salvar = useSalvarMetaMensal();

  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const nomes = useMemo(() => {
    const m = new Map<string, string>();
    (clientesQ.data ?? []).forEach((c) => m.set(c.id, c.nome));
    return m;
  }, [clientesQ.data]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (progresso ?? []).filter((p) => !q || p.nome.toLowerCase().includes(q));
  }, [progresso, busca]);

  const atual = useMemo(
    () => filtradas.find((p) => p.cliente_id === selecionado) ?? filtradas[0] ?? null,
    [filtradas, selecionado],
  );

  const kpisTotais = useMemo(() => {
    const p = progresso ?? [];
    return {
      empresas: p.length,
      posts_meta: p.reduce((s, x) => s + x.meta_post, 0),
      posts_ent:  p.reduce((s, x) => s + x.posts_entregues, 0),
      videos_meta: p.reduce((s, x) => s + x.meta_video, 0),
      videos_ent:  p.reduce((s, x) => s + x.videos_entregues, 0),
    };
  }, [progresso]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-white">📱 Social Media</h1>
        <div className="ml-auto flex items-center gap-2">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}
                  className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}</option>
            ))}
          </select>
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}
                  className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]">
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Empresas" value={String(kpisTotais.empresas)} tone="slate" />
        <StatCard label="Posts / meta" value={`${kpisTotais.posts_ent}/${kpisTotais.posts_meta}`} tone="blue" />
        <StatCard label="Vídeos / meta" value={`${kpisTotais.videos_ent}/${kpisTotais.videos_meta}`} tone="green" />
        <StatCard label="Falta posts" value={String(Math.max(0, kpisTotais.posts_meta - kpisTotais.posts_ent))} tone="amber" />
        <StatCard label="Falta vídeos" value={String(Math.max(0, kpisTotais.videos_meta - kpisTotais.videos_ent))} tone="amber" />
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Sidebar empresas */}
        <aside className="flex w-72 shrink-0 flex-col rounded-md border border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/5 p-2">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar empresa…"
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
            />
          </div>
          <ul className="flex-1 overflow-y-auto">
            {isLoading && <div className="p-4"><Spinner /></div>}
            {filtradas.map((p) => (
              <li key={p.cliente_id}>
                <button
                  onClick={() => setSelecionado(p.cliente_id)}
                  className={`w-full border-b border-white/5 p-2 text-left ${atual?.cliente_id === p.cliente_id ? 'bg-brand-500/10' : 'hover:bg-white/5'}`}
                >
                  <div className="mb-1 text-sm font-medium text-slate-100">{p.nome}</div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <Badge tone={p.posts_entregues >= p.meta_post ? 'green' : 'amber'}>
                      🎨 {p.posts_entregues}/{p.meta_post}
                    </Badge>
                    <Badge tone={p.videos_entregues >= p.meta_video ? 'green' : 'amber'}>
                      🎬 {p.videos_entregues}/{p.meta_video}
                    </Badge>
                  </div>
                </button>
              </li>
            ))}
            {filtradas.length === 0 && !isLoading && (
              <li className="p-4 text-center text-xs text-slate-500">Nenhuma empresa nesse filtro.</li>
            )}
          </ul>
        </aside>

        {/* Detalhe */}
        <div className="min-w-0 flex-1">
          {!atual ? (
            <EmptyState message="Selecione uma empresa à esquerda." />
          ) : (
            <DetalheEmpresa
              cliente_id={atual.cliente_id}
              nome={nomes.get(atual.cliente_id) ?? atual.nome}
              progresso={atual}
              ano={ano}
              mes={mes}
              equipe={equipeQ.data ?? []}
              onSalvarMeta={async (dados) => salvar.mutateAsync({ cliente_id: atual.cliente_id, ano, mes, ...dados })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------
function DetalheEmpresa(props: {
  cliente_id: string;
  nome: string;
  progresso: ProgressoMensal;
  ano: number;
  mes: number;
  equipe: { id: string; nome: string }[];
  onSalvarMeta: (dados: Partial<AtribMensal>) => Promise<void>;
}) {
  const { nome, progresso, equipe, onSalvarMeta } = props;
  const [editando, setEditando] = useState(false);
  const [metaVideo, setMetaVideo] = useState(String(progresso.meta_video));
  const [metaPost,  setMetaPost]  = useState(String(progresso.meta_post));
  const [videomakerId,  setVideomakerId]  = useState<string>('');
  const [webdesignerId, setWebdesignerId] = useState<string>('');

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-100">{nome}</h2>
        <span className="text-xs text-slate-400">
          {new Date(props.ano, props.mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <Button variant="secondary" className="ml-auto" onClick={() => setEditando((v) => !v)}>
          {editando ? 'Fechar' : '✎ Editar metas'}
        </Button>
      </div>

      {editando && (
        <Card className="mb-3 p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Metas do mês</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input id="mv" label="Meta de vídeos" type="number" value={metaVideo} onChange={(e) => setMetaVideo(e.target.value)} />
            <Input id="mp" label="Meta de posts"  type="number" value={metaPost}  onChange={(e) => setMetaPost(e.target.value)} />
            <label className="text-xs text-slate-300">
              Videomaker do mês
              <select value={videomakerId} onChange={(e) => setVideomakerId(e.target.value)}
                      className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]">
                <option value="">— não atribuído —</option>
                {equipe.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Webdesigner do mês
              <select value={webdesignerId} onChange={(e) => setWebdesignerId(e.target.value)}
                      className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]">
                <option value="">— não atribuído —</option>
                {equipe.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={async () => {
                await onSalvarMeta({
                  meta_video: Number(metaVideo || 0),
                  meta_post: Number(metaPost || 0),
                  videomaker_id: videomakerId || null,
                  webdesigner_id: webdesignerId || null,
                });
                setEditando(false);
              }}
            >
              Salvar metas
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">🎨 Posts</h3>
          <div className="text-3xl font-semibold text-slate-100">
            {progresso.posts_entregues}<span className="text-sm text-slate-500"> / {progresso.meta_post}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (progresso.posts_entregues / Math.max(1, progresso.meta_post)) * 100)}%` }} />
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Em andamento: {Math.max(0, progresso.posts_feitos - progresso.posts_entregues)} · Faltam: {progresso.faltam_posts}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">🎬 Vídeos</h3>
          <div className="text-3xl font-semibold text-slate-100">
            {progresso.videos_entregues}<span className="text-sm text-slate-500"> / {progresso.meta_video}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (progresso.videos_entregues / Math.max(1, progresso.meta_video)) * 100)}%` }} />
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Em andamento: {Math.max(0, progresso.videos_feitos - progresso.videos_entregues)} · Faltam: {progresso.faltam_videos}
          </div>
        </Card>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        As tarefas em si são gerenciadas em <a href="/webdesigner" className="text-brand-300 hover:underline">🎨 Webdesigner</a>
        {' '}e <a href="/video-maker" className="text-brand-300 hover:underline">🎬 Video Maker</a>. Aqui é o painel consolidado por empresa.
      </p>
    </Card>
  );
}
