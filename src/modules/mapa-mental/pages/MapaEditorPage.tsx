import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { RoteiroFormModal } from '@/modules/gestao-conteudo/roteiros/RoteiroFormModal';
import { mesAtualRef } from '@/modules/gestao-conteudo/types';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { calcularLayout, descendentes, temDetalhes, type Caixa } from '../layout';
import { exportarPng } from '../exportarPng';
import { MenuNo } from '../MenuNo';
import { CORES_ESCURAS, STATUS_NO, mapas, novoNo, type DadosMapa, type NoMapa } from '../types';

const RAIO = { retangulo: 6, arredondado: 12, pilula: 999 } as const;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;

interface Vista { x: number; y: number; zoom: number }

export function MapaEditorPage() {
  const { id } = useParams();
  const mapaQ = mapas.useUm(id);
  if (mapaQ.isLoading) return <Card className="flex justify-center p-12"><Spinner /></Card>;
  if (!mapaQ.data) {
    return (
      <Card className="p-10 text-center text-sm text-slate-400">
        Mapa não encontrado. <Link to="/mapa-mental" className="font-semibold text-brand-300 hover:underline">Voltar aos mapas</Link>
      </Card>
    );
  }
  return <Editor key={mapaQ.data.id} mapaId={mapaQ.data.id} tituloInicial={mapaQ.data.titulo} dadosIniciais={mapaQ.data.dados} atualizado={mapaQ.data.updated_at ?? mapaQ.data.created_at} />;
}

function Editor({ mapaId, tituloInicial, dadosIniciais, atualizado }: {
  mapaId: string; tituloInicial: string; dadosIniciais: DadosMapa; atualizado: string;
}) {
  const salvar = mapas.useSalvar();
  const { data: clientes } = useClientes('');
  const [titulo, setTitulo] = useState(tituloInicial);
  const [dados, setDados] = useState<DadosMapa>(() => (dadosIniciais?.nos?.length ? dadosIniciais : { nos: [novoNo(null, 'Novo Projeto')] }));
  const historico = useRef<DadosMapa[]>([]);
  const [salvo, setSalvo] = useState<'salvo' | 'salvando' | 'erro'>('salvo');
  const [ultimaData, setUltimaData] = useState(atualizado);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [busca, setBusca] = useState<string | null>(null);
  const [indiceBusca, setIndiceBusca] = useState(0);
  const [pontos, setPontos] = useState(true);
  const [vista, setVista] = useState<Vista>({ x: 60, y: 60, zoom: 1 });
  const [roteiroDe, setRoteiroDe] = useState<NoMapa | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const primeiraVez = useRef(true);

  const { caixas, largura, altura } = useMemo(() => calcularLayout(dados.nos), [dados.nos]);
  const porId = useMemo(() => new Map(caixas.map((c) => [c.no.id, c])), [caixas]);
  const filhosDe = useCallback((id: string) => dados.nos.filter((n) => n.pai === id), [dados.nos]);

  // ---------- Alterações com desfazer + salvamento automático ----------
  const mudar = useCallback((f: (d: DadosMapa) => DadosMapa) => {
    setDados((d) => {
      historico.current = [...historico.current.slice(-49), d];
      return f(d);
    });
  }, []);

  function desfazer() {
    const anterior = historico.current.pop();
    if (anterior) setDados(anterior);
  }

  useEffect(() => {
    if (primeiraVez.current) { primeiraVez.current = false; return; }
    setSalvo('salvando');
    const t = setTimeout(() => {
      salvar.mutate(
        { id: mapaId, dados: { titulo: titulo.trim() || 'Mapa sem título', dados } },
        { onSuccess: () => { setSalvo('salvo'); setUltimaData(new Date().toISOString()); }, onError: () => setSalvo('erro') },
      );
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- salvar muda a cada render; o gatilho são os dados.
  }, [dados, titulo, mapaId]);

  function mudarNo(id: string, m: Partial<NoMapa>) {
    mudar((d) => ({ nos: d.nos.map((n) => (n.id === id ? { ...n, ...m } : n)) }));
  }

  function adicionarFilho(paiId: string) {
    const novo = novoNo(paiId);
    mudar((d) => ({ nos: [...d.nos.map((n) => (n.id === paiId ? { ...n, recolhido: false } : n)), novo] }));
    setSelecionado(novo.id);
    iniciarEdicao(novo);
  }

  function adicionarIrmao(id: string) {
    const atual = dados.nos.find((n) => n.id === id);
    if (!atual || atual.pai === null) return adicionarFilho(id);
    const novo = novoNo(atual.pai);
    mudar((d) => {
      const i = d.nos.findIndex((n) => n.id === id);
      const nos = [...d.nos];
      nos.splice(i + 1, 0, novo);
      return { nos };
    });
    setSelecionado(novo.id);
    iniciarEdicao(novo);
  }

  function excluirNo(id: string) {
    const atual = dados.nos.find((n) => n.id === id);
    if (!atual || atual.pai === null) return;
    const remover = descendentes(dados.nos, id);
    remover.add(id);
    mudar((d) => ({ nos: d.nos.filter((n) => !remover.has(n.id)) }));
    setSelecionado(atual.pai);
    setMenu(null);
  }

  function iniciarEdicao(no: NoMapa) {
    setEditando(no.id);
    setRascunho(no.texto === 'Novo nó' ? '' : no.texto);
    setMenu(null);
  }

  function concluirEdicao(confirmar: boolean) {
    if (editando && confirmar) {
      const texto = rascunho.trim() || 'Novo nó';
      const atual = dados.nos.find((n) => n.id === editando);
      if (atual && atual.texto !== texto) mudarNo(editando, { texto });
    }
    setEditando(null);
    area.current?.focus();
  }

  // ---------- Vista (zoom e arrastar) ----------
  const ajustar = useCallback(() => {
    const el = area.current;
    if (!el || caixas.length === 0) return;
    const r = el.getBoundingClientRect();
    const zoom = Math.min(1.2, Math.max(ZOOM_MIN, Math.min((r.width - 120) / Math.max(largura, 1), (r.height - 140) / Math.max(altura, 1))));
    setVista({ zoom, x: (r.width - largura * zoom) / 2, y: (r.height - altura * zoom) / 2 });
  }, [caixas.length, largura, altura]);

  useEffect(() => { ajustar(); // centraliza na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function zoomEm(fator: number, cx?: number, cy?: number) {
    const el = area.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    setVista((v) => {
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * fator));
      const k = zoom / v.zoom;
      return { zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }

  function centrarEm(c: Caixa) {
    const el = area.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setVista((v) => ({ ...v, x: r.width / 2 - (c.x + c.w / 2) * v.zoom, y: r.height / 2 - (c.y + c.h / 2) * v.zoom }));
  }

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    function rodar(e: WheelEvent) {
      e.preventDefault();
      const r = el!.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomEm(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
      else setVista((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
    el.addEventListener('wheel', rodar, { passive: false });
    return () => el.removeEventListener('wheel', rodar);
  }, []);

  // ---------- Teclado ----------
  function teclado(e: React.KeyboardEvent) {
    if (editando || menu) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); desfazer(); return; }
    const no = selecionado ? dados.nos.find((n) => n.id === selecionado) : undefined;
    if (!no) return;
    if (e.key === 'Tab') { e.preventDefault(); adicionarFilho(no.id); }
    else if (e.key === 'Enter') { e.preventDefault(); adicionarIrmao(no.id); }
    else if (e.key === 'F2') { e.preventDefault(); iniciarEdicao(no); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); excluirNo(no.id); }
    else if (e.key === 'Escape') setSelecionado(null);
  }

  // ---------- Busca ----------
  const termo = (busca ?? '').trim().toLowerCase();
  const achados = termo ? caixas.filter((c) => `${c.no.texto} ${c.no.nota}`.toLowerCase().includes(termo)) : [];
  function proximoAchado() {
    if (!achados.length) return;
    const k = indiceBusca % achados.length;
    setSelecionado(achados[k].no.id);
    centrarEm(achados[k]);
    setIndiceBusca(k + 1);
  }

  const noMenu = menu ? dados.nos.find((n) => n.id === menu) : undefined;
  const caixaMenu = menu ? porId.get(menu) : undefined;
  const totalNos = dados.nos.length;
  const mes = mesAtualRef();

  // ---------- Minimapa ----------
  const MINI_W = 180, MINI_H = 110;
  const escalaMini = Math.min(MINI_W / Math.max(largura, 1), MINI_H / Math.max(altura, 1)) * 0.9;
  const [tamArea, setTamArea] = useState({ w: 800, h: 500 });
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTamArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[520px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/mapa-mental" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-white/10">
          <GlassIcon name="chevron-left" className="h-4 w-4" /> Mapas
        </Link>
        <span className="chip-icone h-9 w-9 bg-brand-500/10"><GlassIcon name="mindmap" tone="brand" className="h-5 w-5" /></span>
        <div className="min-w-0">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            aria-label="Nome do mapa"
            className="w-64 max-w-full rounded-md bg-transparent px-1 text-[15px] font-bold text-slate-100 hover:bg-white/[0.04] focus:bg-white/[0.06] focus:outline-none"
          />
          <div className="flex items-center gap-2 px-1 text-xs text-slate-400">
            <span className={salvo === 'erro' ? 'text-red-400' : ''}>
              {salvo === 'salvando' ? 'Salvando…' : salvo === 'erro' ? 'Não foi possível salvar' : 'Tudo salvo'}
            </span>
            <span>· <GlassIcon name="calendar" className="h-3 w-3" /> {new Date(ultimaData).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            <span>· {totalNos} {totalNos === 1 ? 'nó' : 'nós'}</span>
          </div>
        </div>
      </div>

      <div
        ref={area}
        tabIndex={0}
        onKeyDown={teclado}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('[data-no], [data-ui]')) return;
          area.current?.focus();
          setSelecionado(null);
          arraste.current = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const a = arraste.current;
          if (a) setVista((v) => ({ ...v, x: a.vx + e.clientX - a.x, y: a.vy + e.clientY - a.y }));
        }}
        onPointerUp={() => { arraste.current = null; }}
        className="canvas-mapa relative flex-1 cursor-grab overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] outline-none active:cursor-grabbing"
        style={pontos ? { backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1.2px)', backgroundSize: `${22 * vista.zoom}px ${22 * vista.zoom}px`, backgroundPosition: `${vista.x}px ${vista.y}px` } : undefined}
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.zoom})` }}>
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={Math.max(largura, 1)} height={Math.max(altura, 1)}>
            {caixas.map((c) => {
              const pai = c.no.pai ? porId.get(c.no.pai) : undefined;
              if (!pai) return null;
              const x1 = pai.x + pai.w, y1 = pai.y + pai.h / 2, x2 = c.x, y2 = c.y + c.h / 2, mx = (x1 + x2) / 2;
              return <path key={c.no.id} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke="#9ccbea" strokeWidth={2} />;
            })}
          </svg>

          {caixas.map((c) => {
            const n = c.no;
            const escura = CORES_ESCURAS.has(n.cor);
            const sel = selecionado === n.id;
            const achado = termo && achados.some((a) => a.no.id === n.id);
            const st = STATUS_NO.find((s) => s.id === n.status);
            const temFilhos = dados.nos.some((x) => x.pai === n.id);
            return (
              <div
                key={n.id}
                data-no
                onPointerDown={(e) => { e.stopPropagation(); setSelecionado(n.id); area.current?.focus(); }}
                onDoubleClick={() => iniciarEdicao(n)}
                className={`no-mapa absolute select-none border shadow-sm transition-shadow ${sel ? 'ring-2 ring-brand-400 ring-offset-1' : ''} ${achado ? 'ring-2 ring-amber-400' : ''}`}
                style={{
                  left: c.x, top: c.y, width: c.w, minHeight: c.h, borderRadius: Math.min(RAIO[n.formato], c.h / 2),
                  backgroundColor: n.cor, borderColor: n.cor === '#ffffff' ? '#dbe3ea' : n.cor,
                  color: escura ? '#ffffff' : '#0e1a24',
                }}
              >
                {n.cor === '#ffffff' && <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r" style={{ backgroundColor: '#1e9be0' }} aria-hidden />}
                <div className="flex items-start gap-1.5 py-2.5 pl-3.5 pr-7">
                  {n.icone && <GlassIcon name={n.icone} tone={escura ? 'white' : 'brand'} className="mt-0.5 h-4 w-4 shrink-0" />}
                  {editando === n.id ? (
                    <textarea
                      autoFocus
                      rows={Math.max(1, rascunho.split('\n').length)}
                      value={rascunho}
                      onChange={(e) => setRascunho(e.target.value)}
                      onBlur={() => concluirEdicao(true)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); concluirEdicao(true); }
                        if (e.key === 'Escape') concluirEdicao(false);
                        if (e.key === 'Tab') { e.preventDefault(); concluirEdicao(true); adicionarFilho(n.id); }
                      }}
                      placeholder="Digite o texto"
                      className="w-full resize-none bg-transparent text-sm leading-5 outline-none placeholder:text-slate-400"
                      style={{ color: 'inherit', fontWeight: n.negrito || n.pai === null ? 700 : 500 }}
                    />
                  ) : (
                    <div className="min-w-0 whitespace-pre-wrap break-words text-sm leading-5" style={{ fontWeight: n.negrito || n.pai === null ? 700 : 500 }}>
                      {n.texto}
                    </div>
                  )}
                </div>
                {temDetalhes(n) && (
                  <div className="flex items-center gap-2 px-3.5 pb-2 text-[11px] font-semibold" style={{ color: escura ? 'rgba(255,255,255,.8)' : '#5a6875' }}>
                    {n.status && st && <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.cor }} />{st.label}</span>}
                    {n.data && <span>{n.data.split('-').reverse().slice(0, 2).join('/')}</span>}
                    {n.nota && <span title={n.nota}><GlassIcon name="note" className="h-3 w-3" /></span>}
                    {n.vinculo?.url && (
                      <a href={n.vinculo.url} target={n.vinculo.url.startsWith('/') ? undefined : '_blank'} rel="noreferrer" onPointerDown={(e) => e.stopPropagation()} title={n.vinculo.rotulo} className="hover:underline">
                        <GlassIcon name="link" className="h-3 w-3" /> {n.vinculo.rotulo || 'Vínculo'}
                      </a>
                    )}
                    {n.links.length > 0 && <span title={n.links.map((l) => l.rotulo).join(', ')}><GlassIcon name="paperclip" className="h-3 w-3" /> {n.links.length}</span>}
                  </div>
                )}
                <button
                  data-ui
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => { setSelecionado(n.id); setMenu(n.id); }}
                  aria-label={`Opções de ${n.texto}`}
                  className="absolute right-1 top-1.5 rounded-md p-1 opacity-70 hover:bg-black/10 hover:opacity-100"
                  style={{ color: 'inherit' }}
                >
                  <GlassIcon name="more-vertical" tone={escura ? 'white' : 'slate'} className="h-4 w-4" />
                </button>
                {sel && editando !== n.id && (
                  <div data-ui className="absolute -bottom-7 left-3 flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => adicionarFilho(n.id)} title="Adicionar filho (Tab)" aria-label="Adicionar filho"
                      className="rounded-md border border-white/10 bg-white px-1.5 py-0.5 text-slate-600 shadow-sm hover:text-brand-600">
                      <GlassIcon name="plus" tone="slate" className="h-3.5 w-3.5" />
                    </button>
                    {temFilhos && (
                      <button type="button" onClick={() => mudarNo(n.id, { recolhido: !n.recolhido })} title={n.recolhido ? 'Expandir' : 'Recolher'} aria-label={n.recolhido ? 'Expandir' : 'Recolher'}
                        className="rounded-md border border-white/10 bg-white px-1.5 py-0.5 shadow-sm">
                        <GlassIcon name={n.recolhido ? 'chevron-right' : 'chevron-down'} tone="slate" className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
                {c.ocultos > 0 && (
                  <button data-ui type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => mudarNo(n.id, { recolhido: false })}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white shadow" title="Expandir">
                    +{c.ocultos}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Barra superior */}
        <div data-ui className="barra-mapa absolute left-3 top-3 flex items-center gap-1 rounded-xl border border-white/10 bg-[#121a24] p-1 shadow-sm">
          <button type="button" onClick={desfazer} disabled={historico.current.length === 0} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-40" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
            <GlassIcon name="undo" className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setBusca((b) => (b === null ? '' : null))} className={`rounded-lg p-1.5 hover:bg-white/10 ${busca !== null ? 'text-brand-300' : 'text-slate-300'}`} title="Buscar" aria-label="Buscar no mapa">
            <GlassIcon name="search" className="h-4 w-4" />
          </button>
          {busca !== null && (
            <input
              autoFocus value={busca} onChange={(e) => { setBusca(e.target.value); setIndiceBusca(0); }}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') proximoAchado(); if (e.key === 'Escape') setBusca(null); }}
              placeholder="Buscar nó…" aria-label="Texto da busca"
              className="campo-form w-40 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-100 focus:outline-none"
            />
          )}
          <span className="px-1.5 text-xs text-slate-400">{busca !== null && termo ? `${achados.length} achados` : `${totalNos} nós`}</span>
        </div>

        {/* Barra inferior */}
        <div data-ui className="barra-mapa absolute bottom-3 left-3 flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#121a24] p-1 shadow-sm">
          <button type="button" onClick={() => zoomEm(1 / 1.2)} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" aria-label="Diminuir zoom"><GlassIcon name="minus" className="h-4 w-4" /></button>
          <span className="w-11 text-center text-xs font-semibold tabular-nums text-slate-300">{Math.round(vista.zoom * 100)}%</span>
          <button type="button" onClick={() => zoomEm(1.2)} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" aria-label="Aumentar zoom"><GlassIcon name="plus" className="h-4 w-4" /></button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button type="button" onClick={ajustar} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" title="Ajustar à tela" aria-label="Ajustar à tela"><GlassIcon name="maximize" className="h-4 w-4" /></button>
          <button type="button" onClick={() => setPontos((p) => !p)} className={`rounded-lg p-1.5 hover:bg-white/10 ${pontos ? 'text-brand-300' : 'text-slate-300'}`} title="Mostrar/ocultar pontos" aria-label="Mostrar ou ocultar a grade de pontos"><GlassIcon name="grid" className="h-4 w-4" /></button>
          <button type="button" onClick={() => exportarPng(caixas, titulo)} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" title="Baixar imagem (PNG)" aria-label="Baixar imagem do mapa"><GlassIcon name="download" className="h-4 w-4" /></button>
        </div>

        {/* Minimapa */}
        <div
          data-ui
          className="barra-mapa absolute bottom-3 right-3 hidden overflow-hidden rounded-xl border border-white/10 bg-[#121a24] shadow-sm sm:block"
          style={{ width: MINI_W, height: MINI_H }}
          onPointerDown={(e) => {
            e.stopPropagation();
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const mx = (e.clientX - r.left - 8) / escalaMini, my = (e.clientY - r.top - 8) / escalaMini;
            setVista((v) => ({ ...v, x: tamArea.w / 2 - mx * v.zoom, y: tamArea.h / 2 - my * v.zoom }));
          }}
          title="Clique para ir até esse ponto"
        >
          <svg width={MINI_W} height={MINI_H}>
            <g transform={`translate(8,8) scale(${escalaMini})`}>
              {caixas.map((c) => (
                <rect key={c.no.id} x={c.x} y={c.y} width={c.w} height={c.h} rx={8} fill={c.no.cor === '#ffffff' ? '#9ccbea' : c.no.cor} />
              ))}
              <rect x={-vista.x / vista.zoom} y={-vista.y / vista.zoom} width={tamArea.w / vista.zoom} height={tamArea.h / vista.zoom}
                fill="rgba(30,155,224,0.08)" stroke="#1e9be0" strokeWidth={2 / escalaMini} />
            </g>
          </svg>
        </div>

        {noMenu && caixaMenu && (
          <div data-ui onPointerDown={(e) => e.stopPropagation()}>
            <MenuNo
              no={noMenu}
              temFilhos={filhosDe(noMenu.id).length > 0}
              x={Math.min(tamArea.w - 270, Math.max(8, vista.x + (caixaMenu.x + caixaMenu.w - 40) * vista.zoom))}
              y={Math.min(tamArea.h - 300, Math.max(8, vista.y + (caixaMenu.y + caixaMenu.h) * vista.zoom + 6))}
              onMudar={(m) => mudarNo(noMenu.id, m)}
              onAdicionarFilho={() => { setMenu(null); adicionarFilho(noMenu.id); }}
              onEditarTexto={() => iniciarEdicao(noMenu)}
              onCriarRoteiro={() => { setMenu(null); setRoteiroDe(noMenu); }}
              onExcluir={() => excluirNo(noMenu.id)}
              onFechar={() => setMenu(null)}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Atalhos: <kbd>Tab</kbd> novo filho · <kbd>Enter</kbd> novo irmão · <kbd>F2</kbd> ou duplo clique edita · <kbd>Del</kbd> exclui · <kbd>Ctrl+Z</kbd> desfaz · Ctrl + rolagem dá zoom, arraste o fundo para mover.
      </p>

      {roteiroDe && (
        <RoteiroFormModal
          onClose={() => setRoteiroDe(null)}
          mes={mes}
          clientes={(clientes ?? []).map((c) => ({ id: c.id, nome: c.nome }))}
          inicial={{ titulo: roteiroDe.texto, descricao: roteiroDe.nota }}
          onCriado={(r) => mudarNo(roteiroDe.id, {
            vinculo: { rotulo: 'Roteiro', url: `/gestao-conteudo?aba=roteiros&mes=${r.mes_referencia}&cliente=${r.cliente_id}` },
          })}
        />
      )}
    </div>
  );
}
