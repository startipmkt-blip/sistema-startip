// =============================================================
// reuniao-backup-drive — envia uma reunião (resumo + PDF) para o Google Drive.
// =============================================================
// O sistema NÃO guarda credencial do Google. Ele só conhece a URL de um
// "web app" do Google Apps Script (supabase/drive-backup/apps-script.gs) e
// um token secreto. Quem grava no Drive é o script, na conta dona da pasta.
//
// Body: { reuniaoId: uuid }
// Segredos (Supabase → Edge Functions → Secrets):
//   DRIVE_APPS_SCRIPT_URL    URL do web app (termina em /exec)
//   DRIVE_APPS_SCRIPT_TOKEN  o mesmo valor da propriedade TOKEN do script
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DRIVE_URL = Deno.env.get('DRIVE_APPS_SCRIPT_URL') ?? '';
const DRIVE_TOKEN = Deno.env.get('DRIVE_APPS_SCRIPT_TOKEN') ?? '';

const PDF_MAX_BYTES = 20 * 1024 * 1024;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resp(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resp(405, { erro: 'Método não permitido.' });

  const auth = req.headers.get('Authorization');
  if (!auth) return resp(401, { erro: 'Não autenticado.' });

  const sbUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: user } = await sbUser.auth.getUser();
  if (!user?.user) return resp(401, { erro: 'Não autenticado.' });
  const { data: equipe } = await sbUser.rpc('is_equipe');
  if (!equipe) return resp(403, { erro: 'Apenas a equipe pode enviar para o Drive.' });

  if (!DRIVE_URL || !DRIVE_TOKEN) {
    return resp(500, { erro: 'Backup do Drive ainda não configurado (faltam os segredos DRIVE_APPS_SCRIPT_URL e DRIVE_APPS_SCRIPT_TOKEN).' });
  }

  let body: any;
  try { body = await req.json(); } catch { return resp(400, { erro: 'Requisição inválida.' }); }
  const reuniaoId = String(body?.reuniaoId ?? '');
  if (!reuniaoId) return resp(400, { erro: 'reuniaoId é obrigatório.' });

  // Lê com o JWT do usuário: a RLS decide se ele pode ver essa reunião.
  const { data: r, error: rErr } = await sbUser
    .from('reunioes')
    .select('id, data, titulo, resumo, pdf_url, clientes(nome)')
    .eq('id', reuniaoId)
    .maybeSingle();
  if (rErr) return resp(500, { erro: `Falha ao ler a reunião: ${rErr.message}` });
  if (!r) return resp(404, { erro: 'Reunião não encontrada.' });

  let pdfBase64: string | null = null;
  if (r.pdf_url) {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: blob, error: dErr } = await admin.storage.from('reunioes').download(r.pdf_url);
    if (dErr || !blob) {
      return resp(502, { erro: `Não consegui baixar o PDF anexado: ${dErr?.message ?? 'arquivo ausente'}` });
    }
    if (blob.size > PDF_MAX_BYTES) return resp(413, { erro: 'PDF acima de 20 MB.' });
    pdfBase64 = encodeBase64(new Uint8Array(await blob.arrayBuffer()));
  }

  let driveResp: Response;
  try {
    driveResp = await fetch(DRIVE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({
        token: DRIVE_TOKEN,
        cliente: (r as any).clientes?.nome ?? 'Sem cliente',
        data: r.data,
        titulo: r.titulo,
        resumo: r.resumo ?? '',
        pdfBase64,
      }),
    });
  } catch (e) {
    return resp(502, { erro: `Não consegui falar com o Google Drive: ${(e as Error).message}` });
  }

  const texto = await driveResp.text();
  let json: any;
  try { json = JSON.parse(texto); } catch {
    return resp(502, { erro: 'Resposta inesperada do Google Drive (confira a URL e a implantação do script).' });
  }
  if (!json?.ok) return resp(502, { erro: json?.erro ?? 'O script do Drive recusou o envio.' });

  return resp(200, { ok: true, pastaUrl: json.pastaUrl ?? null, arquivos: json.arquivos ?? [] });
});
