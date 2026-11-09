import { useState } from 'react';
import { mesLabel, type Ideia } from '@/modules/gestao-conteudo/types';
import type { ClienteGestao } from '@/modules/gestao-conteudo/utils';
import { glassify } from '@/shared/ui/GlassIcon';
import { useBancoIdeias } from '@/modules/gestao-conteudo/api/bancoIdeiasApi';
import { BancoIdeias } from './BancoIdeias';
import { LinhaEditorial } from './LinhaEditorial';

interface Props {
  cliente: ClienteGestao;
  mes: string;
  ideias: Ideia[];
}

/** Duas sub-abas: ideias do mês (por semana) e o banco de ideias gerais do cliente. */
export function DetalheIdeias(props: Props) {
  const [sub, setSub] = useState<'mes' | 'banco'>('mes');
  const banco = useBancoIdeias(props.cliente.id);
  const livres = (banco.data ?? []).filter((i) => !i.usada_em).length;

  const aba = (id: 'mes' | 'banco', texto: string) => (
    <button
      type="button"
      onClick={() => setSub(id)}
      className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
        sub === id ? 'border-brand-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
    >
      {glassify(texto)}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="abas-linha flex gap-1 border-b border-white/10">
        {aba('mes', `📅 Linha editorial de ${mesLabel(props.mes)}`)}
        {aba('banco', `💡 Banco de ideias (${livres})`)}
      </div>
      {sub === 'mes'
        ? <LinhaEditorial {...props} />
        : <BancoIdeias clienteId={props.cliente.id} mes={props.mes} ideias={banco.data ?? []} carregando={banco.isLoading} />}
    </div>
  );
}
