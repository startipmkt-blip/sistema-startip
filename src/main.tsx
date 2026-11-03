import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/index.css';
import { GlassSprite } from '@/shared/ui/GlassIcon';
import { ToastHost } from '@/shared/ui/Toast';
import { ConfirmHost } from '@/shared/ui/ConfirmDialog';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlassSprite />
    <App />
    <ToastHost />
    <ConfirmHost />
  </StrictMode>,
);

// Registra o Service Worker do PWA. Só em produção — em dev,
// desregistra se já tiver, pra não interferir no HMR do Vite.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* offline / bloqueado */ });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  }
}
