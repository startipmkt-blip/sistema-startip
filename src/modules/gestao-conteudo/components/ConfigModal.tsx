import { useEffect, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useConfigGestao, useSalvarConfigGestao } from '@/modules/gestao-conteudo/api/gestaoApi';
import { CONFIG_PADRAO, type ConfigGestao } from '@/modules/gestao-conteudo/types';

export function ConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useConfigGestao();
  const salvar = useSalvarConfigGestao();
  const [cfg, setCfg] = useState<ConfigGestao>(CONFIG_PADRAO);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => { if (open && data) { setCfg(data); setErro(null); } }, [open, data]);

  const set = <K extends keyof ConfigGestao>(k: K, v: ConfigGestao[K]) => setCfg((c) => ({ ...c, [k]: v }));

  function handleSalvar() {
    salvar.mutate(cfg, {
      onSuccess: onClose,
      onError: (e) => setErro(`Não foi possível salvar: ${(e as Error).message}`),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurações da Gestão de Conteúdo"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {erro && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-100">⏰ Lembrete automático ao cliente</h3>
          <p className="text-xs text-slate-400">
            Quando um conteúdo fica sem resposta, o sistema reenvia o link no WhatsApp do cliente
            (de seg a sex, das 9h às 18h).
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={cfg.lembrete_ativo} onChange={(e) => set('lembrete_ativo', e.target.checked)} />
            Lembrete automático ativo
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Lembrar após (horas)" type="number" min={1} max={720}
              value={cfg.lembrete_horas} onChange={(e) => set('lembrete_horas', Math.max(1, Number(e.target.value) || 48))} />
            <Input label="Máximo de lembretes" type="number" min={1} max={10}
              value={cfg.lembrete_maximo} onChange={(e) => set('lembrete_maximo', Math.max(1, Number(e.target.value) || 3))} />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-100">🔔 Aviso interno da equipe</h3>
          <p className="text-xs text-slate-400">
            Quando o cliente clicar em "Não aprovado", este WhatsApp recebe o conteúdo e a alteração pedida.
          </p>
          <Input label="WhatsApp da equipe (número ou ID do grupo)" placeholder="5511999999999 ou 1203630…@g.us"
            value={cfg.whatsapp_equipe ?? ''} onChange={(e) => set('whatsapp_equipe', e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={cfg.avisar_reprovacao} onChange={(e) => set('avisar_reprovacao', e.target.checked)} />
            Avisar a equipe quando o cliente reprovar
          </label>
        </section>
      </div>
    </Modal>
  );
}
