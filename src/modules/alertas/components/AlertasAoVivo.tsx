import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lerPrefs, salvarPrefs } from '@/modules/alertas/lib/som';
import { useAlertasAoVivo } from '@/modules/alertas/hooks/useAlertasAoVivo';
import { useAuth } from '@/shared/auth/AuthProvider';
import { podeAcessarModulo } from '@/shared/auth/permissions';
import { formatarDuracao } from '@/modules/alertas/lib/format';

const COR = {
  1: 'border-amber-400/60 bg-amber-500/15',
  2: 'border-orange-400/60 bg-orange-500/20',
  3: 'border-red-400/70 bg-red-500/25',
} as const;

// Montado no AppShell: avisa com som e cartão em QUALQUER tela do sistema.
export function AlertasAoVivo() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const habilitado = podeAcessarModulo(profile, 'alertas');
  const abrir = useCallback(() => navigate('/alertas?aba=notificacoes'), [navigate]);
  const { novos, dispensar, dispensarTodos } = useAlertasAoVivo(habilitado, abrir);
  const [, forcar] = useState(0);

  // Convite único para ativar a notificação do sistema (precisa de um clique do usuário).
  const suporta = typeof window !== 'undefined' && 'Notification' in window;
  const prefs = lerPrefs();
  const convidar = habilitado && suporta && Notification.permission === 'default' && !prefs.dispensouDesktop;

  async function ativarDesktop() {
    const r = await Notification.requestPermission();
    salvarPrefs({ ...lerPrefs(), desktop: r === 'granted', dispensouDesktop: true });
    forcar((n) => n + 1);
  }
  function dispensarConvite() {
    salvarPrefs({ ...lerPrefs(), dispensouDesktop: true });
    forcar((n) => n + 1);
  }

  if (!habilitado || (novos.length === 0 && !convidar)) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" role="alert">
      {convidar && (
        <div className="rounded-xl border border-brand-400/50 bg-slate-900/90 p-3 shadow-glass backdrop-blur-xl">
          <div className="text-sm font-medium text-white">Receber avisos de clientes sem resposta pelo Windows?</div>
          <p className="mt-1 text-xs text-slate-300">
            Toca o som do sistema e aparece mesmo com o Startip OS em segundo plano.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={ativarDesktop}
              className="rounded-lg bg-gradient-brand px-3 py-1 text-xs font-medium text-white">Ativar</button>
            <button type="button" onClick={dispensarConvite}
              className="rounded-lg px-3 py-1 text-xs text-slate-300 hover:bg-white/10">Agora não</button>
          </div>
        </div>
      )}
      {novos.slice(0, 4).map((n) => (
        <div key={n.pendencia.id} className={`rounded-xl border p-3 shadow-glass backdrop-blur-xl ${COR[n.nivel as 1 | 2 | 3]}`}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-200">
            Cliente sem resposta · nível {n.nivel}
          </div>
          <div className="mt-1 text-sm font-medium text-white">
            {n.pendencia.cliente_nome ?? n.pendencia.grupo_nome ?? 'Cliente'}
          </div>
          <div className="text-xs text-slate-200">
            Há {formatarDuracao(n.minutos)} sem ser respondido
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-white/15 px-3 py-1 text-xs font-medium text-white hover:bg-white/25"
              onClick={() => { dispensar(n.pendencia.id); navigate('/alertas?aba=notificacoes'); }}
            >
              Ver
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
              onClick={() => dispensar(n.pendencia.id)}
            >
              Dispensar
            </button>
          </div>
        </div>
      ))}
      {novos.length > 1 && (
        <button type="button" onClick={dispensarTodos} className="self-end text-xs text-slate-300 underline">
          Dispensar todos
        </button>
      )}
    </div>
  );
}
