import { useState } from 'react';
import { GlassIcon } from '@/shared/ui/GlassIcon';

// O Painel do Gestor é um sistema à parte (HTML estático + Supabase próprio). Aqui ele aparece embutido,
// sem sair do OS. O painel só aceita ser embutido a partir deste domínio (ver public/.htaccess dele).
const PAINEL_URL = (import.meta.env.VITE_PAINEL_URL as string | undefined) ?? 'https://painel.agenciastartip.com.br';

export function AbaPainelGestor() {
  const [carregou, setCarregou] = useState(false);
  // ?theme=dark: o OS é sempre escuro; o painel respeita e esconde o botão de tema.
  const src = `${PAINEL_URL}/?theme=dark#/visao`;

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
        src={src}
        onLoad={() => setCarregou(true)}
        className="block h-[calc(100vh-150px)] min-h-[560px] w-full border-0 bg-transparent"
        allow="clipboard-write; fullscreen"
      />
      <p className="px-4 py-2 text-[11px] text-slate-500">
        Se pedir login, entre com o seu acesso do Painel (só na primeira vez). Se a área ficar em branco, use “Abrir em nova aba”.
      </p>
    </div>
  );
}
