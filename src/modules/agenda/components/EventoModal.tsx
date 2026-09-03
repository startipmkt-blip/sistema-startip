import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useSalvarEvento, useApagarEvento, useAgendaTemplates, type AgendaEvent, type AgendaStatus, type Recorrencia } from '@/modules/agenda/api/agendaApi';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { PILLAR_KEYS, pillarInfo, type PillarKey } from '@/shared/lib/pillars';

interface Props {
  open: boolean;
  onClose: () => void;
  evento: AgendaEvent | null;
  dataDefault?: string;
}

const LEMBRETES: { v: number | null; label: string }[] = [
  { v: null, label: 'Sem lembrete' },
  { v: 5,    label: '5 min antes' },
  { v: 15,   label: '15 min antes' },
  { v: 30,   label: '30 min antes' },
  { v: 60,   label: '1 hora antes' },
  { v: 120,  label: '2 horas antes' },
  { v: 1440, label: '1 dia antes' },
];

const RECORR: { v: Recorrencia; label: string }[] = [
  { v: 'none',     label: 'Não recorrente' },
  { v: 'daily',    label: 'Diária' },
  { v: 'weekly',   label: 'Semanal' },
  { v: 'biweekly', label: 'Quinzenal' },
  { v: 'monthly',  label: 'Mensal' },
];

export function EventoModal({ open, onClose, evento, dataDefault }: Props) {
  const salvar = useSalvarEvento();
  const apagar = useApagarEvento();
  const clientesQ = useClientes('');
  const templatesQ = useAgendaTemplates();

  const [titulo, setTitulo] = useState(evento?.titulo ?? '');
  const [descricao, setDescricao] = useState(evento?.descricao ?? '');
  const [data, setData] = useState(evento?.data ?? dataDefault ?? new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(evento?.hora?.slice(0, 5) ?? '09:00');
  const [duracao, setDuracao] = useState(String(evento?.duracao_min ?? 60));
  const [clientes, setClientes] = useState<string[]>(evento?.clientes ?? []);
  const [pilares, setPilares] = useState<PillarKey[]>(evento?.pilares ?? []);
  const [status, setStatus] = useState<AgendaStatus>(evento?.status ?? 'agendado');
  const [lembrete, setLembrete] = useState<number | null>(evento?.lembrete_min ?? null);
  const [recorrencia, setRecorrencia] = useState<Recorrencia>(evento?.recorrencia ?? 'none');
  const [templateId, setTemplateId] = useState<string>('');

  useEffect(() => {
    if (!templateId) return;
    const t = templatesQ.data?.find((x) => x.id === templateId);
    if (!t) return;
    setTitulo(t.titulo);
    setDuracao(String(t.duracao_min_padrao));
    if (t.pilares_padrao.length) setPilares(t.pilares_padrao);
  }, [templateId, templatesQ.data]);

  const listaClientes = useMemo(() => clientesQ.data ?? [], [clientesQ.data]);

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function handleSalvar() {
    await salvar.mutateAsync({
      id: evento?.id,
      dados: {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        data,
        hora: `${hora}:00`,
        duracao_min: parseInt(duracao || '60', 10),
        clientes,
        pilares,
        status,
        lembrete_min: lembrete,
        recorrencia,
      },
    });
    onClose();
  }

  async function handleApagar() {
    if (!evento?.id) return;
    if (!confirm('Apagar agendamento?')) return;
    await apagar.mutateAsync(evento.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={evento ? 'Editar agendamento' : 'Novo agendamento'}
      footer={
        <>
          {evento?.id && (
            <button onClick={handleApagar} className="mr-auto rounded-md px-3 py-1 text-xs text-red-300 hover:bg-red-500/10">
              🗑️ Apagar
            </button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending || !titulo.trim()}>
            {salvar.isPending ? 'Salvando…' : (evento ? 'Salvar' : 'Criar')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="col-span-full text-xs text-slate-300">
          Modelo (opcional)
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]"
          >
            <option value="">— nenhum —</option>
            {(templatesQ.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
          </select>
        </label>

        <div className="col-span-full">
          <Input id="ag-titulo" label="Título *" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>

        <label className="text-xs text-slate-300">
          Data *
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
                 className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]" />
        </label>
        <label className="text-xs text-slate-300">
          Hora *
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
                 className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]" />
        </label>
        <Input id="ag-dur" label="Duração (min)" type="number" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        <label className="text-xs text-slate-300">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as AgendaStatus)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]">
            <option value="agendado">Agendado</option>
            <option value="concluido">Concluído</option>
            <option value="reagendado">Reagendado</option>
            <option value="desistencia">Desistência</option>
          </select>
        </label>

        {/* Empresas (multi) */}
        <div className="col-span-full">
          <div className="mb-1 text-xs text-slate-300">Empresas</div>
          <div className="flex flex-wrap gap-1">
            {listaClientes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClientes((cur) => toggle(cur, c.id))}
                className={`rounded-full px-2 py-1 text-xs ${clientes.includes(c.id) ? 'bg-brand-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Pilares (multi) */}
        <div className="col-span-full">
          <div className="mb-1 text-xs text-slate-300">Pilares</div>
          <div className="flex flex-wrap gap-1">
            {PILLAR_KEYS.map((k) => {
              const info = pillarInfo(k);
              const on = pilares.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPilares((cur) => toggle(cur, k))}
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${on ? 'bg-brand-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  <span aria-hidden>{info.icone}</span>{info.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="text-xs text-slate-300">
          Lembrete
          <select value={lembrete ?? ''} onChange={(e) => setLembrete(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]">
            {LEMBRETES.map((x) => <option key={x.v ?? ''} value={x.v ?? ''}>{x.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          Recorrência
          <select value={recorrencia} onChange={(e) => setRecorrencia(e.target.value as Recorrencia)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]">
            {RECORR.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}
          </select>
        </label>

        <label className="col-span-full text-xs text-slate-300">
          Descrição
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3}
                    className="mt-1 w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none" />
        </label>
      </div>
    </Modal>
  );
}
