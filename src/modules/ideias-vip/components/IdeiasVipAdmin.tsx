import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import {
  useAtualizarLote, useCriarLote, useDuplicarLote, useExcluirIdeia, useExcluirLote, useIdeiasDoLote,
  useLotes, useReordenar, useResumoLotes, useSalvarIdeia,
} from '@/modules/ideias-vip/api/ideiasVipApi';
import { formatarDia, interpretar, modeloCsv, pendencias, temPendencia } from '@/modules/ideias-vip/lib/importar';
import { IDEA_TYPES, ideaVazia, tipoInfo } from '@/modules/ideias-vip/types';
import type { Idea, IdeaBatch, IdeaDraft, IdeaType } from '@/modules/ideias-vip/types';

// 16px no celular evita o zoom automático do iOS ao tocar nos campos.
const CAMPO = '!text-base sm:!text-sm min-h-[44px]';
const BTN = 'min-h-[44px]';

const mesTexto = (iso: string | null) => {
  if (!iso) return 'Sem mês';
  const [a, m] = iso.split('-').map(Number);
  const t = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(a, m - 1, 1));
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function IdeiasVipAdmin({ clienteId, clienteNome }: { clienteId: string; clienteNome: string }) {
  const { data: lotes, isLoading } = useLotes(clienteId);
  const { data: resumo } = useResumoLotes(clienteId);
  const atualizar = useAtualizarLote();
  const excluir = useExcluirLote();
  const [aberto, setAberto] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [duplicando, setDuplicando] = useState<IdeaBatch | null>(null);

  const loteAberto = lotes?.find((l) => l.id === aberto) ?? null;

  function publicar(l: IdeaBatch) {
    const pend = resumo?.[l.id]?.pendentes ?? 0;
    if (pend > 0 && !window.confirm(`${pend} ideia(s) ainda têm campos entre colchetes para preencher. Publicar mesmo assim?`)) return;
    atualizar.mutate({ id: l.id, status: 'publicado' });
  }

  if (loteAberto) {
    return <EditorLote lote={loteAberto} onVoltar={() => setAberto(null)} onPublicar={() => publicar(loteAberto)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Ideias do grupo VIP</h2>
          <p className="text-sm text-slate-400">Lotes de ideias de {clienteNome}. O cliente só vê os lotes publicados.</p>
        </div>
        <Button className={`${BTN} w-full sm:w-auto`} onClick={() => setImportando(true)}>Importar lote</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div>
        : !lotes?.length ? <Card><EmptyState message="Nenhum lote ainda. Use Importar lote para começar." /></Card>
        : (
          <div className="space-y-3">
            {lotes.map((l) => {
              const r = resumo?.[l.id] ?? { total: 0, usadas: 0, pendentes: 0 };
              return (
                <Card key={l.id} className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <button onClick={() => setAberto(l.id)} className="break-words text-left text-base font-semibold text-white hover:underline">{l.title}</button>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <Badge tone={l.status === 'publicado' ? 'green' : 'amber'}>{l.status === 'publicado' ? 'Publicado' : 'Rascunho'}</Badge>
                        {r.pendentes > 0 && <Badge tone="red">{r.pendentes} para preencher</Badge>}
                        <span>{mesTexto(l.reference_month)}</span>
                        <span>{r.total} ideias</span>
                        {l.status === 'publicado' && <span>{r.usadas} feitas pelo cliente</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <Button className={BTN} variant="secondary" onClick={() => setAberto(l.id)}>Abrir</Button>
                      {l.status === 'rascunho'
                        ? <Button className={BTN} onClick={() => publicar(l)} disabled={!r.total}>Publicar</Button>
                        : <Button className={BTN} variant="secondary" onClick={() => atualizar.mutate({ id: l.id, status: 'rascunho' })}>Voltar para rascunho</Button>}
                      <Button className={BTN} variant="secondary" onClick={() => setDuplicando(l)}>Duplicar</Button>
                      <Button className={BTN} variant="ghost" onClick={() => { if (window.confirm(`Excluir o lote "${l.title}" e todas as ideias dele?`)) excluir.mutate(l.id); }}>Excluir</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      {importando && <ImportarModal clienteId={clienteId} onClose={(id) => { setImportando(false); if (id) setAberto(id); }} />}
      {duplicando && <DuplicarModal lote={duplicando} clienteAtual={clienteId} onClose={() => setDuplicando(null)} />}
    </div>
  );
}

// ---------- Importação ----------
function ImportarModal({ clienteId, onClose }: { clienteId: string; onClose: (novoId?: string) => void }) {
  const hoje = new Date();
  const [titulo, setTitulo] = useState('');
  const [mes, setMes] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
  const [texto, setTexto] = useState('');
  const criar = useCriarLote();
  const ano = Number(mes.slice(0, 4)) || hoje.getFullYear();
  const analise = useMemo(() => (texto.trim() ? interpretar(texto, ano) : null), [texto, ano]);
  const validas = analise?.linhas.filter((l) => !l.erros.length) ?? [];
  const comErro = analise?.linhas.filter((l) => l.erros.length) ?? [];

  function baixarModelo() {
    const url = URL.createObjectURL(new Blob([modeloCsv()], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'modelo-ideias.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function lerArquivo(f: File | undefined) {
    if (f) setTexto(await f.text());
  }

  async function salvar() {
    const nome = titulo.trim() || mesTexto(`${mes}-01`);
    const id = await criar.mutateAsync({ clientId: clienteId, title: nome, referenceMonth: `${mes}-01`, ideias: validas.map((l) => l.dados) });
    onClose(id);
  }

  return (
    <Modal
      open onClose={() => onClose()} title="Importar lote de ideias" size="xl" fecharSoPorBotao
      footer={<div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Button className={BTN} variant="secondary" onClick={() => onClose()}>Cancelar</Button>
        <Button className={BTN} onClick={() => void salvar()} disabled={!validas.length || criar.isPending}>
          {criar.isPending ? 'Salvando' : `Salvar (${validas.length})`}
        </Button>
      </div>}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input className={CAMPO} label="Título do lote" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Novembro 2026" />
          <Input className={CAMPO} label="Mês de referência" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10">
            Enviar arquivo CSV
            <input type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={(e) => void lerArquivo(e.target.files?.[0])} />
          </label>
          <Button className={BTN} variant="secondary" onClick={baixarModelo}>Baixar modelo de planilha</Button>
          <span className="text-xs text-slate-400">Colunas: data, horario, tipo, tema, titulo, texto, midia</span>
        </div>
        <Textarea
          className="!text-base sm:!text-sm"
          label="Ou cole a tabela aqui (copiada do Excel, Google Sheets ou documento)"
          value={texto} onChange={(e) => setTexto(e.target.value)} rows={6} semLinks
          placeholder="A primeira linha precisa ter os nomes das colunas"
        />
        {analise?.erroGeral && <p className="text-sm text-red-300">{analise.erroGeral}</p>}
        {analise && !analise.erroGeral && (
          <div className="space-y-2">
            <p className="text-sm text-slate-300">
              {validas.length} linhas prontas{comErro.length > 0 && <>, <span className="text-red-300">{comErro.length} com erro (não serão importadas)</span></>}.
            </p>

            <ul className="max-h-80 space-y-2 overflow-auto sm:hidden">
              {analise.linhas.map((l) => (
                <li key={l.linha} className={`rounded-xl border p-3 text-sm ${l.erros.length ? 'border-red-400/30 bg-red-500/10' : 'border-white/10 bg-white/5'}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>Linha {l.linha}</span>
                    <Badge tone={tipoInfo(l.dados.type).tone}>{tipoInfo(l.dados.type).label}</Badge>
                    {l.dados.suggested_date && <span>{formatarDia(l.dados.suggested_date, true)} {l.dados.suggested_time ?? ''}</span>}
                  </div>
                  <p className="mt-1 line-clamp-3 text-slate-100">{l.dados.body || 'Sem texto'}</p>
                  <p className={`mt-1 text-xs ${l.erros.length ? 'text-red-300' : 'text-emerald-300'}`}>{l.erros.length ? l.erros.join('; ') : 'Ok'}</p>
                </li>
              ))}
            </ul>

            <div className="hidden max-h-72 overflow-auto rounded-xl border border-white/10 sm:block">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 text-slate-400">
                  <tr><th className="p-2">Linha</th><th className="p-2">Data</th><th className="p-2">Tipo</th><th className="p-2">Texto</th><th className="p-2">Situação</th></tr>
                </thead>
                <tbody>
                  {analise.linhas.map((l) => (
                    <tr key={l.linha} className={`border-t border-white/5 ${l.erros.length ? 'bg-red-500/10' : ''}`}>
                      <td className="p-2 text-slate-400">{l.linha}</td>
                      <td className="whitespace-nowrap p-2 text-slate-300">{l.dados.suggested_date ? formatarDia(l.dados.suggested_date, true) : ''} {l.dados.suggested_time ?? ''}</td>
                      <td className="p-2 text-slate-300">{tipoInfo(l.dados.type).label}</td>
                      <td className="max-w-[260px] truncate p-2 text-slate-200">{l.dados.body}</td>
                      <td className="p-2">{l.erros.length ? <span className="text-red-300">{l.erros.join('; ')}</span> : <span className="text-emerald-300">Ok</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------- Duplicar ----------
function DuplicarModal({ lote, clienteAtual, onClose }: { lote: IdeaBatch; clienteAtual: string; onClose: () => void }) {
  const { data: clientes } = useClientes('');
  const { data: ideias } = useIdeiasDoLote(lote.id);
  const duplicar = useDuplicarLote();
  const [sel, setSel] = useState<string[]>([]);
  const [feito, setFeito] = useState(false);
  const opcoes = (clientes ?? []).filter((c) => c.id !== clienteAtual);

  return (
    <Modal
      open onClose={onClose} title="Duplicar lote para outros clientes"
      footer={feito ? <Button className={BTN} onClick={onClose}>Fechar</Button> : <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Button className={BTN} variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button className={BTN} disabled={!sel.length || !ideias || duplicar.isPending} onClick={async () => { await duplicar.mutateAsync({ lote, ideias: ideias ?? [], clientIds: sel }); setFeito(true); }}>
          {duplicar.isPending ? 'Copiando' : `Copiar (${sel.length})`}
        </Button>
      </div>}
    >
      {feito ? <p className="text-sm text-slate-200">Pronto. As cópias estão como rascunho em cada cliente, para você trocar os dados entre colchetes.</p> : (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">As cópias entram como rascunho.</p>
          <div className="max-h-72 space-y-1 overflow-auto">
            {opcoes.map((c) => (
              <label key={c.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 text-base text-slate-200 hover:bg-white/5 sm:text-sm">
                <input type="checkbox" className="h-5 w-5" checked={sel.includes(c.id)} onChange={(e) => setSel(e.target.checked ? [...sel, c.id] : sel.filter((x) => x !== c.id))} />
                {c.nome}
              </label>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------- Editor do lote ----------
function EditorLote({ lote, onVoltar, onPublicar }: { lote: IdeaBatch; onVoltar: () => void; onPublicar: () => void }) {
  const { data: ideias, isLoading } = useIdeiasDoLote(lote.id);
  const salvar = useSalvarIdeia();
  const excluir = useExcluirIdeia();
  const reordenar = useReordenar();
  const atualizar = useAtualizarLote();
  const [form, setForm] = useState<{ id?: string; dados: IdeaDraft } | null>(null);
  const [titulo, setTitulo] = useState(lote.title);
  const pendentes = (ideias ?? []).filter((i) => temPendencia(i.body)).length;

  return (
    <div className="space-y-4">
      <Button className={BTN} variant="ghost" onClick={onVoltar}>Voltar para os lotes</Button>
      <div className="space-y-3">
        <Input className={CAMPO} label="Título do lote" value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={() => titulo.trim() && titulo !== lote.title && atualizar.mutate({ id: lote.id, title: titulo.trim() })} />
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={lote.status === 'publicado' ? 'green' : 'amber'}>{lote.status === 'publicado' ? 'Publicado' : 'Rascunho'}</Badge>
          <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto">
            {lote.status === 'rascunho'
              ? <Button className={BTN} onClick={onPublicar} disabled={!ideias?.length}>Publicar</Button>
              : <Button className={BTN} variant="secondary" onClick={() => atualizar.mutate({ id: lote.id, status: 'rascunho' })}>Voltar para rascunho</Button>}
            <Button className={BTN} variant="secondary" onClick={() => setForm({ dados: ideaVazia() })}>Nova ideia</Button>
          </div>
        </div>
      </div>
      {pendentes > 0 && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{pendentes} ideia(s) com campos entre colchetes para preencher antes de publicar.</p>}

      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div>
        : !ideias?.length ? <Card><EmptyState message="Este lote não tem ideias." /></Card>
        : (
          <div className="space-y-3">
            {ideias.map((i, n) => (
              <Card key={i.id} className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <Badge tone={tipoInfo(i.type).tone}>{tipoInfo(i.type).label}</Badge>
                  {i.suggested_date && <span className="capitalize">{formatarDia(i.suggested_date, true)}</span>}
                  {i.suggested_time && <span>{i.suggested_time}</span>}
                  {temPendencia(i.body) && <Badge tone="red">Preencher {pendencias(i.body).join(' ')}</Badge>}
                </div>
                {i.title && <div className="mt-2 text-sm font-semibold text-white">{i.title}</div>}
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-200">{i.body}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button className={BTN} variant="secondary" onClick={() => setForm({ id: i.id, dados: dadosDe(i) })}>Editar</Button>
                  <Button className={BTN} variant="ghost" onClick={() => { if (window.confirm('Excluir esta ideia?')) excluir.mutate(i.id); }}>Excluir</Button>
                  <Button className={BTN} variant="ghost" disabled={n === 0} onClick={() => reordenar.mutate({ a: i, b: ideias[n - 1] })}>Subir</Button>
                  <Button className={BTN} variant="ghost" disabled={n === ideias.length - 1} onClick={() => reordenar.mutate({ a: i, b: ideias[n + 1] })}>Descer</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

      {form && (
        <FormIdeia
          dados={form.dados}
          salvando={salvar.isPending}
          onClose={() => setForm(null)}
          onSalvar={async (d) => { await salvar.mutateAsync({ id: form.id, batchId: lote.id, clientId: lote.client_id, dados: d }); setForm(null); }}
        />
      )}
    </div>
  );
}

const dadosDe = (i: Idea): IdeaDraft => ({
  type: i.type, title: i.title, body: i.body, media_suggestion: i.media_suggestion,
  theme: i.theme, suggested_date: i.suggested_date, suggested_time: i.suggested_time,
});

function FormIdeia({ dados, salvando, onClose, onSalvar }: { dados: IdeaDraft; salvando: boolean; onClose: () => void; onSalvar: (d: IdeaDraft) => void | Promise<void> }) {
  const [d, setD] = useState(dados);
  const nulo = (v: string) => (v.trim() ? v : null);
  return (
    <Modal
      open onClose={onClose} title="Ideia" size="lg" fecharSoPorBotao
      footer={<div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Button className={BTN} variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button className={BTN} disabled={!d.body.trim() || salvando} onClick={() => void onSalvar({ ...d, body: d.body.trim() })}>Salvar</Button>
      </div>}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select className={CAMPO} label="Tipo" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as IdeaType })} options={IDEA_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
          <Input className={CAMPO} label="Data sugerida" type="date" value={d.suggested_date ?? ''} onChange={(e) => setD({ ...d, suggested_date: nulo(e.target.value) })} />
          <Input className={CAMPO} label="Horário" type="time" value={d.suggested_time ?? ''} onChange={(e) => setD({ ...d, suggested_time: nulo(e.target.value) })} />
        </div>
        <Input className={CAMPO} label="Título (opcional)" value={d.title ?? ''} onChange={(e) => setD({ ...d, title: nulo(e.target.value) })} />
        <Input className={CAMPO} label="Tema do dia" value={d.theme ?? ''} onChange={(e) => setD({ ...d, theme: nulo(e.target.value) })} />
        <Textarea className="!text-base sm:!text-sm" label="Texto pronto para copiar" value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} rows={6} semLinks />
        <Input className={CAMPO} label="Sugestão de mídia" value={d.media_suggestion ?? ''} onChange={(e) => setD({ ...d, media_suggestion: nulo(e.target.value) })} placeholder="Foto, vídeo ou áudio que acompanha" />
      </div>
    </Modal>
  );
}
