import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { getDemoProfile, setDemoUsuarioAtual } from '@/shared/lib/demoData';
import { podeAcessarModulo } from '@/shared/auth/permissions';
import type { Profile } from '@/shared/types/database';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isEquipe: boolean;
  isAdmin: boolean;
  isCliente: boolean;
  podeAcessar: (modulo: string) => boolean;
  // Demo: troca o usuário "logado" para testar cargos/permissões.
  trocarUsuarioDemo?: (id: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const demoSession = { user: { id: 'demo', email: 'demo@startip.os' } } as unknown as Session;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(IS_DEMO ? demoSession : null);
  const [profile, setProfile] = useState<Profile | null>(IS_DEMO ? getDemoProfile() : null);
  const [loading, setLoading] = useState(!IS_DEMO);

  useEffect(() => {
    if (IS_DEMO) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (IS_DEMO) return;
    let active = true;
    async function loadProfile() {
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.error('Erro ao carregar profile:', error.message);
        setProfile(null);
      } else {
        setProfile(data ? (data as unknown as Profile) : null);
      }
      setLoading(false);
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(() => {
    const isEquipe = profile?.tipo === 'equipe';
    return {
      session,
      profile,
      loading,
      isEquipe,
      isAdmin: isEquipe && profile?.papel === 'admin',
      isCliente: profile?.tipo === 'cliente',
      podeAcessar: (modulo: string) => podeAcessarModulo(profile, modulo),
      trocarUsuarioDemo: IS_DEMO
        ? (id: string) => {
            setDemoUsuarioAtual(id);
            setProfile(getDemoProfile());
          }
        : undefined,
      signOut: async () => {
        if (IS_DEMO) return;
        await supabase.auth.signOut();
      },
    };
  }, [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
