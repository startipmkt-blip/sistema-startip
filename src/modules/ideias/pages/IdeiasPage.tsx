import { useState, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { StatCard } from '@/shared/ui/StatCard';
import { Spinner } from '@/shared/ui/Spinner';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { useIdeias } from '@/modules/ideias/api/ideiasApi';
import { IdeiaFormModal } from '@/modules/ideias/components/IdeiaFormModal';
import { IdeiaDetalheModal } from '@/modules/ideias/components/IdeiaDetalheModal';
import {
  TIPO_LABEL, TIPO_TONE,
  IMPORTANCIA_LABEL, IMPORTANCIA_TONE,
  AUTOR_LABEL,
} from '@/modules/ideias/types';
import type { Ideia, IdeiaImportancia } from '@/modules/ideias/types';
import { CriativosTab } from '@/modules/ideias/criativos/CriativosTab';

type Ordem = 'recentes' | 'antigas' | 'mais_importantes' | 'menos_importantes';

const ORDEM_PESO: Record<IdeiaImportancia, number> = {
  simples: 1,
  importante: 2,
  muito_importante: 3,
};

function formatarData(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function BancoDeIdeiasTab({ pills }: { pills: ReactNode }) {
  const { data: ideias, isLoading } = useIdeias();

  const [formOpen, setFormOpen] = useState(false);
  const [editIdeia, setEditIdeia] = useState<Ideia | undefined>();
  const [detalheIdeia, setDetalheIdeia] = useState<Ideia | null>(null);

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroAutor, setFiltroAutor] = useState('');
  const [filtroImportancia, setFiltroImportancia] = useState('');
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<Ordem>('recentes');

  const lista = useMemo(() => {
    if (!ideias) return [];
    let result = [...ideias];

    if (filtroTipo) result = result.filter((i) => i.tipo === filtroTipo);
    if (filtroAutor) result = result.filter((i) => i.autor === filtroAutor);
    if (filtroImportancia) result = result.filter((i) => i.importancia === filtroImportancia);

    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.titulo.toLowerCase().includes(termo) ||
          i.descricao.toLowerCase().includes(termo) ||
          (i.cliente_nome ?? '').toLowerCase().includes(termo) ||
          (i.projeto_nome ?? '').toLowerCase().includes(termo),
      );
    }

    switch (ordem) {
      case 'recentes':
        result.sort((a, b) => b.data_ideia.localeCompare(a.data_ideia));
        break;
      case 'antigas':
        result.sort((a, b) => a.data_ideia.localeCompare(b.data_ideia));
        break;
      case 'mais_importantes':
        result.sort((a, b) => ORDEM_PESO[b.importancia] - ORDEM_PESO[a.importancia]);
        break;
      case 'menos_importantes':
        result.sort((a, b) => ORDEM_PESO[a.importancia] - ORDEM_PESO[b.importancia]);
        break;
    }

    return result;
  }, [ideias, filtroTipo, filtroAutor, filtroImportancia, busca, ordem]);

  const stats = useMemo(() => {
    if (!ideias) return { total: 0, muitoImportantes: 0, agencia: 0, clientes: 0 };
    return {
      total: ideias.length,
      muitoImportantes: ideias.filter((i) => i.importancia === 'muito_importante').length,
      agencia: ideias.filter((i) => i.tipo === 'agencia').length,
      clientes: ideias.filter((i) => i.tipo === 'cliente').length,
    };
  }, [ideias]);

  function abrirNova() {
    setEditIdeia(undefined);
    setFormOpen(true);
  }

  function abrirEditar(ideia: Ideia) {
    setEditIdeia(ideia);
    setFormOpen(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {pills}
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      </div>
    );
  }

  const vazio = !ideias || ideias.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="💡 Banco de Ideias"
        subtitle="Um lugar para guardar aquelas ideias que aparecem do nada e podem virar algo grande."
      >
        <Button onClick={abrirNova}>+ Nova ideia</Button>
      </PageHeader>

      {pills}

      {/* Indicadores */}
      {!vazio && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total de ideias" value={String(stats.total)} tone="blue" />
          <StatCard label="Muito importantes" value={String(stats.muitoImportantes)} tone="red" />
          <StatCard label="Ideias da agência" value={String(stats.agencia)} tone="blue" />
          <StatCard label="Ideias p/ clientes" value={String(stats.clientes)} tone="green" />
        </div>
      )}

      {/* Filtros */}
      {!vazio && (
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[140px] flex-1">
            <Input
              label="Buscar ideias..."
              placeholder="Título, descrição, cliente, projeto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select
            label="Tipo"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            options={[
              { value: '', label: 'Todas' },
              { value: 'agencia', label: 'Agência' },
              { value: 'cliente', label: 'Cliente' },
              { value: 'projeto', label: 'Projeto' },
            ]}
          />
          <Select
            label="Autor"
            value={filtroAutor}
            onChange={(e) => setFiltroAutor(e.target.value)}
            options={[
              { value: '', label: 'Todos' },
              { value: 'iuri', label: 'Iuri' },
              { value: 'dhomini', label: 'Dhomini' },
            ]}
          />
          <Select
            label="Importância"
            value={filtroImportancia}
            onChange={(e) => setFiltroImportancia(e.target.value)}
            options={[
              { value: '', label: 'Todas' },
              { value: 'simples', label: 'Simples' },
              { value: 'importante', label: 'Importante' },
              { value: 'muito_importante', label: 'Muito importante' },
            ]}
          />
          <Select
            label="Ordenar"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordem)}
            options={[
              { value: 'recentes', label: 'Mais recentes' },
              { value: 'antigas', label: 'Mais antigas' },
              { value: 'mais_importantes', label: 'Mais importantes' },
              { value: 'menos_importantes', label: 'Menos importantes' },
            ]}
          />
        </Card>
      )}

      {/* Estado vazio */}
      {vazio && (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="text-5xl">💡</span>
          <h2 className="mt-4 text-lg font-semibold text-slate-100">
            Sua próxima grande ideia pode aparecer a qualquer momento.
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Registre aqui antes que ela se perca.
          </p>
          <Button className="mt-6" onClick={abrirNova}>
            + Registrar primeira ideia
          </Button>
        </Card>
      )}

      {/* Lista de ideias */}
      {!vazio && lista.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-400">
          Nenhuma ideia encontrada com os filtros selecionados.
        </Card>
      )}

      {lista.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((ideia) => (
            <Card
              key={ideia.id}
              className="group cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/40"
              onClick={() => setDetalheIdeia(ideia)}
            >
              <h3 className="text-sm font-semibold text-slate-100 line-clamp-2">{ideia.titulo}</h3>
              {ideia.descricao && (
                <p className="mt-1 text-xs leading-relaxed text-slate-400 line-clamp-2">{ideia.descricao}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={TIPO_TONE[ideia.tipo]}>{TIPO_LABEL[ideia.tipo]}</Badge>
                {ideia.tipo === 'cliente' && ideia.cliente_nome && (
                  <Badge tone="green">{ideia.cliente_nome}</Badge>
                )}
                {ideia.tipo === 'projeto' && ideia.projeto_nome && (
                  <Badge tone="amber">{ideia.projeto_nome}</Badge>
                )}
                <Badge tone="slate">{AUTOR_LABEL[ideia.autor]}</Badge>
                <Badge tone="slate">{formatarData(ideia.data_ideia)}</Badge>
                <Badge tone={IMPORTANCIA_TONE[ideia.importancia]}>
                  {IMPORTANCIA_LABEL[ideia.importancia]}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modais */}
      <IdeiaFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        ideia={editIdeia}
      />

      <IdeiaDetalheModal
        open={!!detalheIdeia}
        onClose={() => setDetalheIdeia(null)}
        ideia={detalheIdeia}
        onEditar={abrirEditar}
      />
    </div>
  );
}

type AbaIdeias = 'banco' | 'criativos';

const ABAS_IDEIAS: { id: AbaIdeias; label: string }[] = [
  { id: 'banco', label: 'Banco de Ideias' },
  { id: 'criativos', label: 'Ideias de Criativos' },
];

export function IdeiasPage() {
  const [params, setParams] = useSearchParams();
  const aba: AbaIdeias = params.get('aba') === 'criativos' ? 'criativos' : 'banco';

  function trocar(nova: AbaIdeias) {
    const p = new URLSearchParams();
    if (nova === 'criativos') p.set('aba', 'criativos');
    setParams(p, { replace: true });
  }

  const pills = (
    <div className="flex flex-wrap gap-2" role="tablist">
      {ABAS_IDEIAS.map((a) => (
        <button
          key={a.id}
          role="tab"
          aria-selected={aba === a.id}
          onClick={() => trocar(a.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            aba === a.id
              ? 'bg-brand-500/20 text-brand-100 ring-1 ring-inset ring-brand-400/50'
              : 'bg-white/5 text-slate-400 ring-1 ring-inset ring-white/10 hover:text-slate-200'
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );

  return aba === 'criativos' ? <CriativosTab pills={pills} /> : <BancoDeIdeiasTab pills={pills} />;
}
