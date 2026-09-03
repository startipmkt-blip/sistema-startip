import { useMemo, useState } from 'react';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import {
  useEntregas, useSalvarEntrega, useExcluirEntrega,
  useOtimizacoes, useSalvarOtimizacao, useExcluirOtimizacao,
  useInvestimentos, useSalvarInvestimento,
  useAvisos, useSalvarAviso, useExcluirAviso,
  usePersona, useSalvarPersona,
} from '@/modules/painel-cliente/api/painelClienteApi';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Select } from '@/shared/ui/Select';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';

type Aba = 'entregas' | 'otimizacoes' | 'investimento' | 'avisos' | 'persona';

function segundaDaSemana(): string {
  const d = new Date();
  const dia = d.getDay();
  const off = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + off);
  return d.toISOString().slice(0, 10);
}

export function PainelClientePage() {
  const [clienteId, setClienteId] = useState('');
  const [aba, setAba] = useState<Aba>('entregas');
  const clientesQ = useClientes('');
  const clienteOpts = useMemo(
    () => [{ value: '', label: '— selecione um cliente —' }, ...(clientesQ.data ?? [])
      .filter((c) => c.status === 'ativo')
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((c) => ({ value: c.id, label: c.nome }))],
    [clientesQ.data],
  );
  const clienteAtual = (clientesQ.data ?? []).find((c) => c.id === clienteId);
  const linkPublico = clienteAtual?.central_slug
    ? `${window.location.origin}/central/${clienteAtual.central_slug}`
    : null;

  return (
    <div className="space-y-4">
      <PageHeader title="Painel do Cliente" subtitle="Alimente as abas que o cliente vê na Central pública.">
        <Select options={clienteOpts} value={clienteId} onChange={(e) => setClienteId(e.target.value)} />
      </PageHeader>

      {!clienteId ? (
        <Card><EmptyState message="Selecione um cliente pra começar." /></Card>
      ) : (
        <>
          {linkPublico && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
              🔗 <span className="text-slate-300">Central do cliente:</span>
              <code className="flex-1 truncate rounded bg-slate-800 px-2 py-0.5 text-slate-200">{linkPublico}</code>
              <button
                onClick={() => { void navigator.clipboard.writeText(linkPublico); }}
                className="rounded-md border border-white/10 px-2 py-0.5 text-slate-200 hover:bg-white/5"
              >Copiar</button>
            </div>
          )}

          <div className="flex flex-wrap gap-1 border-b border-white/10">
            {([
              { id: 'entregas',    label: '📦 Entregas' },
              { id: 'otimizacoes', label: '⚡ Otimizações' },
              { id: 'investimento',label: '💰 Investimento' },
              { id: 'avisos',      label: '📌 Avisos' },
              { id: 'persona',     label: '🎯 Persona' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setAba(t.id)}
                className={`border-b-2 px-4 py-2 text-sm font-medium ${
                  aba === t.id ? 'border-brand-500 text-brand-300' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >{t.label}</button>
            ))}
          </div>

          {aba === 'entregas'     && <SecaoEntregas clienteId={clienteId} />}
          {aba === 'otimizacoes'  && <SecaoOtimizacoes clienteId={clienteId} />}
          {aba === 'investimento' && <SecaoInvestimento clienteId={clienteId} />}
          {aba === 'avisos'       && <SecaoAvisos clienteId={clienteId} />}
          {aba === 'persona'      && <SecaoPersona clienteId={clienteId} />}
        </>
      )}
    </div>
  );
}

// ------------------------------ Entregas ------------------------------
function SecaoEntregas({ clienteId }: { clienteId: string }) {
  const { data: itens } = useEntregas(clienteId);
  const salvar = useSalvarEntrega();
  const excluir = useExcluirEntrega();
  const [form, setForm] = useState({ titulo: '', descricao: '', tipo: 'post', url: '', entregue_em: new Date().toISOString().slice(0, 10) });

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-100">+ Nova entrega</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input id="e-tit"  label="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          <Select id="e-tipo" label="Tipo" options={['post', 'reels', 'story', 'video', 'outro'].map((v) => ({ value: v, label: v }))}
                  value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
          <Input id="e-data" type="date" label="Entregue em" value={form.entregue_em} onChange={(e) => setForm({ ...form, entregue_em: e.target.value })} />
        </div>
        <Input id="e-url" label="URL do post (opcional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <Textarea id="e-desc" label="Descrição (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <div className="flex justify-end">
          <Button
            onClick={async () => {
              if (!form.titulo.trim()) return;
              await salvar.mutateAsync({ dados: { cliente_id: clienteId, ...form } });
              setForm({ titulo: '', descricao: '', tipo: 'post', url: '', entregue_em: new Date().toISOString().slice(0, 10) });
            }}
            disabled={salvar.isPending || !form.titulo.trim()}
          >Adicionar</Button>
        </div>
      </Card>

      {(itens ?? []).length === 0 ? <Card><EmptyState message="Nenhuma entrega registrada." /></Card> : (
        <ul className="space-y-2">
          {itens!.map((e) => (
            <li key={e.id}>
              <Card className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">{e.tipo}</Badge>
                    <span className="text-[11px] text-slate-500">{new Date(e.entregue_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-100">{e.titulo}</div>
                  {e.descricao && <p className="text-xs text-slate-400">{e.descricao}</p>}
                  {e.url && <a href={e.url} target="_blank" rel="noopener" className="text-xs text-brand-300 hover:underline">🔗 {e.url}</a>}
                </div>
                <button onClick={() => { if (confirm('Excluir?')) excluir.mutate(e.id); }} className="text-xs text-red-400 hover:underline">Excluir</button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------ Otimizações ------------------------------
function SecaoOtimizacoes({ clienteId }: { clienteId: string }) {
  const { data: itens } = useOtimizacoes(clienteId);
  const salvar = useSalvarOtimizacao();
  const excluir = useExcluirOtimizacao();
  const [form, setForm] = useState({ titulo: '', descricao: '', plataforma: 'meta' });

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-100">+ Nova otimização</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input id="o-tit" className="sm:col-span-2" label="Título (ex: Adicionei negativas na campanha X)" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          <Select id="o-plat" label="Plataforma" options={['meta', 'google', 'outro'].map((v) => ({ value: v, label: v }))}
                  value={form.plataforma} onChange={(e) => setForm({ ...form, plataforma: e.target.value })} />
        </div>
        <Textarea id="o-desc" label="Detalhes (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <div className="flex justify-end">
          <Button onClick={async () => {
            if (!form.titulo.trim()) return;
            await salvar.mutateAsync({ dados: { cliente_id: clienteId, ...form } });
            setForm({ titulo: '', descricao: '', plataforma: 'meta' });
          }} disabled={salvar.isPending || !form.titulo.trim()}>Registrar</Button>
        </div>
      </Card>

      {(itens ?? []).length === 0 ? <Card><EmptyState message="Nenhuma otimização registrada." /></Card> : (
        <ul className="space-y-2">
          {itens!.map((o) => (
            <li key={o.id}>
              <Card className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold uppercase text-amber-300">⚡ {o.plataforma}</span>
                    <span className="text-slate-500">{new Date(o.criada_em).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-100">{o.titulo}</div>
                  {o.descricao && <p className="whitespace-pre-line text-xs text-slate-400">{o.descricao}</p>}
                </div>
                <button onClick={() => { if (confirm('Excluir?')) excluir.mutate(o.id); }} className="text-xs text-red-400 hover:underline">Excluir</button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------ Investimento ------------------------------
function SecaoInvestimento({ clienteId }: { clienteId: string }) {
  const { data: itens } = useInvestimentos(clienteId);
  const salvar = useSalvarInvestimento();
  const [form, setForm] = useState({ semana_inicio: segundaDaSemana(), investimento_total: 0, media_diaria: 0, observacoes: '' });

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-100">Registrar / atualizar semana</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input id="i-sem"   type="date" label="Semana (segunda-feira)" value={form.semana_inicio} onChange={(e) => setForm({ ...form, semana_inicio: e.target.value })} />
          <Input id="i-total" type="number" label="Investimento total (R$)" value={form.investimento_total} onChange={(e) => setForm({ ...form, investimento_total: Number(e.target.value) })} />
          <Input id="i-med"   type="number" label="Média diária (R$)" value={form.media_diaria} onChange={(e) => setForm({ ...form, media_diaria: Number(e.target.value) })} />
        </div>
        <Textarea id="i-obs" label="Observações (opcional)" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        <div className="flex justify-end">
          <Button onClick={async () => {
            await salvar.mutateAsync({ dados: { cliente_id: clienteId, ...form } });
          }} disabled={salvar.isPending}>Salvar semana</Button>
        </div>
      </Card>

      {(itens ?? []).length === 0 ? <Card><EmptyState message="Sem semanas registradas." /></Card> : (
        <ul className="space-y-2">
          {itens!.map((i) => (
            <li key={i.id}>
              <Card className="flex items-center justify-between p-3">
                <div>
                  <div className="text-xs text-slate-500">Semana de {new Date(i.semana_inicio).toLocaleDateString('pt-BR')}</div>
                  <div className="text-sm font-medium text-slate-100">
                    Total {Number(i.investimento_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    <span className="ml-2 text-xs text-slate-400">· média {Number(i.media_diaria).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/dia</span>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------ Avisos ------------------------------
function SecaoAvisos({ clienteId }: { clienteId: string }) {
  const { data: itens } = useAvisos(clienteId);
  const salvar = useSalvarAviso();
  const excluir = useExcluirAviso();
  const [form, setForm] = useState({ titulo: '', conteudo: '' });
  const [enviandoWa, setEnviandoWa] = useState<string | null>(null);

  async function enviarWhatsApp(a: { titulo: string; conteudo: string; id: string }) {
    setEnviandoWa(a.id);
    try {
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-aviso-whatsapp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId, texto: `*${a.titulo}*\n\n${a.conteudo}` }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) alert(b?.error ?? 'Falha ao enviar');
      else alert('✅ Enviado pelo WhatsApp!');
    } catch (e) { alert((e as Error).message); }
    finally { setEnviandoWa(null); }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-100">+ Novo aviso</h3>
        <Input id="a-tit" label="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        <Textarea id="a-cont" label="Mensagem" className="min-h-[120px]" value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} />
        <div className="flex justify-end">
          <Button onClick={async () => {
            if (!form.titulo.trim() || !form.conteudo.trim()) return;
            await salvar.mutateAsync({ dados: { cliente_id: clienteId, ...form } });
            setForm({ titulo: '', conteudo: '' });
          }} disabled={salvar.isPending || !form.titulo.trim() || !form.conteudo.trim()}>Publicar</Button>
        </div>
      </Card>

      {(itens ?? []).length === 0 ? <Card><EmptyState message="Nenhum aviso publicado." /></Card> : (
        <ul className="space-y-2">
          {itens!.map((a) => (
            <li key={a.id}>
              <Card className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-amber-300">📌 {new Date(a.criado_em).toLocaleDateString('pt-BR')}</div>
                  <div className="text-sm font-semibold text-slate-100">{a.titulo}</div>
                  <p className="whitespace-pre-line text-xs text-slate-300">{a.conteudo}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 text-xs">
                  <button
                    onClick={() => void enviarWhatsApp(a)}
                    disabled={enviandoWa === a.id}
                    className="rounded-md bg-emerald-500/20 px-2 py-1 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
                  >{enviandoWa === a.id ? '⏳' : '📢 WhatsApp'}</button>
                  <button onClick={() => { if (confirm('Excluir?')) excluir.mutate(a.id); }} className="rounded-md px-2 py-1 text-red-400 hover:bg-red-500/10">Excluir</button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------ Persona ------------------------------
function SecaoPersona({ clienteId }: { clienteId: string }) {
  const { data: p } = usePersona(clienteId);
  const salvar = useSalvarPersona();
  const [form, setForm] = useState({
    persona: p?.persona ?? '',
    planejamento_estrategico: p?.planejamento_estrategico ?? '',
    tom_de_voz: p?.tom_de_voz ?? '',
    produtos_servicos: p?.produtos_servicos ?? '',
  });
  // Rehidrata quando persona chega
  useMemo(() => {
    if (p) setForm({
      persona: p.persona ?? '',
      planejamento_estrategico: p.planejamento_estrategico ?? '',
      tom_de_voz: p.tom_de_voz ?? '',
      produtos_servicos: p.produtos_servicos ?? '',
    });
  }, [p]);

  return (
    <Card className="space-y-3 p-4">
      <Textarea id="p-persona" label="Persona (avatar ideal)" className="min-h-[100px]" value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })} />
      <Textarea id="p-plan"    label="Planejamento estratégico" className="min-h-[100px]" value={form.planejamento_estrategico} onChange={(e) => setForm({ ...form, planejamento_estrategico: e.target.value })} />
      <Textarea id="p-tom"     label="Tom de voz" className="min-h-[80px]" value={form.tom_de_voz} onChange={(e) => setForm({ ...form, tom_de_voz: e.target.value })} />
      <Textarea id="p-prod"    label="Produtos / serviços" className="min-h-[80px]" value={form.produtos_servicos} onChange={(e) => setForm({ ...form, produtos_servicos: e.target.value })} />
      <div className="flex justify-end">
        <Button onClick={() => salvar.mutateAsync({ cliente_id: clienteId, ...form })} disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : 'Salvar persona'}
        </Button>
      </div>
    </Card>
  );
}
