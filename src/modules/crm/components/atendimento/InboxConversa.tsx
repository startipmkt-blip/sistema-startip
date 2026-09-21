import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  useCrmMensagens, useEnviarMensagem, useEtapasCrm,
  useReagirMensagem, useApagarMensagem, useEditarMensagem, useFavoritarMensagem,
  useEnviarTyping,
} from '@/modules/crm/api/crmApi';
import { useAuth } from '@/shared/auth/AuthProvider';
import { useMarcarMonitorado } from '@/modules/crm/api/solicitacoesApi';
import {
  useMarcarLida, useFixarConversa, useArquivarConversa,
  useAtribuirConversa, useMudarEtapa, useOperadores,
} from '@/modules/crm/api/atendimentoApi';
import type { CrmConversa, CrmMensagem } from '@/modules/crm/types';
import { MidiaBubble } from './MidiaBubble';
import { MidiaUploadModal } from './MidiaUploadModal';
import { ForwardModal } from './ForwardModal';
import { AudioRecorder } from './AudioRecorder';
import { RespostasRapidasModal } from './RespostasRapidasModal';
import { ContatoModal } from './ContatoModal';
import { EnqueteModal } from './EnqueteModal';
import { LocalizacaoModal } from './LocalizacaoModal';
import { LinkPreviewCard } from './LinkPreviewCard';
import { EventoModal } from './EventoModal';
import { BotoesModal } from './BotoesModal';
import { ListaModal } from './ListaModal';
import { GrupoMembrosModal } from './GrupoMembrosModal';
import { NotifBar } from './NotifBar';
import {
  useAssumirConversa, useLiberarConversa,
  useNotasInternas, useAdicionarNota,
  useRegistrarPresenca, usePresencas,
} from '@/modules/crm/api/multiAtendenteApi';
import { useRespostasRapidas, filtrarPorAtalho } from '@/modules/crm/api/respostasRapidasApi';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';

const EmojiPicker = lazy(() => import('./EmojiPicker'));

interface Props {
  conversa: CrmConversa;
  onIrParaFunil: () => void;
}

// Emojis mais comuns pra reação rápida (padrão WhatsApp).
const REACOES_RAPIDAS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥'];

export function InboxConversa({ conversa, onIrParaFunil }: Props) {
  const { data: mensagens, isLoading } = useCrmMensagens(conversa.id);
  const { data: etapas } = useEtapasCrm();
  const { data: operadores } = useOperadores();
  const enviar = useEnviarMensagem();
  const typing = useEnviarTyping();
  const reagir = useReagirMensagem();
  const apagar = useApagarMensagem();
  const editar = useEditarMensagem();
  const favoritar = useFavoritarMensagem();
  const marcarMonitorado = useMarcarMonitorado();
  const { profile } = useAuth();
  const marcarLida = useMarcarLida();
  const fixar = useFixarConversa();
  const arquivar = useArquivarConversa();
  const atribuir = useAtribuirConversa();
  const mudarEtapa = useMudarEtapa();
  const assumir = useAssumirConversa();
  const liberar = useLiberarConversa();
  const { data: notas } = useNotasInternas(conversa.id);
  const adicionarNota = useAdicionarNota();
  useRegistrarPresenca(conversa.id);
  const { data: presencas } = usePresencas(conversa.id);

  const [texto, setTexto] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [anexoMenuOpen, setAnexoMenuOpen] = useState(false);
  const [uploadArquivo, setUploadArquivo] = useState<{ tipo: 'imagem' | 'audio' | 'documento'; arquivo: File } | null>(null);
  const [gravandoAudio, setGravandoAudio] = useState<MediaStream | null | true>(false as unknown as null);
  const [micErro, setMicErro] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [contatoOpen, setContatoOpen] = useState(false);
  const [enqueteOpen, setEnqueteOpen] = useState(false);
  const [eventoOpen, setEventoOpen] = useState(false);
  const [localOpen, setLocalOpen] = useState(false);
  const [botoesOpen, setBotoesOpen] = useState(false);
  const [listaOpen, setListaOpen] = useState(false);
  const [membrosOpen, setMembrosOpen] = useState(false);
  const { lista: templates } = useRespostasRapidas();
  const [respondendo, setRespondendo] = useState<CrmMensagem | null>(null);
  const [reacaoAlvoId, setReacaoAlvoId] = useState<string | null>(null);
  const [encaminharAlvo, setEncaminharAlvo] = useState<CrmMensagem | null>(null);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [dadosMsg, setDadosMsg] = useState<CrmMensagem | null>(null);
  const [editandoMsg, setEditandoMsg] = useState<{ msg: CrmMensagem; texto: string } | null>(null);
  const [apagarMsg, setApagarMsg] = useState<CrmMensagem | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputImgRef = useRef<HTMLInputElement>(null);
  const inputDocRef = useRef<HTMLInputElement>(null);
  const inputCamRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversa.nao_lidas > 0) marcarLida.mutate(conversa.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversa.id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens?.length]);

  const listaOperadores = operadores ?? [];
  const listaEtapas = useMemo(() => etapas ?? [], [etapas]);
  const mensagensPorId = useMemo(() => {
    const m = new Map<string, CrmMensagem>();
    (mensagens ?? []).forEach((x) => m.set(x.id, x));
    return m;
  }, [mensagens]);

  // Timeline unificada: mensagens + notas internas ordenadas por data.
  const timelineItens = useMemo(() => {
    type Item = { tipo: 'msg'; m: CrmMensagem; ts: number } | { tipo: 'nota'; n: { id: string; texto: string; autor_nome: string | null; created_at: string }; ts: number };
    const itens: Item[] = [];
    for (const m of (mensagens ?? [])) itens.push({ tipo: 'msg', m, ts: new Date(m.hora).getTime() });
    for (const n of (notas ?? [])) itens.push({ tipo: 'nota', n, ts: new Date(n.created_at).getTime() });
    itens.sort((a, b) => a.ts - b.ts);
    return itens;
  }, [mensagens, notas]);

  const typingRef = useRef<number | null>(null);
  const typingUltimoRef = useRef<number>(0);

  const bloqueadoPorAtendente = Boolean(
    conversa.atendente_id && profile?.id && conversa.atendente_id !== profile.id,
  );

  async function handleEnviar() {
    const t = texto.trim();
    if (!t) return;
    if (bloqueadoPorAtendente) {
      alert('Essa conversa está com outro atendente. Assuma antes de enviar.');
      return;
    }
    await enviar.mutateAsync({
      leadId: conversa.id, texto: t,
      respondendoWaId: respondendo?.wa_message_id ?? undefined,
      respondendoId: respondendo?.id,
    });
    setTexto('');
    setRespondendo(null);
  }

  function abrirAnexo(tipo: 'imagem' | 'documento' | 'camera') {
    setAnexoMenuOpen(false);
    if (tipo === 'imagem') inputImgRef.current?.click();
    if (tipo === 'documento') inputDocRef.current?.click();
    if (tipo === 'camera') inputCamRef.current?.click();
  }

  function handleArquivoEscolhido(tipo: 'imagem' | 'audio' | 'documento', f: File | undefined) {
    if (!f) return;
    // Se veio um vídeo pelo input "foto ou vídeo", trata como documento
    // (a Z-API aceita vídeo via send-document sem problema).
    const tipoFinal = (tipo === 'imagem' && f.type.startsWith('video/')) ? 'documento' : tipo;
    setUploadArquivo({ tipo: tipoFinal, arquivo: f });
  }

  async function handleReagir(m: CrmMensagem, emoji: string) {
    if (!m.wa_message_id) return;
    await reagir.mutateAsync({ leadId: conversa.id, waMessageId: m.wa_message_id, emoji });
    setReacaoAlvoId(null);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${
              conversa.is_grupo ? 'bg-amber-500/15 text-amber-300' : 'bg-brand-500/15 text-brand-200'
            }`}
          >
            {conversa.is_grupo ? '👥' : conversa.nome.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-100">{conversa.nome}</span>
              {conversa.is_grupo && <Badge tone="amber">Grupo</Badge>}
            </div>
            <div className="text-xs text-slate-400">
              📞 {conversa.telefone} {conversa.origem ? `· ${conversa.origem}` : ''}
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-400">
            Etapa:
            <select
              value={conversa.etapa}
              onChange={(e) => mudarEtapa.mutate({ leadId: conversa.id, etapa: e.target.value })}
              className="rounded-md border border-white/15 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]"
            >
              {listaEtapas.map((et) => <option key={et.id} value={et.id}>{et.label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-400">
            Atendente:
            <select
              value={conversa.atendente_id ?? ''}
              onChange={(e) => atribuir.mutate({ leadId: conversa.id, atendenteId: e.target.value || null })}
              className="rounded-md border border-white/15 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]"
            >
              <option value="">Não atribuída</option>
              {listaOperadores.map((op) => <option key={op.id} value={op.id}>{op.nome}</option>)}
            </select>
          </label>
          {!conversa.atendente_id && (
            <button
              onClick={() => assumir.mutate(conversa.id)}
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
              disabled={assumir.isPending}
            >
              🙋 Assumir
            </button>
          )}
          {conversa.atendente_id && conversa.atendente_id === profile?.id && (
            <button
              onClick={() => liberar.mutate(conversa.id)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
              disabled={liberar.isPending}
              title="Devolver pra fila"
            >
              🔓 Liberar
            </button>
          )}
          <button
            onClick={() => fixar.mutate({ leadId: conversa.id, fixado: !conversa.fixado })}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
            title={conversa.fixado ? 'Desafixar' : 'Fixar no topo'}
          >
            {conversa.fixado ? '📌 Fixada' : '📌 Fixar'}
          </button>
          <button
            onClick={() => arquivar.mutate({ leadId: conversa.id, arquivado: !conversa.arquivado })}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
          >
            {conversa.arquivado ? '📤 Desarquivar' : '📦 Arquivar'}
          </button>
          {conversa.is_grupo && (
            <button
              onClick={() => setMembrosOpen(true)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
              title="Ver participantes do grupo"
            >
              👥 Membros
            </button>
          )}
          {conversa.is_grupo && (
            <button
              onClick={() =>
                marcarMonitorado.mutate({
                  leadId: conversa.id,
                  monitorado: !conversa.monitorado,
                })
              }
              className={`rounded-md border px-2 py-1 text-xs hover:bg-white/10 ${
                conversa.monitorado
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-slate-200'
              }`}
              title="Agente Turbo cria solicitação para mensagens sem resposta"
            >
              🤖 {conversa.monitorado ? 'Monitorado' : 'Ativar Agente'}
            </button>
          )}
          <button
            onClick={() => setTemplatesOpen(true)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
            title="Gerenciar respostas rápidas"
          >
            ⚡ Templates
          </button>
          <button
            onClick={() => {
              const t = window.prompt('Nota interna (não vai pro cliente):');
              if (t && t.trim()) adicionarNota.mutate({ leadId: conversa.id, texto: t.trim() });
            }}
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/20"
            title="Nota interna visível só para a equipe"
          >
            📝 Nota
          </button>
          <NotifBar />
          <Button variant="secondary" onClick={onIrParaFunil}>Ver no funil</Button>
        </div>
      </div>

      {/* Banners multi-atendente */}
      {bloqueadoPorAtendente && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          <span>⚠️ Esta conversa está com <strong>{conversa.atendente_nome ?? 'outro atendente'}</strong>. Você está em modo leitura.</span>
          <button
            onClick={() => assumir.mutate(conversa.id)}
            className="rounded-md border border-amber-400/50 bg-amber-500/20 px-2 py-1 font-semibold hover:bg-amber-500/30"
            disabled={assumir.isPending}
          >Assumir mesmo assim</button>
        </div>
      )}
      {(presencas ?? []).filter((p) => p.user_id !== profile?.id).length > 0 && (
        <div className="border-b border-white/10 bg-white/5 px-4 py-1.5 text-[11px] text-slate-400">
          👀 {(presencas ?? []).filter((p) => p.user_id !== profile?.id).map((p) => p.user_nome ?? 'alguém').join(', ')} {(presencas ?? []).filter((p) => p.user_id !== profile?.id).length === 1 ? 'está vendo essa conversa' : 'estão vendo essa conversa'}
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 space-y-1 overflow-y-auto px-1 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : timelineItens.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">Sem mensagens ainda.</p>
        ) : (
          timelineItens.map((item) => {
            if (item.tipo === 'nota') {
              const n = item.n;
              return (
                <div key={`n-${n.id}`} className="my-2 flex justify-center">
                  <div className="max-w-[85%] rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    <div className="mb-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-amber-300/80">
                      <span>📝 nota interna</span>
                      <span>·</span>
                      <span>{n.autor_nome ?? 'anônimo'}</span>
                      <span>·</span>
                      <span>{new Date(n.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{n.texto}</div>
                  </div>
                </div>
              );
            }
            const m = item.m;
            const enviada = m.direcao === 'enviada';
            const quote = m.respondendo_id ? mensagensPorId.get(m.respondendo_id) : null;
            return (
              <div
                key={m.id}
                className={`group flex ${enviada ? 'justify-end' : 'justify-start'}`}
                onMouseLeave={() => menuMsgId === m.id && setMenuMsgId(null)}
              >
                <div className="relative max-w-[70%]">
                  {/* Menu de ações (ao passar mouse) */}
                  {m.wa_message_id && (
                    <button
                      onClick={() => setMenuMsgId(menuMsgId === m.id ? null : m.id)}
                      className={`absolute top-1 z-10 rounded-full bg-slate-900/70 px-1.5 py-0.5 text-xs text-white transition-opacity hover:bg-slate-900 opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
                        enviada ? '-left-6' : '-right-6'
                      }`}
                      title="Ações"
                    >
                      ⋯
                    </button>
                  )}
                  {menuMsgId === m.id && (
                    <div
                      className={`absolute top-6 z-20 w-52 rounded-md border border-white/10 bg-slate-900 py-1 text-xs shadow-2xl ${
                        enviada ? 'right-0' : 'left-0'
                      }`}
                    >
                      <button
                        onClick={() => { setDadosMsg(m); setMenuMsgId(null); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-slate-200 hover:bg-white/5"
                      >
                        ℹ️ Dados da mensagem
                      </button>
                      <button
                        onClick={() => { setRespondendo(m); setMenuMsgId(null); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-slate-200 hover:bg-white/5"
                      >
                        ↩️ Responder
                      </button>
                      <button
                        onClick={() => {
                          const t = m.texto || (m.tipo ? `[${m.tipo}]` : '');
                          navigator.clipboard.writeText(t).catch(() => { /* clipboard bloqueado */ });
                          setMenuMsgId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-slate-200 hover:bg-white/5"
                      >
                        📋 Copiar
                      </button>
                      <button
                        onClick={() => { setEncaminharAlvo(m); setMenuMsgId(null); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-slate-200 hover:bg-white/5"
                      >
                        ↪️ Encaminhar
                      </button>
                      <button
                        onClick={() => { setReacaoAlvoId(m.id); setMenuMsgId(null); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-slate-200 hover:bg-white/5"
                      >
                        😊 Reagir
                      </button>
                      <button
                        onClick={() => {
                          const jaFav = m.favorita_ids?.includes(profile?.id ?? '') ?? false;
                          favoritar.mutate({ leadId: conversa.id, messagemId: m.id, favorita: !jaFav });
                          setMenuMsgId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-slate-200 hover:bg-white/5"
                      >
                        {m.favorita_ids?.includes(profile?.id ?? '') ? '⭐ Desfavoritar' : '⭐ Favoritar'}
                      </button>
                      {enviada && (m.tipo === 'texto' || !m.tipo) && (
                        <button
                          onClick={() => { setEditandoMsg({ msg: m, texto: m.texto }); setMenuMsgId(null); }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-slate-200 hover:bg-white/5"
                        >
                          ✏️ Editar
                        </button>
                      )}
                      <div className="my-0.5 h-px bg-white/5" />
                      <button
                        onClick={() => { setApagarMsg(m); setMenuMsgId(null); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-red-300 hover:bg-red-500/10"
                      >
                        🗑️ Apagar
                      </button>
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      enviada
                        ? 'rounded-br-sm bg-brand-600 text-white'
                        : 'rounded-bl-sm border border-white/10 bg-white/5 text-slate-100'
                    }`}
                  >
                    {/* Nome do remetente em grupo */}
                    {conversa.is_grupo && !enviada && m.nome_remetente && (
                      <div className="mb-0.5 text-[10px] font-medium text-brand-300">{m.nome_remetente}</div>
                    )}

                    {/* Quote (respondendo a) */}
                    {quote && (
                      <div className="mb-1 rounded-md border-l-2 border-brand-300 bg-black/20 px-2 py-1 text-[11px] text-slate-300">
                        <div className="font-medium text-brand-200">
                          {quote.direcao === 'enviada' ? 'Você' : (quote.nome_remetente || 'Contato')}
                        </div>
                        <div className="truncate">{quote.texto || `[${quote.tipo}]`}</div>
                      </div>
                    )}

                    {/* Conteúdo — mídia, texto ou "apagada" */}
                    {m.apagada_em ? (
                      <div className="italic text-slate-400">🚫 Esta mensagem foi apagada</div>
                    ) : m.tipo && m.tipo !== 'texto' ? (
                      <MidiaBubble msg={m} />
                    ) : (
                      <>
                        {m.texto && /https?:\/\//i.test(m.texto) && (
                          <LinkPreviewCard texto={m.texto} mensagemId={m.id} linkPreviewCache={m.link_preview ?? null} />
                        )}
                        <div className="whitespace-pre-wrap break-words">{m.texto}</div>
                      </>
                    )}

                    {/* Hora + editada + favorita */}
                    <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${enviada ? 'text-brand-100/70' : 'text-slate-500'}`}>
                      {m.favorita_ids && m.favorita_ids.length > 0 && (
                        <span title="Favoritada">⭐</span>
                      )}
                      <span>{new Date(m.hora).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {m.editada_em && <span className="italic">· editada</span>}
                      {enviada && m.status === 'enviada' && <span title="Enviada" className="text-slate-300">✓</span>}
                      {enviada && m.status === 'entregue' && <span title="Entregue" className="text-slate-300">✓✓</span>}
                      {enviada && m.status === 'lida' && <span title="Lida" className="text-blue-300">✓✓</span>}
                      {enviada && m.status === 'falhou' && <span title="Falhou">⚠️</span>}
                    </div>
                  </div>

                  {/* Reações */}
                  {m.reacoes && Object.keys(m.reacoes).length > 0 && (
                    <div className={`mt-1 flex flex-wrap gap-1 ${enviada ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(m.reacoes).map(([emoji, quem]) => (
                        <span
                          key={emoji}
                          className="rounded-full border border-white/10 bg-slate-800 px-1.5 py-0.5 text-xs"
                          title={quem.join(', ')}
                        >
                          {emoji} {quem.length > 1 ? quem.length : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Picker de reação rápido */}
                  {reacaoAlvoId === m.id && (
                    <div className={`mt-1 flex gap-1 rounded-full border border-white/10 bg-slate-900 p-1 ${enviada ? 'justify-end' : 'justify-start'}`}>
                      {REACOES_RAPIDAS.map((e) => (
                        <button
                          key={e}
                          onClick={() => handleReagir(m, e)}
                          className="rounded-full px-1 text-lg hover:bg-white/10"
                        >
                          {e}
                        </button>
                      ))}
                      <button
                        onClick={() => handleReagir(m, '')}
                        className="rounded-full px-2 text-xs text-slate-400 hover:bg-white/10"
                      >
                        limpar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={fimRef} />
      </div>

      {/* Barra "Respondendo a" */}
      {respondendo && (
        <div className="mx-1 mb-2 flex items-start gap-2 rounded-md border-l-4 border-brand-400 bg-white/5 px-3 py-2 text-xs">
          <div className="flex-1">
            <div className="font-medium text-brand-200">
              Respondendo a {respondendo.direcao === 'enviada' ? 'você mesmo' : (respondendo.nome_remetente || 'contato')}
            </div>
            <div className="truncate text-slate-300">{respondendo.texto || `[${respondendo.tipo}]`}</div>
          </div>
          <button onClick={() => setRespondendo(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Compositor */}
      <div className="relative mt-2 flex items-end gap-2 border-t border-white/10 pt-3">
        {gravandoAudio && gravandoAudio !== true && (
          <div className="flex-1">
            <AudioRecorder
              leadId={conversa.id}
              stream={gravandoAudio as MediaStream}
              respondendoWaId={respondendo?.wa_message_id ?? undefined}
              respondendoId={respondendo?.id}
              onCancel={() => setGravandoAudio(false as unknown as null)}
              onEnviado={() => { setGravandoAudio(false as unknown as null); setRespondendo(null); }}
            />
          </div>
        )}
        {micErro && !gravandoAudio && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            ⚠️ {micErro}
            <button onClick={() => setMicErro(null)} className="ml-auto rounded px-2 py-1 hover:bg-white/10">Fechar</button>
          </div>
        )}
        {!gravandoAudio && emojiOpen && (
          <div className="absolute bottom-full left-0 z-30 mb-2 shadow-2xl">
            <Suspense fallback={<div className="rounded-md bg-slate-800 p-3 text-xs text-slate-300">Carregando…</div>}>
              <EmojiPicker
                onSelect={(nativo) => { setTexto((t) => t + nativo); setEmojiOpen(false); }}
              />
            </Suspense>
          </div>
        )}
        {anexoMenuOpen && (
          <div className="absolute bottom-full left-12 z-30 mb-2 rounded-md border border-white/10 bg-slate-900 py-1 text-sm shadow-2xl">
            <button onClick={() => abrirAnexo('imagem')} className="flex w-full items-center gap-2 px-4 py-2 text-slate-200 hover:bg-white/5">
              🖼️ Galeria (foto/vídeo)
            </button>
            <button onClick={() => abrirAnexo('camera')} className="flex w-full items-center gap-2 px-4 py-2 text-slate-200 hover:bg-white/5">
              📷 Câmera (tirar foto)
            </button>
            <button onClick={() => abrirAnexo('documento')} className="flex w-full items-center gap-2 px-4 py-2 text-slate-200 hover:bg-white/5">
              📎 Documento
            </button>
            <button
              onClick={() => { setAnexoMenuOpen(false); setContatoOpen(true); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-slate-200 hover:bg-white/5"
            >
              👤 Contato
            </button>
            <button
              onClick={() => { setAnexoMenuOpen(false); setEnqueteOpen(true); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-slate-200 hover:bg-white/5"
            >
              📊 Enquete
            </button>
            <button
              onClick={() => { setAnexoMenuOpen(false); setEventoOpen(true); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-slate-200 hover:bg-white/5"
            >
              📅 Evento
            </button>
            <button
              onClick={() => { setAnexoMenuOpen(false); setLocalOpen(true); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-slate-200 hover:bg-white/5"
            >
              📍 Localização
            </button>
            <button
              onClick={() => { setAnexoMenuOpen(false); setBotoesOpen(true); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-slate-200 hover:bg-white/5"
            >
              🔘 Botões (até 3)
            </button>
            <button
              onClick={() => { setAnexoMenuOpen(false); setListaOpen(true); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-slate-200 hover:bg-white/5"
            >
              📋 Lista interativa
            </button>
          </div>
        )}

        {/* Botão anexos */}
        <button
          type="button"
          onClick={() => { setAnexoMenuOpen((v) => !v); setEmojiOpen(false); }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10"
          title="Anexar arquivo"
        >
          +
        </button>

        {/* Inputs escondidos */}
        <input ref={inputImgRef} type="file" accept="image/*,video/*" className="hidden"
               onChange={(e) => handleArquivoEscolhido('imagem', e.target.files?.[0])} />
        <input ref={inputDocRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" className="hidden"
               onChange={(e) => handleArquivoEscolhido('documento', e.target.files?.[0])} />
        {/* Câmera: capture="environment" abre direto a câmera traseira em mobile;
            em desktop cai no seletor normal de arquivo. */}
        <input ref={inputCamRef} type="file" accept="image/*" capture="environment" className="hidden"
               onChange={(e) => handleArquivoEscolhido('imagem', e.target.files?.[0])} />

        {/* Botão emoji */}
        <button
          type="button"
          onClick={() => { setEmojiOpen((v) => !v); setAnexoMenuOpen(false); }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10"
          title="Emojis"
        >
          😊
        </button>

        {!gravandoAudio && texto.startsWith('/') && (() => {
          const busca = texto.slice(1).split(/\s/)[0] ?? '';
          const sugeridos = filtrarPorAtalho(templates, busca).slice(0, 5);
          if (sugeridos.length === 0) return null;
          return (
            <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-md border border-white/10 bg-slate-900 text-sm shadow-2xl">
              <div className="border-b border-white/5 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                Respostas rápidas
              </div>
              {sugeridos.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTexto(r.texto)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-white/5"
                >
                  <span className="mt-0.5 shrink-0 rounded bg-brand-500/20 px-1.5 py-0.5 font-mono text-[11px] text-brand-200">/{r.atalho}</span>
                  <span className="text-slate-200 line-clamp-2">{r.texto}</span>
                </button>
              ))}
            </div>
          );
        })()}
        {!gravandoAudio && (
          <>
            <textarea
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                if (typingRef.current) window.clearTimeout(typingRef.current);
                if (e.target.value.trim().length > 0 && !bloqueadoPorAtendente) {
                  // Ping a Z-API a cada 4s enquanto digita (evita spam)
                  if (!typingUltimoRef.current || Date.now() - typingUltimoRef.current > 4000) {
                    typingUltimoRef.current = Date.now();
                    typing.mutate(conversa.id);
                  }
                  typingRef.current = window.setTimeout(() => { typingUltimoRef.current = 0; }, 5000);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEnviar();
                }
              }}
              rows={2}
              placeholder="Escreva uma resposta… (Enter envia, Shift+Enter quebra linha)"
              className="min-h-11 flex-1 resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
            />
            {texto.trim() ? (
              <Button onClick={handleEnviar} disabled={enviar.isPending}>
                {enviar.isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setEmojiOpen(false);
                  setAnexoMenuOpen(false);
                  setMicErro(null);
                  try {
                    if (!navigator.mediaDevices?.getUserMedia) {
                      throw new Error('Seu navegador não suporta gravação de áudio.');
                    }
                    // Pedido inline no clique — user gesture direto, sem passar por useEffect.
                    // Lista mics disponíveis primeiro pra dar mensagem mais clara em NotFoundError.
                    let temMic = true;
                    try {
                      const devs = await navigator.mediaDevices.enumerateDevices();
                      temMic = devs.some((d) => d.kind === 'audioinput');
                    } catch { /* alguns browsers exigem permissão pra enumerar; tenta getUserMedia direto */ }
                    if (!temMic) throw Object.assign(new Error('Nenhum microfone encontrado neste dispositivo.'), { name: 'NotFoundError' });
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    setGravandoAudio(stream);
                  } catch (e) {
                    const err = e as Error;
                    console.error('[mic] clique 🎤 falhou:', err.name, err.message);
                    const nome = err.name || '';
                    let msg = err.message || 'Falha ao acessar o microfone';
                    if (nome === 'NotAllowedError' || nome === 'SecurityError') {
                      msg = 'Permissão do microfone bloqueada. Clica no 🔒 da barra de endereço → permite Microfone → recarrega a página.';
                    } else if (nome === 'NotFoundError' || nome === 'OverconstrainedError' || /device not found/i.test(err.message)) {
                      msg = 'Nenhum microfone detectado. Verifica se o mic está conectado, e nas configurações do Windows/Mac se o app do navegador tem acesso.';
                    } else if (nome === 'NotReadableError') {
                      msg = 'O microfone está sendo usado por outro app. Fecha Zoom/Meet/Discord/OBS e tenta de novo.';
                    }
                    setMicErro(msg);
                  }
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10"
                title="Gravar áudio"
              >
                🎤
              </button>
            )}
          </>
        )}
      </div>

      {/* Modais */}
      {uploadArquivo && (
        <MidiaUploadModal
          open={true}
          onClose={() => setUploadArquivo(null)}
          leadId={conversa.id}
          tipo={uploadArquivo.tipo}
          arquivo={uploadArquivo.arquivo}
        />
      )}
      <RespostasRapidasModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <ContatoModal open={contatoOpen} onClose={() => setContatoOpen(false)} leadId={conversa.id} />
      <EnqueteModal open={enqueteOpen} onClose={() => setEnqueteOpen(false)} leadId={conversa.id} />
      <EventoModal open={eventoOpen} onClose={() => setEventoOpen(false)} leadId={conversa.id} />
      <LocalizacaoModal open={localOpen} onClose={() => setLocalOpen(false)} leadId={conversa.id} />
      <BotoesModal open={botoesOpen} onClose={() => setBotoesOpen(false)} leadId={conversa.id} />
      <ListaModal open={listaOpen} onClose={() => setListaOpen(false)} leadId={conversa.id} />
      {conversa.is_grupo && (
        <GrupoMembrosModal
          open={membrosOpen}
          onClose={() => setMembrosOpen(false)}
          leadId={conversa.id}
          nomeGrupo={conversa.nome}
        />
      )}

      {/* Dados da mensagem */}
      {dadosMsg && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={() => setDadosMsg(null)}>
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-slate-900 p-4 text-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-slate-100 font-medium">Dados da mensagem</div>
              <button onClick={() => setDadosMsg(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <dl className="space-y-2 text-xs text-slate-300">
              <div><dt className="text-slate-500">Enviada em</dt><dd>{new Date(dadosMsg.hora).toLocaleString('pt-BR')}</dd></div>
              <div><dt className="text-slate-500">Direção</dt><dd>{dadosMsg.direcao === 'enviada' ? 'Enviada por nós' : 'Recebida'}</dd></div>
              <div><dt className="text-slate-500">Tipo</dt><dd>{dadosMsg.tipo || 'texto'}</dd></div>
              {dadosMsg.editada_em && <div><dt className="text-slate-500">Editada em</dt><dd>{new Date(dadosMsg.editada_em).toLocaleString('pt-BR')}</dd></div>}
              {dadosMsg.wa_message_id && <div><dt className="text-slate-500">ID no WhatsApp</dt><dd className="break-all font-mono text-[10px]">{dadosMsg.wa_message_id}</dd></div>}
              <div><dt className="text-slate-500">Favoritada por</dt><dd>{dadosMsg.favorita_ids?.length || 0} atendente(s)</dd></div>
            </dl>
          </div>
        </div>
      )}

      {/* Editar mensagem */}
      {editandoMsg && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditandoMsg(null)}>
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-900 p-4 text-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-slate-100 font-medium">Editar mensagem</div>
            <textarea
              value={editandoMsg.texto}
              onChange={(e) => setEditandoMsg({ ...editandoMsg, texto: e.target.value })}
              rows={4}
              className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
            />
            <p className="mt-2 text-[11px] text-slate-500">
              O WhatsApp só permite editar mensagens de texto enviadas nos últimos 15 minutos.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditandoMsg(null)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  if (!editandoMsg.msg.wa_message_id) return;
                  await editar.mutateAsync({
                    leadId: conversa.id,
                    waMessageId: editandoMsg.msg.wa_message_id,
                    texto: editandoMsg.texto.trim(),
                  });
                  setEditandoMsg(null);
                }}
                disabled={editar.isPending || !editandoMsg.texto.trim()}
              >
                {editar.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Apagar mensagem */}
      {apagarMsg && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={() => setApagarMsg(null)}>
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-slate-900 p-4 text-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-slate-100 font-medium">Apagar mensagem</div>
            <p className="mb-4 text-xs text-slate-400">
              Você quer apagar essa mensagem só do painel ou também no WhatsApp de quem recebeu?
            </p>
            <div className="flex flex-col gap-2">
              {apagarMsg.direcao === 'enviada' && (
                <Button
                  onClick={async () => {
                    if (!apagarMsg.wa_message_id) return;
                    await apagar.mutateAsync({ leadId: conversa.id, waMessageId: apagarMsg.wa_message_id, paraTodos: true });
                    setApagarMsg(null);
                  }}
                  disabled={apagar.isPending}
                >
                  {apagar.isPending ? 'Apagando…' : '🗑️ Apagar para todos'}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!apagarMsg.wa_message_id) return;
                  await apagar.mutateAsync({ leadId: conversa.id, waMessageId: apagarMsg.wa_message_id, paraTodos: false });
                  setApagarMsg(null);
                }}
                disabled={apagar.isPending}
              >
                Apagar só pra mim
              </Button>
              <button onClick={() => setApagarMsg(null)} className="text-xs text-slate-500 hover:text-slate-300">Cancelar</button>
            </div>
            <p className="mt-3 text-[10px] text-slate-500">
              "Apagar para todos" só funciona nos ~7 minutos após o envio, é uma limitação do WhatsApp.
            </p>
          </div>
        </div>
      )}
      {encaminharAlvo && encaminharAlvo.wa_message_id && (
        <ForwardModal
          open={true}
          onClose={() => setEncaminharAlvo(null)}
          leadIdOrigem={conversa.id}
          waMessageId={encaminharAlvo.wa_message_id}
        />
      )}
    </div>
  );
}
