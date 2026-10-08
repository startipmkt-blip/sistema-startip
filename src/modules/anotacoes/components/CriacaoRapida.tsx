import { useMemo, useState } from 'react';
import { useSalvarAnotacao } from '@/modules/anotacoes/api/anotacoesApi';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useAuth } from '@/shared/auth/AuthProvider';

interface Props {
  clienteInicial?: string | null;
}

export function CriacaoRapida({ clienteInicial = null }: Props) {
  const salvar = useSalvarAnotacao();
  const { profile } = useAuth();
  const { data: clientes } = useClientes('');
  const [texto, setTexto] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(clienteInicial);

  const clienteOpts = useMemo(
    () => [
      { value: '', label: 'Geral' },
      ...(clientes ?? []).filter((c) => c.status === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome))
        .map((c) => ({ value: c.id, label: c.nome })),
    ],
    [clientes],
  );

  async function salvarRapido() {
    if (!texto.trim()) return;
    await salvar.mutateAsync({
      dados: {
        texto: texto.trim(),
        cliente_id: clienteId,
        autor_id: profile?.id ?? null,
        prazo: null,
        prioridade: 'normal',
      },
    });
    setTexto('');
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
      <span className="pl-2 text-slate-500">✍️</span>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void salvarRapido(); }}
        placeholder="Anotação rápida… (Enter para salvar)"
        className="min-w-[200px] flex-1 bg-transparent px-1 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
      />
      <select
        value={clienteId ?? ''}
        onChange={(e) => setClienteId(e.target.value || null)}
        className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]"
      >
        {clienteOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button
        onClick={() => void salvarRapido()}
        disabled={!texto.trim() || salvar.isPending}
        className="rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-400 disabled:opacity-40"
      >
        {salvar.isPending ? '…' : 'Salvar'}
      </button>
    </div>
  );
}
