import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/auth/AuthProvider';
import { formatarData } from '@/modules/datas-comemorativas/lib/recorrencia';
import type { Ocorrencia } from '@/modules/datas-comemorativas/types';
import { TIPO_LABEL, useDemandas, type DesignerTipo } from '@/modules/designer/api/demandasApi';
import { labelMes, mesAnteriorProximo, mesDaSemana, semanasDoMes, hojeLocal } from '@/modules/designer/lib/periodo';

interface Props {
  ocorrencia: Ocorrencia;
  clienteId: string;
  clienteNome: string;
  onClose: () => void;
}

export function tituloDemandaData(o: Ocorrencia, clienteNome: string) {
  return `${o.base.nome} - ${clienteNome}`;
}

/** Demanda do designer já criada a partir desta data (mesmo cliente, título e ano). */
export function useDemandaDaData(o: Ocorrencia, clienteId: string, clienteNome: string) {
  const { data } = useDemandas({ clienteId });
  const titulo = tituloDemandaData(o, clienteNome);
  return (data ?? []).find(
    (d) => d.origem === 'calendario' && d.titulo === titulo && (d.ref_data ?? d.created_at).slice(0, 4) === String(o.ano),
  ) ?? null;
}

export function EnviarDesignerModal({ ocorrencia: o, clienteId, clienteNome, onClose }: Props) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const mesData = mesDaSemana(o.data);
  const [mes, setMes] = useState(mesData);
  const [semana, setSemana] = useState(() => semanasDoMes(mesData).find((s) => o.data >= s.ini && o.data <= s.fim)?.ini ?? '');
  const [tipo, setTipo] = useState<DesignerTipo>('post');
  const [erro, setErro] = useState<string | null>(null);
  const existente = useDemandaDaData(o, clienteId, clienteNome);

  const meses = useMemo(() => {
    const base = mesDaSemana(hojeLocal());
    const lista = Array.from({ length: 15 }, (_, i) => mesAnteriorProximo(base, i - 2));
    return (lista.includes(mesData) ? lista : [...lista, mesData].sort()).map((m) => ({ value: m, label: labelMes(m) }));
  }, [mesData]);
  const semanas = useMemo(
    () => semanasDoMes(mes).map((s) => ({ value: s.ini, label: `Semana ${s.numero} (${s.label})` })),
    [mes],
  );

  function trocarMes(novo: string) {
    setMes(novo);
    setSemana(semanasDoMes(novo)[0]?.ini ?? '');
  }

  const enviar = useMutation({
    mutationFn: async () => {
      const angulos = o.angulos.length ? `\nPossíveis ângulos: ${o.angulos.join(', ')}.` : '';
      const dataTxt = formatarData(o.data, { day: '2-digit', month: '2-digit', year: 'numeric' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('designer_demandas').insert({
        cliente_id: clienteId,
        titulo: tituloDemandaData(o, clienteNome),
        descricao: `Data comemorativa: ${o.base.nome} (${dataTxt}).`,
        briefing: `${o.item.relevancia ? `${o.item.relevancia}\n` : ''}${angulos}`.trim() || null,
        tipo,
        status: 'a_fazer',
        origem: 'calendario',
        semana_ref: semana,
        criado_por: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['designer'] });
      onClose();
    },
    onError: (e) => setErro((e as Error).message),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Enviar ao designer — ${o.base.nome}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => enviar.mutate()} disabled={enviar.isPending || !semana}>
            {enviar.isPending ? 'Enviando…' : existente ? 'Criar mesmo assim' : 'Criar demanda'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Cria a demanda de {clienteNome} em &quot;A fazer&quot; no Designer. Escolha para quando o designer deve entregar.
        </p>
        {existente && (
          <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Já enviada ao designer ({new Date(existente.created_at).toLocaleDateString('pt-BR')}). Criar de novo vai duplicar a demanda.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Mês" value={mes} onChange={(e) => trocarMes(e.target.value)} options={meses} />
          <Select label="Semana" value={semana} onChange={(e) => setSemana(e.target.value)} options={semanas} />
        </div>
        <Select
          label="Tipo da peça"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as DesignerTipo)}
          options={(Object.keys(TIPO_LABEL) as DesignerTipo[]).map((t) => ({ value: t, label: TIPO_LABEL[t] }))}
        />
        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
      </div>
    </Modal>
  );
}
