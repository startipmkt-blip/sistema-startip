import { useMemo, useState } from 'react';
import { useMpPerfis, useSalvarPerfil, useMpProdutos, useSalvarProduto, useApagarProduto, type MpCategoria } from '@/modules/marketplace/api/marketplaceApi';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

export function MarketplaceAdminPage() {
  const { data: perfis, isLoading } = useMpPerfis();
  const clientesQ = useClientes('');
  const salvarPerfil = useSalvarPerfil();
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);

  const clientesSemPerfil = useMemo(() => {
    const jaTem = new Set((perfis ?? []).map((p) => p.cliente_id));
    return (clientesQ.data ?? []).filter((c) => !jaTem.has(c.id));
  }, [perfis, clientesQ.data]);

  const perfilAtual = useMemo(
    () => (perfis ?? []).find((p) => p.cliente_id === clienteSelecionado) ?? null,
    [perfis, clienteSelecionado],
  );

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">🛍️ Marketplace</h1>
          <p className="text-xs text-slate-400">Gerencie o perfil e os produtos dos clientes no clube de descontos.</p>
        </div>
        <a
          href={`${window.location.origin}/marketplace`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
        >
          ↗ Abrir vitrine pública
        </a>
        {clientesSemPerfil.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              onChange={(e) => {
                const cid = e.target.value;
                if (!cid) return;
                salvarPerfil.mutate({ cliente_id: cid, categoria: 'base', publicado: false });
                e.target.value = '';
                setClienteSelecionado(cid);
              }}
              className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]"
            >
              <option value="">+ Adicionar cliente ao marketplace</option>
              {clientesSemPerfil.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}
      </header>

      <div className="grid gap-3 lg:grid-cols-[300px,1fr]">
        <Card className="p-2">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Empresas no marketplace</div>
          {isLoading ? <Spinner /> : (perfis ?? []).length === 0 ? (
            <EmptyState message="Nenhum cliente cadastrado ainda." />
          ) : (
            <ul className="space-y-1">
              {(perfis ?? []).map((p) => (
                <li key={p.cliente_id}>
                  <button
                    onClick={() => setClienteSelecionado(p.cliente_id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${clienteSelecionado === p.cliente_id ? 'bg-brand-500/15 text-brand-200' : 'text-slate-300 hover:bg-white/5'}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{p.cliente_nome}</span>
                    <Badge tone={p.publicado ? 'green' : 'slate'}>{p.publicado ? 'ativo' : 'oculto'}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-3">
          {!perfilAtual ? (
            <EmptyState message="Selecione uma empresa à esquerda." />
          ) : (
            <>
              <PerfilForm cid={perfilAtual.cliente_id} inicial={perfilAtual} />
              <ProdutosSection clienteId={perfilAtual.cliente_id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------
function PerfilForm({ cid, inicial }: { cid: string; inicial: ReturnType<typeof useMpPerfis>['data'] extends (infer T)[] | undefined ? T : never }) {
  const salvar = useSalvarPerfil();
  const [categoria, setCategoria] = useState<MpCategoria>(inicial.categoria);
  const [segmento, setSegmento] = useState(inicial.segmento ?? '');
  const [logoUrl, setLogoUrl] = useState(inicial.logo_url ?? '');
  const [whatsapp, setWhatsapp] = useState(inicial.whatsapp ?? '');
  const [instagram, setInstagram] = useState(inicial.instagram ?? '');
  const [publicado, setPublicado] = useState(inicial.publicado);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">{inicial.cliente_nome}</h2>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} />
          Publicado
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-300">
          Categoria
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as MpCategoria)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]">
            <option value="base">🏢 Base Turbo</option>
            <option value="beneficios">⭐ Clube de Benefícios</option>
          </select>
        </label>
        <Input id="segm" label="Segmento" value={segmento} onChange={(e) => setSegmento(e.target.value)} placeholder="Ex: Tráfego pago, Moda, Advocacia…" />
        <Input id="logo" label="URL do logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
        <Input id="wpp"  label="WhatsApp"  value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+55 27 99999-9999" />
        <div className="sm:col-span-2">
          <Input id="ig" label="Instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@empresa" />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          onClick={() => salvar.mutate({ cliente_id: cid, categoria, segmento, logo_url: logoUrl, whatsapp, instagram, publicado })}
          disabled={salvar.isPending}
        >
          {salvar.isPending ? 'Salvando…' : 'Salvar perfil'}
        </Button>
      </div>
    </Card>
  );
}

// -----------------------------------------------
function ProdutosSection({ clienteId }: { clienteId: string }) {
  const { data: produtos, isLoading } = useMpProdutos(clienteId);
  const salvar = useSalvarProduto();
  const apagar = useApagarProduto();
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoDesc, setNovoDesc]   = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [novoDesconto, setNovoDesconto] = useState('');

  async function adicionar() {
    if (!novoTitulo.trim()) return;
    await salvar.mutateAsync({
      cliente_id: clienteId,
      titulo: novoTitulo.trim(),
      descricao: novoDesc.trim() || null,
      preco_brl: novoPreco ? Number(novoPreco) : null,
      desconto_texto: novoDesconto.trim() || null,
      ativo: true,
      ordem: (produtos?.length ?? 0),
    });
    setNovoTitulo(''); setNovoDesc(''); setNovoPreco(''); setNovoDesconto('');
  }

  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-100">Produtos / ofertas</h3>

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <Input id="np-t" label="Título" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} />
        <Input id="np-d" label="Descrição" value={novoDesc} onChange={(e) => setNovoDesc(e.target.value)} />
        <Input id="np-p" label="Preço (R$)" type="number" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} />
        <Input id="np-des" label="Termo do desconto (opcional)" value={novoDesconto} onChange={(e) => setNovoDesconto(e.target.value)} placeholder="Ex: 20% off, 2 por 1…" />
        <div className="sm:col-span-2 flex justify-end">
          <Button onClick={adicionar} disabled={salvar.isPending || !novoTitulo.trim()}>+ Adicionar produto</Button>
        </div>
      </div>

      {isLoading ? <Spinner /> : (produtos ?? []).length === 0 ? (
        <p className="text-center text-xs text-slate-500">Nenhum produto ainda.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {produtos!.map((p) => (
            <li key={p.id} className="flex items-start gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-100">{p.titulo}</span>
                  {!p.ativo && <Badge tone="slate">inativo</Badge>}
                </div>
                {p.descricao && <div className="text-xs text-slate-400">{p.descricao}</div>}
                <div className="mt-1 text-xs text-slate-500">
                  {p.preco_brl != null && <>R$ {Number(p.preco_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · </>}
                  {p.desconto_texto}
                </div>
              </div>
              <button
                onClick={() => salvar.mutate({ id: p.id, cliente_id: clienteId, titulo: p.titulo, ativo: !p.ativo })}
                className="rounded-md px-2 text-xs text-slate-300 hover:bg-white/10"
              >
                {p.ativo ? 'ocultar' : 'ativar'}
              </button>
              <button
                onClick={() => { if (confirm('Apagar produto?')) apagar.mutate({ id: p.id, cliente_id: clienteId }); }}
                className="rounded-md px-2 text-xs text-red-300 hover:bg-red-500/10"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
