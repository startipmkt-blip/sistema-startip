import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { AUTOR_LABEL, IMPORTANCIA_LABEL, IMPORTANCIA_TONE } from '@/modules/ideias/types';
import { useCriativos, useMudarStatusCriativo } from './criativosApi';
import { CriativoFormModal } from './components/CriativoFormModal';
import { CriativoDetalheModal } from './components/CriativoDetalheModal';
import { MiniaturaAnexo } from './components/AnexosCriativo';
import {
  FORMATO_LABEL, STATUS_LABEL, STATUS_TONE, ehImagem, formatarData,
  type Criativo, type CriativoStatus,
} from './types';

function opts<T extends string>(labels: Record<T, string>, todos: string) {
  return [{ value: '', label: todos }, ...(Object.keys(labels) as T[]).map((k) => ({ value: k, label: labels[k] }))];
}

export function CriativosTab({ pills }: { pills: ReactNode }) {
  const { data: criativos, isLoading, error } = useCriativos();
  const { data: clientes = [] } = useClientes('');
  const mudarStatus = useMudarStatusCriativo();
  const [params, setParams] = useSearchParams();

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Criativo | undefined>();
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [fCliente, setFCliente] = useState('');
  const [fFormato, setFFormato] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fAutor, setFAutor] = useState('');
  const [fNivel, setFNivel] = useState('');

  // /ideias?aba=criativos&ideia=<id> abre o detalhe direto (usado pelo detalhe do cliente)
  const ideiaParam = params.get('ideia');
  useEffect(() => {
    if (ideiaParam) setDetalheId(ideiaParam);
  }, [ideiaParam]);

  const nomeCliente = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);
  const detalhe = useMemo(() => (criativos ?? []).find((c) => c.id === detalheId) ?? null, [criativos, detalheId]);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (criativos ?? []).filter((c) => {
      if (fCliente && !(c.geral || c.cliente_ids.includes(fCliente))) return false;
      if (fFormato && c.formato !== fFormato) return false;
      if (fStatus && c.status !== fStatus) return false;
      if (fAutor && c.autor !== fAutor) return false;
      if (fNivel && c.importancia !== fNivel) return false;
      if (t && !(c.titulo.toLowerCase().includes(t) || c.descricao.toLowerCase().includes(t))) return false;
      return true;
    });
  }, [criativos, busca, fCliente, fFormato, fStatus, fAutor, fNivel]);

  function abrirNova() { setEditando(undefined); setFormOpen(true); }
  function abrirEditar(c: Criativo) { setEditando(c); setFormOpen(true); }
  function fecharDetalhe() {
    setDetalheId(null);
    if (ideiaParam) {
      const p = new URLSearchParams(params);
      p.delete('ideia');
      setParams(p, { replace: true });
    }
  }

  const vazio = !criativos || criativos.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="💡 Banco de Ideias"
        subtitle="Anote ideias de criativos, marque os clientes e guarde o material de apoio."
      >
        <Button onClick={abrirNova}>+ Nova ideia de criativo</Button>
      </PageHeader>

      {pills}

      {isLoading && <div className="flex justify-center py-16"><Spinner /></div>}

      {error && (
        <Card className="p-4 text-sm text-red-300">
          Não foi possível carregar as ideias: {(error as Error).message}
        </Card>
      )}

      {!isLoading && !error && vazio && (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="text-5xl">🎬</span>
          <h2 className="mt-4 text-lg font-semibold text-slate-100">
            Teve uma ideia de criativo? Registre aqui antes que ela se perca.
          </h2>
          <Button className="mt-6" onClick={abrirNova}>+ Registrar primeira ideia de criativo</Button>
        </Card>
      )}

      {!vazio && (
        <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-2">
            <Input label="Buscar" placeholder="Título ou descrição..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select
            label="Cliente"
            value={fCliente}
            onChange={(e) => setFCliente(e.target.value)}
            options={[{ value: '', label: 'Todos' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]}
          />
          <Select label="Formato" value={fFormato} onChange={(e) => setFFormato(e.target.value)} options={opts(FORMATO_LABEL, 'Todos')} />
          <Select label="Status" value={fStatus} onChange={(e) => setFStatus(e.target.value)} options={opts(STATUS_LABEL, 'Todos')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Autor" value={fAutor} onChange={(e) => setFAutor(e.target.value)} options={opts(AUTOR_LABEL, 'Todos')} />
            <Select label="Nível" value={fNivel} onChange={(e) => setFNivel(e.target.value)} options={opts(IMPORTANCIA_LABEL, 'Todos')} />
          </div>
        </Card>
      )}

      {!vazio && lista.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-400">Nenhuma ideia encontrada com os filtros selecionados.</Card>
      )}

      {lista.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((c) => {
            const capa = c.anexos.find(ehImagem) ?? c.anexos[0];
            const nomes = c.cliente_ids.map((id) => nomeCliente.get(id) ?? 'Cliente');
            return (
              <Card
                key={c.id}
                className="cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/40"
                onClick={() => setDetalheId(c.id)}
              >
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-100">{c.titulo}</h3>
                    {c.descricao && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{c.descricao}</p>}
                  </div>
                  {capa && (
                    <div className="relative shrink-0">
                      <MiniaturaAnexo anexo={capa} className="h-16 w-16" />
                      {c.anexos.length > 1 && (
                        <span className="absolute -right-1 -top-1 rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-white">
                          {c.anexos.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.geral ? (
                    <Badge tone="blue">Ideia geral</Badge>
                  ) : (
                    nomes.slice(0, 3).map((n, i) => <Badge key={`${n}-${i}`} tone="green">{n}</Badge>)
                  )}
                  {nomes.length > 3 && !c.geral && <Badge tone="slate">+{nomes.length - 3}</Badge>}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.formato && <Badge tone="amber">{FORMATO_LABEL[c.formato]}</Badge>}
                  <Badge tone={IMPORTANCIA_TONE[c.importancia]}>{IMPORTANCIA_LABEL[c.importancia]}</Badge>
                  <Badge tone="slate">{AUTOR_LABEL[c.autor]}</Badge>
                  <Badge tone="slate">{formatarData(c.data_ideia)}</Badge>
                  {c.anexos.length > 0 && (
                    <Badge tone="slate">{c.anexos.length} {c.anexos.length === 1 ? 'anexo' : 'anexos'}</Badge>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  <select
                    aria-label="Mudar status"
                    value={c.status}
                    onChange={(e) => mudarStatus.mutate({ id: c.id, status: e.target.value as CriativoStatus })}
                    className="glass-field ml-auto max-w-[9rem] px-2 py-1 text-xs [&>option]:bg-slate-900 [&>option]:text-slate-100"
                  >
                    {(Object.keys(STATUS_LABEL) as CriativoStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CriativoFormModal open={formOpen} onClose={() => setFormOpen(false)} criativo={editando} />
      <CriativoDetalheModal open={!!detalhe} onClose={fecharDetalhe} criativo={detalhe} onEditar={abrirEditar} />
    </div>
  );
}
