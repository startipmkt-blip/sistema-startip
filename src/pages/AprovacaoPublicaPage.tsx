import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

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
}

interface Dados {
  cliente: { id: string; nome: string; logo_url: string | null };
  mes: string;
  meses: string[];
  ideias: Ideia[];
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
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mes, setMes] = useState<string | null>(null);
  const [reprovar, setReprovar] = useState<Ideia | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [salvando, setSalvando] = useState(false);

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

  useEffect(() => { void carregar(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [slug]);

  async function decidir(id: string, status: 'aprovado' | 'reprovado', just = '') {
    setSalvando(true);
    try {
      const r = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, id, status, justificativa: just }),
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

  if (erro) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="mb-3 text-3xl">⚠️</div>
        <div className="text-slate-100">{erro}</div>
      </Card>
    </div>
  );
  if (!dados) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Spinner /></div>;

  const c = dados.cliente;
  const pendentes = dados.ideias.filter((i) => i.status === 'pendente').length;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="text-center">
          {c.logo_url && <img src={c.logo_url} alt="" className="mx-auto mb-3 h-16 w-16 rounded-full border border-white/10 object-cover" />}
          <h1 className="text-2xl font-semibold text-white">{c.nome}</h1>
          <p className="mt-1 text-xs text-slate-400">Aprovação de Conteúdo · Startip</p>
        </header>

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
          {dados.ideias.length === 0 ? 'Nenhum conteúdo publicado neste mês ainda.' :
            pendentes === 0 ? '✅ Todos os conteúdos deste mês já foram decididos.' :
              `${pendentes} conteúdo(s) aguardando sua decisão.`}
        </div>

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
                          {i.status === 'pendente' ? 'Aguardando' : i.status === 'aprovado' ? 'Aprovado' : 'Reprovado'}
                        </Badge>
                        {i.dia_postagem && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                            📅 postar em {new Date(i.dia_postagem).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                          </span>
                        )}
                      </div>
                      <h3 className="mb-1.5 text-base font-semibold text-slate-100">{i.titulo}</h3>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{i.descricao}</p>
                      {i.status === 'reprovado' && i.justificativa && (
                        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                          <strong>Motivo:</strong> {i.justificativa}
                        </div>
                      )}
                      {i.status === 'pendente' && (
                        <div className="mt-4 flex gap-2">
                          <Button onClick={() => void decidir(i.id, 'aprovado')} disabled={salvando} className="flex-1">
                            ✅ Aprovar
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => { setReprovar(i); setJustificativa(''); }}
                            disabled={salvando}
                            className="flex-1"
                          >
                            ❌ Reprovar
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
        title={reprovar ? `Por que reprovar "${reprovar.titulo}"?` : ''}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Nos conte o que não ficou bom e o que sugere alterar — isso ajuda a equipe a refazer melhor.
          </p>
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={5}
            placeholder="Ex: prefiro que o foco seja em X, evitem menção a Y…"
            className="w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReprovar(null)}>Cancelar</Button>
            <Button
              onClick={() => reprovar && void decidir(reprovar.id, 'reprovado', justificativa)}
              disabled={salvando || justificativa.trim().length < 5}
            >
              Enviar reprovação
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
