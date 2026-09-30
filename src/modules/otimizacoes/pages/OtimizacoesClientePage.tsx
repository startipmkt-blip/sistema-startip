import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Badge } from '@/shared/ui/Badge';
import { clientePorSlug } from '../clientes';
import {
  useOtimizacoesMes,
  useSalvarOtimizacao,
  useApagarOtimizacao,
  useLinkPublico,
  useGerarOuRotacionarLink,
  uploadPrint,
  removerPrint,
  type Otimizacao,
  type Anexo,
} from '../api/otimizacoesApi';
import { MESES_PT, isoHoje, ultimosMeses, fmtDia } from '../utils';

const rascunhoKey = (slug: string, data: string) => `otim_rascunho_${slug}_${data}`;

export function OtimizacoesClientePage() {
  const { slug = '' } = useParams();
  const cliente = clientePorSlug(slug);
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [editando, setEditando] = useState<{ data: string; conteudo: string; anexos: Anexo[]; existe: boolean } | null>(null);
  const [mostraLink, setMostraLink] = useState(false);

  const { data: otimizacoes, isLoading } = useOtimizacoesMes(slug, ano, mes);
  const { data: link } = useLinkPublico(slug);
  const salvar = useSalvarOtimizacao();
  const apagar = useApagarOtimizacao();
  const gerarLink = useGerarOuRotacionarLink();

  const meses = useMemo(() => ultimosMeses(12), []);
  const mesLabel = `${MESES_PT[mes - 1]} ${ano}`;

  if (!cliente) {
    return (
      <div className="p-6">
        <p className="text-slate-300">Cliente não encontrado.</p>
        <Link to="/otimizacoes" className="text-brand-400 hover:underline">← Voltar</Link>
      </div>
    );
  }

  const abrirNova = () => setEditando({ data: isoHoje(), conteudo: '', anexos: [], existe: false });
  const abrirEdicao = (o: Otimizacao) =>
    setEditando({ data: o.data, conteudo: o.conteudo, anexos: o.anexos ?? [], existe: true });

  const exportarPdf = () => {
    if (!otimizacoes || otimizacoes.length === 0) return alert('Nada pra exportar neste mês.');
    gerarPdfMes(cliente.nome, mesLabel, otimizacoes);
  };

  const copiarLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(`${window.location.origin}/otim/${link.token}`);
    alert('Link copiado!');
  };

  const copiarComoTexto = async () => {
    if (!otimizacoes || otimizacoes.length === 0) return alert('Nada pra copiar neste mês.');
    const ordenadas = [...otimizacoes].sort((a, b) => a.data.localeCompare(b.data));
    const linhas: string[] = [];
    linhas.push(`*Otimizações — ${cliente.nome}*`);
    linhas.push(`_${mesLabel}_`);
    linhas.push('');
    for (const o of ordenadas) {
      const { dia, mesAbrev, diaSemana } = fmtDia(o.data);
      linhas.push(`📅 *${dia}/${mesAbrev} (${diaSemana})*`);
      linhas.push(o.conteudo.trim());
      if (o.anexos && o.anexos.length > 0) {
        linhas.push(`(${o.anexos.length} print${o.anexos.length === 1 ? '' : 's'} anexo${o.anexos.length === 1 ? '' : 's'})`);
      }
      linhas.push('');
    }
    await navigator.clipboard.writeText(linhas.join('\n').trim());
    alert('Texto copiado! Cole no grupo do WhatsApp.');
  };

  const linkUrl = link ? `${window.location.origin}/otim/${link.token}` : null;

  return (
    <div className="space-y-4 p-4">
      <div className="text-sm">
        <Link to="/otimizacoes" className="text-slate-400 hover:text-brand-400">← Todos os clientes</Link>
      </div>

      <PageHeader
        title={`📈 ${cliente.nome}`}
        subtitle="Histórico diário de otimizações. Clique em um dia pra editar, ou em “Nova otimização” pra registrar hoje."
      >
        <Button variant="secondary" onClick={copiarComoTexto}>📋 Copiar como texto</Button>
        <Button variant="secondary" onClick={exportarPdf}>📄 Exportar PDF</Button>
        <Button variant="secondary" onClick={() => setMostraLink(true)}>🔗 Link do cliente</Button>
        <Button onClick={abrirNova}>+ Nova otimização</Button>
      </PageHeader>

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Select
          id="mes"
          value={`${ano}-${mes}`}
          onChange={(e) => {
            const [a, m] = e.target.value.split('-').map(Number);
            setAno(a); setMes(m);
          }}
          options={meses.map((m) => ({ value: `${m.ano}-${m.mes}`, label: m.label }))}
        />
        <span className="ml-auto text-xs text-slate-400">
          {otimizacoes?.length ?? 0} otimizaç{(otimizacoes?.length ?? 0) === 1 ? 'ão' : 'ões'} em {mesLabel.toLowerCase()}
        </span>
      </Card>

      {isLoading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : !otimizacoes || otimizacoes.length === 0 ? (
        <EmptyState message="Nenhuma otimização neste mês — registre a primeira clicando em “+ Nova otimização”." />
      ) : (
        <div className="space-y-3">
          {otimizacoes.map((o) => (
            <BlocoDia
              key={o.id}
              clienteNome={cliente.nome}
              otim={o}
              onEditar={() => abrirEdicao(o)}
            />
          ))}
        </div>
      )}

      {editando && (
        <ModalEditar
          slug={slug}
          data={editando.data}
          conteudo={editando.conteudo}
          anexos={editando.anexos}
          existe={editando.existe}
          onClose={() => setEditando(null)}
          onSalvar={async (v) => {
            await salvar.mutateAsync({ cliente_slug: slug, data: v.data, conteudo: v.conteudo, anexos: v.anexos });
            localStorage.removeItem(rascunhoKey(slug, v.data));
            setEditando(null);
          }}
          onApagar={async (data) => {
            if (!confirm('Apagar a otimização deste dia?')) return;
            await apagar.mutateAsync({ cliente_slug: slug, data });
            localStorage.removeItem(rascunhoKey(slug, data));
            setEditando(null);
          }}
        />
      )}

      {mostraLink && (
        <Modal open onClose={() => setMostraLink(false)} title="Link público do cliente"
          footer={<Button variant="secondary" onClick={() => setMostraLink(false)}>Fechar</Button>}>
          <div className="space-y-3 text-sm">
            <p className="text-slate-300">
              Esse link mostra tudo que já foi otimizado pra esse cliente (todas as datas, mais recentes no topo).
              Cole na descrição do grupo do WhatsApp — o cliente vê sem precisar de login. É permanente.
            </p>
            {linkUrl ? (
              <>
                <div className="rounded-lg border border-white/10 bg-white/5 p-2 font-mono text-xs break-all text-slate-100">{linkUrl}</div>
                <div className="flex gap-2">
                  <Button onClick={copiarLink}>Copiar link</Button>
                  <a href={linkUrl} target="_blank" rel="noreferrer"><Button variant="secondary">Abrir</Button></a>
                  <Button variant="ghost" onClick={async () => {
                    if (!confirm('Isso invalida o link atual. Continuar?')) return;
                    await gerarLink.mutateAsync({ cliente_slug: slug, rotacionar: true });
                  }}>Rotacionar (invalida o antigo)</Button>
                </div>
              </>
            ) : (
              <Button onClick={async () => { await gerarLink.mutateAsync({ cliente_slug: slug }); }}>Gerar link agora</Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function BlocoDia({ clienteNome, otim, onEditar }: { clienteNome: string; otim: Otimizacao; onEditar: () => void }) {
  const [expandido, setExpandido] = useState(false);
  const { dia, mesAbrev, diaSemana } = fmtDia(otim.data);
  const linhas = otim.conteudo.split('\n').length;
  const longo = linhas > 8 || otim.conteudo.length > 500;
  const mostraCorte = longo && !expandido;
  const conteudoMostrado = mostraCorte ? otim.conteudo.split('\n').slice(0, 8).join('\n') : otim.conteudo;

  const copiarDia = async () => {
    const linhas: string[] = [];
    linhas.push(`*${clienteNome} — ${dia}/${mesAbrev} (${diaSemana})*`);
    linhas.push('');
    linhas.push(otim.conteudo.trim());
    if (otim.anexos && otim.anexos.length > 0) {
      linhas.push('');
      linhas.push(`(${otim.anexos.length} print${otim.anexos.length === 1 ? '' : 's'} anexo${otim.anexos.length === 1 ? '' : 's'})`);
    }
    await navigator.clipboard.writeText(linhas.join('\n'));
    alert('Dia copiado!');
  };

  return (
    <Card className="flex gap-4 p-4">
      <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-white/5 py-2">
        <span className="text-2xl font-bold text-white leading-none">{dia}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">{mesAbrev}</span>
        <span className="mt-1 text-[10px] text-slate-500">{diaSemana}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <Badge tone="green">otimizada</Badge>
          <span className="text-[10px] text-slate-500">
            atualizada {new Date(otim.updated_at).toLocaleString('pt-BR')}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={copiarDia} className="text-xs text-slate-400 hover:text-brand-400" title="Copiar só este dia">📋 copiar</button>
            <button onClick={onEditar} className="text-xs text-slate-400 hover:text-brand-400">editar</button>
          </div>
        </div>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-200">
          {conteudoMostrado}{mostraCorte && '...'}
        </pre>
        {longo && (
          <button onClick={() => setExpandido((v) => !v)} className="mt-2 text-xs text-brand-400 hover:underline">
            {expandido ? 'ver menos' : 'ver mais'}
          </button>
        )}
        {otim.anexos && otim.anexos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {otim.anexos.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer" title={a.nome}
                className="block h-20 w-20 overflow-hidden rounded-lg border border-white/10 bg-white/5 hover:border-brand-400/60">
                <img src={a.url} alt={a.nome} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function ModalEditar({
  slug, data, conteudo, anexos, existe, onClose, onSalvar, onApagar,
}: {
  slug: string;
  data: string;
  conteudo: string;
  anexos: Anexo[];
  existe: boolean;
  onClose: () => void;
  onSalvar: (v: { data: string; conteudo: string; anexos: Anexo[] }) => Promise<void>;
  onApagar: (data: string) => Promise<void>;
}) {
  const [d, setD] = useState(data);
  const [c, setC] = useState(conteudo);
  const [anexosLocal, setAnexosLocal] = useState<Anexo[]>(anexos);
  const [uploading, setUploading] = useState(false);
  const [rascunhoNotif, setRascunhoNotif] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // Ao abrir, verifica se existe rascunho salvo diferente do conteúdo atual.
  useEffect(() => {
    const salvo = localStorage.getItem(rascunhoKey(slug, d));
    if (salvo && salvo !== conteudo && salvo.trim().length > 0) {
      setRascunhoNotif(salvo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salvamento automático do rascunho (debounce 500ms) enquanto o usuário digita.
  useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      if (c.trim().length > 0) localStorage.setItem(rascunhoKey(slug, d), c);
      else localStorage.removeItem(rascunhoKey(slug, d));
    }, 500);
    return () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); };
  }, [c, slug, d]);

  const podeSalvar = c.trim().length > 0 && !uploading;

  const escolherArquivos = () => fileRef.current?.click();
  const enviarArquivos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const novos: Anexo[] = [];
      for (const f of Array.from(files)) {
        const a = await uploadPrint(slug, d, f);
        novos.push(a);
      }
      setAnexosLocal((prev) => [...prev, ...novos]);
    } catch (e) {
      alert('Falha no upload: ' + (e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removerAnexo = async (a: Anexo) => {
    if (!confirm(`Remover ${a.nome}?`)) return;
    try { await removerPrint(a); } catch { /* ignore, ainda tira da lista */ }
    setAnexosLocal((prev) => prev.filter((x) => x.url !== a.url));
  };

  return (
    <Modal open onClose={onClose}
      title={existe ? `Editar otimização — ${fmtDia(data).dia}/${fmtDia(data).mesAbrev}` : 'Nova otimização'}
      size="lg"
      footer={
        <>
          {existe && <Button variant="ghost" onClick={() => onApagar(data)}>Apagar</Button>}
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!podeSalvar} onClick={() => onSalvar({ data: d, conteudo: c, anexos: anexosLocal })}>
            {uploading ? 'Enviando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        {rascunhoNotif && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
            <span>📝 Encontramos um rascunho salvo desse dia que ainda não foi enviado.</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setC(rascunhoNotif); setRascunhoNotif(null); }}
                className="rounded bg-amber-500/20 px-2 py-1 font-medium hover:bg-amber-500/30"
              >Recuperar</button>
              <button
                onClick={() => { localStorage.removeItem(rascunhoKey(slug, d)); setRascunhoNotif(null); }}
                className="rounded px-2 py-1 hover:bg-white/10"
              >Descartar</button>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">Data</label>
          <input
            type="date"
            value={d}
            disabled={existe}
            onChange={(e) => setD(e.target.value)}
            className="glass-field w-full px-3 py-2 text-sm text-white"
          />
          {existe && (
            <p className="mt-1 text-[10px] text-slate-500">A data não muda numa edição — pra registrar outro dia, feche e crie uma nova.</p>
          )}
        </div>

        <Textarea
          id="cont"
          label={`O que foi feito em ${slug}`}
          rows={12}
          value={c}
          onChange={(e) => setC(e.target.value)}
          placeholder="ex: pausei 3 anúncios do conjunto Interesses (CPL alto), escalei o carrossel Black em +30%, criei nova campanha de remarketing com o público 180d..."
        />
        <p className="text-[10px] text-slate-500">💾 Rascunho salvo automaticamente enquanto você digita.</p>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">Prints das campanhas</label>
          <div className="flex flex-wrap gap-2">
            {anexosLocal.map((a) => (
              <div key={a.url} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                <img src={a.url} alt={a.nome} className="h-full w-full object-cover" />
                <button
                  onClick={() => removerAnexo(a)}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100"
                >
                  <span className="text-xs text-white">Remover</span>
                </button>
              </div>
            ))}
            <button
              onClick={escolherArquivos}
              disabled={uploading}
              className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 text-xs text-slate-400 hover:border-brand-400/60 hover:text-brand-300 disabled:opacity-50"
            >
              {uploading ? '…' : (<><span className="text-lg">+</span><span>adicionar</span></>)}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => enviarArquivos(e.target.files)}
          />
        </div>
      </div>
    </Modal>
  );
}

// ============ Export PDF ============

function gerarPdfMes(clienteNome: string, mesLabel: string, otimizacoes: Otimizacao[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margem = 40;
  let y = margem;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Otimizações de Campanha', margem, y);
  y += 22;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${clienteNome} — ${mesLabel}`, margem, y);
  y += 8;
  doc.setDrawColor(200);
  doc.line(margem, y, pageW - margem, y);
  y += 16;

  const ordenadas = [...otimizacoes].sort((a, b) => a.data.localeCompare(b.data));
  const maxW = pageW - margem * 2;

  for (const o of ordenadas) {
    const { dia, mesAbrev, diaSemana } = fmtDia(o.data);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const linhasCorpo = doc.splitTextToSize(o.conteudo || '(vazio)', maxW);
    const nAnexos = o.anexos?.length ?? 0;
    const alturaBloco = 20 + linhasCorpo.length * 13 + (nAnexos > 0 ? 14 : 0) + 12;
    if (y + alturaBloco > pageH - margem) { doc.addPage(); y = margem; }
    doc.text(`${dia}/${mesAbrev} — ${diaSemana}`, margem, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(linhasCorpo, margem, y);
    y += linhasCorpo.length * 13;
    if (nAnexos > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`${nAnexos} print${nAnexos === 1 ? '' : 's'} anexo${nAnexos === 1 ? '' : 's'} (ver no link do cliente)`, margem, y + 12);
      doc.setTextColor(0);
      y += 14;
    }
    y += 10;
    doc.setDrawColor(230);
    doc.line(margem, y, pageW - margem, y);
    y += 10;
  }

  const nome = `otimizacoes-${clienteNome.replace(/\s+/g, '-').toLowerCase()}-${mesLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(nome);
}
