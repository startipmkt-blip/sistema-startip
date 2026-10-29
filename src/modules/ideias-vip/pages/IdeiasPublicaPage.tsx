import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { BrandMark } from '@/shared/ui/BrandMark';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClientes } from '@/shared/lib/demoData';
import { useDadosPortal } from '@/modules/ideias-vip/api/ideiasVipApi';
import { IdeiasVipCliente } from '@/modules/ideias-vip/components/IdeiasVipCliente';

// Página aberta pelo link que a equipe manda ao cliente. Não exige login.
export function IdeiasPublicaPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const chave = slug.toLowerCase();
  const { data, isLoading, isError } = useDadosPortal('', IS_DEMO ? undefined : chave);
  const clienteId = IS_DEMO ? demoClientes[0]?.id ?? '' : data?.cliente?.id ?? '';
  const nome = IS_DEMO ? demoClientes[0]?.nome : data?.cliente?.nome;

  useEffect(() => {
    document.title = nome ? `${nome} · Ideias de postagem` : 'Ideias de postagem';
  }, [nome]);

  if (isLoading && !IS_DEMO) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;

  if (!IS_DEMO && (isError || !data?.cliente)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <p className="text-base text-slate-100">Este link não está mais disponível.</p>
          <p className="mt-2 text-sm text-slate-400">Peça um novo link à equipe Startip.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <BrandMark />
          {nome && <span className="truncate text-sm font-medium text-slate-100">{nome}</span>}
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Ideias de postagem</h1>
          <p className="text-sm text-slate-400">Ideias prontas para o seu grupo VIP. Copie o texto e use quando fizer sentido.</p>
        </div>
        <IdeiasVipCliente clientId={clienteId} slug={IS_DEMO ? undefined : chave} />
      </main>
    </div>
  );
}
