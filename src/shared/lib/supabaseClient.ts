import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_DEMO } from '@/shared/lib/env';

// Chaves vêm SEMPRE de variáveis de ambiente (ver .env.example).
// Apenas a ANON KEY (pública) é usada no frontend — a RLS protege os dados.
//
// Em Modo Demonstração (sem chaves), criamos um client com placeholders
// apenas para satisfazer o construtor; ele NÃO é chamado — as camadas de
// auth e de dados desviam para os mocks quando IS_DEMO é true.
export const supabase = createClient<Database>(
  IS_DEMO ? 'http://localhost:54321' : SUPABASE_URL,
  IS_DEMO ? 'demo-anon-key' : SUPABASE_ANON_KEY,
);
