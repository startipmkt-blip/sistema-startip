import { useEffect, useRef, useState } from 'react';
import { GlassIcon } from '@/shared/ui/GlassIcon';

// O Painel do Gestor é um sistema à parte (HTML estático + Supabase próprio). Aqui ele aparece embutido,
// sem sair do OS. O painel só aceita ser embutido a partir deste domínio (ver public/.htaccess dele).
const PAINEL_URL = (import.meta.env.VITE_PAINEL_URL as string | undefined) ?? 'https://painel.agenciastartip.com.br';

export function AbaPainelGestor({ cheio = false }: { cheio?: boolean } = {}) {
  const [carregou, setCarregou] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const temaAtual = () => (document.documentElement.classList.contains('light') ? 'light' : 'dark');
  // O tema do OS vai na URL (primeira carga) e por mensagem quando você troca no botão do OS.
  const [src] = useState(() => `${PAINEL_URL}/?theme=${temaAtual()}#/visao`);

  useEffect(() => {
    const avisar = () => frame.current?.contentWindow?.postMessage({ type: 'dg-theme', theme: temaAtual() }, PAINEL_URL);
    const obs = new MutationObserver(avisar);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-slate-500">
        <span>Painel do Gestor · dados do Meta Ads em tempo real</span>
        <a
          href={`${PAINEL_URL}/`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-slate-300 hover:border-brand-400 hover:text-white"
        >
          <GlassIcon emoji="📎" /> Abrir em nova aba
        </a>
      </div>
      {!carregou && (
        <div className="absolute inset-x-0 top-12 flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
          Carregando o Painel do Gestor…
        </div>
      )}
      <iframe
        title="Painel do Gestor"
        ref={frame}
        src={src}
        onLoad={() => setCarregou(true)}
        className={`block min-h-[560px] w-full border-0 bg-transparent ${cheio ? 'h-[calc(100vh-130px)]' : 'h-[calc(100vh-150px)]'}`}
        allow="clipboard-write; fullscreen"
      />
      <p className="px-4 py-2 text-[11px] text-slate-500">
        Se pedir login, entre com o seu acesso do Painel (só na primeira vez). Se a área ficar em branco, use “Abrir em nova aba”.
      </p>
    </div>
  );
}
