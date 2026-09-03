// =============================================================
// env.ts — Leitura central das variáveis de ambiente.
// =============================================================
// IS_DEMO liga o "Modo Demonstração": quando as chaves do Supabase
// NÃO estão configuradas, o app roda com dados de exemplo em memória
// (para preview/local). Em produção as chaves sempre existem, então
// o modo demo nunca ativa lá — o app usa o Supabase real.
// =============================================================

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
