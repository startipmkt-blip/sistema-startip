// Pilares canônicos da agência. Espelho do enum public.pillar_key do Postgres.
// Referenciar sempre este arquivo — não hardcodar labels em componentes.

export const PILLARS = {
  traffic: { label: 'Tráfego Pago',       icone: '🎯', tone: 'orange'  },
  social:  { label: 'Social Media',       icone: '📱', tone: 'pink'    },
  gmb:     { label: 'Google Meu Negócio', icone: '📍', tone: 'blue'    },
  cs:      { label: 'Customer Success',   icone: '🤝', tone: 'emerald' },
} as const;

export type PillarKey = keyof typeof PILLARS;

export const PILLAR_KEYS = Object.keys(PILLARS) as PillarKey[];

export function pillarInfo(key: PillarKey | string | null | undefined) {
  if (key && key in PILLARS) return PILLARS[key as PillarKey];
  return { label: 'Sem pilar', icone: '•', tone: 'slate' as const };
}

// ------------------------------------------------------------------
// Parser do nome de grupo WhatsApp (convenção Turbo Ferramentas):
//   "🌐 [Empresa] | [Pilar]"
// O emoji 🌐 identifica um grupo monitorado. O pilar em pt-BR é
// mapeado pra key canônica.
// ------------------------------------------------------------------

const MAPA_PILAR_PT: Record<string, PillarKey> = {
  'trafego pago':          'traffic',
  'tráfego pago':          'traffic',
  'trafego':               'traffic',
  'tráfego':               'traffic',
  'social media':          'social',
  'social midia':          'social',
  'social mídia':          'social',
  'social':                'social',
  'google meu negocio':    'gmb',
  'google meu negócio':    'gmb',
  'gmn':                   'gmb',
  'gmb':                   'gmb',
  'customer success':      'cs',
  'cs':                    'cs',
  'sucesso do cliente':    'cs',
};

export interface GrupoParseado {
  empresa: string | null;
  pilar: PillarKey | null;
}

/**
 * Extrai empresa + pilar do nome do grupo WhatsApp, tolerante a variações:
 *   "🌐 Empresa | Pilar"            → padrão Turbo
 *   "Tráfego Pago - Casas Paran."   → pilar antes, empresa depois
 *   "Marketing | AJS Empilhadeiras" → alias "Marketing" = social
 *   "Empresa - Tráfego"             → empresa antes, pilar depois
 * Retorna pilar quando encontra um alias conhecido; empresa fica com o
 * resto. Se não achar pilar, empresa recebe o nome inteiro (sem 🌐).
 */
export function parseNomeGrupo(nome: string | null | undefined): GrupoParseado {
  if (!nome) return { empresa: null, pilar: null };
  const semGlobo = nome.trim().replace(/^🌐\s*/u, '').trim();
  if (!semGlobo) return { empresa: null, pilar: null };

  // Quebra por | ou - (com espaços ao redor pra evitar cortar "Casas-Paranaense").
  const partes = semGlobo.split(/\s*[|\-–]\s+/).map((p) => p.trim()).filter(Boolean);
  if (partes.length < 2) return { empresa: semGlobo, pilar: null };

  // Tenta encontrar um pilar em qualquer posição.
  let pilar: PillarKey | null = null;
  const empresaPartes: string[] = [];
  for (const p of partes) {
    const chave = p.toLowerCase();
    // "marketing" isolado é ambíguo — não é pilar, é rótulo da agência.
    if (chave in MAPA_PILAR_PT) {
      if (!pilar) pilar = MAPA_PILAR_PT[chave];
    } else {
      empresaPartes.push(p);
    }
  }
  const empresa = empresaPartes.join(' - ').trim() || semGlobo;
  return { empresa, pilar };
}
