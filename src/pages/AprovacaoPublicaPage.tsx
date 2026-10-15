import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { driveInfo } from '@/modules/gestao-conteudo/types';
import { VideoDrive } from '@/modules/gestao-conteudo/components/VideoDrive';
import { CarrosselPasta } from '@/modules/gestao-conteudo/components/CarrosselPasta';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';
import { Linkify } from '@/shared/ui/Linkify';
import { LogoCliente } from '@/shared/ui/LogoCliente';

interface Ideia {
  id: string;
  titulo: string;
  descricao: string;
  formato: string;
  semana: number;
  dia_postagem: string | null;
  status: 'pendente' | 'aprovado' | 'reprovado';
  justificativa: string;
  mes_referencia: string;
  link_drive?: string | null;
  etapa?: string;
  votos?: { aprovador_id: string; decisao: 'aprovado' | 'reprovado'; justificativa: string }[];
}

interface Dados {
  cliente: { id: string; nome: string; logo_url: string | null };
  mes: string;
  meses: string[];
  ideias: Ideia[];
  /** 2+ => aprovação em conjunto: todos precisam aprovar. */
  aprovadores?: { id: string; nome: string }[];
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aprovacao-publica`;

const FORMATO_LABEL: Record<string, string> = {
  reels: 'Reels', carrossel: 'Carrossel', estatico: 'Estático', story: 'Story', video: 'Vídeo',
};

function formatMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function AprovacaoPublicaPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [query] = useSearchParams();
  const mesDoLink = query.get('mes') ?? undefined;
  const [previa, setPrevia] = useState<Ideia | null>(null);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mes, setMes] = useState<string | null>(null);
  const [reprovar, setReprovar] = useState<Ideia | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [salvando, setSalvando] = useState(false);
  const chaveAprovador = `aprovador-${slug}`;
  const [aprovadorId, setAprovadorId] = useState<string>(() => {
    try { return localStorage.getItem(chaveAprovador) ?? ''; } catch { return ''; }
  });
  function escolherAprovador(id: string) {
    setAprovadorId(id);
    try { localStorage.setItem(chaveAprovador, id); } catch { /* sem storage */ }
  }

  async function carregar(mesAlvo?: string) {
    try {
      const u = new URL(FN_URL);
      u.searchParams.set('slug', slug);
      if (mesAlvo) u.searchParams.set('mes', mesAlvo);
      const r = await fetch(u.toString());
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error ?? 'erro');
      setDados(body as Dados);
      setMes((body as Dados).mes);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  useEffect(() => { void carregar(mesDoLink); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [slug]);

  async function decidir(id: string, status: 'aprovado' | 'reprovado', just = '') {
    setSalvando(true);
    try {
      const r = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, id, status, justificativa: just, aprovador_id: aprovadorId || undefined }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error ?? 'erro');
      await carregar(mes ?? undefined);
      setReprovar(null); setJustificativa('');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function aprovarTodos() {
    const alvo = mes ?? dados?.mes;
    if (!alvo) return;
    const n = dados?.ideias.filter((i) => i.status === 'pendente').length ?? 0;
    if (!confirm(`Aprovar todos os ${n} conteúdos pendentes deste mês?

Se algum precisar de ajuste, use "Não aprovado" nele antes.`)) return;
    setSalvando(true);
    try {
      const r = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, mes: alvo, acao: 'aprovar_todos', aprovador_id: aprovadorId || undefined }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error ?? 'erro');
      await carregar(alvo);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  if (erro) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="mb-3 text-3xl"><GlassIcon name="alert" /></div>
        <div className="text-slate-100">{erro}</div>
      </Card>
    </div>
  );
  if (!dados) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Spinner /></div>;

  const c = dados.cliente;
  const aprovadores = dados.aprovadores ?? [];
  const emConjunto = aprovadores.length >= 2;
  const eu = aprovadores.find((a) => a.id === aprovadorId);
  const meuVoto = (i: Ideia) => i.votos?.find((v) => v.aprovador_id === aprovadorId);
  // Em conjunto: "pendente para mim" = ainda não decidido e eu ainda não votei.
  const pendentes = dados.ideias.filter(
    (i) => i.status === 'pendente' && (!emConjunto || (eu && !meuVoto(i))),
  ).length;
  const podeDecidir = !emConjunto || !!eu;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="text-center">
          {c.logo_url && <LogoCliente src={c.logo_url} alt="" className="mx-auto mb-3 h-16 w-16 rounded-full border border-white/10 object-cover" />}
          <h1 className="text-2xl font-semibold text-white">{c.nome}</h1>
          <p className="mt-1 text-xs text-slate-400">Aprovação de Conteúdo · Startip</p>
        </header>

        {emConjunto && (
          <div className="rounded-2xl border border-brand-400/30 bg-brand-500/10 p-4 text-center">
            <p className="text-sm font-medium text-white">Este conteúdo é aprovado em conjunto.</p>
            <p className="mt-0.5 text-xs text-slate-300">
              Cada pessoa aprova por si e o conteúdo só fica aprovado quando todos aprovarem. Quem está aprovando agora?
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {aprovadores.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => escolherAprovador(a.id)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                    a.id === aprovadorId
                      ? 'border-brand-400 bg-brand-500 text-white'
                      : 'border-white/15 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {a.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seletor de mês */}
        <div className="flex flex-wrap justify-center gap-2">
          {(dados.meses.length ? dados.meses : [dados.mes]).map((m) => (
            <button
              key={m}
              onClick={() => void carregar(m)}
              className={`rounded-full border px-3 py-1 text-xs capitalize ${
                m === mes ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'
              }`}
            >
              {formatMes(m)}
            </button>
          ))}
        </div>

        <div className="text-center text-xs text-slate-400">
          {glassify(dados.ideias.length === 0 ? 'Nenhum conteúdo publicado neste mês ainda.' :
            pendentes === 0 ? '✅ Todos os conteúdos deste mês já foram decididos.' :
              emConjunto && !eu ? 'Escolha seu nome acima para aprovar.' :
                pendentes === 0 && dados.ideias.some((i) => i.status === 'pendente')
                  ? 'Você já decidiu tudo o que era seu. Aguardando os demais aprovadores.'
                  : `${pendentes} conteúdo(s) aguardando sua decisão.`)}
        </div>

        {pendentes >= 2 && (
          <div className="flex justify-center">
            <Button onClick={() => void aprovarTodos()} disabled={salvando}>
              <GlassIcon name="check-circle" /> Aprovar todos os {pendentes} pendentes
            </Button>
          </div>
        )}

        {/* Cards de ideias agrupados por semana */}
        <div className="space-y-6">
          {[1, 2, 3, 4].map((semana) => {
            const daSemana = dados.ideias.filter((i) => i.semana === semana);
            if (daSemana.length === 0) return null;
            return (
              <section key={semana}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-sm font-semibold text-brand-200">
                    Semana {semana}
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {daSemana.map((i) => (
                    <div key={i.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone="slate">{FORMATO_LABEL[i.formato] ?? i.formato}</Badge>
                        <Badge tone={i.status === 'aprovado' ? 'green' : i.status === 'reprovado' ? 'red' : 'amber'}>
                          {i.status === 'pendente' ? 'Aguardando' : i.status === 'aprovado'
                            ? (i.etapa === 'programado' ? 'Aprovado · programado' : 'Aprovado')
                            : 'Reprovado'}
                        </Badge>
                        {i.dia_postagem && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                            <GlassIcon name="calendar" /> postar em {new Date(i.dia_postagem).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                          </span>
                        )}
                      </div>
                      {driveInfo(i.link_drive).tipo === 'pasta' ? (
                        <button
                          type="button"
                          onClick={() => setPrevia(i)}
                          className="mb-3 block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-6 text-center text-sm font-medium text-brand-300 hover:bg-white/10"
                        >
                          <GlassIcon name="play" /> Ver todas as imagens do carrossel
                        </button>
                      ) : driveInfo(i.link_drive).tipo === 'arquivo' ? (
                        <button
                          type="button"
                          onClick={() => setPrevia(i)}
                          className="group relative mb-3 block w-full overflow-hidden rounded-xl border border-white/10 bg-black"
                        >
                          <img
                            src={driveInfo(i.link_drive).thumbUrl}
                            alt={`Prévia de ${i.titulo}`}
                            loading="lazy"
                            className="h-48 w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                          />
                          <span className="absolute inset-0 grid place-items-center">
                            <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white"><GlassIcon name="play" /> Ver prévia</span>
                          </span>
                        </button>
                      ) : driveInfo(i.link_drive).abrirUrl ? (
                        <a
                          href={driveInfo(i.link_drive).abrirUrl}
                          target="_blank" rel="noreferrer noopener"
                          className="mb-3 block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-brand-300 hover:bg-white/10"
                        >
                          Abrir material no Drive ↗
                        </a>
                      ) : null}
                      <h3 className="mb-1.5 text-base font-semibold text-slate-100">{i.titulo}</h3>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300"><Linkify texto={i.descricao} /></p>
                      {emConjunto && i.status !== 'reprovado' && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {aprovadores.map((a) => {
                            const v = i.votos?.find((x) => x.aprovador_id === a.id);
                            const aprovou = v?.decisao === 'aprovado' || (!v && i.status === 'aprovado');
                            return (
                              <span
                                key={a.id}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                                  aprovou ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-300 ring-amber-500/30'}`}
                              >
                                {aprovou ? '✓' : '…'} {a.nome}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {i.status === 'reprovado' && i.justificativa && (
                        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                          <strong>Alteração pedida:</strong> {i.justificativa}
                        </div>
                      )}
                      {i.status === 'pendente' && emConjunto && eu && meuVoto(i) && (
                        <p className="mt-4 rounded-lg bg-emerald-500/10 p-2 text-center text-xs text-emerald-300">
                          Você ({eu.nome}) já aprovou. Aguardando: {
                            aprovadores.filter((a) => !i.votos?.some((v) => v.aprovador_id === a.id && v.decisao === 'aprovado'))
                              .map((a) => a.nome).join(', ') || '—'}.
                        </p>
                      )}
                      {i.status === 'pendente' && !(emConjunto && eu && meuVoto(i)) && (
                        <div className="mt-4 flex gap-2">
                          <Button onClick={() => void decidir(i.id, 'aprovado')} disabled={salvando || !podeDecidir} className="flex-1">
                            <GlassIcon name="check-circle" /> Aprovado
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => { setReprovar(i); setJustificativa(''); }}
                            disabled={salvando || !podeDecidir}
                            className="flex-1"
                          >
                            <GlassIcon name="x-circle" /> Não aprovado
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="pt-6 text-center text-[11px] text-slate-500">
          Suas decisões são registradas na nossa plataforma. Dúvidas? Fale com seu gerente.
        </footer>
      </div>

      <Modal
        open={reprovar !== null}
        onClose={() => setReprovar(null)}
        title={reprovar ? `Por que não aprovou "${reprovar.titulo}"?` : ''}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Conte o motivo e <strong>qual alteração você quer</strong> — a equipe vai refazer com base no que você escrever.
          </p>
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={5}
            placeholder="Ex: trocar a música, deixar o logo maior e cortar os 3 primeiros segundos…"
            className="w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReprovar(null)}>Cancelar</Button>
            <Button
              onClick={() => reprovar && void decidir(reprovar.id, 'reprovado', justificativa)}
              disabled={salvando || justificativa.trim().length < 5}
            >
              Enviar pedido de alteração
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={previa !== null}
        onClose={() => setPrevia(null)}
        size="xl"
        semBlur
        title={previa?.titulo ?? ''}
      >
        {previa && driveInfo(previa.link_drive).previewUrl && (
          <div className="space-y-3">
            {driveInfo(previa.link_drive).tipo === 'pasta' ? (
              <CarrosselPasta pastaId={driveInfo(previa.link_drive).id as string} titulo={previa.titulo} />
            ) : previa.formato === 'reels' && driveInfo(previa.link_drive).id ? (
              <VideoDrive
                id={driveInfo(previa.link_drive).id as string}
                titulo={previa.titulo}
                abrirUrl={driveInfo(previa.link_drive).abrirUrl}
                thumbUrl={driveInfo(previa.link_drive).thumbUrl}
              />
            ) : (
              <iframe
                src={driveInfo(previa.link_drive).previewUrl}
                title={previa.titulo}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="h-[65vh] w-full rounded-xl border border-white/10 bg-black"
              />
            )}
            <a
              href={driveInfo(previa.link_drive).abrirUrl}
              target="_blank" rel="noreferrer noopener"
              className="block text-center text-xs text-brand-300 hover:underline"
            >
              Se o vídeo não abrir direito, toque aqui para ver no Drive ↗
            </a>
            {previa.status === 'pendente' && (
              <div className="flex gap-2">
                <Button className="flex-1" disabled={salvando || !podeDecidir}
                  onClick={() => { const i = previa; setPrevia(null); void decidir(i.id, 'aprovado'); }}>
                  <GlassIcon name="check-circle" /> Aprovado
                </Button>
                <Button variant="secondary" className="flex-1" disabled={salvando || !podeDecidir}
                  onClick={() => { const i = previa; setPrevia(null); setReprovar(i); setJustificativa(''); }}>
                  <GlassIcon name="x-circle" /> Não aprovado
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
