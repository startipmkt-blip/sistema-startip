import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import {
  linkAprovacaoIdeias, useEnviarIdeias, useExcluirIdeia, useLembrarIdeias, useMoverIdeia, useRecolherIdeia,
} from '@/modules/gestao-conteudo/api/ideiasApi';
import { pilaresEditoriais } from '@/modules/gestao-conteudo/api/pilaresApi';
import { SEMANA_EXTRA, STATUS_IDEIA, mesLabel, type Ideia, type StatusIdeia } from '@/modules/gestao-conteudo/types';
import { semanasRotuladas } from '@/modules/gestao-conteudo/lib/semanas';
import { baixarPdfLinhaEditorial } from '@/modules/gestao-conteudo/lib/pdfLinhaEditorial';
import type { ClienteGestao } from '@/modules/gestao-conteudo/utils';
import { IdeiaFormModal } from './IdeiaFormModal';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { confirmar } from '@/shared/ui/ConfirmDialog';
import { PLATAFORMAS } from '@/shared/ui/form/FormKit';

interface Props {
  cliente: ClienteGestao;
  mes: string;
  ideias: Ideia[];
}

/** Só rascunhos e reprovadas voltam para o cliente. */
const ENVIAVEL: StatusIdeia[] = ['rascunho', 'reprovada'];

const FORMATO_CHIP: Record<string, { label: string; icone: string; cls: string }> = {
  reels: { label: 'Vídeo', icone: 'video', cls: 'bg-violet-500/10 text-violet-300' },
  carrossel: { label: 'Carrossel', icone: 'layers', cls: 'bg-blue-500/10 text-blue-300' },
  estatico: { label: 'Imagem', icone: 'image', cls: 'bg-emerald-500/10 text-emerald-300' },
};

function dm(iso: string) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d}/${m}`;
}

/** Quadro "Linha Editorial": semanas do mês + conteúdo extra, com envio para o cliente aprovar. */
export function LinhaEditorial({ cliente, mes, ideias }: Props) {
  const enviar = useEnviarIdeias();
  const lembrar = useLembrarIdeias();
  const excluir = useExcluirIdeia();
  const recolher = useRecolherIdeia();
  const mover = useMoverIdeia();
  const pilaresQ = pilaresEditoriais.useLista();

  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [form, setForm] = useState<{ ideia?: Ideia; semana: number } | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);

  const pilares = useMemo(() => new Map((pilaresQ.data ?? []).map((p) => [p.id, p])), [pilaresQ.data]);
  const semanas = useMemo(() => semanasRotuladas(mes), [mes]);
  const quadros = [
    ...semanas.map((s) => ({ numero: s.numero, titulo: `Semana ${s.numero}`, periodo: `${dm(s.ini)} - ${dm(s.fim)}`, periodoLongo: s.periodo })),
    { numero: SEMANA_EXTRA, titulo: 'Conteúdo extra', periodo: '', periodoLongo: '' },
  ];
  // Ideia antiga numa semana que o mês não tem (ex.: semana 5 num mês de 4) vai para "Conteúdo extra".
  const numeros = new Set(quadros.map((q) => q.numero));
  const quadroDe = (i: Ideia) => (numeros.has(i.semana) ? i.semana : SEMANA_EXTRA);

  const link = cliente.central_slug ? linkAprovacaoIdeias(cliente.central_slug, mes) : null;
  const aguardando = ideias.filter((i) => i.status === 'enviada');
  const enviaveis = ideias.filter((i) => ENVIAVEL.includes(i.status));
  const total = ideias.length;
  const pct = (s: StatusIdeia) => (total ? Math.round((ideias.filter((i) => i.status === s).length / total) * 100) : 0);

  const ok = (texto: string) => setAviso({ tipo: 'ok', texto });
  const erro = (e: unknown) => setAviso({ tipo: 'erro', texto: (e as Error).message });

  function alternar(id: string) {
    setSelecionadas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function enviarSelecionadas() {
    if (!(await confirmar(`Enviar ${selecionadas.length} item(ns) para aprovação no WhatsApp de ${cliente.nome}?`))) return;
    setAviso(null);
    enviar.mutate(
      { clienteId: cliente.id, clienteNome: cliente.nome, slug: cliente.central_slug, mes, ids: selecionadas },
      { onSuccess: () => { setSelecionadas([]); ok('Enviado! O cliente recebeu o link da linha editorial no WhatsApp.'); }, onError: erro },
    );
  }

  async function lembrarAgora() {
    if (!(await confirmar(`Reenviar o link para ${cliente.nome} (${aguardando.length} aguardando)?`))) return;
    setAviso(null);
    lembrar.mutate(
      { clienteId: cliente.id, clienteNome: cliente.nome, slug: cliente.central_slug, mes, ids: aguardando.map((i) => i.id) },
      { onSuccess: () => ok('Lembrete enviado ao cliente.'), onError: erro },
    );
  }

  async function pdf() {
    try {
      await baixarPdfLinhaEditorial({
        clienteNome: cliente.nome,
        mes,
        grupos: quadros.map((q) => ({ titulo: q.titulo, periodo: q.periodoLongo, itens: ideias.filter((i) => quadroDe(i) === q.numero) })),
        pilarNome: (id) => (id ? pilares.get(id)?.nome ?? '' : ''),
      });
    } catch (e) { erro(e); }
  }

  function soltar(numero: number, idArrastado: string) {
    const id = idArrastado || arrastando;
    if (id) {
      const i = ideias.find((x) => x.id === id);
      if (i && quadroDe(i) !== numero) mover.mutate({ id: i.id, semana: numero }, { onError: erro });
    }
    setArrastando(null);
    setAlvo(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100"><GlassIcon name="calendar" className="h-5 w-5" /> Linha Editorial</h2>
          <p className="text-xs text-slate-400">O ciclo editorial de {cliente.nome} em prática · {mesLabel(mes)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void pdf()} disabled={total === 0}><GlassIcon name="download" className="h-4 w-4" /> Baixar PDF</Button>
          <button
            onClick={() => setForm({ semana: semanas[0]?.numero ?? 1 })}
            className="aba-escura inline-flex items-center gap-2 rounded-lg bg-[#0e1a24] px-4 py-2 text-sm font-semibold text-[#ffffff] hover:opacity-90"
          >
            <GlassIcon name="plus" tone="white" className="h-4 w-4" /> Adicionar item
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!link}
          onClick={() => { if (link) { void navigator.clipboard.writeText(link).then(() => ok('Link de aprovação copiado.'), () => ok(link)); } }}>
          <GlassIcon name="link" className="h-4 w-4" /> Copiar link
        </Button>
        <Button variant="secondary" size="sm" onClick={lembrarAgora} disabled={aguardando.length === 0 || lembrar.isPending || !cliente.whatsapp_chat_id}>
          <GlassIcon name="alarm" className="h-4 w-4" /> {lembrar.isPending ? 'Enviando…' : `Lembrar cliente (${aguardando.length})`}
        </Button>
        <Button size="sm" onClick={enviarSelecionadas} disabled={selecionadas.length === 0 || enviar.isPending || !cliente.whatsapp_chat_id}
          title={!cliente.whatsapp_chat_id ? 'Cliente sem WhatsApp cadastrado' : undefined}>
          <GlassIcon name="send" className="h-4 w-4" /> {enviar.isPending ? 'Enviando…' : `Enviar para aprovação (${selecionadas.length})`}
        </Button>
        {enviaveis.length > 0 && (
          <button className="text-xs font-semibold text-brand-300 hover:underline" onClick={() => setSelecionadas(enviaveis.map((i) => i.id))}>
            Selecionar pendentes de envio ({enviaveis.length})
          </button>
        )}
        {selecionadas.length > 0 && (
          <button className="text-xs text-slate-400 hover:underline" onClick={() => setSelecionadas([])}>Limpar seleção</button>
        )}
        <div className="ml-auto flex items-center gap-3 text-xs font-semibold text-slate-300" title="Aprovados · aguardando o cliente · reprovados">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {pct('aprovada')}%</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> {pct('enviada')}%</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> {pct('reprovada')}%</span>
        </div>
      </div>

      {aviso && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${aviso.tipo === 'ok' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>
          {aviso.texto}
        </p>
      )}
      {!cliente.whatsapp_chat_id && (
        <p className="text-xs text-amber-300"><GlassIcon name="alert" /> Este cliente não tem WhatsApp cadastrado: envio e lembrete ficam desativados. Você ainda pode copiar o link.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {quadros.map((q) => {
          const itens = ideias.filter((i) => quadroDe(i) === q.numero);
          return (
            <section
              key={q.numero}
              onDragOver={(e) => { e.preventDefault(); if (alvo !== q.numero) setAlvo(q.numero); }}
              onDragLeave={() => setAlvo((a) => (a === q.numero ? null : a))}
              onDrop={(e) => { e.preventDefault(); soltar(q.numero, e.dataTransfer.getData('text/plain')); }}
              className={`quadro-semana flex min-h-[150px] flex-col rounded-2xl border p-3 transition-colors ${
                alvo === q.numero ? 'border-brand-400 bg-brand-500/10' : 'border-white/10 bg-white/[0.02]'}`}
            >
              <div className="mb-2 flex items-start justify-between px-1">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-100">{q.titulo}</div>
                  {q.periodo && <div className="text-[11px] text-slate-400">{q.periodo}</div>}
                </div>
                <button onClick={() => setForm({ semana: q.numero })} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200" aria-label={`Adicionar em ${q.titulo}`}>
                  <GlassIcon name="plus" className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {itens.map((i) => {
                  const pilar = i.pilar_id ? pilares.get(i.pilar_id) : undefined;
                  const formato = FORMATO_CHIP[i.formato] ?? FORMATO_CHIP.reels;
                  const st = STATUS_IDEIA[i.status];
                  const podeSelecionar = ENVIAVEL.includes(i.status);
                  const marcada = selecionadas.includes(i.id);
                  const plataforma = PLATAFORMAS.find((p) => p.id === (i.plataformas ?? [])[0]);
                  return (
                    <article
                      key={i.id}
                      draggable
                      onDragStart={(e) => { setArrastando(i.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', i.id); }}
                      onDragEnd={() => { setArrastando(null); setAlvo(null); }}
                      className={`item-editorial group cursor-grab rounded-xl border border-l-[3px] bg-white/[0.04] p-3 active:cursor-grabbing ${
                        marcada ? 'border-brand-400' : 'border-white/10'} ${arrastando === i.id ? 'opacity-40' : ''}`}
                      style={{ borderLeftColor: pilar?.cor ?? '#94a3b8' }}
                    >
                      <div className="flex items-start gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${formato.cls}`}>
                          <GlassIcon name={formato.icone} className="h-3 w-3" /> {formato.label}
                        </span>
                        {pilar && (
                          <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${pilar.cor}1a`, color: pilar.cor }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pilar.cor }} /> {pilar.nome}
                          </span>
                        )}
                        <span className="ml-auto flex gap-0.5">
                          {(i.plataformas ?? []).length > 0 && plataforma && <GlassIcon name={plataforma.icone ?? 'globe'} className="h-4 w-4" title={(i.plataformas ?? []).join(', ')} />}
                        </span>
                      </div>
                      <button type="button" onClick={() => setForm({ ideia: i, semana: i.semana })} className="mt-2 block w-full text-left text-sm font-semibold text-slate-100 hover:text-brand-300">
                        {i.titulo}
                      </button>
                      {i.descricao && <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{i.descricao}</p>}
                      {i.status === 'reprovada' && i.justificativa && (
                        <p className="mt-1.5 rounded-lg bg-red-500/10 p-1.5 text-xs text-red-300"><strong>O cliente pediu:</strong> {i.justificativa}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5 border-t border-white/[0.06] pt-2">
                        {podeSelecionar && (
                          <input type="checkbox" checked={marcada} onChange={() => alternar(i.id)} aria-label="Selecionar para enviar ao cliente" />
                        )}
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {(i.cenas?.length ?? 0) > 0 && <span className="text-[11px] text-slate-400">{i.cenas!.length} cenas</span>}
                        <span className="ml-auto flex items-center">
                          {i.status === 'enviada' && (
                            <button onClick={() => recolher.mutate(i.id)} className="rounded p-1 text-slate-400 hover:bg-white/10" title="Recolher (volta para rascunho e some do portal)" aria-label="Recolher">
                              <GlassIcon name="undo" className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => setForm({ ideia: i, semana: i.semana })} className="rounded p-1 text-slate-400 hover:bg-white/10" title="Editar" aria-label="Editar">
                            <GlassIcon name="pencil" className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={async () => { if (await confirmar(`Excluir "${i.titulo}"?`)) excluir.mutate(i.id); }} className="rounded p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400" title="Excluir" aria-label="Excluir">
                            <GlassIcon name="trash" className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                    </article>
                  );
                })}
                {itens.length === 0 && (
                  <div className="flex flex-1 items-center justify-center py-6 text-xs text-slate-400">Arraste itens para cá</div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {total === 0 && (
        <Card className="p-5 text-center text-sm text-slate-400">
          Nenhum item na linha editorial de {mesLabel(mes)}. Use <strong>Adicionar item</strong> ou o <strong>+</strong> de uma semana.
        </Card>
      )}

      {form && (
        <IdeiaFormModal open onClose={() => setForm(null)} clienteId={cliente.id} mes={mes} ideia={form.ideia} semanaInicial={form.semana} />
      )}
    </div>
  );
}
