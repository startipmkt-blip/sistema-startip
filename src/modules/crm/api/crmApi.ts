import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { CRM_ETAPAS, type CrmLead, type CrmMensagem, type EtapaCrm } from '@/modules/crm/types';

// ---------- Leads (prospects da agência) ----------
const demoLeads: CrmLead[] = [
  { id: 'l1', nome: 'João Souza', empresa: 'Restaurante Sabor', telefone: '(11) 98888-1111', origem: 'Instagram', etapa: 'novo', valor: 1200, etiquetas: ['qualificada'], created_at: '2026-07-28T10:00:00Z' },
  { id: 'l2', nome: 'Maria Lima', empresa: 'Clínica Bem Estar', telefone: '(11) 97777-2222', origem: 'WhatsApp', etapa: 'contato', valor: 900, etiquetas: ['reuniao'], created_at: '2026-07-25T10:00:00Z' },
  { id: 'l3', nome: 'Pedro Alves', empresa: 'Auto Peças PA', telefone: '(21) 96666-3333', origem: 'Indicação', etapa: 'proposta', valor: 3500, etiquetas: ['qualificada', 'negociacao'], created_at: '2026-07-20T10:00:00Z' },
  { id: 'l4', nome: 'Ana Rocha', empresa: 'Moda Ana', telefone: '(21) 95555-4444', origem: 'Meta Ads', etapa: 'ganho', valor: 4200, etiquetas: ['venda'], created_at: '2026-07-10T10:00:00Z' },
  { id: 'l5', nome: 'Carla Dias', empresa: 'Studio C', telefone: '(31) 94444-5555', origem: 'Site', etapa: 'novo', valor: 600, etiquetas: [], created_at: '2026-07-30T10:00:00Z' },
  { id: 'l6', nome: 'Rafael Melo', empresa: 'Melo Advocacia', telefone: '(11) 93333-6666', origem: 'Google', etapa: 'perdido', valor: 0, etiquetas: [], created_at: '2026-06-30T10:00:00Z' },
];

const demoMensagens: CrmMensagem[] = [
  { id: 'm1', lead_id: 'l1', direcao: 'recebida', texto: 'Olá! Vi o anúncio de vocês, queria saber mais sobre gestão de tráfego.', hora: '2026-07-28T10:00:00Z' },
  { id: 'm2', lead_id: 'l1', direcao: 'enviada', texto: 'Oi João! Claro, trabalhamos com tráfego pago para negócios locais. Qual seu segmento?', hora: '2026-07-28T10:05:00Z' },
  { id: 'm3', lead_id: 'l1', direcao: 'recebida', texto: 'Tenho um restaurante. Quanto fica por mês?', hora: '2026-07-28T10:12:00Z' },
  { id: 'm4', lead_id: 'l2', direcao: 'recebida', texto: 'Bom dia, podemos marcar uma reunião?', hora: '2026-07-25T09:00:00Z' },
  { id: 'm5', lead_id: 'l2', direcao: 'enviada', texto: 'Bom dia Maria! Podemos sim, quinta às 15h te atende?', hora: '2026-07-25T09:10:00Z' },
];

const crmKeys = {
  all: ['crm'] as const,
  leads: (etiqueta: string) => ['crm', 'leads', etiqueta] as const,
  mensagens: (leadId: string) => ['crm', 'mensagens', leadId] as const,
  etapas: ['crm', 'etapas'] as const,
};

// ---------- Etapas do funil (personalizáveis) ----------
const demoEtapas: EtapaCrm[] = CRM_ETAPAS.map((e) => ({ ...e }));

function slug(label: string): string {
  return label.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID();
}

async function fetchEtapas(): Promise<EtapaCrm[]> {
  if (IS_DEMO) return [...demoEtapas];
  const { data, error } = await supabase.from('crm_etapas').select('*').order('ordem', { ascending: true });
  if (error) throw error;
  const lista = (data ?? []) as EtapaCrm[];
  return lista.length ? lista : [...CRM_ETAPAS];
}

async function addEtapa(label: string): Promise<void> {
  if (IS_DEMO) {
    demoEtapas.push({ id: `${slug(label)}-${demoEtapas.length}`, label });
    return;
  }
  const { error } = await supabase.from('crm_etapas').insert({ id: slug(label), label, ordem: 99 } as never);
  if (error) throw error;
}

async function removerEtapa(id: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoEtapas.findIndex((e) => e.id === id);
    if (i >= 0) demoEtapas.splice(i, 1);
    // Move os leads órfãos para a primeira etapa.
    const primeira = demoEtapas[0]?.id;
    if (primeira) demoLeads.forEach((l) => { if (l.etapa === id) l.etapa = primeira; });
    return;
  }
  const { error } = await supabase.from('crm_etapas').delete().eq('id', id);
  if (error) throw error;
}

export function useEtapasCrm() {
  return useQuery({ queryKey: crmKeys.etapas, queryFn: fetchEtapas });
}
export function useAddEtapaCrm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => addEtapa(label),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.etapas }),
  });
}
export function useRemoverEtapaCrm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removerEtapa(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.all }),
  });
}

async function fetchLeads(etiqueta: string): Promise<CrmLead[]> {
  if (IS_DEMO) {
    return demoLeads.filter((l) => !etiqueta || l.etiquetas.includes(etiqueta));
  }
  let query = supabase.from('crm_leads').select('*').order('created_at', { ascending: false });
  if (etiqueta) query = query.contains('etiquetas', [etiqueta]);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CrmLead[];
}

export type CrmLeadFormData = Pick<
  CrmLead,
  'nome' | 'empresa' | 'telefone' | 'origem' | 'etapa' | 'valor' | 'etiquetas'
>;

async function saveLead(id: string | undefined, dados: CrmLeadFormData): Promise<void> {
  if (IS_DEMO) {
    if (id) {
      const l = demoLeads.find((x) => x.id === id);
      if (l) Object.assign(l, dados);
    } else {
      demoLeads.unshift({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...dados });
    }
    return;
  }
  const { error } = id
    ? await supabase.from('crm_leads').update(dados as never).eq('id', id)
    : await supabase.from('crm_leads').insert(dados as never);
  if (error) throw error;
}

async function fetchMensagens(leadId: string): Promise<CrmMensagem[]> {
  if (IS_DEMO) {
    return demoMensagens
      .filter((m) => m.lead_id === leadId)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }
  const { data, error } = await supabase
    .from('crm_mensagens')
    .select('id, lead_id, direcao, conteudo, enviada_em, lida, nome_remetente, tipo, midia_path, midia_mime, midia_nome, midia_duracao, wa_message_id, respondendo_id, reacoes, editada_em, apagada_em, apagada_para_todos, favorita_ids, status')
    .eq('lead_id', leadId)
    .order('enviada_em', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as unknown as {
      id: string; lead_id: string; direcao: 'recebida' | 'enviada';
      conteudo: string | null; enviada_em: string;
      lida?: boolean; nome_remetente?: string | null;
      tipo?: string; midia_path?: string | null; midia_mime?: string | null;
      midia_nome?: string | null; midia_duracao?: number | null;
      wa_message_id?: string | null; respondendo_id?: string | null;
      reacoes?: Record<string, string[]>;
      editada_em?: string | null; apagada_em?: string | null;
      apagada_para_todos?: boolean; favorita_ids?: string[];
      status?: string | null;
    };
    return {
      id: row.id,
      lead_id: row.lead_id,
      direcao: row.direcao,
      texto: row.conteudo ?? '',
      hora: row.enviada_em,
      lida: row.lida,
      nome_remetente: row.nome_remetente ?? null,
      tipo: (row.tipo ?? 'texto') as CrmMensagem['tipo'],
      midia_path: row.midia_path ?? null,
      midia_mime: row.midia_mime ?? null,
      midia_nome: row.midia_nome ?? null,
      midia_duracao: row.midia_duracao ?? null,
      wa_message_id: row.wa_message_id ?? null,
      respondendo_id: row.respondendo_id ?? null,
      reacoes: row.reacoes ?? {},
      editada_em: row.editada_em ?? null,
      apagada_em: row.apagada_em ?? null,
      apagada_para_todos: row.apagada_para_todos ?? false,
      favorita_ids: row.favorita_ids ?? [],
      status: (row.status as CrmMensagem['status']) ?? null,
    } as CrmMensagem;
  });
}

async function enviarMensagem(leadId: string, texto: string, respondendoWaId?: string, respondendoId?: string): Promise<void> {
  if (IS_DEMO) {
    demoMensagens.push({ id: crypto.randomUUID(), lead_id: leadId, direcao: 'enviada', texto, hora: new Date().toISOString() });
    return;
  }
  const { error } = await supabase.functions.invoke('zapi-enviar', {
    body: { leadId, acao: 'text', texto, respondendoWaId, respondendoId },
  });
  if (error) throw error;
}

/** Envia mídia: primeiro sobe pro bucket crm-media, depois manda pela Z-API. */
async function enviarMidia(params: {
  leadId: string;
  tipo: 'imagem' | 'audio' | 'documento';
  arquivo: File | Blob;
  nome?: string;
  mime?: string;
  legenda?: string;
  duracao?: number;
  respondendoWaId?: string;
  respondendoId?: string;
}): Promise<void> {
  const nome = params.nome ?? ('arquivo' as string);
  const mime = params.mime ?? (params.arquivo as File).type ?? 'application/octet-stream';
  // Supabase Storage rejeita acentos, espaços e caracteres especiais na key.
  const nomeSeguro = nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'arquivo';
  const path = `${params.leadId}/${crypto.randomUUID()}-${nomeSeguro}`;

  if (!IS_DEMO) {
    // Upload no Storage (bucket crm-media).
    const { error: upErr } = await supabase.storage
      .from('crm-media')
      .upload(path, params.arquivo, { contentType: mime, upsert: false });
    if (upErr) throw upErr;
  }

  // Gera URL pública temporária para a Z-API baixar.
  const dataUrl = IS_DEMO ? URL.createObjectURL(params.arquivo) : (await urlAssinada(path));

  // A Edge Function usa nomes em inglês para "acao" (bate com endpoints Z-API).
  const acaoMap = { imagem: 'image', audio: 'audio', documento: 'document' } as const;
  const body: Record<string, unknown> = {
    leadId: params.leadId,
    acao: acaoMap[params.tipo],
    respondendoWaId: params.respondendoWaId,
    respondendoId: params.respondendoId,
    midiaPath: path,
    midiaMime: mime,
    midiaNome: nome,
  };
  if (params.tipo === 'imagem') body.imagemUrl = dataUrl;
  if (params.tipo === 'audio')  { body.audioUrl = dataUrl; if (params.duracao) body.duracao = params.duracao; }
  if (params.tipo === 'documento') { body.docUrl = dataUrl; body.docNome = nome; body.docMime = mime; }
  if (params.legenda) body.legenda = params.legenda;

  if (IS_DEMO) {
    demoMensagens.push({ id: crypto.randomUUID(), lead_id: params.leadId, direcao: 'enviada', texto: params.legenda ?? '', hora: new Date().toISOString() });
    return;
  }

  const { error } = await supabase.functions.invoke('zapi-enviar', { body });
  if (error) throw error;
}

async function urlAssinada(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('crm-media').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

async function reagirMensagem(leadId: string, waMessageId: string, emoji: string): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.functions.invoke('zapi-enviar', {
    body: { leadId, acao: 'reaction', waMessageId, emoji },
  });
  if (error) throw error;
}

async function apagarMensagem(leadId: string, waMessageId: string, paraTodos: boolean): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.functions.invoke('zapi-enviar', {
    body: { leadId, acao: 'delete', waMessageId, paraTodos },
  });
  if (error) throw error;
}

async function editarMensagem(leadId: string, waMessageId: string, texto: string): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.functions.invoke('zapi-enviar', {
    body: { leadId, acao: 'edit', waMessageId, texto },
  });
  if (error) throw error;
}

async function favoritarMensagem(messagemId: string, favorita: boolean): Promise<void> {
  if (IS_DEMO) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('não autenticado');
  const { data: atual } = await supabase.from('crm_mensagens').select('favorita_ids').eq('id', messagemId).maybeSingle();
  const arr: string[] = (atual as { favorita_ids?: string[] } | null)?.favorita_ids ?? [];
  const proximo = favorita ? Array.from(new Set([...arr, user.id])) : arr.filter((x) => x !== user.id);
  const { error } = await supabase.from('crm_mensagens').update({ favorita_ids: proximo } as never).eq('id', messagemId);
  if (error) throw error;
}

async function enviarEnquete(leadId: string, pergunta: string, opcoes: string[], multi: boolean): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.functions.invoke('zapi-enviar', {
    body: { leadId, acao: 'poll', pergunta, opcoes, multi },
  });
  if (error) throw error;
}

async function enviarEvento(
  leadId: string, titulo: string, inicio: string, fim: string | null, local: string | null, descricao: string | null,
): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.functions.invoke('zapi-enviar', {
    body: { leadId, acao: 'event', titulo, inicio, fim, local, descricao },
  });
  if (error) throw error;
}

async function enviarContato(leadId: string, contatoNome: string, contatoTelefone: string): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.functions.invoke('zapi-enviar', {
    body: { leadId, acao: 'contact', contatoNome, contatoTelefone },
  });
  if (error) throw error;
}

async function encaminharMensagem(leadId: string, waMessageId: string, paraTelefone: string): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.functions.invoke('zapi-enviar', {
    body: { leadId, acao: 'forward', waMessageId, paraTelefone },
  });
  if (error) throw error;
}

export function useCrmLeads(etiqueta = '') {
  return useQuery({ queryKey: crmKeys.leads(etiqueta), queryFn: () => fetchLeads(etiqueta) });
}
export function useCrmMensagens(leadId: string | undefined) {
  return useQuery({
    queryKey: crmKeys.mensagens(leadId ?? ''),
    queryFn: () => fetchMensagens(leadId as string),
    enabled: Boolean(leadId),
  });
}
async function deleteLead(id: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoLeads.findIndex((x) => x.id === id);
    if (i >= 0) demoLeads.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('crm_leads').delete().eq('id', id);
  if (error) throw error;
}

export function useSalvarLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: CrmLeadFormData }) => saveLead(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.all }),
  });
}

export function useExcluirLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.all }),
  });
}

export function useMoverLeadEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; etapa: string }) => {
      const alvo = demoLeads.find((x) => x.id === p.id);
      if (alvo) alvo.etapa = p.etapa;
      const { error } = await supabase.from('crm_leads').update({ etapa: p.etapa } as never).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.all }),
  });
}
export function useEnviarMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; texto: string; respondendoWaId?: string; respondendoId?: string }) =>
      enviarMensagem(p.leadId, p.texto, p.respondendoWaId, p.respondendoId),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: crmKeys.mensagens(p.leadId) }),
  });
}
export function useEnviarMidia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Parameters<typeof enviarMidia>[0]) => enviarMidia(p),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: crmKeys.mensagens(p.leadId) }),
  });
}
export function useReagirMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; waMessageId: string; emoji: string }) =>
      reagirMensagem(p.leadId, p.waMessageId, p.emoji),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: crmKeys.mensagens(p.leadId) }),
  });
}
export function useApagarMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; waMessageId: string; paraTodos: boolean }) =>
      apagarMensagem(p.leadId, p.waMessageId, p.paraTodos),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: crmKeys.mensagens(p.leadId) }),
  });
}
export function useEditarMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; waMessageId: string; texto: string }) =>
      editarMensagem(p.leadId, p.waMessageId, p.texto),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: crmKeys.mensagens(p.leadId) }),
  });
}
export function useFavoritarMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; messagemId: string; favorita: boolean }) =>
      favoritarMensagem(p.messagemId, p.favorita),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: crmKeys.mensagens(p.leadId) }),
  });
}
export function useEnviarEnquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; pergunta: string; opcoes: string[]; multi: boolean }) =>
      enviarEnquete(p.leadId, p.pergunta, p.opcoes, p.multi),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: crmKeys.mensagens(p.leadId) }),
  });
}
export function useEnviarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; titulo: string; inicio: string; fim: string | null; local: string | null; descricao: string | null }) =>
      enviarEvento(p.leadId, p.titulo, p.inicio, p.fim, p.local, p.descricao),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: crmKeys.mensagens(p.leadId) }),
  });
}
export function useEnviarContato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; contatoNome: string; contatoTelefone: string }) =>
      enviarContato(p.leadId, p.contatoNome, p.contatoTelefone),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: crmKeys.mensagens(p.leadId) }),
  });
}
export function useEncaminharMensagem() {
  return useMutation({
    mutationFn: (p: { leadId: string; waMessageId: string; paraTelefone: string }) =>
      encaminharMensagem(p.leadId, p.waMessageId, p.paraTelefone),
  });
}
