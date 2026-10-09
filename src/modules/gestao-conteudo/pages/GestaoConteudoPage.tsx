import { useMemo, useState } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Input } from '@/shared/ui/Input';
import { Spinner } from '@/shared/ui/Spinner';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import type { Cliente } from '@/modules/clientes/types';
import {
  linkAprovacao, useEnviarParaAprovacao, useExcluirPost, useMudarEtapa,
  usePostsDoMes, useSalvarMeta,
} from '@/modules/gestao-conteudo/api/gestaoApi';
import {
  ETAPAS, ETAPA_INFO, deslocarMes, driveInfo, mesAtualRef, mesLabel,
  type Etapa, type Post,
} from '@/modules/gestao-conteudo/types';
import { PostFormModal } from '@/modules/gestao-conteudo/components/PostFormModal';
import { PreviaDrive } from '@/modules/gestao-conteudo/components/PreviaDrive';

// Campos novos de cliente ainda fora do tipo gerado.
type ClienteGestao = Cliente & { posts_por_mes?: number };

const COR_ETAPA: Record<Etapa, string> = {
  em_edicao: 'bg-slate-500', editado: 'bg-sky-500', enviado: 'bg-amber-500',
  reprovado: 'bg-red-500', aprovado: 'bg-emerald-500', programado: 'bg-indigo-500',
  publicado: 'bg-emerald-300',
};

const DIA_MS = 24 * 60 * 60 * 1000;

function contar(posts: Post[]): Record<Etapa, number> {
  const base = Object.fromEntries(ETAPAS.map((e) => [e.id, 0])) as Record<Etapa, number>;
  for (const p of posts) base[p.etapa] += 1;
  return base;
}

function alertasDoCliente(c: ClienteGestao, posts: Post[], mesAtual: boolean): string[] {
  const out: string[] = [];
  const porMes = c.posts_por_mes ?? 0;
  const porSemana = c.conteudos_por_semana ?? 0;
  if (porMes > 0 && posts.length < porMes) out.push(`Faltam ${porMes - posts.length} post(s) para a meta do mês`);
  const reprovados = posts.filter((p) => p.etapa === 'reprovado').length;
  if (reprovados) out.push(`${reprovados} reprovado(s) aguardando ajuste`);
  const antigos = posts.filter(
    (p) => p.etapa === 'enviado' && p.enviado_em && Date.now() - new Date(p.enviado_em).getTime() > 2 * DIA_MS,
  ).length;
  if (antigos) out.push(`${antigos} aguardando o cliente há +2 dias`);
  if (mesAtual && porSemana > 0) {
    const semanaHoje = Math.min(4, Math.ceil(new Date().getDate() / 7));
    const daSemana = posts.filter((p) => p.semana === semanaHoje).length;
    if (daSemana < porSemana) out.push(`Semana ${semanaHoje}: ${daSemana}/${porSemana} posts`);
  }
  return out;
}

export function GestaoConteudoPage() {
  const [mes, setMes] = useState(mesAtualRef());
  const [clienteId, setClienteId] = useState<string | null>(null);

  const clientesQ = useClientes('');
  const postsQ = usePostsDoMes(mes);

  const clientes = useMemo(
    () => ((clientesQ.data ?? []) as ClienteGestao[])
      .filter((c) => c.status === 'ativo' && (c.servicos ?? []).includes('social_midia'))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [clientesQ.data],
  );
  const posts = postsQ.data ?? [];
  const cliente = clientes.find((c) => c.id === clienteId) ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="🗂️ Gestão de Conteúdo"
        subtitle="Acompanhe, por cliente e por mês, o que está em edição, em aprovação, aprovado e programado."
      >
        <div className="flex items-center gap-1">
          <Button variant="secondary" onClick={() => setMes(deslocarMes(mes, -1))}>←</Button>
          <span className="min-w-[10rem] text-center text-sm font-medium capitalize text-slate-100">{mesLabel(mes)}</span>
          <Button variant="secondary" onClick={() => setMes(deslocarMes(mes, 1))}>→</Button>
        </div>
      </PageHeader>

      {(clientesQ.isLoading || postsQ.isLoading) && <div className="flex justify-center py-16"><Spinner /></div>}
      {postsQ.error && (
        <Card className="p-4 text-sm text-red-300">Erro ao carregar: {(postsQ.error as Error).message}</Card>
      )}

      {!clientesQ.isLoading && !postsQ.isLoading && !cliente && (
        <VisaoGeral
          clientes={clientes} posts={posts} mes={mes}
          mesAtual={mes === mesAtualRef()} onAbrir={setClienteId}
        />
      )}

      {cliente && (
        <DetalheCliente
          key={cliente.id + mes}
          cliente={cliente}
          mes={mes}
          posts={posts.filter((p) => p.cliente_id === cliente.id)}
          onVoltar={() => setClienteId(null)}
        />
      )}
    </div>
  );
}

// ------------------------------------------------ Visão geral
function VisaoGeral({
  clientes, posts, mes, mesAtual, onAbrir,
}: {
  clientes: ClienteGestao[]; posts: Post[]; mes: string; mesAtual: boolean;
  onAbrir: (id: string) => void;
}) {
  const totais = contar(posts.filter((p) => clientes.some((c) => c.id === p.cliente_id)));

  if (clientes.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-slate-400">
        Nenhum cliente ativo com o serviço <strong>Social mídia</strong>. Marque o serviço no
        cadastro do cliente para ele aparecer aqui.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {ETAPAS.map((e) => (
          <Card key={e.id} className="p-3">
            <div className="text-[11px] text-slate-400">{e.emoji} {e.label}</div>
            <div className="mt-1 text-2xl font-semibold text-white">{totais[e.id]}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {clientes.map((c) => {
          const meus = posts.filter((p) => p.cliente_id === c.id);
          const n = contar(meus);
          const meta = c.posts_por_mes ?? 0;
          const alertas = alertasDoCliente(c, meus, mesAtual);
          const base = Math.max(meus.length, meta, 1);
          return (
            <Card
              key={c.id}
              className="cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/40"
              onClick={() => onAbrir(c.id)}
            >
              <div className="flex items-center gap-3">
                {c.logo_url
                  ? <img src={c.logo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  : <span className="grid h-9 w-9 place-items-center rounded-full bg-white/5">🏢</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">{c.nome}</p>
                  <p className="text-[11px] text-slate-400">
                    {meus.length}{meta > 0 ? ` / ${meta}` : ''} posts no mês
                    {c.conteudos_por_semana > 0 && ` · meta ${c.conteudos_por_semana}/semana`}
                  </p>
                </div>
                {alertas.length === 0 && meus.length > 0 && <Badge tone="green">Em dia</Badge>}
              </div>

              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/5" title={`Pipeline de ${mes}`}>
                {ETAPAS.map((e) => n[e.id] > 0 && (
                  <div key={e.id} className={COR_ETAPA[e.id]} style={{ width: `${(n[e.id] / base) * 100}%` }} />
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {ETAPAS.filter((e) => n[e.id] > 0).map((e) => (
                  <Badge key={e.id} tone={e.tone}>{e.emoji} {n[e.id]} {e.label.toLowerCase()}</Badge>
                ))}
              </div>

              {alertas.length > 0 && (
                <ul className="mt-3 space-y-0.5 text-[11px] text-amber-300">
                  {alertas.map((a) => <li key={a}>⚠ {a}</li>)}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------ Detalhe do cliente
function DetalheCliente({
  cliente, mes, posts, onVoltar,
}: { cliente: ClienteGestao; mes: string; posts: Post[]; onVoltar: () => void }) {
  const mudarEtapa = useMudarEtapa();
  const excluir = useExcluirPost();
  const enviar = useEnviarParaAprovacao();
  const salvarMeta = useSalvarMeta();

  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Post | undefined>();
  const [semanaNova, setSemanaNova] = useState(1);
  const [previa, setPrevia] = useState<Post | null>(null);
  const [porSemana, setPorSemana] = useState(String(cliente.conteudos_por_semana ?? 0));
  const [porMes, setPorMes] = useState(String(cliente.posts_por_mes ?? 0));
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const n = contar(posts);
  const link = cliente.central_slug ? linkAprovacao(cliente.central_slug, mes) : null;
  const semMeta = Number(porMes) > 0 ? Number(porMes) : 0;

  function alternar(id: string) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function enviarSelecionados() {
    const escolhidos = posts.filter((p) => selecionados.includes(p.id));
    const semArquivo = escolhidos.filter((p) => driveInfo(p.link_drive).tipo !== 'arquivo').length;
    const extra = semArquivo
      ? `\n\n⚠ ${semArquivo} conteúdo(s) sem link do Drive válido (o cliente não verá a prévia).`
      : '';
    if (!confirm(
      `Enviar ${escolhidos.length} conteúdo(s) para aprovação no WhatsApp de ${cliente.nome}?${extra}`,
    )) return;
    setAviso(null);
    enviar.mutate(
      {
        clienteId: cliente.id, clienteNome: cliente.nome, slug: cliente.central_slug,
        mes, ids: selecionados,
      },
      {
        onSuccess: () => {
          setSelecionados([]);
          setAviso({ tipo: 'ok', texto: 'Enviado! O cliente recebeu o link de aprovação no WhatsApp.' });
        },
        onError: (e) => setAviso({ tipo: 'erro', texto: (e as Error).message }),
      },
    );
  }

  function copiarLink() {
    if (!link) return;
    void navigator.clipboard.writeText(link);
    setAviso({ tipo: 'ok', texto: 'Link de aprovação copiado.' });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={onVoltar}>← Todos os clientes</Button>
        <h2 className="text-lg font-semibold text-white">{cliente.nome}</h2>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copiarLink} disabled={!link}>🔗 Copiar link</Button>
          <Button
            onClick={enviarSelecionados}
            disabled={selecionados.length === 0 || enviar.isPending || !cliente.whatsapp_chat_id}
            title={!cliente.whatsapp_chat_id ? 'Cliente sem WhatsApp cadastrado' : undefined}
          >
            {enviar.isPending ? 'Enviando…' : `📤 Enviar para aprovação (${selecionados.length})`}
          </Button>
          <Button onClick={() => { setEditando(undefined); setSemanaNova(1); setFormAberto(true); }}>+ Novo conteúdo</Button>
        </div>
      </div>

      {aviso && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${
          aviso.tipo === 'ok'
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/40 bg-red-500/10 text-red-300'}`}
        >
          {aviso.texto}
        </p>
      )}
      {!cliente.whatsapp_chat_id && (
        <p className="text-xs text-amber-300">
          ⚠ Este cliente não tem WhatsApp cadastrado — o envio fica desativado. Cadastre o número/grupo no cliente.
        </p>
      )}

      {/* Metas */}
      <Card className="flex flex-wrap items-end gap-3 p-3">
        <div className="w-36">
          <Input label="Posts por semana" type="number" min={0} value={porSemana}
            onChange={(e) => setPorSemana(e.target.value)} />
        </div>
        <div className="w-36">
          <Input label="Posts por mês" type="number" min={0} value={porMes}
            onChange={(e) => setPorMes(e.target.value)} />
        </div>
        <Button
          variant="secondary"
          disabled={salvarMeta.isPending}
          onClick={() => salvarMeta.mutate({
            clienteId: cliente.id, porSemana: Math.max(0, Number(porSemana) || 0),
            porMes: Math.max(0, Number(porMes) || 0),
          })}
        >
          {salvarMeta.isPending ? 'Salvando…' : 'Salvar metas'}
        </Button>
        <span className="ml-auto text-xs text-slate-400">
          {posts.length}{semMeta ? ` / ${semMeta}` : ''} posts planejados em {mesLabel(mes)}
        </span>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {ETAPAS.map((e) => <Badge key={e.id} tone={e.tone}>{e.emoji} {n[e.id]} {e.label}</Badge>)}
        {posts.some((p) => p.etapa === 'editado') && (
          <button
            className="text-xs text-brand-300 hover:underline"
            onClick={() => setSelecionados(posts.filter((p) => p.etapa === 'editado').map((p) => p.id))}
          >
            Selecionar todos os editados
          </button>
        )}
      </div>

      {/* Semanas */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((semana) => {
          const daSemana = posts.filter((p) => p.semana === semana);
          const meta = Number(porSemana) || 0;
          return (
            <section key={semana} className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-slate-100">Semana {semana}</span>
                <span className={`text-[11px] ${meta && daSemana.length < meta ? 'text-amber-300' : 'text-slate-400'}`}>
                  {daSemana.length}{meta ? `/${meta}` : ''}
                </span>
              </div>
              <div className="space-y-2">
                {daSemana.map((p) => (
                  <PostCard
                    key={p.id} post={p}
                    selecionado={selecionados.includes(p.id)}
                    onSelecionar={() => alternar(p.id)}
                    onEtapa={(etapa) => mudarEtapa.mutate({ id: p.id, etapa })}
                    onPrevia={() => setPrevia(p)}
                    onEditar={() => { setEditando(p); setFormAberto(true); }}
                    onExcluir={() => {
                      if (confirm(`Excluir "${p.titulo}"?`)) excluir.mutate(p.id);
                    }}
                  />
                ))}
                <button
                  className="w-full rounded-lg border border-dashed border-white/15 py-1.5 text-xs text-slate-400 hover:border-brand-400/50 hover:text-slate-200"
                  onClick={() => { setEditando(undefined); setSemanaNova(semana); setFormAberto(true); }}
                >
                  + adicionar
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <PostFormModal
        open={formAberto} onClose={() => setFormAberto(false)}
        clienteId={cliente.id} mes={mes} post={editando} semanaInicial={semanaNova}
      />
      <PreviaDrive
        open={previa !== null} onClose={() => setPrevia(null)}
        titulo={previa?.titulo ?? ''} link={previa?.link_drive ?? null}
      />
    </div>
  );
}

function PostCard({
  post, selecionado, onSelecionar, onEtapa, onPrevia, onEditar, onExcluir,
}: {
  post: Post; selecionado: boolean;
  onSelecionar: () => void; onEtapa: (e: Etapa) => void;
  onPrevia: () => void; onEditar: () => void; onExcluir: () => void;
}) {
  const info = driveInfo(post.link_drive);
  const etapa = ETAPA_INFO[post.etapa];
  const [thumbOk, setThumbOk] = useState(true);

  return (
    <div className={`rounded-lg border p-2 text-xs ${selecionado ? 'border-brand-400/60 bg-brand-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={selecionado} onChange={onSelecionar} className="mt-0.5" aria-label="Selecionar" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-100">{post.titulo}</p>
          <p className="text-[10px] text-slate-500">
            {post.formato}
            {post.dia_postagem && ` · ${new Date(post.dia_postagem + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
          </p>
        </div>
        {info.tipo === 'arquivo' && thumbOk && info.thumbUrl && (
          <button onClick={onPrevia} className="shrink-0" title="Ver prévia">
            <img src={info.thumbUrl} alt="" onError={() => setThumbOk(false)}
              className="h-12 w-12 rounded-md object-cover" loading="lazy" />
          </button>
        )}
      </div>

      {post.etapa === 'reprovado' && post.justificativa && (
        <p className="mt-1.5 rounded bg-red-500/10 p-1.5 text-[11px] text-red-300">
          <strong>Alteração pedida:</strong> {post.justificativa}
        </p>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <select
          value={post.etapa}
          onChange={(e) => onEtapa(e.target.value as Etapa)}
          aria-label="Etapa"
          className="glass-field min-w-0 flex-1 px-1.5 py-1 text-[11px] [&>option]:bg-slate-900 [&>option]:text-slate-100"
        >
          {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.emoji} {e.label}</option>)}
        </select>
        {post.link_drive && (
          <button onClick={onPrevia} className="rounded px-1.5 py-1 text-slate-300 hover:bg-white/10" title="Prévia">👁</button>
        )}
        <button onClick={onEditar} className="rounded px-1.5 py-1 text-slate-300 hover:bg-white/10" title="Editar">✏️</button>
        <button onClick={onExcluir} className="rounded px-1.5 py-1 text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Excluir">🗑</button>
      </div>
      <div className="mt-1"><Badge tone={etapa.tone}>{etapa.emoji} {etapa.label}</Badge></div>
    </div>
  );
}
