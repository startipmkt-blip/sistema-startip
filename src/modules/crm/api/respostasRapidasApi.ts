import { useCallback, useEffect, useState } from 'react';

const CHAVE = 'startip-os:respostas-rapidas';

export interface RespostaRapida {
  id: string;
  atalho: string;   // Ex: "oi", "orcamento"
  texto: string;
}

const PADRAO: RespostaRapida[] = [
  { id: 'r-oi', atalho: 'oi', texto: 'Olá! Tudo bem? Como posso ajudar?' },
  { id: 'r-orc', atalho: 'orcamento', texto: 'Para elaborar seu orçamento, preciso entender melhor seu projeto. Me conta um pouco sobre ele?' },
  { id: 'r-obr', atalho: 'obrigado', texto: 'Obrigado pelo contato! Qualquer coisa é só chamar.' },
];

function ler(): RespostaRapida[] {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return PADRAO;
    const arr = JSON.parse(cru) as RespostaRapida[];
    return Array.isArray(arr) ? arr : PADRAO;
  } catch {
    return PADRAO;
  }
}

function gravar(lista: RespostaRapida[]) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch { /* quota / privado */ }
}

// Compartilha entre abas/instâncias na mesma tab via CustomEvent.
const EVENTO = 'startip-os:respostas-rapidas-mudou';

export function useRespostasRapidas() {
  const [lista, setLista] = useState<RespostaRapida[]>(() => ler());

  useEffect(() => {
    const on = () => setLista(ler());
    window.addEventListener(EVENTO, on);
    window.addEventListener('storage', on);
    return () => {
      window.removeEventListener(EVENTO, on);
      window.removeEventListener('storage', on);
    };
  }, []);

  const salvar = useCallback((r: Omit<RespostaRapida, 'id'> & { id?: string }) => {
    const atual = ler();
    if (r.id) {
      const i = atual.findIndex((x) => x.id === r.id);
      if (i >= 0) atual[i] = { ...atual[i], atalho: r.atalho, texto: r.texto };
    } else {
      atual.push({ id: crypto.randomUUID(), atalho: r.atalho, texto: r.texto });
    }
    gravar(atual);
    window.dispatchEvent(new CustomEvent(EVENTO));
  }, []);

  const remover = useCallback((id: string) => {
    gravar(ler().filter((x) => x.id !== id));
    window.dispatchEvent(new CustomEvent(EVENTO));
  }, []);

  return { lista, salvar, remover };
}

export function filtrarPorAtalho(lista: RespostaRapida[], busca: string): RespostaRapida[] {
  const q = busca.toLowerCase().trim();
  if (!q) return lista;
  return lista.filter((r) => r.atalho.toLowerCase().includes(q));
}
