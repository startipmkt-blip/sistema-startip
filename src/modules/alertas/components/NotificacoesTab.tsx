import { useState } from 'react';
import { useAvisosAtuais } from '@/modules/alertas/hooks/useAlertasAoVivo';
import { formatarDuracao, formatarHora } from '@/modules/alertas/lib/format';
import { audioLiberado, lerPrefs, salvarPrefs, tocarAlerta, destravarAudio, type PrefsSom } from '@/modules/alertas/lib/som';
import { useAlertasConfig } from '@/modules/alertas/api/alertasApi';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';

const TOM = { 1: 'amber', 2: 'amber', 3: 'red' } as const;

export function NotificacoesTab() {
  const { avisos, carregando } = useAvisosAtuais();
  const cfg = useAlertasConfig().data;
  const [prefs, setPrefs] = useState<PrefsSom>(lerPrefs());
  const [msg, setMsg] = useState<string | null>(null);

  function atualizar(p: PrefsSom) { setPrefs(p); salvarPrefs(p); }

  function testar(nivel: 1 | 2 | 3) {
    destravarAudio();
    // O contexto de áudio leva um instante para ligar no primeiro clique.
    setTimeout(() => {
      const ok = tocarAlerta(nivel, prefs.volume);
      setMsg(ok ? null : 'O navegador bloqueou o som. Clique de novo ou verifique se a aba não está silenciada.');
    }, 50);
  }

  async function ativarDesktop() {
    if (!('Notification' in window)) { setMsg('Este navegador não suporta notificações do sistema.'); return; }
    const r = await Notification.requestPermission();
    atualizar({ ...prefs, desktop: r === 'granted' });
    if (r !== 'granted') setMsg('Permissão de notificação negada no navegador.');
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-semibold text-white">Aviso sonoro neste computador</h2>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={prefs.ativo}
            onChange={(e) => atualizar({ ...prefs, ativo: e.target.checked })} />
          Tocar som quando um cliente passar do prazo (em qualquer tela do sistema)
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          Volume
          <input type="range" min={0.1} max={1} step={0.1} value={prefs.volume}
            onChange={(e) => atualizar({ ...prefs, volume: Number(e.target.value) })} className="accent-brand-500" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => testar(1)}>Testar nível 1</Button>
          <Button variant="secondary" onClick={() => testar(2)}>Testar nível 2</Button>
          <Button variant="secondary" onClick={() => testar(3)}>Testar nível 3 (urgente)</Button>
          <Button variant="ghost" onClick={ativarDesktop}>
            {prefs.desktop ? 'Notificação do sistema ativa' : 'Ativar notificação do sistema'}
          </Button>
        </div>
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
        <p className="text-xs text-slate-500">
          O som e o cartão de aviso aparecem nos mesmos prazos dos alertas
          ({cfg ? `${cfg.nivel1_min}, ${cfg.nivel2_min} e ${cfg.nivel3_min} minutos` : 'níveis configurados'}), uma vez por cliente e por nível.
          A aba do navegador precisa estar aberta e o navegador só libera o som depois de um clique na página
          {audioLiberado() ? ' (já liberado).' : '.'}
        </p>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">Clientes sem resposta agora</h2>
        {carregando ? <div className="flex justify-center p-8"><Spinner /></div> : avisos.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-400">Nenhum cliente fora do prazo. Tudo respondido.</Card>
        ) : (
          <div className="space-y-2">
            {avisos.map((a) => (
              <Card key={a.pendencia.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium text-white">{a.pendencia.cliente_nome ?? a.pendencia.grupo_nome}</div>
                  <div className="max-w-xl truncate text-sm text-slate-400">
                    {a.pendencia.ultima_msg_texto || '[mídia]'}
                  </div>
                  <div className="text-xs text-slate-500">Desde {formatarHora(a.pendencia.iniciada_em)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={TOM[a.nivel as 1 | 2 | 3]}>Nível {a.nivel}</Badge>
                  <span className="text-lg font-semibold text-white">{formatarDuracao(a.minutos)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
