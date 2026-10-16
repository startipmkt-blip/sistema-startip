import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import {
  carregarFormularioPublico,
  enviarFormularioPublico,
  type FormularioPublico,
} from '@/modules/formularios/api/formulariosApi';
import { BrandMark } from '@/shared/ui/BrandMark';
import { CamposInput } from '@/modules/formularios/components/CamposInput';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';

export function FormularioPublicoPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [estado, setEstado] = useState<'carregando' | 'form' | 'enviado' | 'erro' | 'ja_preenchido'>('carregando');
  const [erro, setErro] = useState('');
  const [form, setForm] = useState<FormularioPublico | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await carregarFormularioPublico(slug);
      if (!r.ok) { setErro(r.error); setEstado('erro'); return; }
      setForm(r.dados);
      if (r.dados.preenchido) { setEstado('ja_preenchido'); return; }
      setEstado('form');
    })();
  }, [slug]);

  const total = form?.perguntas.length ?? 0;
  const respondidas = useMemo(
    () => (form?.perguntas ?? []).filter((p) => String(respostas[p.id] ?? '').trim()).length,
    [form, respostas],
  );
  const progresso = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  function up(id: string, v: string) {
    setRespostas((r) => ({ ...r, [id]: v }));
  }

  function faltaObrigatoria(): string | null {
    if (!form) return null;
    for (const p of form.perguntas) {
      if (p.obrigatoria && !String(respostas[p.id] ?? '').trim()) {
        return p.label;
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    const falta = faltaObrigatoria();
    if (falta) { setErro(`Pergunta obrigatória: ${falta}`); return; }
    setEnviando(true);
    const r = await enviarFormularioPublico(slug, respostas);
    setEnviando(false);
    if (r.ok) setEstado('enviado');
    else setErro(r.error);
  }

  if (estado === 'carregando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Spinner />
      </div>
    );
  }

  if (estado === 'erro') {
    return (
      <Shell>
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-3 text-3xl"><GlassIcon name="alert" /></div>
          <div className="text-slate-100">{erro || 'Erro ao carregar formulário.'}</div>
        </Card>
      </Shell>
    );
  }

  if (estado === 'ja_preenchido') {
    return (
      <Shell>
        <TelaObrigado titulo="Este formulário já foi enviado 🎉" />
      </Shell>
    );
  }

  if (estado === 'enviado') {
    return (
      <Shell>
        <TelaObrigado />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <header className="text-center">
          <BrandMark sub="" className="mb-3 justify-center" />
          <h1 className="text-xl font-semibold text-white">{form?.titulo}</h1>
        </header>

        {total > 3 && (
          <div className="rounded-full bg-white/5 p-1">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
              style={{ width: `${progresso}%` }}
            />
            <div className="mt-1 text-center text-xs text-slate-400">
              {respondidas} de {total} respondidas
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {form?.perguntas.map((p, i, todas) => (
            <div key={p.id} className="space-y-3">
              {p.secao && p.secao !== todas[i - 1]?.secao && (
                <h2 className="pt-4 text-base font-semibold text-brand-300">{p.secao}</h2>
              )}
            <Card className="p-4">
              <label className="mb-1 block text-sm font-medium text-slate-100">
                {p.label}
                {p.obrigatoria && <span className="ml-1 text-brand-300">*</span>}
              </label>
              {p.ajuda && <p className="mb-2 text-xs text-slate-400">{p.ajuda}</p>}
              {p.tipo === 'texto' ? (
                <Input
                  value={respostas[p.id] ?? ''}
                  onChange={(e) => up(p.id, e.target.value)}
                  required={p.obrigatoria}
                />
              ) : p.tipo === 'campos' ? (
                <CamposInput pergunta={p} onChange={(t) => up(p.id, t)} />
              ) : p.tipo === 'escolha' ? (
                <div className="space-y-1">
                  {(p.opcoes ?? []).map((o) => (
                    <label key={o} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                      <input type="radio" name={p.id} checked={respostas[p.id] === o} onChange={() => up(p.id, o)} />
                      {o}
                    </label>
                  ))}
                </div>
              ) : p.tipo === 'multipla' ? (
                <div className="space-y-1">
                  {(p.opcoes ?? []).map((o) => {
                    const sel = (respostas[p.id] ?? '').split(', ').filter(Boolean);
                    return (
                      <label key={o} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={sel.includes(o)}
                          onChange={(e) =>
                            up(p.id, (e.target.checked ? [...sel, o] : sel.filter((x) => x !== o)).join(', '))
                          }
                        />
                        {o}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <Textarea
                  value={respostas[p.id] ?? ''}
                  onChange={(e) => up(p.id, e.target.value)}
                  className="min-h-[90px]"
                  required={p.obrigatoria}
                />
              )}
            </Card>
            </div>
          ))}

          {erro && <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{erro}</div>}

          <div className="pt-2">
            <Button type="submit" disabled={enviando} className="w-full py-3 text-base">
              {glassify(enviando ? 'Enviando…' : '✓ Enviar respostas')}
            </Button>
          </div>
        </form>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function TelaObrigado({ titulo }: { titulo?: string }) {
  return (
    <Card className="w-full max-w-xl p-8 text-center">
      <div className="mb-4 flex justify-center">
        <div className="flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-brand-500/15 text-5xl">
          <GlassIcon name="check" />
        </div>
      </div>
      <BrandMark sub="" className="mb-4 justify-center" />
      <h1 className="mb-3 text-2xl font-semibold text-white">
        {glassify(titulo ?? 'Obrigado por preencher as informações! 🎉')}
      </h1>
      <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-300">
        Agora vamos seguir para os próximos passos, que é montar o seu diagnóstico personalizado
        com base no que você preencheu no formulário.
        <br /><br />
        Em breve retornaremos com as próximas etapas.
      </p>
    </Card>
  );
}
