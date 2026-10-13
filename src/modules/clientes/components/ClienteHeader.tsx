import { useRef, useState } from 'react';
import type { Cliente } from '@/modules/clientes/types';
import { TIPO_NEGOCIO_LABEL, SERVICO_LABEL } from '@/modules/clientes/types';
import { StatusBadge } from '@/modules/clientes/components/StatusBadge';
import { Badge } from '@/shared/ui/Badge';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { uploadArquivo } from '@/shared/lib/storage';
import { useAtualizarLogoCliente } from '@/modules/clientes/api/clientesApi';
import { LogoCliente } from '@/shared/ui/LogoCliente';

export function ClienteHeader({ cliente }: { cliente: Cliente }) {
  const iniciais = cliente.nome.slice(0, 2).toUpperCase();
  const dataEntrada = new Date(cliente.data_entrada).toLocaleDateString('pt-BR');

  const atualizarLogo = useAtualizarLogoCliente();
  const inputLogo = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroLogo, setErroLogo] = useState<string | null>(null);

  async function enviarLogo(file: File) {
    setErroLogo(null);
    if (file.size > 5 * 1024 * 1024) { setErroLogo('Logo acima de 5 MB.'); return; }
    setEnviando(true);
    try {
      const { url } = await uploadArquivo({ bucket: 'logos-clientes', clienteId: cliente.id, file });
      await atualizarLogo.mutateAsync({ id: cliente.id, logo_url: url });
    } catch (e) {
      setErroLogo((e as Error).message || 'Falha ao enviar a logo.');
    } finally {
      setEnviando(false);
    }
  }

  async function removerLogo() {
    if (!confirm(`Remover a logo de "${cliente.nome}"?`)) return;
    setErroLogo(null);
    try { await atualizarLogo.mutateAsync({ id: cliente.id, logo_url: null }); }
    catch (e) { setErroLogo((e as Error).message || 'Falha ao remover a logo.'); }
  }

  return (
    <div className="flex items-start gap-4">
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => inputLogo.current?.click()}
          disabled={enviando}
          title={cliente.logo_url ? 'Trocar logotipo' : 'Adicionar logotipo'}
          className="group relative h-16 w-16 overflow-hidden rounded-lg border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          {cliente.logo_url ? (
            <LogoCliente src={cliente.logo_url} alt={`Logo de ${cliente.nome}`} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-brand-500/10 text-lg font-semibold text-brand-300">
              {iniciais}
            </span>
          )}
          <span className={`absolute inset-0 flex items-center justify-center bg-slate-950/70 text-brand-100 transition-opacity ${
            enviando ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}>
            <GlassIcon name={enviando ? 'hourglass' : 'upload'} className="h-5 w-5" />
          </span>
        </button>
        <input
          ref={inputLogo}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void enviarLogo(f); }}
        />
        <button
          type="button"
          onClick={() => inputLogo.current?.click()}
          disabled={enviando}
          className="whitespace-nowrap text-[11px] font-medium text-brand-300 hover:underline"
        >
          {enviando ? 'Enviando…' : cliente.logo_url ? 'Trocar logo' : 'Adicionar logotipo'}
        </button>
        {cliente.logo_url && !enviando && (
          <button type="button" onClick={removerLogo} className="text-[11px] text-slate-400 hover:text-red-300">
            Remover
          </button>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-2xl font-semibold text-white">
            {cliente.nome}
          </h1>
          <StatusBadge status={cliente.status} />
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {TIPO_NEGOCIO_LABEL[cliente.tipo_negocio]} · cliente desde {dataEntrada}
          {cliente.conteudos_por_semana > 0 && (
            <> · {cliente.conteudos_por_semana} conteúdos/semana</>
          )}
        </p>
        {cliente.servicos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {cliente.servicos.map((s) => (
              <Badge key={s} tone="blue">{SERVICO_LABEL[s]}</Badge>
            ))}
          </div>
        )}
        {erroLogo && <p role="alert" className="mt-2 text-xs text-red-400">{erroLogo}</p>}
      </div>
    </div>
  );
}
