import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useDemandas, useGerarSemana, TIPO_LABEL, type DesignerTipo } from '../api/demandasApi';
import { opcoesDeSemana, semanasDoMes, mesDaSemana, hojeLocal, semanaDe } from '../lib/periodo';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Início da semana aberta no quadro (padrão do seletor). */
  semanaInicial?: string;
}

// Gera, de uma vez, as demandas "A fazer" da semana: uma por post da meta semanal
// de cada cliente (clientes.conteudos_por_semana), descontando as que já existem.
export function GerarSemanaModal({ open, onClose, semanaInicial }: Props) {
  const { data: clientes, isLoading } = useClientes('');
  const { data: demandas } = useDemandas();
  const gerar = useGerarSemana();

  const hoje = hojeLocal();
  const padrao = semanaInicial ?? semanaDe(mesDaSemana(hoje), hoje).ini;
  const [semana, setSemana] = useState(padrao);
  const [tipo, setTipo] = useState<DesignerTipo>('post');
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setSemana(padrao); setQtds({}); setErro(null); setOk(null); }
  }, [open, padrao]);

  const opcoes = useMemo(() => opcoesDeSemana([semana]), [semana]);
  const intervalo = useMemo(() => {
    const mes = mesDaSemana(semana);
    const s = semanasDoMes(mes).find((x) => semana >= x.ini && semana <= x.fim);
    return s ? { ini: s.ini, fim: s.fim } : { ini: semana, fim: semana };
  }, [semana]);

  const linhas = useMemo(() => {
    const ativos = (clientes ?? []).filter((c) => c.status === 'ativo' && (c.conteudos_por_semana ?? 0) > 0);
    return ativos
      .map((c) => {
        const existentes = (demandas ?? []).filter(
          (d) => d.cliente_id === c.id && (d.ref_data ?? '') >= intervalo.ini && (d.ref_data ?? '') <= intervalo.fim,
        ).length;
        const meta = c.conteudos_por_semana ?? 0;
        const sugerido = Math.max(0, meta - existentes);
        return { c, meta, existentes, sugerido, criar: qtds[c.id] ?? sugerido };
      })
      .sort((a, b) => a.c.nome.localeCompare(b.c.nome));
  }, [clientes, demandas, intervalo, qtds]);

  const total = linhas.reduce((s, l) => s + l.criar, 0);

  async function confirmar() {
    setErro(null);
    const lote = linhas.flatMap((l) =>
      Array.from({ length: l.criar }, (_, i) => ({
        cliente_id: l.c.id,
        titulo: `${TIPO_LABEL[tipo]} ${l.existentes + i + 1} - ${l.c.nome}`,
        tipo,
        semana_ref: semana,
      })),
    );
    if (lote.length === 0) { setErro('Nada para criar nesta semana.'); return; }
    try {
      const n = await gerar.mutateAsync(lote);
      setOk(`${n} demanda(s) criadas em A fazer.`);
      setTimeout(onClose, 900);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gerar demandas da semana"
      size="lg"
      fecharSoPorBotao
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={gerar.isPending || total === 0}>
            {gerar.isPending ? 'Criando…' : `Criar ${total} demanda(s)`}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Semana" value={semana} onChange={(e) => setSemana(e.target.value)} options={opcoes} />
          <Select
            label="Tipo das demandas"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as DesignerTipo)}
            options={(Object.keys(TIPO_LABEL) as DesignerTipo[]).map((t) => ({ value: t, label: TIPO_LABEL[t] }))}
          />
        </div>
        <p className="text-xs text-slate-400">
          Uma demanda por conteúdo da meta semanal de cada cliente ativo, descontando as que já existem nesta semana.
          Ajuste as quantidades se precisar. Os cartões entram em &quot;A fazer&quot; e você edita cada um depois.
        </p>

        {isLoading ? <div className="flex justify-center p-6"><Spinner /></div> : (
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Meta/semana</th>
                  <th className="px-3 py-2">Já tem</th>
                  <th className="px-3 py-2">Criar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {linhas.map((l) => (
                  <tr key={l.c.id}>
                    <td className="px-3 py-1.5 text-slate-100">{l.c.nome}</td>
                    <td className="px-3 py-1.5 text-slate-300">{l.meta}</td>
                    <td className="px-3 py-1.5 text-slate-300">{l.existentes}</td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number" min={0} max={30} value={l.criar}
                        onChange={(e) => setQtds({ ...qtds, [l.c.id]: Math.min(30, Math.max(0, Math.floor(Number(e.target.value) || 0))) })}
                        className="glass-field w-16 px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                      Nenhum cliente ativo com meta semanal de conteúdos. Defina &quot;conteúdos por semana&quot; no cadastro do cliente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
        {ok && <p className="text-sm text-emerald-300">{ok}</p>}
      </div>
    </Modal>
  );
}
