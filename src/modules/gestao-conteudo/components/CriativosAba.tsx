import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { Textarea } from '@/shared/ui/Textarea';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';
import { LogoCliente } from '@/shared/ui/LogoCliente';
import {
  linkAprovacao, useEnviarParaAprovacao, useExcluirPost, useLembrarCliente, useMudarEtapa,
  usePostsDoMes, useReenviarAlterados,
} from '@/modules/gestao-conteudo/api/gestaoApi';
import { useAprovadores, useVotosDoCliente } from '@/modules/gestao-conteudo/api/aprovadoresApi';
import {
  ETAPAS, driveInfo, mensagemCriativos, mesLabel, type Etapa, type Post,
} from '@/modules/gestao-conteudo/types';
import {
  COR_ETAPA, alertasDoCliente, contar, textoTempoMedio, type ClienteGestao,
} from '@/modules/gestao-conteudo/utils';
import { videoDriveUrl } from './VideoDrive';
import { PostCard } from './PostCard';
import { AprovadoresModal } from './AprovadoresModal';
import { PostFormModal } from './PostFormModal';
import { PreviaDrive } from './PreviaDrive';

interface Props {
  /** Clientes ativos (qualquer serviço); a aba filtra os que têm Tráfego pago. */
  clientes: ClienteGestao[];
  mes: string;
  clienteId: string;
  onCliente: (id: string | null) => void;
}

// Criativos não têm meta: sem faltas por semana/mês, só alertas de reprovado e de cliente parado.
const semMeta = (c: ClienteGestao): ClienteGestao => ({ ...c, posts_por_mes: 0, conteudos_por_semana: 0 });

export function CriativosAba({ clientes, mes, clienteId, onCliente }: Props) {
  const postsQ = usePostsDoMes(mes, 'criativo');
  const [etapaFiltro, setEtapaFiltro] = useState<Etapa | ''>('');

  const lista = useMemo(
    () => clientes
      .filter((c) => (c.servicos ?? []).includes('trafego_pago'))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [clientes],
  );
  const posts = postsQ.data ?? [];
  const cliente = lista.find((c) => c.id === clienteId) ?? null;
  const doEscopo = posts.filter((p) => (cliente ? p.cliente_id === cliente.id : lista.some((c) => c.id === p.cliente_id)));
  const totais = contar(doEscopo);

  // Clientes sem tráfego pago mas com criativo no mês continuam acessíveis.
  const extras = clientes.filter((c) => !lista.includes(c) && posts.some((p) => p.cliente_id === c.id));
  const todos = [...lista, ...extras].sort((a, b) => a.nome.localeCompare(b.nome));
  const clienteSel = todos.find((c) => c.id === clienteId) ?? null;

  const visiveis = etapaFiltro ? todos.filter((c) => posts.some((p) => p.cliente_id === c.id && p.etapa === etapaFiltro)) : todos;

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-slate-400">
        <GlassIcon name="lightbulb" /> Criativos de <strong>tráfego pago</strong>: não têm meta por semana nem por mês,
        e o cliente aprova por um <strong>link próprio</strong>, separado do conteúdo orgânico.
      </p>

      <Card className="flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-[14rem] flex-1 sm:flex-none">
          <Select
            label="Cliente"
            value={clienteId}
            onChange={(e) => onCliente(e.target.value || null)}
            options={[
              { value: '', label: `Todos os clientes (${todos.length})` },
              ...todos.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />
        </div>
        {clienteSel && <Button variant="secondary" onClick={() => onCliente(null)}>← Ver todos os clientes</Button>}
        {etapaFiltro && (
          <Button variant="secondary" onClick={() => setEtapaFiltro('')}><GlassIcon name="x" /> Limpar filtro de etapa</Button>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {ETAPAS.map((e) => {
          const ativo = etapaFiltro === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setEtapaFiltro(ativo ? '' : e.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                ativo ? 'border-brand-400/70 bg-brand-500/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
            >
              <div className="text-[11px] text-slate-400"><GlassIcon emoji={e.emoji} /> {e.label}</div>
              <div className="mt-1 text-2xl font-semibold text-white">{totais[e.id]}</div>
            </button>
          );
        })}
      </div>

      {postsQ.isLoading && <div className="flex justify-center py-16"><Spinner /></div>}
      {postsQ.error && (
        <Card className="p-4 text-sm text-red-300">Erro ao carregar: {(postsQ.error as Error).message}</Card>
      )}

      {!postsQ.isLoading && todos.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-400">
          Nenhum cliente ativo com o serviço <strong>Tráfego pago</strong>. Marque o serviço no cadastro do cliente para ele aparecer aqui.
        </Card>
      )}

      {!postsQ.isLoading && clienteSel && (
        <DetalheCriativos
          key={clienteSel.id + mes}
          cliente={clienteSel}
          mes={mes}
          posts={posts.filter((p) => p.cliente_id === clienteSel.id)}
          etapaFiltro={etapaFiltro}
        />
      )}

      {!postsQ.isLoading && !clienteSel && todos.length > 0 && (
        visiveis.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-400">
            Nenhum cliente tem criativos nessa etapa em {mesLabel(mes)}.
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {visiveis.map((c) => {
              const meus = posts.filter((p) => p.cliente_id === c.id);
              const n = contar(meus);
              const alertas = alertasDoCliente(semMeta(c), meus, false);
              const tempo = textoTempoMedio(meus);
              return (
                <Card
                  key={c.id}
                  className="cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/40"
                  onClick={() => onCliente(c.id)}
                >
                  <div className="flex items-center gap-3">
                    {c.logo_url
                      ? <LogoCliente src={c.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5"><GlassIcon name="building" /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-100">{c.nome}</p>
                      <p className="text-[11px] text-slate-400">
                        {meus.length} {meus.length === 1 ? 'criativo' : 'criativos'} no mês
                      </p>
                    </div>
                    {alertas.some((a) => a.gravidade === 'alta') && <Badge tone="red">Atenção</Badge>}
                  </div>

                  {meus.length > 0 && (
                    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/5" title={`Etapas de ${mes}`}>
                      {ETAPAS.map((e) => n[e.id] > 0 && (
                        <div key={e.id} className={COR_ETAPA[e.id]} style={{ width: `${(n[e.id] / meus.length) * 100}%` }} />
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ETAPAS.filter((e) => n[e.id] > 0).map((e) => (
                      <Badge key={e.id} tone={e.tone}><GlassIcon emoji={e.emoji} /> {n[e.id]} {e.label.toLowerCase()}</Badge>
                    ))}
                    {meus.length === 0 && <span className="text-[11px] text-slate-500">Nenhum criativo no mês.</span>}
                  </div>
                  {tempo && <p className="mt-2 text-[11px] text-slate-400"><GlassIcon name="timer" /> Responde em média em {tempo}</p>}
                  {alertas.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-[11px]">
                      {alertas.map((a) => (
                        <li key={a.texto} className={a.gravidade === 'alta' ? 'text-red-300' : 'text-amber-300'}><GlassIcon name="alert" /> {a.texto}</li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

interface DetalheProps {
  cliente: ClienteGestao;
  mes: string;
  posts: Post[];
  etapaFiltro: Etapa | '';
}

function DetalheCriativos({ cliente, mes, posts, etapaFiltro }: DetalheProps) {
  const mudarEtapa = useMudarEtapa();
  const excluir = useExcluirPost();
  const enviar = useEnviarParaAprovacao();
  const lembrar = useLembrarCliente();
  const reenviar = useReenviarAlterados();

  const [aprovadoresAberto, setAprovadoresAberto] = useState(false);
  const aprovadoresQ = useAprovadores(cliente.id);
  const aprovadoresAtivos = (aprovadoresQ.data ?? []).filter((a) => a.ativo);
  const votosQ = useVotosDoCliente(
    cliente.id,
    aprovadoresAtivos.length >= 2 ? posts.filter((p) => p.etapa === 'enviado').map((p) => p.id) : [],
  );
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Post | undefined>();
  const [previa, setPrevia] = useState<Post | null>(null);
  const [mensagemEnvio, setMensagemEnvio] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const n = contar(posts);
  const alertas = alertasDoCliente(semMeta(cliente), posts, false);
  const tempo = textoTempoMedio(posts);
  const link = cliente.central_slug ? linkAprovacao(cliente.central_slug, mes, 'criativo') : null;
  const aguardando = posts.filter((p) => p.etapa === 'enviado');
  const alterados = posts.filter((p) => p.refeito && (p.etapa === 'editado' || p.etapa === 'em_edicao'));
  const visiveis = etapaFiltro ? posts.filter((p) => p.etapa === etapaFiltro) : posts;

  const ok = (texto: string) => setAviso({ tipo: 'ok', texto });
  const erro = (e: unknown) => setAviso({ tipo: 'erro', texto: (e as Error).message });
  const alternar = (id: string) => setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function enviarSelecionados() {
    const escolhidos = posts.filter((p) => selecionados.includes(p.id));
    const semArquivo = escolhidos.filter((p) => driveInfo(p.link_drive).tipo === 'invalido').length;
    if (semArquivo && !confirm(`⚠ ${semArquivo} criativo(s) sem link do Drive válido (o cliente não verá a prévia). Continuar?`)) return;
    setAviso(null);
    setMensagemEnvio(mensagemCriativos({ link: link ?? '(link do cliente)' }));
  }

  function confirmarEnvio() {
    if (mensagemEnvio === null) return;
    const texto = mensagemEnvio;
    setAviso(null);
    for (const p of posts.filter((x) => selecionados.includes(x.id) && x.formato === 'reels')) {
      const id = driveInfo(p.link_drive).id;
      if (id) void fetch(videoDriveUrl(id), { headers: { Range: 'bytes=0-0' } }).catch(() => {});
    }
    enviar.mutate(
      {
        clienteId: cliente.id, clienteNome: cliente.nome, slug: cliente.central_slug, mes,
        ids: selecionados, texto, categoria: 'criativo',
      },
      {
        onSuccess: () => { setMensagemEnvio(null); setSelecionados([]); ok('Enviado! O cliente recebeu o link de aprovação dos criativos no WhatsApp.'); },
        onError: (e) => { setMensagemEnvio(null); erro(e); },
      },
    );
  }

  function lembrarAgora() {
    if (!confirm(`Reenviar o link de aprovação dos criativos para ${cliente.nome} (${aguardando.length} aguardando)?`)) return;
    setAviso(null);
    lembrar.mutate(
      {
        clienteId: cliente.id, clienteNome: cliente.nome, slug: cliente.central_slug, mes,
        ids: aguardando.map((p) => p.id), categoria: 'criativo',
      },
      { onSuccess: () => ok('Lembrete enviado ao cliente.'), onError: erro },
    );
  }

  function reenviarAlterados() {
    setAviso(null);
    reenviar.mutate(
      { clienteId: cliente.id, slug: cliente.central_slug, mes, ids: alterados.map((p) => p.id), categoria: 'criativo' },
      {
        onSuccess: () => ok('Reenviado! O grupo do cliente foi avisado de que os criativos foram alterados.'),
        onError: erro,
      },
    );
  }

  const renderCard = (p: Post) => (
    <PostCard
      key={p.id} post={p}
      selecionado={selecionados.includes(p.id)}
      onSelecionar={() => alternar(p.id)}
      onEtapa={(etapa) => mudarEtapa.mutate({ id: p.id, etapa, anterior: p.etapa })}
      onPrevia={() => setPrevia(p)}
      onEditar={() => { setEditando(p); setFormAberto(true); }}
      onExcluir={() => { if (confirm(`Excluir "${p.titulo}"?`)) excluir.mutate(p.id); }}
      aprovacoes={aprovadoresAtivos.length >= 2 ? {
        total: aprovadoresAtivos.length,
        feitos: aprovadoresAtivos.filter((a) => (votosQ.data ?? []).some(
          (v) => v.post_id === p.id && v.aprovador_id === a.id && v.decisao === 'aprovado')).length,
        faltam: aprovadoresAtivos.filter((a) => !(votosQ.data ?? []).some(
          (v) => v.post_id === p.id && v.aprovador_id === a.id && v.decisao === 'aprovado')).map((a) => a.nome),
      } : undefined}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-white">{cliente.nome}</h2>
        <Badge tone="amber">Criativos · tráfego pago</Badge>
        {tempo && <span className="text-xs text-slate-400"><GlassIcon name="timer" /> responde em média em {tempo}</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { if (link) { void navigator.clipboard.writeText(link); ok('Link de aprovação dos criativos copiado.'); } }} disabled={!link}>
            <GlassIcon name="link" /> Copiar link
          </Button>
          <Button
            variant="secondary"
            onClick={lembrarAgora}
            disabled={aguardando.length === 0 || lembrar.isPending || !cliente.whatsapp_chat_id}
            title={aguardando.length === 0 ? 'Nada aguardando o cliente' : undefined}
          >
            {glassify(lembrar.isPending ? 'Enviando…' : `⏰ Lembrar cliente (${aguardando.length})`)}
          </Button>
          {alterados.length > 0 && (
            <Button onClick={reenviarAlterados} disabled={reenviar.isPending || !cliente.whatsapp_chat_id}>
              {glassify(reenviar.isPending ? 'Enviando…' : `🔁 Reenviar alterados (${alterados.length})`)}
            </Button>
          )}
          <Button
            onClick={enviarSelecionados}
            disabled={selecionados.length === 0 || enviar.isPending || !cliente.whatsapp_chat_id}
            title={!cliente.whatsapp_chat_id ? 'Cliente sem WhatsApp cadastrado' : undefined}
          >
            {glassify(enviar.isPending ? 'Enviando…' : `📤 Enviar para aprovação (${selecionados.length})`)}
          </Button>
          <Button variant="secondary" onClick={() => setAprovadoresAberto(true)}>
            <GlassIcon name="users" /> Aprovadores{aprovadoresAtivos.length >= 2 ? ` (${aprovadoresAtivos.length})` : ''}
          </Button>
          <Button onClick={() => { setEditando(undefined); setFormAberto(true); }}>+ Novo criativo</Button>
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
          <GlassIcon name="alert" /> Este cliente não tem WhatsApp cadastrado — envio e lembrete ficam desativados.
        </p>
      )}
      {alertas.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          {alertas.map((a) => (
            <li key={a.texto} className={a.gravidade === 'alta' ? 'text-red-300' : 'text-amber-300'}><GlassIcon name="alert" /> {a.texto}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {ETAPAS.map((e) => <Badge key={e.id} tone={e.tone}><GlassIcon emoji={e.emoji} /> {n[e.id]} {e.label}</Badge>)}
        <span className="text-xs text-slate-400">· {posts.length} {posts.length === 1 ? 'criativo' : 'criativos'} em {mesLabel(mes)}</span>
        {posts.some((p) => p.etapa === 'editado') && (
          <button
            className="text-xs text-brand-300 hover:underline"
            onClick={() => setSelecionados(posts.filter((p) => p.etapa === 'editado').map((p) => p.id))}
          >
            Selecionar todos os editados
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {ETAPAS.filter((e) => !etapaFiltro || e.id === etapaFiltro).map((e) => {
          const coluna = visiveis.filter((p) => p.etapa === e.id);
          return (
            <section key={e.id} className="w-64 shrink-0 rounded-xl border border-white/10 bg-white/[0.02] p-2">
              <div className="mb-2 flex items-center justify-between px-1 text-sm font-semibold text-slate-100">
                <span><GlassIcon emoji={e.emoji} /> {e.label}</span>
                <span className="text-[11px] text-slate-400">{coluna.length}</span>
              </div>
              <div className="space-y-2">
                {coluna.map(renderCard)}
                {coluna.length === 0 && <p className="px-1 py-3 text-[11px] text-slate-600">Nenhum criativo.</p>}
              </div>
            </section>
          );
        })}
      </div>

      <Modal
        open={mensagemEnvio !== null}
        onClose={() => !enviar.isPending && setMensagemEnvio(null)}
        title={`Enviar para aprovação · ${selecionados.length} criativo(s)`}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setMensagemEnvio(null)} disabled={enviar.isPending}>Cancelar</Button>
            <Button onClick={confirmarEnvio} disabled={enviar.isPending || !(mensagemEnvio ?? '').trim()}>
              {enviar.isPending ? 'Enviando…' : 'Enviar no WhatsApp'}
            </Button>
          </>
        )}
      >
        <div className="space-y-2">
          <Textarea
            label={`Mensagem para ${cliente.nome}`}
            rows={8}
            value={mensagemEnvio ?? ''}
            onChange={(e) => setMensagemEnvio(e.target.value)}
          />
          <p className="text-[11px] text-slate-500">
            Edite à vontade. Mantenha o link — é por ele que o cliente aprova os criativos.
            <button
              type="button"
              className="ml-2 text-brand-300 hover:underline"
              onClick={() => setMensagemEnvio(mensagemCriativos({ link: link ?? '(link do cliente)' }))}
            >
              Restaurar padrão
            </button>
          </p>
        </div>
      </Modal>
      <AprovadoresModal
        open={aprovadoresAberto}
        onClose={() => setAprovadoresAberto(false)}
        clienteId={cliente.id}
        clienteNome={cliente.nome}
      />
      <PostFormModal
        open={formAberto} onClose={() => setFormAberto(false)}
        clienteId={cliente.id} mes={mes} post={editando} categoria="criativo"
      />
      <PreviaDrive
        open={previa !== null} onClose={() => setPrevia(null)}
        titulo={previa?.titulo ?? ''} link={previa?.link_drive ?? null} formato={previa?.formato}
      />
    </div>
  );
}
