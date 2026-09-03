import { useEffect, useState } from 'react';

type Tema = 'dark' | 'light';
const CHAVE = 'startip-os:tema';

function inicial(): Tema {
  try {
    const v = localStorage.getItem(CHAVE);
    if (v === 'light' || v === 'dark') return v;
  } catch { /* privado */ }
  return 'dark';
}

function aplicar(t: Tema) {
  const html = document.documentElement;
  if (t === 'light') html.classList.add('light');
  else html.classList.remove('light');
}

export function TemaToggle() {
  const [tema, setTema] = useState<Tema>(inicial);

  useEffect(() => {
    aplicar(tema);
    try { localStorage.setItem(CHAVE, tema); } catch { /* privado */ }
  }, [tema]);

  return (
    <button
      onClick={() => setTema((t) => (t === 'dark' ? 'light' : 'dark'))}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
      title={tema === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
      aria-label="Alternar tema"
    >
      <span className="text-lg">{tema === 'dark' ? '☀️' : '🌙'}</span>
    </button>
  );
}
