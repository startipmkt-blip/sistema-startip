import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { usePostsDoMes } from '@/modules/gestao-conteudo/api/gestaoApi';
import {
  ETAPAS, deslocarMes, mesAtualRef, mesLabel, type Etapa, type Visao,
} from '@/modules/gestao-conteudo/types';
import { contar, type ClienteGestao } from '@/modules/gestao-conteudo/utils';
import { DetalheCliente } from '@/modules/gestao-conteudo/components/DetalheCliente';
import { ConfigModal } from '@/modules/gestao-conteudo/components/ConfigModal';
import { AgendaSemana, VisaoCarteira, VisaoTabela } from '@/modules/gestao-conteudo/components/VisoesCarteira';

const VISOES: { id: Visao; label: string }[] = [
  { id: 'carteira', label: '🗂️ Carteira' },
  { id: 'tabela',   label: '📊 Tabela' },
  { id: 'semana',   label: '📅 Agenda da semana' },
];

export function GestaoConteudoPage() {
  const [params, setParams] = useSearchParams();
  const [configAberta, setConfigAberta] = useState(false);

  const mes = params.get('mes') ?? mesAtualRef();
  const clienteId = params.get('cliente') ?? '';
  const visao = (params.get('visao') as Visao | null) ?? 'carteira';
  const etapaFiltro = (params.get('etapa') as Etapa | null) ?? '';

  function atualizar(mudancas: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    setParams(p, { replace: true });
  }

  const clientesQ = useClientes('');
  const postsQ = usePostsDoMes(mes);

  const clientes = useMemo(
    () => ((clientesQ.data ?? []) as ClienteGestao[])
      .filter((c) => c.status === 'ativo' && (c.servicos ?? []).includes('social_midia'))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [clientesQ.data],
  );
  const posts = postsQ.data ?? [];
  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const mesAtual = mes === mesAtualRef();
  const carregando = clientesQ.isLoading || postsQ.isLoading;

  // Visões da carteira respeitam o filtro de etapa (só clientes que têm algo nela).
  const postsFiltrados = etapaFiltro ? posts.filter((p) => p.etapa === etapaFiltro) : posts;
  const clientesVisiveis = etapaFiltro
    ? clientes.filter((c) => postsFiltrados.some((p) => p.cliente_id === c.id))
    : clientes;

  const totais = contar(posts.filter((p) => (cliente ? p.cliente_id === cliente.id : clientes.some((c) => c.id === p.cliente_id))));

  return (
    <div className="space-y-4">
      <PageHeader
        title="🗂️ Gestão de Conteúdo"
        subtitle="Acompanhe, por cliente e por mês, o que está em edição, em aprovação, aprovado e programado."
      >
        <div className="flex items-center gap-1">
          <Button variant="secondary" onClick={() => atualizar({ mes: deslocarMes(mes, -1) })}>←</Button>
          <span className="min-w-[10rem] text-center text-sm font-medium capitalize text-slate-100">{mesLabel(mes)}</span>
          <Button variant="secondary" onClick={() => atualizar({ mes: deslocarMes(mes, 1) })}>→</Button>
        </div>
        <Button variant="secondary" onClick={() => setConfigAberta(true)}>⚙ Configurações</Button>
      </PageHeader>

      {/* Barra de controle: quem ver + como ver */}
      <Card className="flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-[14rem] flex-1 sm:flex-none">
          <Select
            label="Cliente"
            value={clienteId}
            onChange={(e) => atualizar({ cliente: e.target.value || null })}
            options={[
              { value: '', label: `Todos os clientes (${clientes.length})` },
              ...clientes.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />
        </div>

        {!cliente && (
          <div className="flex rounded-lg border border-white/10 p-0.5 text-xs">
            {VISOES.map((v) => (
              <button
                key={v.id}
                onClick={() => atualizar({ visao: v.id === 'carteira' ? null : v.id })}
                className={`rounded-md px-3 py-1.5 ${visao === v.id ? 'bg-brand-500/20 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        {cliente && (
          <Button variant="secondary" onClick={() => atualizar({ cliente: null })}>← Ver toda a carteira</Button>
        )}

        {etapaFiltro && (
          <Button variant="secondary" onClick={() => atualizar({ etapa: null })}>✕ Limpar filtro de etapa</Button>
        )}
      </Card>

      {/* Contadores: clique para filtrar por etapa */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {ETAPAS.map((e) => {
          const ativo = etapaFiltro === e.id;
          return (
            <button
              key={e.id}
              onClick={() => atualizar({ etapa: ativo ? null : e.id })}
              className={`rounded-xl border p-3 text-left transition-colors ${
                ativo ? 'border-brand-400/70 bg-brand-500/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
            >
              <div className="text-[11px] text-slate-400">{e.emoji} {e.label}</div>
              <div className="mt-1 text-2xl font-semibold text-white">{totais[e.id]}</div>
            </button>
          );
        })}
      </div>

      {carregando && <div className="flex justify-center py-16"><Spinner /></div>}
      {postsQ.error && (
        <Card className="p-4 text-sm text-red-300">Erro ao carregar: {(postsQ.error as Error).message}</Card>
      )}

      {!carregando && clientes.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-400">
          Nenhum cliente ativo com o serviço <strong>Social mídia</strong>. Marque o serviço no
          cadastro do cliente para ele aparecer aqui.
        </Card>
      )}

      {!carregando && clientes.length > 0 && cliente && (
        <DetalheCliente
          key={cliente.id + mes}
          cliente={cliente}
          mes={mes}
          mesAtual={mesAtual}
          posts={posts.filter((p) => p.cliente_id === cliente.id)}
          etapaFiltro={etapaFiltro}
        />
      )}

      {!carregando && clientes.length > 0 && !cliente && (
        <>
          {visao === 'semana' ? (
            <AgendaSemana
              clientes={clientes}
              etapaFiltro={etapaFiltro}
              onAbrir={(id) => atualizar({ cliente: id, visao: null })}
            />
          ) : clientesVisiveis.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-400">
              Nenhum cliente tem conteúdos nessa etapa em {mesLabel(mes)}.
            </Card>
          ) : visao === 'tabela' ? (
            <VisaoTabela
              clientes={clientesVisiveis} posts={posts} mes={mes} mesAtual={mesAtual}
              onAbrir={(id) => atualizar({ cliente: id })}
            />
          ) : (
            <VisaoCarteira
              clientes={clientesVisiveis} posts={posts} mes={mes} mesAtual={mesAtual}
              onAbrir={(id) => atualizar({ cliente: id })}
            />
          )}
        </>
      )}

      <ConfigModal open={configAberta} onClose={() => setConfigAberta(false)} />
    </div>
  );
}
