import { useEffect, useMemo, useState } from 'react';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useAuth } from '@/shared/auth/AuthProvider';
import {
  STATUS_ORDEM, useConcluirDemanda, useDefinirPinPainel, useDemandasUrgentes, useExcluirDemanda,
  usePainelSlug, useSalvarDemanda, useSalvarSaude, useSaudeClientes, type DemandaForm,
} from '@/modules/painel-tv/api/painelTvApi';
import { STATUS_INFO, type DemandaUrgente, type SaudeCliente, type SaudeStatus } from '@/modules/painel-tv/types';
import { formatarData } from '@/modules/datas-comemorativas/lib/recorrencia';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';

const LIMITE_TV = 6;

const BOTAO_STATUS: Record<SaudeStatus, string> = {
  saudavel: 'border-emerald-400 bg-emerald-500/20 text-emerald-100',
  atencao: 'border-amber-400 bg-amber-500/20 text-amber-100',
  urgente: 'border-red-400 bg-red-500/25 text-red-100',
};

export function PainelTvAdminPage() {
  const { isAdmin } = useAuth();
  const clientesQ = useClientes('');
  const saudeQ = useSaudeClientes();
  const slugQ = usePainelSlug();
  const [pinAberto, setPinAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const linhas = useMemo(() => {
    const saude = new Map((saudeQ.data ?? []).map((s) => [s.cliente_id, s]));
    return (clientesQ.data ?? [])
      .filter((c) => c.status === 'ativo')
      .map((c) => ({ cliente: c, saude: saude.get(c.id) ?? { cliente_id: c.id, status: 'saudavel' as SaudeStatus, motivo: '', ordem: null } }))
      .sort((a, b) =>
        STATUS_ORDEM.indexOf(a.saude.status) - STATUS_ORDEM.indexOf(b.saude.status)
        || (a.saude.ordem ?? 99) - (b.saude.ordem ?? 99)
        || a.cliente.nome.localeCompare(b.cliente.nome));
  }, [clientesQ.data, saudeQ.data]);

  const urgentes = linhas.filter((l) => l.saude.status === 'urgente').length;
  const link = slugQ.data ? `${window.location.origin}/tv/${slugQ.data}` : null;

  return (
    <div className="space-y-4">
      <PageHeader title="📺 Painel TV" subtitle="Saúde da carteira e demandas urgentes da semana, exibidas na TV do escritório.">
        {link && (
          <>
            <Button variant="secondary" onClick={() => { void navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}>
              {copiado ? 'Copiado ✓' : '🔗 Copiar link da TV'}
            </Button>
            <a href={link} target="_blank" rel="noreferrer"><Button>Abrir painel ↗</Button></a>
          </>
        )}
        {isAdmin && <Button variant="secondary" onClick={() => setPinAberto(true)}>🔒 Trocar senha</Button>}
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Saúde dos clientes ativos ({linhas.length})</h2>
            <span className={`text-xs ${urgentes > LIMITE_TV ? 'text-amber-300' : 'text-slate-400'}`}>
              🔴 {urgentes} urgente(s){urgentes > LIMITE_TV && ` — a TV destaca os ${LIMITE_TV} primeiros`}
            </span>
          </div>
          {clientesQ.isLoading || saudeQ.isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : (
            <ul className="divide-y divide-white/5">
              {linhas.map(({ cliente, saude }) => (
                <LinhaCliente key={cliente.id} nome={cliente.nome} saude={saude} totalUrgentes={urgentes} />
              ))}
            </ul>
          )}
        </Card>

        <DemandasCard clientes={(clientesQ.data ?? []).filter((c) => c.status === 'ativo').map((c) => ({ id: c.id, nome: c.nome }))} />
      </div>

      {pinAberto && <TrocarPinModal onClose={() => setPinAberto(false)} />}
    </div>
  );
}

function LinhaCliente({ nome, saude, totalUrgentes }: { nome: string; saude: SaudeCliente; totalUrgentes: number }) {
  const salvar = useSalvarSaude();
  const [motivo, setMotivo] = useState(saude.motivo);
  useEffect(() => setMotivo(saude.motivo), [saude.motivo]);

  function mudarStatus(status: SaudeStatus) {
    if (status === saude.status) return;
    salvar.mutate({ ...saude, status, ordem: status === 'urgente' ? totalUrgentes + 1 : null });
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <span className="w-44 truncate text-sm text-slate-100">{nome}</span>
      <div className="flex gap-1">
        {STATUS_ORDEM.slice().reverse().map((s) => (
          <button
            key={s}
            onClick={() => mudarStatus(s)}
            disabled={salvar.isPending}
            title={STATUS_INFO[s].label}
            className={`rounded-md border px-2 py-1 text-xs ${saude.status === s ? BOTAO_STATUS[s] : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
          >
            {STATUS_INFO[s].emoji} {STATUS_INFO[s].label}
          </button>
        ))}
      </div>
      {saude.status === 'urgente' && (
        <select
          value={saude.ordem ?? ''}
          onChange={(e) => salvar.mutate({ ...saude, ordem: Number(e.target.value) })}
          title="Posição entre os urgentes"
          className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]"
        >
          {Array.from({ length: Math.max(totalUrgentes, saude.ordem ?? 0) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>#{n}</option>
          ))}
        </select>
      )}
      {saude.status !== 'saudavel' && (
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          onBlur={() => { if (motivo.trim() !== saude.motivo) salvar.mutate({ ...saude, motivo: motivo.trim() }); }}
          placeholder="Motivo (aparece na TV)…"
          maxLength={90}
          className="glass-field min-w-[12rem] flex-1 px-2 py-1 text-xs"
        />
      )}
    </li>
  );
}

const FORM_VAZIO: DemandaForm = { titulo: '', cliente_id: null, responsavel: '', prazo: null };

function DemandasCard({ clientes }: { clientes: Array<{ id: string; nome: string }> }) {
  const { data: demandas, isLoading } = useDemandasUrgentes();
  const salvar = useSalvarDemanda();
  const concluir = useConcluirDemanda();
  const excluir = useExcluirDemanda();
  const [form, setForm] = useState<DemandaForm>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const nomeCliente = (id: string | null) => clientes.find((c) => c.id === id)?.nome;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    await salvar.mutateAsync({ id: editandoId ?? undefined, dados: { ...form, titulo: form.titulo.trim(), responsavel: form.responsavel.trim() } });
    setForm(FORM_VAZIO);
    setEditandoId(null);
  }

  function editar(d: DemandaUrgente) {
    setEditandoId(d.id);
    setForm({ titulo: d.titulo, cliente_id: d.cliente_id, responsavel: d.responsavel, prazo: d.prazo });
  }

  return (
    <Card className="space-y-3 p-4">
      <h2 className="text-sm font-semibold text-white">⚡ Demandas urgentes da semana ({demandas?.length ?? 0})</h2>
      <form onSubmit={(e) => void enviar(e)} className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <Input id="du-titulo" placeholder="O que precisa ser feito?" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} maxLength={100} />
        <Select
          id="du-cliente" value={form.cliente_id ?? ''}
          onChange={(e) => setForm({ ...form, cliente_id: e.target.value || null })}
          options={[{ value: '', label: 'Cliente (opcional)' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input id="du-resp" placeholder="Responsável" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          <Input id="du-prazo" type="date" value={form.prazo ?? ''} onChange={(e) => setForm({ ...form, prazo: e.target.value || null })} className="[color-scheme:dark]" />
        </div>
        <div className="flex justify-end gap-2">
          {editandoId && <Button type="button" variant="secondary" onClick={() => { setEditandoId(null); setForm(FORM_VAZIO); }}>Cancelar</Button>}
          <Button type="submit" disabled={!form.titulo.trim() || salvar.isPending}>{editandoId ? 'Salvar' : '+ Adicionar'}</Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex justify-center p-6"><Spinner /></div>
      ) : (demandas ?? []).length === 0 ? (
        <p className="p-4 text-center text-xs text-slate-500">Nenhuma demanda urgente. Adicione as da semana acima.</p>
      ) : (
        <ul className="space-y-2">
          {(demandas ?? []).map((d) => (
            <li key={d.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-100">{d.titulo}</div>
                <div className="text-[11px] text-slate-500">
                  {[nomeCliente(d.cliente_id), d.responsavel, d.prazo && `prazo ${formatarData(d.prazo, { day: '2-digit', month: '2-digit' })}`].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <button onClick={() => concluir.mutate(d.id)} className="rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/30">✓ Feita</button>
              <button onClick={() => editar(d)} className="px-1 text-[11px] text-brand-300 hover:underline">Editar</button>
              <button onClick={() => { if (confirm(`Excluir "${d.titulo}"?`)) excluir.mutate(d.id); }} className="px-1 text-[11px] text-slate-500 hover:text-red-300">Excluir</button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TrocarPinModal({ onClose }: { onClose: () => void }) {
  const definir = useDefinirPinPainel();
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!/^\d{4,}$/.test(pin1)) { setErro('Use ao menos 4 números.'); return; }
    if (pin1 !== pin2) { setErro('As senhas não coincidem.'); return; }
    try {
      await definir.mutateAsync(pin1);
      alert('Senha trocada. A TV vai pedir a nova senha na próxima atualização.');
      onClose();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <Modal open onClose={onClose} title="Trocar senha do painel da TV">
      <form onSubmit={(e) => void salvar(e)} className="space-y-3">
        <Input id="pin1" label="Nova senha (números)" type="password" inputMode="numeric" value={pin1} onChange={(e) => setPin1(e.target.value)} />
        <Input id="pin2" label="Repita a senha" type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value)} />
        {erro && <div className="text-xs text-red-300">{erro}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={definir.isPending}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
