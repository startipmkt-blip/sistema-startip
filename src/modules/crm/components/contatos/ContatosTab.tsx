import { useMemo, useState } from 'react';
import type { CrmLead } from '@/modules/crm/types';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';

interface Props {
  leads: CrmLead[];
  onAbrirConversa: (leadId: string) => void;
  onEditarLead: (lead: CrmLead) => void;
  onNovoContato: () => void;
  onConverterCliente: (lead: CrmLead) => void;
}

function formatData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function ContatosTab({
  leads, onAbrirConversa, onEditarLead, onNovoContato, onConverterCliente,
}: Props) {
  const [busca, setBusca] = useState('');
  const [origemFiltro, setOrigemFiltro] = useState<'todos' | 'whatsapp' | 'manual'>('todos');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return leads
      .filter((l) => {
        if (origemFiltro === 'whatsapp' && !(l.origem ?? '').toLowerCase().includes('whatsapp')) return false;
        if (origemFiltro === 'manual' && (l.origem ?? '').toLowerCase().includes('whatsapp')) return false;
        if (!q) return true;
        return (
          l.nome.toLowerCase().includes(q) ||
          (l.empresa ?? '').toLowerCase().includes(q) ||
          l.telefone.includes(q) ||
          (l.origem ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }, [leads, busca, origemFiltro]);

  const totalWhatsapp = leads.filter((l) => (l.origem ?? '').toLowerCase().includes('whatsapp')).length;
  const totalManual = leads.length - totalWhatsapp;

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      {/* Header — busca + filtros + ação */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <input
            type="text"
            placeholder="Buscar por nome, telefone, empresa…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-8 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
          />
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        </div>

        <div className="flex gap-1 rounded-md border border-white/10 bg-white/5 p-0.5 text-xs">
          {(
            [
              { id: 'todos', label: `Todos (${leads.length})` },
              { id: 'whatsapp', label: `WhatsApp (${totalWhatsapp})` },
              { id: 'manual', label: `Manuais (${totalManual})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setOrigemFiltro(f.id)}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                origemFiltro === f.id ? 'bg-brand-500/25 text-brand-100' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Button onClick={onNovoContato}>+ Novo contato</Button>
      </div>

      {/* Tabela */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02]">
        {filtrados.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8">
            <EmptyState
              message={
                busca
                  ? 'Nenhum contato encontrado com esses termos.'
                  : 'Nenhum contato ainda. Mensagens do WhatsApp aparecem aqui automaticamente.'
              }
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Telefone</th>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Origem</th>
                <th className="px-4 py-2 font-medium">Etapa</th>
                <th className="px-4 py-2 font-medium">Entrou em</th>
                <th className="px-4 py-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtrados.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-2">
                    <button
                      onClick={() => onEditarLead(l)}
                      className="text-left text-slate-100 hover:text-brand-300"
                    >
                      {l.nome || <span className="italic text-slate-500">sem nome</span>}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-slate-300">{l.telefone || '—'}</td>
                  <td className="px-4 py-2 text-slate-400">{l.empresa || '—'}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        (l.origem ?? '').toLowerCase().includes('whatsapp')
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {(l.origem ?? '').toLowerCase().includes('whatsapp') && '🟢'} {l.origem || 'Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">{l.etapa}</td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {l.created_at ? formatData(l.created_at) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onAbrirConversa(l.id)}
                        className="rounded-md bg-brand-500/15 px-2 py-1 text-[11px] font-medium text-brand-200 hover:bg-brand-500/25"
                      >
                        💬 Conversa
                      </button>
                      <button
                        onClick={() => onConverterCliente(l)}
                        className="rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/10"
                        title="Cadastrar este contato como cliente da agência"
                      >
                        ➕ Virar cliente
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
