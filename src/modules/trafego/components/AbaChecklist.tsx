import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { CHECKLIST_ITENS, useChecklistHoje, useSalvarChecklist, type ChecklistDia } from '../api/trafegoApi';

interface Props { clienteId: string | undefined; clienteNome: string | undefined; }

export function AbaChecklist({ clienteId, clienteNome }: Props) {
  const { data, isLoading } = useChecklistHoje(clienteId);
  const salvar = useSalvarChecklist();

  const [local, setLocal] = useState<ChecklistDia | null>(null);
  useEffect(() => { if (data) setLocal(data); }, [data]);

  if (!clienteId) return <Card className="p-8 text-center text-sm text-slate-400">Selecione um cliente acima.</Card>;
  if (isLoading || !local) return null;

  function toggle(i: number) {
    if (!local) return;
    const key = `item_${i}` as keyof ChecklistDia;
    setLocal({ ...local, [key]: !local[key] } as ChecklistDia);
  }

  const marcados = [1,2,3,4,5,6].filter((i) => local![`item_${i}` as 'item_1']).length;

  async function submit() {
    if (!local) return;
    await salvar.mutateAsync({
      cliente_id: local.cliente_id, data: local.data,
      item_1: local.item_1, item_2: local.item_2, item_3: local.item_3,
      item_4: local.item_4, item_5: local.item_5, item_6: local.item_6,
      observacoes: local.observacoes,
    });
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">📋 Checklist diário — {clienteNome}</h3>
          <p className="text-[11px] text-slate-500">Ciclo desde {new Date(local.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} · zera seg/qua/sex · {marcados}/6 itens</p>
        </div>
        <div className="h-2 w-40 rounded-full bg-white/5">
          <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all" style={{ width: `${(marcados/6)*100}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {CHECKLIST_ITENS.map((label, idx) => {
          const key = `item_${idx + 1}` as 'item_1';
          const checked = local[key];
          return (
            <li key={idx}>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <input type="checkbox" checked={checked} onChange={() => toggle(idx + 1)} className="mt-0.5" />
                <span className={`flex-1 text-sm ${checked ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{label}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        <Textarea id="obs" label="Observações do dia" rows={3} value={local.observacoes ?? ''}
          onChange={(e) => setLocal({ ...local, observacoes: e.target.value })} />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button onClick={submit} disabled={salvar.isPending}>{salvar.isPending ? 'Salvando…' : 'Salvar'}</Button>
      </div>
    </Card>
  );
}
