import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

interface Produto {
  id: string;
  titulo: string;
  descricao: string | null;
  preco_brl: number | null;
  desconto_texto: string | null;
  imagem_url: string | null;
}

interface Empresa {
  cliente_id: string;
  nome: string;
  categoria: 'base' | 'beneficios';
  segmento: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  produtos: Produto[];
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketplace-publico`;

const ABAS: { id: 'todas' | 'base' | 'beneficios'; label: string }[] = [
  { id: 'todas',       label: 'Todos' },
  { id: 'base',        label: '🏢 Base Turbo' },
  { id: 'beneficios',  label: '⭐ Clube de Benefícios' },
];

function wppLink(tel: string | null): string | null {
  if (!tel) return null;
  const s = tel.replace(/\D/g, '');
  return s ? `https://wa.me/${s}` : null;
}

export function MarketplacePublicoPage() {
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [aba, setAba] = useState<'todas' | 'base' | 'beneficios'>('todas');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    (async () => {
      const url = aba === 'todas' ? FN_URL : `${FN_URL}?categoria=${aba}`;
      const r = await fetch(url);
      const body = await r.json().catch(() => ({}));
      setEmpresas(body?.empresas ?? []);
    })();
  }, [aba]);

  const filtradas = useMemo(() => {
    if (!empresas) return null;
    const q = busca.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter((e) => {
      if (e.nome.toLowerCase().includes(q)) return true;
      if ((e.segmento ?? '').toLowerCase().includes(q)) return true;
      return e.produtos.some((p) => p.titulo.toLowerCase().includes(q));
    });
  }, [empresas, busca]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="text-center">
          <div className="mb-2 text-4xl">🛍️</div>
          <h1 className="text-3xl font-semibold text-white">Turbo Marketplace</h1>
          <p className="mt-1 text-sm text-slate-400">Descontos e ofertas exclusivas entre os clientes da Startip.</p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md bg-white/5 p-1">
            {ABAS.map((t) => (
              <button
                key={t.id}
                onClick={() => setAba(t.id)}
                className={`rounded px-3 py-1 text-xs ${aba === t.id ? 'bg-brand-500 text-white' : 'text-slate-300'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar empresa, segmento ou produto…"
            className="ml-auto w-full max-w-sm rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
          />
        </div>

        {!filtradas ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : filtradas.length === 0 ? (
          <EmptyState message="Nenhuma empresa nesse filtro." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtradas.map((e) => (
              <Card key={e.cliente_id} className="flex flex-col p-4">
                <div className="mb-3 flex items-start gap-3">
                  {e.logo_url ? (
                    <img src={e.logo_url} alt="" className="h-12 w-12 rounded-lg border border-white/10 object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500/15 text-lg text-brand-300">🏢</div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-100">{e.nome}</h3>
                    {e.segmento && <div className="text-xs text-slate-400">{e.segmento}</div>}
                  </div>
                </div>

                {e.produtos.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhum produto cadastrado ainda.</p>
                ) : (
                  <ul className="mb-3 space-y-2">
                    {e.produtos.map((p) => (
                      <li key={p.id} className="rounded-md border border-white/5 bg-white/[0.02] p-2 text-xs">
                        <div className="font-medium text-slate-100">{p.titulo}</div>
                        {p.descricao && <div className="text-slate-400">{p.descricao}</div>}
                        <div className="mt-1 text-slate-300">
                          {p.preco_brl != null && <span className="font-mono">R$ {Number(p.preco_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                          {p.preco_brl != null && p.desconto_texto && ' · '}
                          {p.desconto_texto && <span className="text-emerald-300">{p.desconto_texto}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex gap-2">
                  {wppLink(e.whatsapp) && (
                    <a
                      href={wppLink(e.whatsapp) as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-md bg-emerald-500 px-3 py-2 text-center text-xs font-medium text-white hover:bg-emerald-600"
                    >
                      💬 Falar com vendedor
                    </a>
                  )}
                  {e.instagram && (
                    <a
                      href={e.instagram.startsWith('http') ? e.instagram : `https://instagram.com/${e.instagram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                    >
                      ↗ Instagram
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <footer className="pt-6 text-center text-[11px] text-slate-500">Powered by Startip · Marketplace B2B</footer>
      </div>
    </div>
  );
}
