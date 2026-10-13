import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IS_DEMO, SUPABASE_URL } from '@/shared/lib/env';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface Pergunta { id: string; label: string; ajuda?: string }
interface Dados {
  cliente: { nome: string; logo_url: string | null };
  tipo: string;
  titulo: string;
  perguntas: Pergunta[];
}

const FN_URL = `${SUPABASE_URL}/functions/v1/cs-publico`;

const DEMO: Dados = {
  cliente: { nome: 'Padaria do Bairro', logo_url: null },
  tipo: 'semanal',
  titulo: 'Feedback da semana',
  perguntas: [
    { id: 'dificuldades', label: 'Quais foram as maiores dificuldades da semana?' },
    { id: 'percepcao', label: 'O que você notou essa semana nos anúncios e no seu negócio?' },
    { id: 'necessidade', label: 'Tem alguma necessidade para os próximos dias?', ajuda: 'Ex.: um evento chegando, um material novo, uma promoção.' },
  ],
};

export function CsPublicoPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      if (IS_DEMO) { setDados(DEMO); return; }
      try {
        const r = await fetch(`${FN_URL}?slug=${encodeURIComponent(slug)}`);
        const corpo = await r.json().catch(() => ({}));
        if (!ativo) return;
        if (!r.ok) setErroCarga(r.status === 404 ? 'Link inválido.' : 'Não foi possível carregar.');
        else setDados(corpo as Dados);
      } catch {
        if (ativo) setErroCarga('Não foi possível carregar. Confira sua conexão.');
      }
    })();
    return () => { ativo = false; };
  }, [slug]);

  useEffect(() => {
    if (dados) document.title = `${dados.cliente.nome} · ${dados.titulo}`;
  }, [dados]);

  const temResposta = Object.values(respostas).some((v) => v.trim());

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!dados || !temResposta) return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      if (!IS_DEMO) {
        const r = await fetch(FN_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug, tipo: dados.tipo, respostas }),
        });
        const corpo = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(corpo?.error ?? 'Não foi possível enviar. Tente novamente.');
      }
      setConcluido(true);
    } catch (err) {
      setErroEnvio((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (erroCarga) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-3 text-3xl"><GlassIcon name="alert" /></div>
          <div className="text-slate-100">{erroCarga}</div>
          <p className="mt-2 text-xs text-slate-400">Confira o endereço ou fale com a equipe Startip.</p>
        </Card>
      </div>
    );
  }
  if (!dados) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Spinner /></div>;

  if (concluido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card className="w-full max-w-md space-y-3 p-8 text-center">
          <div className="text-4xl"><GlassIcon name="check-circle" /></div>
          <h1 className="text-xl font-semibold text-white">Obrigado, {dados.cliente.nome}!</h1>
          <p className="text-sm leading-relaxed text-slate-300">
            Recebemos suas respostas. A equipe Startip vai analisar e voltar com os próximos passos.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <form onSubmit={(e) => void enviar(e)} className="mx-auto max-w-xl space-y-6">
        <header className="text-center">
          {dados.cliente.logo_url && (
            <img src={dados.cliente.logo_url} alt="" className="mx-auto mb-3 h-16 w-16 rounded-full border border-white/10 object-cover" />
          )}
          <h1 className="text-2xl font-semibold text-white">{dados.cliente.nome}</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">{dados.titulo}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Leva dois minutos. Responda o que fizer sentido — não precisa preencher tudo.
          </p>
        </header>

        {dados.perguntas.map((p) => (
          <div key={p.id} className="space-y-1.5">
            <label htmlFor={`cs-${p.id}`} className="block text-sm font-medium text-slate-100">{p.label}</label>
            {p.ajuda && <p className="text-xs text-slate-500">{p.ajuda}</p>}
            <textarea
              id={`cs-${p.id}`}
              value={respostas[p.id] ?? ''}
              onChange={(e) => setRespostas((r) => ({ ...r, [p.id]: e.target.value }))}
              maxLength={2000}
              rows={4}
              className="glass-field w-full px-3 py-2 text-base text-slate-100"
            />
          </div>
        ))}

        {erroEnvio && <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">{erroEnvio}</div>}

        <Button type="submit" disabled={!temResposta || enviando} className="w-full py-3 text-base">
          {enviando ? 'Enviando…' : 'Enviar respostas'}
        </Button>
        <p className="text-center text-[11px] text-slate-500">Suas respostas vão direto para a equipe Startip.</p>
      </form>
    </div>
  );
}
