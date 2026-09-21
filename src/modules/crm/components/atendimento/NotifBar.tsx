import { useEffect, useState } from 'react';
import { useNotifConfig, pedirPermissao, tocarBip } from '@/modules/crm/api/notificacoesApi';

// Toggle discreto usado no cabeçalho da inbox. O hook global de realtime
// (useNotificacoesCrm) é chamado em AtendimentoTab, não aqui.
export function NotifBar() {
  const { config, salvar } = useNotifConfig();

  const [permissao, setPermissao] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPermissao(Notification.permission);
  }, []);

  async function habilitar() {
    const p = await pedirPermissao();
    setPermissao(p);
    if (p === 'granted') salvar.mutate({ notificacao: true });
  }

  const precisaLiberar = permissao !== 'granted' && config.notificacao;

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
        title="Notificações"
      >
        {precisaLiberar ? '🔔 Ativar' : config.som ? '🔔' : '🔕'}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-lg border border-white/10 bg-slate-900 p-3 text-xs shadow-2xl">
          <div className="mb-2 flex items-center justify-between text-slate-200">
            <span className="font-semibold">Notificações</span>
            <button className="text-slate-400 hover:text-slate-100" onClick={() => setAberto(false)}>×</button>
          </div>

          {precisaLiberar && (
            <div className="mb-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-amber-200">
              <p className="mb-1">Precisamos da sua permissão pra mostrar avisos.</p>
              <button
                onClick={habilitar}
                className="rounded bg-amber-500 px-2 py-1 text-[11px] font-semibold text-slate-900 hover:bg-amber-400"
              >Permitir agora</button>
            </div>
          )}

          <label className="mt-1 flex items-center justify-between gap-2 py-1.5 text-slate-200">
            <span>🔊 Tocar som</span>
            <input type="checkbox" checked={config.som}
              onChange={(e) => salvar.mutate({ som: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between gap-2 py-1.5 text-slate-200">
            <span>💬 Avisar no navegador</span>
            <input type="checkbox" checked={config.notificacao}
              onChange={(e) => salvar.mutate({ notificacao: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between gap-2 py-1.5 text-slate-200">
            <span>🔴 Badge no título da aba</span>
            <input type="checkbox" checked={config.titulo_badge}
              onChange={(e) => salvar.mutate({ titulo_badge: e.target.checked })} />
          </label>

          <div className="mt-2 border-t border-white/10 pt-2 text-[11px] text-slate-400">Quais mensagens:</div>
          <label className="flex items-center justify-between gap-2 py-1 text-slate-200">
            <span>Minhas conversas</span>
            <input type="checkbox" checked={config.novas_atribuidas}
              onChange={(e) => salvar.mutate({ novas_atribuidas: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between gap-2 py-1 text-slate-200">
            <span>Fila (sem atendente)</span>
            <input type="checkbox" checked={config.fila_livre}
              onChange={(e) => salvar.mutate({ fila_livre: e.target.checked })} />
          </label>

          <button
            onClick={tocarBip}
            className="mt-2 w-full rounded border border-white/10 bg-white/5 py-1.5 text-slate-300 hover:bg-white/10"
          >🎧 Testar som</button>
        </div>
      )}
    </div>
  );
}
