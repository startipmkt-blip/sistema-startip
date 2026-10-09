import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Input } from '@/shared/ui/Input';
import {
  linkAprovacao, useCopiarMesAnterior, useEnviarParaAprovacao, useExcluirPost,
  useLembrarCliente, useMudarEtapa, useSalvarMeta,
} from '@/modules/gestao-conteudo/api/gestaoApi';
import {
  ETAPAS, deslocarMes, driveInfo, mesLabel, type Etapa, type Post,
} from '@/modules/gestao-conteudo/types';
import { alertasDoCliente, contar, textoTempoMedio, type ClienteGestao } from '@/modules/gestao-conteudo/utils';
import { PostCard } from './PostCard';
import { PostFormModal } from './PostFormModal';
import { PreviaDrive } from './PreviaDrive';

type Agrupar = 'semanas' | 'etapas';

interface Props {
  cliente: ClienteGestao;
  mes: string;
  mesAtual: boolean;
  posts: Post[];
  etapaFiltro: Etapa | '';
}

export function DetalheCliente({ cliente, mes, mesAtual, posts, etapaFiltro }: Props) {
  const mudarEtapa = useMudarEtapa();
  const excluir = useExcluirPost();
  const enviar = useEnviarParaAprovacao();
  const lembrar = useLembrarCliente();
  const copiar = useCopiarMesAnterior();
  const salvarMeta = useSalvarMeta();

  const [agrupar, setAgrupar] = useState<Agrupar>('semanas');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Post | undefined>();
  const [semanaNova, setSemanaNova] = useState(1);
  const [previa, setPrevia] = useState<Post | null>(null);
  const [porSemana, setPorSemana] = useState(String(cliente.conteudos_por_semana ?? 0));
  const [porMes, setPorMes] = useState(String(cliente.posts_por_mes ?? 0));
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const visiveis = etapaFiltro ? posts.filter((p) => p.etapa === etapaFiltro) : posts;
  const n = contar(posts);
  const alertas = alertasDoCliente(
    { ...cliente, conteudos_por_semana: Number(porSemana) || 0, posts_por_mes: Number(porMes) || 0 },
    posts, mesAtual,
  );
  const tempo = textoTempoMedio(posts);
  const link = cliente.central_slug ? linkAprovacao(cliente.central_slug, mes) : null;
  const aguardando = posts.filter((p) => p.etapa === 'enviado');
  const metaMes = Number(porMes) > 0 ? Number(porMes) : 0;

  const ok = (texto: string) => setAviso({ tipo: 'ok', texto });
  const erro = (e: unknown) => setAviso({ tipo: 'erro', texto: (e as Error).message });

  function alternar(id: string) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function enviarSelecionados() {
    const escolhidos = posts.filter((p) => selecionados.includes(p.id));
    const semArquivo = escolhidos.filter((p) => driveInfo(p.link_drive).tipo !== 'arquivo').length;
    const extra = semArquivo
      ? `\n\n⚠ ${semArquivo} conteúdo(s) sem link do Drive válido (o cliente não verá a prévia).`
      : '';
    if (!confirm(`Enviar ${escolhidos.length} conteúdo(s) para aprovação no WhatsApp de ${cliente.nome}?${extra}`)) return;
    setAviso(null);
    enviar.mutate(
      { clienteId: cliente.id, clienteNome: cliente.nome, slug: cliente.central_slug, mes, ids: selecionados },
      { onSuccess: () => { setSelecionados([]); ok('Enviado! O cliente recebeu o link de aprovação no WhatsApp.'); }, onError: erro },
    );
  }

  function lembrarAgora() {
    if (!confirm(`Reenviar o link de aprovação para ${cliente.nome} (${aguardando.length} aguardando)?`)) return;
    setAviso(null);
    lembrar.mutate(
      { clienteId: cliente.id, clienteNome: cliente.nome, slug: cliente.central_slug, mes, ids: aguardando.map((p) => p.id) },
      { onSuccess: () => ok('Lembrete enviado ao cliente.'), onError: erro },
    );
  }

  function copiarMesAnterior() {
    const origem = deslocarMes(mes, -1);
    if (!confirm(
      `Copiar o planejamento de ${mesLabel(origem)} para ${mesLabel(mes)}?\n\n` +
      'Os conteúdos entram como "Em edição", sem arquivos do Drive. Itens com mesmo título e semana são ignorados.',
    )) return;
    setAviso(null);
    copiar.mutate(
      { clienteId: cliente.id, mesOrigem: origem, mesDestino: mes },
      {
        onSuccess: (qtd) => ok(qtd > 0 ? `${qtd} conteúdo(s) copiado(s) de ${mesLabel(origem)}.` : 'Nada novo para copiar.'),
        onError: erro,
      },
    );
  }

  function abrirNovo(semana: number) {
    setEditando(undefined); setSemanaNova(semana); setFormAberto(true);
  }

  const renderCard = (p: Post) => (
    <PostCard
      key={p.id} post={p}
      selecionado={selecionados.includes(p.id)}
      onSelecionar={() => alternar(p.id)}
      onEtapa={(etapa) => mudarEtapa.mutate({ id: p.id, etapa })}
      onPrevia={() => setPrevia(p)}
      onEditar={() => { setEditando(p); setFormAberto(true); }}
      onExcluir={() => { if (confirm(`Excluir "${p.titulo}"?`)) excluir.mutate(p.id); }}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-white">{cliente.nome}</h2>
        {alertas.length === 0 && posts.length > 0 && <Badge tone="green">Em dia</Badge>}
        {tempo && <span className="text-xs text-slate-400">⏱ responde em média em {tempo}</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copiarMesAnterior} disabled={copiar.isPending}>
            {copiar.isPending ? 'Copiando…' : '📋 Copiar mês anterior'}
          </Button>
          <Button variant="secondary" onClick={() => { if (link) { void navigator.clipboard.writeText(link); ok('Link de aprovação copiado.'); } }} disabled={!link}>
            🔗 Copiar link
          </Button>
          <Button
            variant="secondary"
            onClick={lembrarAgora}
            disabled={aguardando.length === 0 || lembrar.isPending || !cliente.whatsapp_chat_id}
            title={aguardando.length === 0 ? 'Nada aguardando o cliente' : undefined}
          >
            {lembrar.isPending ? 'Enviando…' : `⏰ Lembrar cliente (${aguardando.length})`}
          </Button>
          <Button
            onClick={enviarSelecionados}
            disabled={selecionados.length === 0 || enviar.isPending || !cliente.whatsapp_chat_id}
            title={!cliente.whatsapp_chat_id ? 'Cliente sem WhatsApp cadastrado' : undefined}
          >
            {enviar.isPending ? 'Enviando…' : `📤 Enviar para aprovação (${selecionados.length})`}
          </Button>
          <Button onClick={() => abrirNovo(1)}>+ Novo conteúdo</Button>
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
          ⚠ Este cliente não tem WhatsApp cadastrado — envio e lembrete ficam desativados. Cadastre o número/grupo no cliente.
        </p>
      )}
      {alertas.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          {alertas.map((a) => (
            <li key={a.texto} className={a.gravidade === 'alta' ? 'text-red-300' : 'text-amber-300'}>⚠ {a.texto}</li>
          ))}
        </ul>
      )}

      {/* Metas */}
      <Card className="flex flex-wrap items-end gap-3 p-3">
        <div className="w-36">
          <Input label="Posts por semana" type="number" min={0} value={porSemana} onChange={(e) => setPorSemana(e.target.value)} />
        </div>
        <div className="w-36">
          <Input label="Posts por mês" type="number" min={0} value={porMes} onChange={(e) => setPorMes(e.target.value)} />
        </div>
        <Button
          variant="secondary"
          disabled={salvarMeta.isPending}
          onClick={() => salvarMeta.mutate(
            { clienteId: cliente.id, porSemana: Math.max(0, Number(porSemana) || 0), porMes: Math.max(0, Number(porMes) || 0) },
            { onSuccess: () => ok('Metas salvas.'), onError: erro },
          )}
        >
          {salvarMeta.isPending ? 'Salvando…' : 'Salvar metas'}
        </Button>
        <span className="ml-auto text-xs text-slate-400">
          {posts.length}{metaMes ? ` / ${metaMes}` : ''} posts planejados em {mesLabel(mes)}
        </span>
      </Card>

      <div className="flex flex-wrap items-center gap-1.5">
        {ETAPAS.map((e) => <Badge key={e.id} tone={e.tone}>{e.emoji} {n[e.id]} {e.label}</Badge>)}
        {posts.some((p) => p.etapa === 'editado') && (
          <button
            className="text-xs text-brand-300 hover:underline"
            onClick={() => setSelecionados(posts.filter((p) => p.etapa === 'editado').map((p) => p.id))}
          >
            Selecionar todos os editados
          </button>
        )}
        <div className="ml-auto flex rounded-lg border border-white/10 p-0.5 text-xs">
          {(['semanas', 'etapas'] as Agrupar[]).map((a) => (
            <button
              key={a}
              onClick={() => setAgrupar(a)}
              className={`rounded-md px-3 py-1 ${agrupar === a ? 'bg-brand-500/20 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {a === 'semanas' ? 'Por semana' : 'Por etapa'}
            </button>
          ))}
        </div>
      </div>

      {agrupar === 'semanas' ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((semana) => {
            const daSemana = visiveis.filter((p) => p.semana === semana);
            const total = posts.filter((p) => p.semana === semana).length;
            const meta = Number(porSemana) || 0;
            return (
              <section key={semana} className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-slate-100">Semana {semana}</span>
                  <span className={`text-[11px] ${meta && total < meta ? 'text-amber-300' : 'text-slate-400'}`}>
                    {total}{meta ? `/${meta}` : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {daSemana.map(renderCard)}
                  <button
                    className="w-full rounded-lg border border-dashed border-white/15 py-1.5 text-xs text-slate-400 hover:border-brand-400/50 hover:text-slate-200"
                    onClick={() => abrirNovo(semana)}
                  >
                    + adicionar
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {ETAPAS.filter((e) => !etapaFiltro || e.id === etapaFiltro).map((e) => {
            const coluna = visiveis.filter((p) => p.etapa === e.id);
            return (
              <section key={e.id} className="w-64 shrink-0 rounded-xl border border-white/10 bg-white/[0.02] p-2">
                <div className="mb-2 flex items-center justify-between px-1 text-sm font-semibold text-slate-100">
                  <span>{e.emoji} {e.label}</span>
                  <span className="text-[11px] text-slate-400">{coluna.length}</span>
                </div>
                <div className="space-y-2">
                  {coluna.map(renderCard)}
                  {coluna.length === 0 && <p className="px-1 py-3 text-[11px] text-slate-600">Nenhum conteúdo.</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

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
