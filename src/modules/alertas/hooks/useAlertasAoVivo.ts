import { useEffect, useMemo, useState } from 'react';
import { useAlertasConfig, usePendencias } from '@/modules/alertas/api/alertasApi';
import { fimDoDia, hojeSP, inicioDoDia } from '@/modules/alertas/lib/format';
import {
  destravarAudio, lerPrefs, lerVistos, salvarVistos, tocarAlerta,
} from '@/modules/alertas/lib/som';
import type { Pendencia } from '@/modules/alertas/types';

export interface AvisoAoVivo {
  pendencia: Pendencia;
  nivel: 0 | 1 | 2 | 3;
  minutos: number;
}

// Nível atual de cada cliente sem resposta, com os mesmos limiares do motor
// (o prazo do grupo sobrescreve o 1º nível; 2º e 3º nunca ficam antes dele).
export function nivelDe(p: Pendencia, n2cfg: number, n3cfg: number): 0 | 1 | 2 | 3 {
  const min = p.minutos_decorridos ?? 0;
  const n1 = p.prazo_min;
  const n2 = Math.max(n2cfg, n1 + 1);
  const n3 = Math.max(n3cfg, n2 + 1);
  return min >= n3 ? 3 : min >= n2 ? 2 : min >= n1 ? 1 : 0;
}

// Clientes sem resposta agora, com o nível atual (somente leitura, sem som).
export function useAvisosAtuais() {
  const hoje = hojeSP();
  const pendQ = usePendencias(inicioDoDia(hoje), fimDoDia(hoje));
  const cfgQ = useAlertasConfig();
  const avisos = useMemo<AvisoAoVivo[]>(() => {
    if (!cfgQ.data) return [];
    return (pendQ.data ?? [])
      .filter((p) => p.status === 'aguardando')
      .map((p) => ({ pendencia: p, nivel: nivelDe(p, cfgQ.data!.nivel2_min, cfgQ.data!.nivel3_min), minutos: p.minutos_decorridos ?? 0 }))
      .filter((a) => a.nivel > 0)
      .sort((a, b) => b.minutos - a.minutos);
  }, [pendQ.data, cfgQ.data]);
  return { avisos, abertas: pendQ.data, carregando: pendQ.isLoading };
}

// Avisos ao vivo: toca o som uma vez por cliente e por nível, em qualquer tela do sistema.
export function useAlertasAoVivo(habilitado: boolean, onAbrir?: () => void) {
  const { avisos, abertas: dados } = useAvisosAtuais();
  const [novos, setNovos] = useState<AvisoAoVivo[]>([]);

  // Libera o áudio no primeiro clique/tecla em qualquer lugar da página.
  useEffect(() => {
    if (!habilitado) return;
    const liberar = () => destravarAudio();
    window.addEventListener('pointerdown', liberar, { once: true });
    window.addEventListener('keydown', liberar, { once: true });
    return () => {
      window.removeEventListener('pointerdown', liberar);
      window.removeEventListener('keydown', liberar);
    };
  }, [habilitado]);

  useEffect(() => {
    if (!habilitado || !dados) return;
    const vistos = lerVistos();
    const abertas = new Set(dados.filter((p) => p.status === 'aguardando').map((p) => p.id));
    const disparar: AvisoAoVivo[] = [];
    for (const a of avisos) {
      if ((vistos[a.pendencia.id] ?? 0) < a.nivel) {
        disparar.push(a);
        vistos[a.pendencia.id] = a.nivel;
      }
    }
    // Esquece pendências já resolvidas para o armazenamento não crescer.
    for (const id of Object.keys(vistos)) if (!abertas.has(id)) delete vistos[id];
    salvarVistos(vistos);

    if (disparar.length > 0) {
      const prefs = lerPrefs();
      if (prefs.ativo) tocarAlerta(Math.max(...disparar.map((d) => d.nivel)) as 1 | 2 | 3, prefs.volume);
      if (prefs.desktop && 'Notification' in window && Notification.permission === 'granted') {
        // Notificação do sistema: toca o som do próprio Windows e aparece com a aba em segundo plano.
        for (const a of disparar.slice(0, 3)) {
          try {
            const n = new Notification(`Cliente sem resposta há ${Math.round(a.minutos)} min`, {
              body: `${a.pendencia.cliente_nome ?? a.pendencia.grupo_nome ?? 'Cliente'} aguarda atendimento (nível ${a.nivel}).`,
              tag: `alerta-${a.pendencia.id}-${a.nivel}`,
              requireInteraction: a.nivel >= 2,
              silent: false,
            });
            n.onclick = () => { window.focus(); onAbrir?.(); n.close(); };
          } catch { /* navegador sem suporte a esta chamada */ }
        }
      }
      setNovos((atual) => {
        const porId = new Map(atual.map((n) => [n.pendencia.id, n]));
        disparar.forEach((d) => porId.set(d.pendencia.id, d));
        return [...porId.values()];
      });
    }
  }, [avisos, habilitado, dados, onAbrir]);

  // Título da aba do navegador chama atenção enquanto houver cliente esperando.
  useEffect(() => {
    if (!habilitado) return;
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = avisos.length > 0 ? `(${avisos.length}) ${base}` : base;
    return () => { document.title = base; };
  }, [avisos.length, habilitado]);

  return {
    avisos,
    novos,
    dispensar: (id: string) => setNovos((n) => n.filter((x) => x.pendencia.id !== id)),
    dispensarTodos: () => setNovos([]),
  };
}
