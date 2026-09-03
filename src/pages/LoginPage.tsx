import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { useAuth } from '@/shared/auth/AuthProvider';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { BrandMark } from '@/shared/ui/BrandMark';

// Traduz erros do Supabase Auth em português + neutro (não vaza se conta
// existe ou não, para reduzir enumeração de usuários).
function traduzErroAuth(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha inválidos.';
  if (m.includes('email not confirmed'))       return 'Confirme o e-mail antes de entrar.';
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  }
  return 'Não foi possível entrar agora. Tente novamente em instantes.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [googleEnviando, setGoogleEnviando] = useState(false);

  // Já autenticado (fora do demo)? Vai para a área interna.
  if (!IS_DEMO && session && !authLoading) {
    return <Navigate to="/inicio" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // No Modo Demonstração não há autenticação real — apenas entra.
    if (IS_DEMO) {
      navigate('/inicio');
      return;
    }
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setEnviando(false);
    if (error) setErro(traduzErroAuth(error.message));
    // Em caso de sucesso, o AuthProvider redireciona via mudança de sessão.
  }

  async function handleGoogle() {
    if (IS_DEMO) {
      navigate('/inicio');
      return;
    }
    setErro(null);
    setGoogleEnviando(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Volta pra origem do próprio app; o AuthProvider capta a nova sessão.
        redirectTo: `${window.location.origin}/inicio`,
      },
    });
    if (error) {
      setGoogleEnviando(false);
      setErro('Não foi possível iniciar o login com Google.');
    }
    // Se deu certo, o browser é redirecionado para o Google; nada mais a fazer.
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark sub="Agência de Marketing" />
          <p className="mt-4 text-sm text-slate-400">Acesse sua conta</p>
        </div>

        {IS_DEMO && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-300">
            Modo demonstração — clique em “Entrar” para navegar com dados de
            exemplo.
          </div>
        )}

        {/* Botão Google (fica escondido no modo demo pra não confundir). */}
        {!IS_DEMO && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleEnviando}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
            >
              <GoogleIcon className="h-4 w-4" />
              {googleEnviando ? 'Abrindo Google…' : 'Entrar com Google'}
            </button>

            <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              ou
              <span className="h-px flex-1 bg-white/10" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            label="E-mail"
            autoComplete="email"
            required={!IS_DEMO}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="senha"
            type="password"
            label="Senha"
            autoComplete="current-password"
            required={!IS_DEMO}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          {erro && (
            <p role="alert" className="text-sm text-red-400">
              {erro}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        {!IS_DEMO && (
          <p className="mt-6 text-center text-xs text-slate-500">
            Sistema privado. Se você é novo por aqui, um administrador precisa
            liberar seu acesso antes de conseguir entrar.
          </p>
        )}
      </Card>
    </div>
  );
}

// Ícone Google inline (sem depender de lib externa).
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.3 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 34.9 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3c-.4.4 6.4-4.7 6.4-14.8 0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
