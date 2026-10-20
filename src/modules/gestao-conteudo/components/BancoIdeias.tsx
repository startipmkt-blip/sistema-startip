import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { Linkify } from '@/shared/ui/Linkify';
import { AnexosCriativo, MiniaturaAnexo } from '@/modules/ideias/criativos/components/AnexosCriativo';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import {
  useAplicarIdeiaBanco, useExcluirIdeiaBanco, useSalvarIdeiaBanco,
  type IdeiaBanco, type IdeiaBancoForm,
} from '@/modules/gestao-conteudo/api/bancoIdeiasApi';
import { FORMATO_OPCOES, mesLabel } from '@/modules/gestao-conteudo/types';
import { semanasRotuladas } from '@/modules/gestao-conteudo/lib/semanas';
import { chaveMes, mesAnteriorProximo } from '@/modules/designer/lib/periodo';

const FORMATO_LABEL: Record<string, string> = Object.fromEntries(FORMATO_OPCOES.map((f) => [f.value, f.label]));
const VAZIO: IdeiaBancoForm = { titulo: '', descricao: '', formato: 'estatico', anexos: [] };

function FormIdeia({ clienteId, ideia, onClose }: { clienteId: string; ideia?: IdeiaBanco; onClose: () => void }) {
  const salvar = useSalvarIdeiaBanco();
  const [form, setForm] = useState<IdeiaBancoForm>(ideia
    ? { titulo: ideia.titulo, descricao: ideia.descricao, formato: ideia.formato, anexos: ideia.anexos ?? [] }
    : VAZIO);
  // Enviados nesta abertura: se cancelar, somem do storage.
  const [novos, setNovos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    for (const p of novos) void descartarAnexo(p);
    onClose();
  }

  function handleSalvar() {
    if (!form.titulo.trim()) { setErro('Informe o título da ideia.'); return; }
    setErro(null);
    salvar.mutate(
      { id: ideia?.id, clienteId, dados: { ...form, titulo: form.titulo.trim() } },
      {
        onSuccess: () => {
          const mantidos = new Set(form.anexos.map((a) => a.path));
          for (const a of ideia?.anexos ?? []) if (!mantidos.has(a.path)) void descartarAnexo(a.path);
          onClose();
        },
        onError: (e) => setErro(`Não foi possível salvar: ${(e as Error).message}`),
      },
    );
  }

  return (
    <Modal
      open onClose={fechar}
      title={ideia ? 'Editar ideia' : 'Nova ideia geral'}
      footer={
        <>
          <Button variant="secondary" onClick={fechar}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending}>{salvar.isPending ? 'Salvando…' : 'Salvar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {erro && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}
        <Input label="Título da ideia *" value={form.titulo} autoFocus
          onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
        <Textarea label="Explique a ideia" rows={5} value={form.descricao}
          onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
        <Select label="Formato" value={form.formato} options={FORMATO_OPCOES}
          onChange={(e) => setForm((f) => ({ ...f, formato: e.target.value as IdeiaBancoForm['formato'] }))} />
        <div>
          <p className="mb-1 text-xs font-medium text-slate-300">Prints e referências</p>
          <AnexosCriativo
            anexos={form.anexos}
            onChange={(anexos) => setForm((f) => ({ ...f, anexos }))}
            novos={novos} onNovos={setNovos}
          />
        </div>
      </div>
    </Modal>
  );
}

function AplicarModal({ ideia, mesPadrao, onClose }: { ideia: IdeiaBanco; mesPadrao: string; onClose: () => void }) {
  const aplicar = useAplicarIdeiaBanco();
  const meses = useMemo(() => {
    const base = chaveMes(new Date());
    return Array.from({ length: 14 }, (_, i) => mesAnteriorProximo(base, i - 1));
  }, []);
  const [mes, setMes] = useState(meses.includes(mesPadrao) ? mesPadrao : meses[1]);
  const semanas = useMemo(() => semanasRotuladas(mes), [mes]);
  const [semana, setSemana] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { setSemana(1); }, [mes]);
  const escolhida = semanas.find((s) => s.numero === semana) ?? semanas[0];

  function confirmar() {
    setErro(null);
    aplicar.mutate(
      { ideia, semanaIni: escolhida.ini },
      { onSuccess: onClose, onError: (e) => setErro((e as Error).message) },
    );
  }

  return (
    <Modal
      open onClose={onClose} title="Aplicar ideia em uma semana"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={aplicar.isPending}>
            {aplicar.isPending ? 'Enviando…' : 'Subir para o Designer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-200">
          <strong>{ideia.titulo}</strong> vira uma demanda <em>A fazer</em> no Designer, na semana escolhida.
        </p>
        {erro && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Mês" value={mes} onChange={(e) => setMes(e.target.value)}
            options={meses.map((m) => ({ value: m, label: mesLabel(m) }))} />
          <Select label="Semana" value={String(semana)} onChange={(e) => setSemana(Number(e.target.value))}
            options={semanas.map((s) => ({ value: String(s.numero), label: s.label }))} />
        </div>
      </div>
    </Modal>
  );
}

export function BancoIdeias({ clienteId, mes, ideias, carregando }: {
  clienteId: string; mes: string; ideias: IdeiaBanco[]; carregando: boolean;
}) {
  const excluir = useExcluirIdeiaBanco();
  const [form, setForm] = useState<{ ideia?: IdeiaBanco } | null>(null);
  const [aplicando, setAplicando] = useState<IdeiaBanco | null>(null);
  const [verUsadas, setVerUsadas] = useState(false);

  const livres = ideias.filter((i) => !i.usada_em);
  const usadas = ideias.filter((i) => i.usada_em);

  function remover(i: IdeiaBanco) {
    if (!confirm(`Excluir "${i.titulo}"?`)) return;
    excluir.mutate(i.id, { onSuccess: () => { for (const a of i.anexos ?? []) void descartarAnexo(a.path); } });
  }

  const cartao = (i: IdeiaBanco) => (
    <div key={i.id} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
      <div>
        <p className="text-sm font-medium text-slate-100">{i.titulo}</p>
        <p className="text-[10px] text-slate-500">{FORMATO_LABEL[i.formato] ?? i.formato}</p>
      </div>
      {i.descricao && <p className="line-clamp-4 whitespace-pre-line text-[11px] text-slate-300"><Linkify texto={i.descricao} /></p>}
      {(i.anexos ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {i.anexos.slice(0, 4).map((a) => <MiniaturaAnexo key={a.path} anexo={a} className="h-12 w-12" />)}
          {i.anexos.length > 4 && <span className="self-center text-[11px] text-slate-400">+{i.anexos.length - 4}</span>}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        {i.usada_em
          ? <Badge tone="green">Usada · semana de {new Date(`${i.usada_semana}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</Badge>
          : <Button onClick={() => setAplicando(i)}>Aplicar em uma semana</Button>}
        <span className="ml-auto" />
        <button onClick={() => setForm({ ideia: i })} className="rounded px-1.5 py-1 text-slate-300 hover:bg-white/10" title="Editar">
          <GlassIcon name="pencil" />
        </button>
        <button onClick={() => remover(i)} className="rounded px-1.5 py-1 text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Excluir">
          <GlassIcon name="trash" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-400">
          Ideias guardadas sem semana. Quando quiser usar, escolha o mês e a semana: ela sobe como demanda para o Designer.
        </p>
        <Button className="ml-auto" onClick={() => setForm({})}>+ Nova ideia geral</Button>
      </div>

      {carregando && <div className="flex justify-center py-10"><Spinner /></div>}

      {!carregando && livres.length === 0 && (
        <Card className="p-6 text-center text-sm text-slate-400">
          Nenhuma ideia guardada. Use <strong>+ Nova ideia geral</strong> para anotar ideias que ainda não têm semana.
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{livres.map(cartao)}</div>

      {usadas.length > 0 && (
        <div className="space-y-2">
          <button className="text-xs text-brand-300 hover:underline" onClick={() => setVerUsadas((v) => !v)}>
            {verUsadas ? 'Esconder' : 'Ver'} ideias já usadas ({usadas.length})
          </button>
          {verUsadas && <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{usadas.map(cartao)}</div>}
        </div>
      )}

      {form && <FormIdeia clienteId={clienteId} ideia={form.ideia} onClose={() => setForm(null)} />}
      {aplicando && <AplicarModal ideia={aplicando} mesPadrao={mes} onClose={() => setAplicando(null)} />}
    </div>
  );
}
