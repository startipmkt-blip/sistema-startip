import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BrandMark } from '@/shared/ui/BrandMark';
import { STATUS_ORDEM, usePainelTv } from '@/modules/painel-tv/api/painelTvApi';
import type { PainelTvDados, SaudeStatus } from '@/modules/painel-tv/types';
import { diasEntre, hojeSaoPaulo } from '@/modules/datas-comemorativas/lib/recorrencia';

const LIMITE_URGENTES = 6;
const LIMITE_DEMANDAS = 6;
// Recarrega a página de tempos em tempos para a TV pegar versões novas do sistema.
const RECARREGAR_MS = 6 * 60 * 60 * 1000;

function lerPin(slug: string): string | null {
  try { return localStorage.getItem(`painel-tv-pin:${slug}`); } catch { return null; }
}
function gravarPin(slug: string, pin: string | null) {
  try {
    if (pin) localStorage.setItem(`painel-tv-pin:${slug}`, pin);
    else localStorage.removeItem(`painel-tv-pin:${slug}`);
  } catch { /* sem storage: a TV pede a senha de novo ao recarregar */ }
}

// O painel é dimensionado em rem; ajustar a fonte raiz faz tudo escalar
// com a tela (notebook, monitor ou TV 4K) sem rolagem.
function useEscalaTv() {
  useEffect(() => {
    const html = document.documentElement;
    const anterior = html.style.fontSize;
    html.style.fontSize = 'min(1.05vw, 1.9vh)';
    return () => { html.style.fontSize = anterior; };
  }, []);
}

function useAgora(intervaloMs: number) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return agora;
}

export function PainelTvPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [pin, setPin] = useState<string | null>(() => lerPin(slug));
  const [erroPin, setErroPin] = useState(false);
  const { data, isLoading, isError, isFetching } = usePainelTv(slug, pin);
  useEscalaTv();

  useEffect(() => {
    document.title = 'Startip · Painel TV';
    const t = setTimeout(() => window.location.reload(), RECARREGAR_MS);
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => undefined);
    return () => { clearTimeout(t); void lock?.release(); };
  }, []);

  useEffect(() => {
    if (pin && data === null && !isFetching) {
      gravarPin(slug, null);
      setPin(null);
      setErroPin(true);
    }
  }, [data, pin, isFetching, slug]);

  if (!pin) {
    return <TelaSenha erro={erroPin} onEntrar={(p) => { gravarPin(slug, p); setErroPin(false); setPin(p); }} />;
  }
  if (isLoading || !data) {
    return <Fundo><div className="flex h-full items-center justify-center text-2xl text-slate-400">Carregando painel…</div></Fundo>;
  }
  return <Painel dados={data} offline={isError} />;
}

function Fundo({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 -right-40 h-[44rem] w-[44rem] rounded-full bg-red-600/10 blur-3xl" />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

function TelaSenha({ erro, onEntrar }: { erro: boolean; onEntrar: (pin: string) => void }) {
  const [valor, setValor] = useState('');
  return (
    <Fundo>
      <form
        onSubmit={(e) => { e.preventDefault(); if (valor.trim()) onEntrar(valor.trim()); }}
        className="flex h-full flex-col items-center justify-center gap-6"
      >
        <BrandMark sub="Painel TV" className="scale-150" />
        <p className="mt-4 text-lg text-slate-300">Digite a senha para exibir o painel</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-72 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-center text-4xl tracking-[0.5em] text-white focus:border-brand-400 focus:outline-none"
        />
        {erro && <p className="text-lg text-red-300">Senha incorreta ou link inválido.</p>}
        <button type="submit" className="rounded-2xl bg-brand-500 px-10 py-3 text-xl font-semibold text-white hover:bg-brand-400">Entrar</button>
      </form>
    </Fundo>
  );
}

const COR_STATUS: Record<SaudeStatus, { ponto: string; chip: string; numero: string }> = {
  saudavel: { ponto: 'bg-emerald-400', chip: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50', numero: 'text-emerald-300' },
  atencao: { ponto: 'bg-amber-400', chip: 'border-amber-400/40 bg-amber-500/15 text-amber-50', numero: 'text-amber-300' },
  urgente: { ponto: 'bg-red-500', chip: 'border-red-500/50 bg-red-500/20 text-red-50', numero: 'text-red-400' },
};

function Painel({ dados, offline }: { dados: PainelTvDados; offline: boolean }) {
  const agora = useAgora(10_000);
  const hoje = hojeSaoPaulo();

  const { urgentes, todos, contagem } = useMemo(() => {
    const todos = [...dados.clientes].sort((a, b) =>
      STATUS_ORDEM.indexOf(a.status) - STATUS_ORDEM.indexOf(b.status)
      || (a.ordem ?? 99) - (b.ordem ?? 99)
      || a.nome.localeCompare(b.nome));
    const contagem = { saudavel: 0, atencao: 0, urgente: 0 } as Record<SaudeStatus, number>;
    for (const c of todos) contagem[c.status] += 1;
    return { urgentes: todos.filter((c) => c.status === 'urgente').slice(0, LIMITE_URGENTES), todos, contagem };
  }, [dados.clientes]);

  const demandas = dados.demandas.slice(0, LIMITE_DEMANDAS);
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const dataLonga = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' });
  const atualizado = new Date(dados.gerado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

  return (
    <Fundo>
      <div className="flex h-full flex-col gap-[1.2rem] p-[1.6rem]">
        <header className="flex items-center gap-[2rem]">
          <BrandMark sub="Saúde da carteira" className="origin-left scale-[1.6]" />
          <div className="ml-[5rem] flex gap-[0.8rem]">
            <Contador valor={todos.length} rotulo="clientes" classe="text-white" />
            <Contador valor={contagem.saudavel} rotulo="saudáveis" classe={COR_STATUS.saudavel.numero} ponto={COR_STATUS.saudavel.ponto} />
            <Contador valor={contagem.atencao} rotulo="atenção" classe={COR_STATUS.atencao.numero} ponto={COR_STATUS.atencao.ponto} />
            <Contador valor={contagem.urgente} rotulo="urgentes" classe={COR_STATUS.urgente.numero} ponto={COR_STATUS.urgente.ponto} />
            <Contador valor={dados.demandas.length} rotulo="demandas urgentes" classe="text-brand-300" />
          </div>
          <div className="ml-auto text-right">
            <div className="text-[3.2rem] font-bold leading-none tabular-nums">{hora}</div>
            <div className="mt-1 text-[1.1rem] text-slate-400 first-letter:uppercase">{dataLonga}</div>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-[2fr_1fr] gap-[1.2rem]">
          <section className="flex min-h-0 flex-col rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-[1.2rem]">
            <TituloSecao icone="🚨" texto="Clientes que exigem atenção agora" extra={contagem.urgente > LIMITE_URGENTES ? `+${contagem.urgente - LIMITE_URGENTES} na faixa abaixo` : undefined} />
            {urgentes.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-[2rem] text-emerald-300">🎉 Nenhum cliente em estado urgente</div>
            ) : (
              <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-[1rem]">
                {urgentes.map((c, i) => <CardUrgente key={c.id} posicao={i + 1} nome={c.nome} motivo={c.motivo} logo={c.logo_url} />)}
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-col rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-[1.2rem]">
            <TituloSecao icone="⚡" texto="Urgentes da semana" />
            {demandas.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center text-[1.6rem] text-slate-400">Nenhuma demanda urgente 🙌</div>
            ) : (
              <ol className="grid min-h-0 flex-1 grid-rows-6 gap-[0.7rem]">
                {demandas.map((d) => <LinhaDemanda key={d.id} demanda={d} hoje={hoje} />)}
              </ol>
            )}
          </section>
        </main>

        <footer className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] px-[1.2rem] py-[0.9rem]">
          <div className="mb-[0.6rem] flex items-center justify-between text-[0.95rem] uppercase tracking-[0.2em] text-slate-400">
            <span>Todos os clientes</span>
            <span className={`normal-case tracking-normal ${offline ? 'text-amber-300' : 'text-slate-500'}`}>
              {offline ? `⚠ Sem conexão — dados de ${atualizado}` : `Atualizado às ${atualizado}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-[0.5rem]">
            {todos.map((c) => (
              <span key={c.id} className={`flex items-center gap-[0.5rem] rounded-full border px-[0.9rem] py-[0.35rem] text-[1.05rem] font-medium ${COR_STATUS[c.status].chip}`}>
                <span className={`h-[0.65rem] w-[0.65rem] rounded-full ${COR_STATUS[c.status].ponto}`} />
                {c.nome}
              </span>
            ))}
          </div>
        </footer>
      </div>
      <BotaoTelaCheia />
    </Fundo>
  );
}

function Contador({ valor, rotulo, classe, ponto }: { valor: number; rotulo: string; classe: string; ponto?: string }) {
  return (
    <div className="flex min-w-[7rem] flex-col items-center rounded-[1rem] border border-white/10 bg-white/[0.04] px-[1rem] py-[0.5rem]">
      <span className={`text-[2.2rem] font-bold leading-none tabular-nums ${classe}`}>{valor}</span>
      <span className="mt-[0.3rem] flex items-center gap-[0.35rem] text-[0.85rem] uppercase tracking-wider text-slate-400">
        {ponto && <span className={`h-[0.55rem] w-[0.55rem] rounded-full ${ponto}`} />}
        {rotulo}
      </span>
    </div>
  );
}

function TituloSecao({ icone, texto, extra }: { icone: string; texto: string; extra?: string }) {
  return (
    <div className="mb-[1rem] flex items-center gap-[0.7rem]">
      <span className="text-[1.6rem]">{icone}</span>
      <h2 className="text-[1.5rem] font-bold uppercase tracking-wide">{texto}</h2>
      {extra && <span className="ml-auto text-[1rem] text-red-300">{extra}</span>}
    </div>
  );
}

function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

function CardUrgente({ posicao, nome, motivo, logo }: { posicao: number; nome: string; motivo: string; logo: string | null }) {
  return (
    <article className="relative flex min-h-0 flex-col justify-between overflow-hidden rounded-[1.3rem] border border-red-500/50 bg-gradient-to-br from-red-500/30 via-red-600/10 to-transparent p-[1.2rem] shadow-2xl shadow-red-900/40">
      <span className="pointer-events-none absolute -bottom-[1.5rem] right-[0.6rem] text-[9rem] font-black leading-none text-red-500/15">{posicao}</span>
      <div className="flex items-center gap-[0.8rem]">
        <span className="relative flex h-[0.9rem] w-[0.9rem]">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-[0.9rem] w-[0.9rem] rounded-full bg-red-500" />
        </span>
        <span className="text-[1rem] font-semibold uppercase tracking-[0.2em] text-red-200">Prioridade #{posicao}</span>
      </div>
      <div className="flex items-center gap-[1rem]">
        {logo
          ? <img src={logo} alt="" className="h-[4rem] w-[4rem] shrink-0 rounded-full border border-white/20 object-cover" />
          : <span className="flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[1.5rem] font-bold">{iniciais(nome)}</span>}
        <h3 className="line-clamp-2 min-w-0 text-[1.85rem] font-bold leading-tight [overflow-wrap:anywhere]">{nome}</h3>
      </div>
      <p className={`line-clamp-2 text-[1.2rem] leading-snug ${motivo ? 'text-red-100' : 'italic text-red-200/50'}`}>
        {motivo || 'Motivo não informado'}
      </p>
    </article>
  );
}

function prazoInfo(prazo: string | null, criado: string, hoje: string): { texto: string; classe: string } {
  if (!prazo) {
    const dias = diasEntre(criado.slice(0, 10), hoje);
    return { texto: dias <= 0 ? 'criada hoje' : `aberta há ${dias}d`, classe: 'bg-white/10 text-slate-200' };
  }
  const faltam = diasEntre(hoje, prazo);
  if (faltam < 0) return { texto: `atrasada ${-faltam}d`, classe: 'bg-red-500 text-white' };
  if (faltam === 0) return { texto: 'vence hoje', classe: 'bg-red-500/80 text-white' };
  if (faltam === 1) return { texto: 'amanhã', classe: 'bg-amber-500/80 text-slate-950' };
  return { texto: `em ${faltam} dias`, classe: 'bg-white/10 text-slate-200' };
}

function LinhaDemanda({ demanda: d, hoje }: { demanda: PainelTvDados['demandas'][number]; hoje: string }) {
  const p = prazoInfo(d.prazo, d.created_at, hoje);
  return (
    <li className="flex min-h-0 items-center gap-[0.9rem] rounded-[1rem] border border-white/10 bg-white/[0.04] px-[1rem] py-[0.6rem]">
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-[1.35rem] font-semibold">{d.titulo}</div>
        <div className="line-clamp-1 text-[1rem] text-slate-400">{[d.cliente, d.responsavel].filter(Boolean).join(' · ') || '—'}</div>
      </div>
      <span className={`shrink-0 rounded-full px-[0.8rem] py-[0.3rem] text-[1rem] font-bold ${p.classe}`}>{p.texto}</span>
    </li>
  );
}

function BotaoTelaCheia() {
  const [cheia, setCheia] = useState(false);
  useEffect(() => {
    const on = () => setCheia(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  if (cheia) return null;
  return (
    <button
      onClick={() => void document.documentElement.requestFullscreen?.()}
      className="absolute bottom-[0.6rem] right-[0.8rem] rounded-full bg-white/5 px-[0.8rem] py-[0.3rem] text-[0.8rem] text-slate-500 opacity-40 hover:opacity-100"
    >
      ⛶ Tela cheia
    </button>
  );
}
