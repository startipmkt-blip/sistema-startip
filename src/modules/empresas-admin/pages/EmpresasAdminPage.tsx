import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { PinGate } from '@/shared/ui/PinGate';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { StatCard } from '@/shared/ui/StatCard';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import type { Cliente, ClienteStatus } from '@/shared/types/database';

const CHAVE_SESSAO = 'startip-os:empresas-pin-ok';

export function EmpresasAdminPage() {
  const [liberado, setLiberado] = useState<boolean>(() => sessionStorage.getItem(CHAVE_SESSAO) === '1');
  if (!liberado) return (
    <PinGate area="empresas" icone="🏢" titulo="Empresas"
             onOk={() => { sessionStorage.setItem(CHAVE_SESSAO, '1'); setLiberado(true); }} />
  );
  return <PainelEmpresas onSair={() => { sessionStorage.removeItem(CHAVE_SESSAO); setLiberado(false); }} />;
}

// -----------------------------------------
function useTodosClientes() {
  return useQuery({
    queryKey: ['empresas-admin', 'todos'],
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase.from('clientes').select('*').order('nome');
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });
}

function useMudarStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; status: ClienteStatus }) => {
      const { error } = await supabase.from('clientes').update({ status: p.status } as never).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresas-admin'] }),
  });
}

function csvSeguro(v: unknown): string {
  const s = String(v ?? '').replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

function PainelEmpresas({ onSair }: { onSair: () => void }) {
  const { data: clientes, isLoading } = useTodosClientes();
  const mudarStatus = useMudarStatus();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'ativo' | 'prospect' | 'inativo'>('todos');
  const [ordenar, setOrdenar] = useState<'nome' | 'recentes'>('nome');

  const totais = useMemo(() => {
    const t = { total: 0, ativo: 0, prospect: 0, inativo: 0 };
    (clientes ?? []).forEach((c) => { t.total++; (t as any)[c.status]++; });
    return t;
  }, [clientes]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let arr = (clientes ?? []).filter((c) => (filtro === 'todos' ? true : c.status === filtro));
    if (q) arr = arr.filter((c) => c.nome.toLowerCase().includes(q));
    arr.sort((a, b) => (ordenar === 'nome' ? a.nome.localeCompare(b.nome) : b.created_at.localeCompare(a.created_at)));
    return arr;
  }, [clientes, busca, filtro, ordenar]);

  function exportarCsv() {
    const cols = ['id', 'nome', 'status', 'tipo_negocio', 'servicos', 'conteudos_por_semana', 'data_entrada'];
    const linhas = [cols.join(',')];
    filtradas.forEach((c) => {
      linhas.push([
        c.id, c.nome, c.status, c.tipo_negocio,
        (c.servicos ?? []).join('|'),
        c.conteudos_por_semana, c.data_entrada,
      ].map(csvSeguro).join(','));
    });
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `empresas-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-white">🏢 Empresas</h1>
        <span className="text-xs text-slate-400">Cadastro consolidado</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={exportarCsv}>⬇️ CSV</Button>
          <Button variant="secondary" onClick={onSair}>🔒 Sair da área</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total"    value={String(totais.total)}    tone="slate" />
        <StatCard label="Ativos"   value={String(totais.ativo)}    tone="green" />
        <StatCard label="Prospect" value={String(totais.prospect)} tone="blue" />
        <StatCard label="Inativos" value={String(totais.inativo)}  tone="amber" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md bg-white/5 p-1 text-xs">
          {(['todos', 'ativo', 'prospect', 'inativo'] as const).map((s) => (
            <button key={s} onClick={() => setFiltro(s)}
                    className={`rounded px-3 py-1 ${filtro === s ? 'bg-brand-500 text-white' : 'text-slate-300'}`}>
              {s === 'todos' ? 'Todos' : s === 'ativo' ? 'Ativos' : s === 'prospect' ? 'Prospect' : 'Inativos'}
            </button>
          ))}
        </div>
        <select value={ordenar} onChange={(e) => setOrdenar(e.target.value as 'nome' | 'recentes')}
                className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]">
          <option value="nome">A-Z</option>
          <option value="recentes">Mais recentes</option>
        </select>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome…"
          className="ml-auto w-full max-w-sm rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : filtradas.length === 0 ? (
        <EmptyState message="Nenhuma empresa nesse filtro." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-xs text-slate-400">
              <tr>
                <th className="p-3">Empresa</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Serviços</th>
                <th className="p-3">Desde</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3">
                    <a href={`/clientes/${c.id}`} className="font-medium text-brand-300 hover:underline">{c.nome}</a>
                  </td>
                  <td className="p-3 text-xs text-slate-300">{c.tipo_negocio === 'local' ? 'Local' : 'E-commerce'}</td>
                  <td className="p-3 text-xs text-slate-400">{(c.servicos ?? []).join(' · ') || '—'}</td>
                  <td className="p-3 text-xs text-slate-400">{new Date(c.data_entrada).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">
                    <Badge tone={c.status === 'ativo' ? 'green' : c.status === 'prospect' ? 'blue' : 'slate'}>{c.status}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1 text-xs">
                      {c.status !== 'ativo'    && <button onClick={() => mudarStatus.mutate({ id: c.id, status: 'ativo' })}   className="rounded px-2 py-1 text-emerald-300 hover:bg-emerald-500/10">Ativar</button>}
                      {c.status !== 'prospect' && <button onClick={() => mudarStatus.mutate({ id: c.id, status: 'prospect' })} className="rounded px-2 py-1 text-blue-300 hover:bg-blue-500/10">Prospect</button>}
                      {c.status !== 'inativo'  && <button onClick={() => mudarStatus.mutate({ id: c.id, status: 'inativo' })}  className="rounded px-2 py-1 text-slate-400 hover:bg-white/5">Arquivar</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
