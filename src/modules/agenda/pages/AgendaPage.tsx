import { useMemo, useState } from 'react';
import { useAgendaEventos, type AgendaEvent } from '@/modules/agenda/api/agendaApi';
import { EventoModal } from '@/modules/agenda/components/EventoModal';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { pillarInfo } from '@/shared/lib/pillars';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

function inicioSemana(d: Date): Date {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7; // segunda como início
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDias(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
function iso(d: Date): string { return d.toISOString().slice(0, 10); }
function ddmm(d: Date): string { return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function AgendaPage() {
  const [inicio, setInicio] = useState<Date>(() => inicioSemana(new Date()));
  const fim = addDias(inicio, 6);
  const { data: eventos, isLoading } = useAgendaEventos(iso(inicio), iso(fim));
  const clientesQ = useClientes('');
  const [novoOpen, setNovoOpen] = useState<{ open: boolean; data?: string; evento?: AgendaEvent | null }>({ open: false });

  const nomeCliente = useMemo(() => {
    const m = new Map<string, string>();
    (clientesQ.data ?? []).forEach((c) => m.set(c.id, c.nome));
    return m;
  }, [clientesQ.data]);

  const porDia = useMemo(() => {
    const m: Record<string, AgendaEvent[]> = {};
    (eventos ?? []).forEach((e) => {
      (m[e.data] ??= []).push(e);
    });
    return m;
  }, [eventos]);

  function copiarDia(d: Date) {
    const key = iso(d);
    const lista = porDia[key] ?? [];
    if (lista.length === 0) { alert('Nenhum agendamento nesse dia.'); return; }
    const texto = `📅 *Agenda ${d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}*\n\n`
      + lista.map((e) => {
        const nomes = e.clientes.map((id) => nomeCliente.get(id) ?? '—').join(', ');
        const pilaresTxt = e.pilares.map((p) => pillarInfo(p).icone).join(' ');
        return `• ${e.hora.slice(0, 5)} — *${e.titulo}*${nomes ? ` (${nomes})` : ''} ${pilaresTxt}`;
      }).join('\n');
    navigator.clipboard.writeText(texto).catch(() => { /* clipboard bloqueado */ });
    alert('Agenda do dia copiada. Cole no grupo do WhatsApp.');
  }

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-white">Agenda</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={() => setInicio(inicioSemana(new Date()))}>Hoje</Button>
          <button onClick={() => setInicio(addDias(inicio, -7))} className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/10">‹</button>
          <span className="min-w-32 text-center text-sm text-slate-200">{ddmm(inicio)} → {ddmm(fim)}</span>
          <button onClick={() => setInicio(addDias(inicio, 7))} className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/10">›</button>
          <Button onClick={() => setNovoOpen({ open: true })}>+ Novo agendamento</Button>
        </div>
      </header>

      {isLoading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {DIAS.map((label, i) => {
            const d = addDias(inicio, i);
            const key = iso(d);
            const lista = porDia[key] ?? [];
            const hoje = key === iso(new Date());
            return (
              <Card key={i} className={`flex min-h-[220px] flex-col p-2 ${hoje ? 'border-brand-400/40' : ''}`}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
                    <div className="text-sm font-semibold text-slate-100">{ddmm(d)}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => copiarDia(d)} title="Copiar agenda pro WhatsApp"
                            className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 hover:bg-white/10">💬</button>
                    <button onClick={() => setNovoOpen({ open: true, data: key })}
                            className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 hover:bg-white/10">+</button>
                  </div>
                </div>
                {lista.length === 0 ? (
                  <p className="mt-4 text-center text-[11px] text-slate-600">vazio</p>
                ) : (
                  <ul className="space-y-1">
                    {lista.map((e) => (
                      <li key={e.id}>
                        <button
                          onClick={() => setNovoOpen({ open: true, evento: e })}
                          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-left text-[11px] text-slate-200 hover:bg-white/10"
                        >
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-slate-400">{e.hora.slice(0, 5)}</span>
                            <span className="truncate font-medium">{e.titulo}</span>
                          </div>
                          {e.clientes.length > 0 && (
                            <div className="mt-0.5 truncate text-[10px] text-slate-500">
                              {e.clientes.map((id) => nomeCliente.get(id) ?? '—').join(', ')}
                            </div>
                          )}
                          {e.pilares.length > 0 && (
                            <div className="mt-0.5 flex gap-1">
                              {e.pilares.map((p) => <span key={p} title={pillarInfo(p).label}>{pillarInfo(p).icone}</span>)}
                            </div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {(!eventos || eventos.length === 0) && !isLoading && (
        <EmptyState message="Nenhum agendamento nesta semana. Clique em '+ Novo agendamento' para começar." />
      )}

      {novoOpen.open && (
        <EventoModal
          open
          onClose={() => setNovoOpen({ open: false })}
          evento={novoOpen.evento ?? null}
          dataDefault={novoOpen.data}
        />
      )}
    </div>
  );
}
