import { useEffect, useState } from 'react';

// Chrome/Edge/Android disparam 'beforeinstallprompt' quando o app é
// instalável. iOS Safari não dispara nada — nesse caso mostramos uma
// dica manual (compartilhar → adicionar à tela de início).
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const KEY = 'startip-os:pwa-dispensado';

function ehIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

function jaInstalado(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true);
}

export function PwaInstallHint() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [mostrarIos, setMostrarIos] = useState(false);
  const [dispensado, setDispensado] = useState<boolean>(() => localStorage.getItem(KEY) === '1');

  useEffect(() => {
    if (jaInstalado() || dispensado) return;
    function onPrompt(e: Event) { e.preventDefault(); setPrompt(e as PromptEvent); }
    window.addEventListener('beforeinstallprompt', onPrompt);
    // iOS: se não recebeu evento em 3s e é iOS, oferece dica manual.
    const t = setTimeout(() => { if (!prompt && ehIos()) setMostrarIos(true); }, 3000);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); clearTimeout(t); };
  }, [dispensado, prompt]);

  function dispensar() {
    localStorage.setItem(KEY, '1');
    setDispensado(true);
    setPrompt(null);
    setMostrarIos(false);
  }

  async function instalar() {
    if (!prompt) return;
    await prompt.prompt();
    const r = await prompt.userChoice;
    if (r.outcome === 'accepted') { setPrompt(null); }
    else { dispensar(); }
  }

  if (dispensado || jaInstalado()) return null;
  if (!prompt && !mostrarIos) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span className="text-2xl">📲</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-100">Instalar Startip OS</div>
          {prompt ? (
            <p className="mt-0.5 text-xs text-slate-400">
              Adicione à tela inicial para abrir como app, com atalhos rápidos e sem barra de navegador.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-400">
              No iPhone: toque em <strong>Compartilhar</strong> ⎋ e depois em <strong>Adicionar à Tela de Início</strong>.
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={dispensar} className="rounded-md px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">
          Agora não
        </button>
        {prompt && (
          <button
            onClick={() => void instalar()}
            className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-400"
          >
            Instalar
          </button>
        )}
      </div>
    </div>
  );
}
