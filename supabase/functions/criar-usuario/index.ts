// =============================================================
// criar-usuario — POST { email, senha, nome, cargo, papel, permissoes }
// Só admin autenticado pode chamar. Cria user no Auth + profile ativo.
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'sem autenticação' }, 401);

  const sbUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sbUser.auth.getUser();
  if (!user) return json({ error: 'sessão inválida' }, 401);

  const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: me } = await sbAdmin.from('profiles').select('papel, status').eq('id', user.id).maybeSingle();
  if ((me as any)?.papel !== 'admin' || (me as any)?.status !== 'ativo') {
    return json({ error: 'só admin ativo pode criar usuários' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const { email, senha, nome, cargo, papel, permissoes, status } = body as {
    email?: string; senha?: string; nome?: string; cargo?: string;
    papel?: 'admin' | 'operador'; permissoes?: string[]; status?: 'ativo' | 'pendente';
  };
  if (!email?.trim() || !senha?.trim() || !nome?.trim()) return json({ error: 'email, senha e nome obrigatórios' }, 400);
  if (senha.length < 6) return json({ error: 'senha precisa ter ao menos 6 caracteres' }, 400);

  const { data: novo, error: e1 } = await sbAdmin.auth.admin.createUser({
    email: email.trim(),
    password: senha,
    email_confirm: true,
    user_metadata: { nome: nome.trim() },
  });
  if (e1) return json({ error: e1.message }, 500);

  const userId = novo.user?.id;
  if (!userId) return json({ error: 'não retornou userId' }, 500);

  // Atualiza ou insere o profile. O trigger padrão do Supabase pode já
  // ter criado uma linha vazia — usamos upsert por id.
  const { error: e2 } = await sbAdmin.from('profiles').upsert({
    id: userId,
    nome: nome.trim(),
    cargo: cargo ?? '',
    email: email.trim(),
    tipo: 'equipe',
    papel: papel ?? 'operador',
    status: status ?? 'ativo',
    permissoes: permissoes ?? [],
  } as any, { onConflict: 'id' });
  if (e2) return json({ error: e2.message, hint: 'user criado no Auth mas profile falhou' }, 500);

  return json({ ok: true, user_id: userId });
});
