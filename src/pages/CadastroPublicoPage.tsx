import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { carregarFormularioPublico, enviarFormularioPublico } from '@/modules/onboarding-publico/api/onboardingPublicoApi';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';

interface FormData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  endereco: string;
  segmento: string;
  contato_nome: string;
  contato_email: string;
  contato_telefone: string;
  instagram: string;
  facebook: string;
  site: string;
  google_meu_negocio: string;
  observacoes: string;
}

const VAZIO: FormData = {
  razao_social: '', nome_fantasia: '', cnpj: '', endereco: '', segmento: '',
  contato_nome: '', contato_email: '', contato_telefone: '',
  instagram: '', facebook: '', site: '', google_meu_negocio: '',
  observacoes: '',
};

export function CadastroPublicoPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [estado, setEstado] = useState<'carregando' | 'form' | 'enviado' | 'erro'>('carregando');
  const [erro, setErro] = useState<string>('');
  const [dados, setDados] = useState<FormData>(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [jaPreenchido, setJaPreenchido] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await carregarFormularioPublico(slug);
      if (!r.ok) { setErro(r.error); setEstado('erro'); return; }
      if (r.preenchido) setJaPreenchido(true);
      if (r.dados && Object.keys(r.dados).length) {
        setDados({ ...VAZIO, ...(r.dados as Partial<FormData>) });
      }
      setEstado('form');
    })();
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await enviarFormularioPublico(slug, dados as unknown as Record<string, unknown>);
    setEnviando(false);
    if (r.ok) setEstado('enviado');
    else { setErro(r.error); setEstado('erro'); }
  }

  function up<K extends keyof FormData>(k: K, v: FormData[K]) {
    setDados((d) => ({ ...d, [k]: v }));
  }

  if (estado === 'carregando') {
    return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  }
  if (estado === 'erro') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-3 text-3xl">⚠️</div>
          <div className="text-slate-100">{erro || 'Erro ao carregar formulário.'}</div>
        </Card>
      </div>
    );
  }
  if (estado === 'enviado') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-3 text-4xl">✅</div>
          <h1 className="mb-2 text-lg font-semibold text-slate-100">Cadastro recebido!</h1>
          <p className="text-sm text-slate-400">Obrigado. Nossa equipe entrará em contato em breve.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">🚀</div>
          <h1 className="text-2xl font-semibold text-white">Bem-vindo à Startip</h1>
          <p className="mt-1 text-sm text-slate-400">
            Preencha seus dados abaixo pra começarmos a trabalhar juntos.
            {jaPreenchido && <span className="mt-1 block text-amber-300">Você já preencheu este formulário. Pode atualizar e reenviar se precisar.</span>}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-slate-100">Empresa</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input id="razao" label="Razão social *" required value={dados.razao_social} onChange={(e) => up('razao_social', e.target.value)} />
              <Input id="fantasia" label="Nome fantasia" value={dados.nome_fantasia} onChange={(e) => up('nome_fantasia', e.target.value)} />
              <Input id="cnpj" label="CNPJ *" required value={dados.cnpj} onChange={(e) => up('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
              <Input id="segmento" label="Segmento" value={dados.segmento} onChange={(e) => up('segmento', e.target.value)} placeholder="Ex: Restaurante, Advocacia…" />
              <div className="sm:col-span-2">
                <Input id="end" label="Endereço" value={dados.endereco} onChange={(e) => up('endereco', e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-slate-100">Contato responsável</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input id="ct-nome" label="Nome *" required value={dados.contato_nome} onChange={(e) => up('contato_nome', e.target.value)} />
              <Input id="ct-tel" label="WhatsApp *" required value={dados.contato_telefone} onChange={(e) => up('contato_telefone', e.target.value)} placeholder="+55 27 99999-9999" />
              <div className="sm:col-span-2">
                <Input id="ct-email" label="E-mail *" required type="email" value={dados.contato_email} onChange={(e) => up('contato_email', e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-slate-100">Presença digital</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input id="ig" label="@instagram" value={dados.instagram} onChange={(e) => up('instagram', e.target.value)} placeholder="@suaempresa" />
              <Input id="fb" label="Facebook" value={dados.facebook} onChange={(e) => up('facebook', e.target.value)} placeholder="fb.com/suaempresa" />
              <Input id="site" label="Site" value={dados.site} onChange={(e) => up('site', e.target.value)} placeholder="https://…" />
              <Input id="gmn" label="Google Meu Negócio" value={dados.google_meu_negocio} onChange={(e) => up('google_meu_negocio', e.target.value)} placeholder="Link do perfil" />
            </div>
          </Card>

          <Card className="p-5">
            <label className="block text-xs text-slate-300">
              Observações (o que você quer que a gente saiba)
              <textarea
                value={dados.observacoes}
                onChange={(e) => up('observacoes', e.target.value)}
                rows={4}
                className="mt-1 w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
              />
            </label>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={enviando || !dados.razao_social.trim() || !dados.cnpj.trim() || !dados.contato_email.trim()}>
              {enviando ? 'Enviando…' : 'Enviar cadastro'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
