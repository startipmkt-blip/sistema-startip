import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { DESIGNER_NOME, useDesignerOcioso } from '../hooks/useDesignerOcioso';

// Montado no AppShell: só os sócios recebem o aviso, em qualquer tela do sistema.
export function DesignerOciosoAviso() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const abrir = useCallback(() => navigate('/designer'), [navigate]);
  const { aviso, dispensar } = useDesignerOcioso(profile?.papel === 'admin', abrir);
  if (!aviso) return null;
  return (
    <div className="acima-nav fixed bottom-4 left-4 z-[60] w-80 max-w-[calc(100vw-2rem)]" role="alert">
      <div className="rounded-xl border border-red-400/70 bg-red-500/25 p-3 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200">
          <GlassIcon name="timer" /> Designer parado
        </div>
        <p className="mt-1 text-sm font-medium text-white">
          {DESIGNER_NOME} não está tocando nenhuma demanda há mais de {aviso.minutos} min.
        </p>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => { dispensar(); abrir(); }}
            className="rounded-lg bg-white/15 px-3 py-1 text-xs font-medium text-white hover:bg-white/25">Ver quadro</button>
          <button type="button" onClick={dispensar}
            className="rounded-lg px-3 py-1 text-xs text-slate-200 hover:bg-white/10">Dispensar</button>
        </div>
      </div>
    </div>
  );
}
