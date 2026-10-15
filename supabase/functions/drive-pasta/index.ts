// =============================================================
// drive-pasta — Lista os arquivos de uma pasta pública do Google Drive
// (usado para pré-visualizar carrosséis no sistema e na aprovação do cliente).
//
// POST { id: string }  →  { ok: true, arquivos: [{ id, nome }] }
//   - Lê a visualização embutida da pasta (não exige chave de API).
//   - A pasta precisa estar compartilhada como "Qualquer pessoa com o link".
// =============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });
}

const decodificar = (t: string) =>
  t.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let id = '';
  try { id = String((await req.json()).id ?? ''); } catch { /* corpo inválido */ }
  if (!/^[\w-]{10,}$/.test(id)) return json({ ok: false, error: 'id inválido' }, 400);

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const resp = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`, {
      redirect: 'follow', signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) return json({ ok: true, arquivos: [] });
    const html = await resp.text();

    const arquivos: { id: string; nome: string }[] = [];
    const rx = /id="entry-([\w-]+)"[\s\S]*?flip-entry-title">([^<]*)</g;
    for (const m of html.matchAll(rx)) arquivos.push({ id: m[1], nome: decodificar(m[2]) });

    arquivos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
    return json({ ok: true, arquivos });
  } catch {
    return json({ ok: true, arquivos: [] });
  }
});
