import { useEffect, useState } from 'react';

type Tipo = 'info' | 'sucesso' | 'erro';
interface Item { id: number; msg: string; tipo: Tipo }

const EVENTO = 'startip:toast';
let seq = 0;

export function toast(msg: string, tipo: Tipo = 'info') {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { id: ++seq, msg, tipo } }));
}

const cor: Record<Tipo, string> = {
  info: 'border-white/15',
  sucesso: 'border-emerald-500/40',
  erro: 'border-red-500/40',
};

export function ToastHost() {
  const [itens, setItens] = useState<Item[]>([]);

  useEffect(() => {
    const on = (e: Event) => {
      const it = (e as CustomEvent<Item>).detail;
      setItens((l) => [...l, it]);
      window.setTimeout(() => setItens((l) => l.filter((x) => x.id !== it.id)), 5000);
    };
    window.addEventListener(EVENTO, on);
    // Substitui o alert() nativo (que trava a tela) por um aviso discreto.
    const nativo = window.alert;
    window.alert = (m?: unknown) => {
      const t = String(m ?? '');
      toast(t, /erro|falh|não foi poss|inválid/i.test(t) ? 'erro' : 'info');
    };
    return () => {
      window.removeEventListener(EVENTO, on);
      window.alert = nativo;
    };
  }, []);

  return (
    <div className="acima-nav pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {itens.map((i) => (
        <div
          key={i.id}
          role="status"
          className={`pointer-events-auto whitespace-pre-line rounded-lg border bg-[#17212d] px-4 py-3 text-sm text-slate-100 shadow-pop ${cor[i.tipo]}`}
        >
          {i.msg}
        </div>
      ))}
    </div>
  );
}
