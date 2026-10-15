// Navegação mês → semana do Designer.
// Semanas vão de domingo a sábado e sempre aparecem INTEIRAS (ex.: 29/11 a 05/12).
// A semana pertence ao mês em que ela TERMINA (o sábado): a de 29/11 a 05/12 é a
// semana 1 de dezembro, nunca de novembro. Assim nenhuma semana é cortada nem repetida.

export interface Periodo {
  ini: string; // YYYY-MM-DD, inclusivo
  fim: string; // YYYY-MM-DD, inclusivo
}

export interface SemanaMes extends Periodo {
  numero: number;
  label: string; // "11/10 a 17/10"
}

const iso = (d: Date) => d.toLocaleDateString('sv-SE');
const dm = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const dataLocal = (s: string) => {
  const [a, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
};

export function hojeLocal(): string {
  return iso(new Date());
}

export function chaveMes(d: Date): string {
  return iso(d).slice(0, 7);
}

export function labelMes(chave: string): string {
  const [a, m] = chave.split('-').map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function mesAnteriorProximo(chave: string, delta: number): string {
  const [a, m] = chave.split('-').map(Number);
  return chaveMes(new Date(a, m - 1 + delta, 1));
}

export function semanasDoMes(chave: string): SemanaMes[] {
  const [a, m] = chave.split('-').map(Number);
  const sab = new Date(a, m - 1, 1);
  while (sab.getDay() !== 6) sab.setDate(sab.getDate() + 1); // primeiro sábado do mês
  const semanas: SemanaMes[] = [];
  while (sab.getMonth() === m - 1) {
    const ini = new Date(sab);
    ini.setDate(sab.getDate() - 6);
    semanas.push({ numero: semanas.length + 1, ini: iso(ini), fim: iso(sab), label: `${dm(ini)} a ${dm(sab)}` });
    sab.setDate(sab.getDate() + 7);
  }
  return semanas;
}

export function periodoDoMes(chave: string): Periodo {
  const s = semanasDoMes(chave);
  return { ini: s[0].ini, fim: s[s.length - 1].fim };
}

// Mês ao qual a semana da data pertence (mês do sábado daquela semana).
export function mesDaSemana(dia: string): string {
  const d = dataLocal(dia);
  d.setDate(d.getDate() + (6 - d.getDay()));
  return chaveMes(d);
}

// Semana do mês que contém a data (ou a primeira, se nenhuma).
export function semanaDe(chave: string, dia: string): SemanaMes {
  const semanas = semanasDoMes(chave);
  return semanas.find((s) => dia >= s.ini && dia <= s.fim) ?? semanas[0];
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((dataLocal(ate).getTime() - dataLocal(de).getTime()) / 86_400_000);
}

interface DemandaDatas {
  status: string;
  concluido_em: string | null;
  prazo: string | null;
  created_at: string;
  /** Semana escolhida na demanda (início da semana); vence prazo e criação. */
  semana_ref?: string | null;
}

export interface Posicao {
  /** Data usada para decidir mês/semana onde a demanda aparece. */
  ref: string;
  /** Aberta e com prazo vencido. */
  atrasada: boolean;
  /** Estava num mês já encerrado e foi levada para a 1ª semana do mês atual. */
  carregada: boolean;
}

// Onde a demanda aparece: feita → semana em que foi concluída; aberta → semana do prazo
// (ou da criação, sem prazo). Atrasada de mês já encerrado vai para a 1ª semana do mês atual.
export function posicaoDaDemanda(d: DemandaDatas, hoje = hojeLocal()): Posicao {
  const prazo = d.prazo ? d.prazo.slice(0, 10) : null;
  const aberta = d.status !== 'concluido';
  const atrasada = aberta && !!prazo && prazo < hoje;

  if (!aberta && d.concluido_em) return { ref: iso(new Date(d.concluido_em)), atrasada: false, carregada: false };

  const semanaRef = d.semana_ref ? d.semana_ref.slice(0, 10) : null;
  const base = semanaRef ?? prazo ?? iso(new Date(d.created_at));
  if (atrasada) {
    const mesAtual = mesDaSemana(hoje);
    if (mesDaSemana(base) < mesAtual) {
      return { ref: semanasDoMes(mesAtual)[0].ini, atrasada: true, carregada: true };
    }
  }
  return { ref: base, atrasada, carregada: false };
}

/** Semanas de 1 mes atras a 2 a frente (+ as extras informadas), ordenadas por inicio. */
export function opcoesDeSemana(extras: (string | null | undefined)[] = []): { value: string; label: string }[] {
  const mesAtual = mesDaSemana(hojeLocal());
  const mapa = new Map<string, string>();
  for (const delta of [-1, 0, 1, 2]) {
    const mes = mesAnteriorProximo(mesAtual, delta);
    for (const s of semanasDoMes(mes)) mapa.set(s.ini, `Semana ${s.numero} de ${labelMes(mes)} (${s.label})`);
  }
  for (const e of extras) {
    const ini = e?.slice(0, 10);
    if (ini && !mapa.has(ini)) {
      const mes = mesDaSemana(ini);
      const sem = semanaDe(mes, ini);
      mapa.set(sem.ini, `Semana ${sem.numero} de ${labelMes(mes)} (${sem.label})`);
    }
  }
  return [...mapa].sort(([a], [b]) => a.localeCompare(b)).map(([value, label]) => ({ value, label }));
}
