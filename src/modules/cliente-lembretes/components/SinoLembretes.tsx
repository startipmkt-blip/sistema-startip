import { useState } from 'react';
import {
  useLembretes, useAdicionarLembrete, useMarcarLembrete, useExcluirLembrete,
  lembretePendente, FREQUENCIA_LABEL, type FrequenciaLembrete,
} from '../api/lembretesApi';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface Props {
  clienteId: string;
  clienteNome: string;
}

const FREQ_OPTIONS = (Object.keys(FREQUENCIA_LABEL) as FrequenciaLembrete[]).map((f) => ({
  value: f,
  label: FREQUENCIA_LABEL[f],
}));

export function SinoLembretes({ clienteId, clienteNome }: Props) {
  const { data } = useLembretes();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [frequencia, setFrequencia] = useState<FrequenciaLembrete>('semanal');
  const adicionar = useAdicionarLembrete();
  const marcar = useMarcarLembrete();
  const excluir = useExcluirLembrete();

  const lembretes = (data ?? []).filter((l) => l.cliente_id === clienteId);
  const pendentes = lembretes.filter(lembretePendente).length;

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    try {
      await adicionar.mutateAsync({ cliente_id: clienteId, titulo: titulo.trim(), frequencia });
      setTitulo('');
    } catch (err) {
      alert(`Não foi possível adicionar: ${(err as Error).message}`);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title={pendentes > 0 ? `${pendentes} lembrete(s) pendente(s)` : 'Lembretes do cliente'}
        aria-label={`Lembretes de ${clienteNome}`}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-white/10"
      >
        <GlassIcon name="bell" className="h-5 w-5" />
        {pendentes > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {pendentes}
          </span>
        )}
      </button>

      <Modal
        open={aberto}
        onClose={() => setAberto(false)}
        title={`Lembretes · ${clienteNome}`}
        footer={<Button variant="secondary" onClick={() => setAberto(false)}>Fechar</Button>}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Marque o que já foi feito. O que não for marcado fica com a bolinha vermelha, e a lista
            zera sozinha a cada nova semana (segunda-feira) ou mês.
          </p>

          {lembretes.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Nenhum lembrete ainda. Adicione o primeiro abaixo.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {lembretes.map((l) => {
                const pend = lembretePendente(l);
                return (
                  <li key={l.id} className="flex items-center gap-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => marcar.mutate({ id: l.id, feito: pend })}
                      aria-label={pend ? 'Marcar como feito' : 'Desfazer'}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                        pend
                          ? 'border-red-400/60 text-transparent hover:border-brand-400'
                          : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {!pend && <GlassIcon name="check" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm ${pend ? 'text-slate-100' : 'text-slate-500 line-through'}`}>{l.titulo}</div>
                      <div className="text-xs text-slate-400">{FREQUENCIA_LABEL[l.frequencia]}</div>
                    </div>
                    {pend && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title="Pendente" />}
                    <button
                      type="button"
                      className="text-xs font-medium text-red-400 hover:underline"
                      onClick={() => {
                        if (confirm(`Excluir o lembrete "${l.titulo}"?`)) excluir.mutate(l.id);
                      }}
                    >
                      Excluir
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleAdicionar} className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <Input
              id="lembrete-titulo"
              label="Novo lembrete"
              placeholder="Ex.: pedir as ofertas e fotos de iPhone"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            <Select
              id="lembrete-freq"
              label="Repete"
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value as FrequenciaLembrete)}
              options={FREQ_OPTIONS}
            />
            <Button type="submit" disabled={adicionar.isPending || !titulo.trim()}>Adicionar</Button>
          </form>
        </div>
      </Modal>
    </>
  );
}
