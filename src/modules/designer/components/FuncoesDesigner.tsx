import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import {
  FREQUENCIA_LABEL, useExcluirFuncao, useFuncoes, useSalvarFuncao,
  type DesignerFuncao, type FuncaoForm, type FuncaoFrequencia,
} from '../api/funcoesApi';
import { Linkify } from '@/shared/ui/Linkify';

const MAX_CHIPS = 8;

const FORM_VAZIO: FuncaoForm = {
  titulo: '', descricao: '', frequencia: 'semanal', todos_clientes: false, cliente_ids: [],
};

// ------------------------------------------------ Modal
function FuncaoModal({ funcao, onClose }: { funcao?: DesignerFuncao; onClose: () => void }) {
  const salvar = useSalvarFuncao();
  const { data: clientes = [] } = useClientes('');
  const [form, setForm] = useState<FuncaoForm>(FORM_VAZIO);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setForm(funcao
      ? {
        titulo: funcao.titulo, descricao: funcao.descricao, frequencia: funcao.frequencia,
        todos_clientes: funcao.todos_clientes, cliente_ids: funcao.cliente_ids,
      }
      : FORM_VAZIO);
    setBusca('');
    setErro(null);
  }, [funcao]);

  const ativos = useMemo(
    () => clientes.filter((c) => c.status === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome)),
    [clientes],
  );
  const visiveis = ativos.filter((c) => c.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  const set = <K extends keyof FuncaoForm>(k: K, v: FuncaoForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const alternar = (id: string) =>
    set('cliente_ids', form.cliente_ids.includes(id) ? form.cliente_ids.filter((x) => x !== id) : [...form.cliente_ids, id]);

  const comRedeSocial = ativos.filter((c) => c.servicos?.includes('social_midia')).map((c) => c.id);
  const soTrafego = ativos
    .filter((c) => c.servicos?.includes('trafego_pago') && !c.servicos.includes('social_midia'))
    .map((c) => c.id);

  async function handleSalvar() {
    if (!form.titulo.trim()) { setErro('Dê um nome para a função.'); return; }
    try {
      await salvar.mutateAsync({
        id: funcao?.id,
        dados: { ...form, titulo: form.titulo.trim(), descricao: form.descricao.trim() },
      });
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const atalho = 'rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10';

  return (
    <Modal
      open
      onClose={onClose}
      title={funcao ? 'Editar função' : 'Nova função'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          id="f-titulo" label="Função" placeholder="Ex.: Buscar ideias de conteúdo"
          value={form.titulo} onChange={(e) => set('titulo', e.target.value)}
        />
        <Textarea
          id="f-desc" label="Como fazer / detalhes (opcional)" rows={4}
          placeholder="Passo a passo, onde pesquisar, o que entregar…"
          value={form.descricao} onChange={(e) => set('descricao', e.target.value)}
        />
        <Select
          id="f-freq" label="Frequência"
          value={form.frequencia}
          onChange={(e) => set('frequencia', e.target.value as FuncaoFrequencia)}
          options={(Object.keys(FREQUENCIA_LABEL) as FuncaoFrequencia[]).map((f) => ({ value: f, label: FREQUENCIA_LABEL[f] }))}
        />

        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-300">Quais clientes</span>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox" checked={form.todos_clientes}
              onChange={(e) => set('todos_clientes', e.target.checked)}
            />
            Todos os clientes
          </label>

          {!form.todos_clientes && (
            <>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={atalho} onClick={() => set('cliente_ids', comRedeSocial)}>
                  Com rede social ({comRedeSocial.length})
                </button>
                <button type="button" className={atalho} onClick={() => set('cliente_ids', soTrafego)}>
                  Só tráfego pago ({soTrafego.length})
                </button>
                <button type="button" className={atalho} onClick={() => set('cliente_ids', ativos.map((c) => c.id))}>
                  Selecionar todos
                </button>
                {form.cliente_ids.length > 0 && (
                  <button type="button" className="text-xs text-slate-400 hover:underline" onClick={() => set('cliente_ids', [])}>
                    Limpar
                  </button>
                )}
              </div>
              <Input id="f-busca" placeholder="Buscar cliente…" value={busca} onChange={(e) => setBusca(e.target.value)} />
              <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-white/10 p-2">
                {visiveis.length === 0 && <span className="text-xs text-slate-500">Nenhum cliente encontrado.</span>}
                {visiveis.map((c) => {
                  const ativo = form.cliente_ids.includes(c.id);
                  return (
                    <button
                      key={c.id} type="button" aria-pressed={ativo} onClick={() => alternar(c.id)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        ativo ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {c.nome}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">{form.cliente_ids.length} cliente(s) selecionado(s)</p>
            </>
          )}
        </div>

        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
      </div>
    </Modal>
  );
}

// ------------------------------------------------ Aba
export function FuncoesDesigner() {
  const { data: funcoes, isLoading } = useFuncoes();
  const { data: clientes = [] } = useClientes('');
  const excluir = useExcluirFuncao();
  const [editando, setEditando] = useState<DesignerFuncao | undefined>();
  const [aberto, setAberto] = useState(false);

  const nomePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);

  function abrir(f?: DesignerFuncao) {
    setEditando(f);
    setAberto(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Tudo o que o designer tem de fazer, e para quais clientes. Use como checklist de responsabilidades.
        </p>
        <Button onClick={() => abrir()}>+ Nova função</Button>
      </div>

      {isLoading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : !funcoes || funcoes.length === 0 ? (
        <Card>
          <EmptyState message="Nenhuma função cadastrada ainda. Crie a primeira, por exemplo: “Buscar ideias de conteúdo”." />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {funcoes.map((f) => {
            const nomes = f.cliente_ids.map((id) => nomePorId.get(id)).filter(Boolean) as string[];
            return (
              <Card key={f.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-100">{f.titulo}</h3>
                  <Badge tone="blue">{FREQUENCIA_LABEL[f.frequencia]}</Badge>
                </div>
                {f.descricao && (
                  <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300"><Linkify texto={f.descricao} /></p>
                )}
                <div className="flex flex-wrap gap-1">
                  {f.todos_clientes ? (
                    <Badge tone="green">Todos os clientes</Badge>
                  ) : nomes.length === 0 ? (
                    <span className="text-[11px] text-slate-500">Sem clientes definidos</span>
                  ) : (
                    <>
                      {nomes.slice(0, MAX_CHIPS).map((n) => <Badge key={n} tone="slate">{n}</Badge>)}
                      {nomes.length > MAX_CHIPS && <Badge tone="slate">+{nomes.length - MAX_CHIPS}</Badge>}
                    </>
                  )}
                </div>
                <div className="flex gap-3 pt-1 text-xs">
                  <button className="font-medium text-brand-300 hover:underline" onClick={() => abrir(f)}>Editar</button>
                  <button
                    className="font-medium text-red-400 hover:underline"
                    onClick={() => {
                      if (confirm(`Excluir a função "${f.titulo}"?`)) {
                        excluir.mutate(f.id, { onError: (e) => alert(`Não foi possível excluir: ${(e as Error).message}`) });
                      }
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {aberto && <FuncaoModal funcao={editando} onClose={() => setAberto(false)} />}
    </div>
  );
}
