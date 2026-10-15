import { useEffect, useState } from 'react';
import { useAlertasConfig, useGruposAlerta, useSalvarConfig, useTestarEnvio } from '@/modules/alertas/api/alertasApi';
import { DIAS_SEMANA, type AlertasConfig } from '@/modules/alertas/types';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';

const hhmm = (t: string) => t.slice(0, 5);

export function ConfigTab() {
  const cfgQ = useAlertasConfig();
  const gruposQ = useGruposAlerta();
  const salvar = useSalvarConfig();
  const testar = useTestarEnvio();
  const [f, setF] = useState<AlertasConfig | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => { if (cfgQ.data) setF(cfgQ.data); }, [cfgQ.data]);
  if (!f) return <div className="flex justify-center p-10"><Spinner /></div>;

  const set = <K extends keyof AlertasConfig>(k: K, v: AlertasConfig[K]) => setF({ ...f, [k]: v });
  const num = (v: string) => (v === '' ? 0 : Number(v));

  async function gravar() {
    if (!f) return;
    if (!(f.nivel1_min < f.nivel2_min && f.nivel2_min < f.nivel3_min)) {
      setMsg({ ok: false, texto: 'Os níveis precisam estar em ordem crescente (1º < 2º < 3º).' }); return;
    }
    if (f.horario_comercial_ativo && (hhmm(f.hc_inicio) >= hhmm(f.hc_fim) || f.hc_dias.length === 0)) {
      setMsg({ ok: false, texto: 'Horário comercial inválido: início deve ser antes do fim e ao menos um dia marcado.' }); return;
    }
    const interno = (gruposQ.data ?? []).find((g) => g.chat_id === f.grupo_interno_id);
    try {
      await salvar.mutateAsync({
        ativo: f.ativo, grupo_interno_id: f.grupo_interno_id || null,
        grupo_interno_nome: interno?.nome_grupo ?? f.grupo_interno_nome,
        nivel1_min: f.nivel1_min, nivel2_min: f.nivel2_min, nivel3_min: f.nivel3_min, sla_min: f.sla_min,
        horario_comercial_ativo: f.horario_comercial_ativo, hc_inicio: f.hc_inicio, hc_fim: f.hc_fim, hc_dias: f.hc_dias,
        max_tentativas: f.max_tentativas, retencao_dias: f.retencao_dias,
      });
      setMsg({ ok: true, texto: 'Configurações salvas.' });
    } catch (e) {
      setMsg({ ok: false, texto: (e as Error).message });
    }
  }

  async function enviarTeste() {
    try { await testar.mutateAsync(); setMsg({ ok: true, texto: 'Mensagem de teste enviada ao grupo interno.' }); }
    catch (e) { setMsg({ ok: false, texto: (e as Error).message }); }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-semibold text-white">Grupo interno de alertas</h2>
        <Select
          label="Os avisos serão enviados somente para este grupo"
          value={f.grupo_interno_id ?? ''}
          onChange={(e) => set('grupo_interno_id', e.target.value || null)}
          options={[{ value: '', label: '— selecione —' },
            ...(gruposQ.data ?? []).map((g) => ({ value: g.chat_id, label: g.nome_grupo ?? g.chat_id }))]}
        />
        <p className="text-xs text-slate-500">
          Se o grupo não aparecer, busque os grupos na aba “Grupos monitorados”. O grupo escolhido deixa de ser monitorado como cliente.
        </p>
        <Button variant="secondary" onClick={enviarTeste} disabled={testar.isPending || !cfgQ.data?.grupo_interno_id}>
          Enviar mensagem de teste
        </Button>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-semibold text-white">Níveis de alerta (minutos sem resposta)</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="1º alerta" type="number" min={1} value={f.nivel1_min} onChange={(e) => set('nivel1_min', num(e.target.value))} />
          <Input label="2º alerta" type="number" min={2} value={f.nivel2_min} onChange={(e) => set('nivel2_min', num(e.target.value))} />
          <Input label="3º alerta" type="number" min={3} value={f.nivel3_min} onChange={(e) => set('nivel3_min', num(e.target.value))} />
        </div>
        <Input label="Meta de atendimento nos relatórios (minutos)" type="number" min={1} value={f.sla_min}
          onChange={(e) => set('sla_min', num(e.target.value))} />
        <p className="text-xs text-slate-500">Cada nível é enviado uma única vez por pendência. Quando a equipe responde, os próximos são cancelados.</p>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-semibold text-white">Horário comercial (opcional)</h2>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={f.horario_comercial_ativo}
            onChange={(e) => set('horario_comercial_ativo', e.target.checked)} />
          Contar o tempo sem resposta apenas dentro do horário comercial (desligado = 24 horas)
        </label>
        {f.horario_comercial_ativo && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Início" type="time" value={hhmm(f.hc_inicio)} onChange={(e) => set('hc_inicio', e.target.value)} />
              <Input label="Fim" type="time" value={hhmm(f.hc_fim)} onChange={(e) => set('hc_fim', e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-3">
              {DIAS_SEMANA.map((d) => (
                <label key={d.n} className="flex items-center gap-1 text-sm text-slate-300">
                  <input type="checkbox" className="accent-brand-500" checked={f.hc_dias.includes(d.n)}
                    onChange={(e) => set('hc_dias', e.target.checked ? [...f.hc_dias, d.n] : f.hc_dias.filter((x) => x !== d.n))} />
                  {d.label}
                </label>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-semibold text-white">Operação e privacidade</h2>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={f.ativo} onChange={(e) => set('ativo', e.target.checked)} />
          Monitoramento ativo
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Tentativas máximas de envio do alerta" type="number" min={1} max={10} value={f.max_tentativas}
            onChange={(e) => set('max_tentativas', num(e.target.value))} />
          <Input label="Guardar histórico por (dias — LGPD)" type="number" min={30} value={f.retencao_dias}
            onChange={(e) => set('retencao_dias', num(e.target.value))} />
        </div>
        <p className="text-xs text-slate-500">
          Mensagens guardam apenas os primeiros 500 caracteres e são apagadas após o período de retenção. Credenciais da Z-API ficam só no servidor.
        </p>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={gravar} disabled={salvar.isPending}>Salvar configurações</Button>
        {msg && <span className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.texto}</span>}
      </div>
    </div>
  );
}
