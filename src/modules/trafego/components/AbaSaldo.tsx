import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Badge } from '@/shared/ui/Badge';
import { formatMoney } from '@/shared/lib/format';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import {
  useSaldoConfig, useSalvarSaldoConfig,
  useSaldoContatos, useSalvarContato, useExcluirContato,
  useSaldoSnapshotHoje, useDispararSaldo,
  type SaldoConfig,
} from '../api/trafegoApi';

export function AbaSaldo() {
  const cfgQ = useSaldoConfig();
  const salvarCfg = useSalvarSaldoConfig();
  const disparar = useDispararSaldo();
  const contatosQ = useSaldoContatos();
  const snap = useSaldoSnapshotHoje();

  const [cfg, setCfg] = useState<SaldoConfig | null>(null);
  useEffect(() => { if (cfgQ.data) setCfg(cfgQ.data); }, [cfgQ.data]);

  const [resposta, setResposta] = useState<string | null>(null);

  async function rodar() {
    setResposta(null);
    try {
      const r: any = await disparar.mutateAsync({ forcado: true });
      setResposta(`${r?.contas ?? 0} conta(s) processadas · ${(r?.resultado ?? []).filter((x: any) => x.enviado).length} envios OK`);
    } catch (e) { setResposta(`Erro: ${(e as Error).message}`); }
  }

  if (!cfg) return null;

  const total = snap.data?.length ?? 0;
  const precisam = (snap.data ?? []).filter((s) => s.situacao === 'sem_saldo' || s.situacao === 'alerta').length;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Coluna esquerda: tabela snapshot */}
      <Card className="lg:col-span-2 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">💰 Saldo hoje</h3>
            <p className="text-[11px] text-slate-500">
              {total} conta(s) · {precisam > 0 ? <span className="text-amber-300">⚠ {precisam} precisam atenção</span> : '✅ tudo ok'}
            </p>
          </div>
          <Button variant="secondary" onClick={rodar} disabled={disparar.isPending}>
            {disparar.isPending ? 'Rodando…' : '🔄 Rodar agora'}
          </Button>
        </div>
        {resposta && <p className="border-b border-white/10 bg-white/5 px-4 py-2 text-xs text-brand-100">{resposta}</p>}
        <table className="min-w-full text-xs">
          <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Empresa</th>
              <th className="px-3 py-2 text-right">Disponível</th>
              <th className="px-3 py-2 text-right">Gasto ontem</th>
              <th className="px-3 py-2 text-right">Limite</th>
              <th className="px-3 py-2 text-left">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(snap.data ?? []).map((s) => (
              <tr key={s.cliente_id}>
                <td className="px-3 py-2 text-slate-100">{s.cliente_nome ?? '—'}</td>
                <td className="px-3 py-2 text-right text-slate-100">{s.disponivel != null ? formatMoney(s.disponivel) : '—'}</td>
                <td className="px-3 py-2 text-right text-slate-300">{s.gasto_ontem != null ? formatMoney(s.gasto_ontem) : '—'}</td>
                <td className="px-3 py-2 text-right text-slate-400">{s.limite != null ? formatMoney(s.limite) : '—'}</td>
                <td className="px-3 py-2">
                  <Badge tone={s.situacao === 'sem_saldo' ? 'red' : s.situacao === 'alerta' ? 'amber' : 'green'}>{s.situacao ?? '—'}</Badge>
                </td>
              </tr>
            ))}
            {(snap.data ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Sem snapshot hoje. Clique "🔄 Rodar agora".</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Coluna direita: config + contatos */}
      <div className="space-y-3">
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-100">⚙️ Envio diário</h3>
          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between gap-2 text-slate-300">
              <span>Ativo</span>
              <input type="checkbox" checked={cfg.ativo} onChange={(e) => setCfg({ ...cfg, ativo: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between gap-2 text-slate-300">
              <span>Só dias úteis</span>
              <input type="checkbox" checked={cfg.dias_uteis_only} onChange={(e) => setCfg({ ...cfg, dias_uteis_only: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between gap-2 text-slate-300">
              <span>Só enviar em alerta</span>
              <input type="checkbox" checked={cfg.so_alertas} onChange={(e) => setCfg({ ...cfg, so_alertas: e.target.checked })} />
            </label>
            <Input id="hor" type="time" label="Horário" value={cfg.horario.slice(0, 5)} onChange={(e) => setCfg({ ...cfg, horario: e.target.value + ':00' })} />
            <Input id="piso" type="number" label="Piso de alerta (R$)" value={String(cfg.piso_alerta)} onChange={(e) => setCfg({ ...cfg, piso_alerta: Number(e.target.value) })} />
            <Textarea id="msg" label="Mensagem no topo" rows={2} value={cfg.mensagem_topo ?? ''} onChange={(e) => setCfg({ ...cfg, mensagem_topo: e.target.value })} />
            <Button onClick={() => salvarCfg.mutate(cfg)} disabled={salvarCfg.isPending} className="w-full">
              {salvarCfg.isPending ? 'Salvando…' : 'Salvar configuração'}
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-100">📱 Contatos do aviso</h3>
          <ContatosLista contatos={contatosQ.data ?? []} />
        </Card>
      </div>
    </div>
  );
}

function ContatosLista({ contatos }: { contatos: NonNullable<ReturnType<typeof useSaldoContatos>['data']> }) {
  const salvar = useSalvarContato();
  const excluir = useExcluirContato();
  const { data: clientes } = useClientes('');
  const [novo, setNovo] = useState({ cliente_id: '', nome_grupo: '', zapi_chat_id: '' });

  async function add() {
    if (!novo.nome_grupo.trim() || !novo.zapi_chat_id.trim()) return;
    await salvar.mutateAsync({
      cliente_id: novo.cliente_id || null,
      nome_grupo: novo.nome_grupo.trim(),
      zapi_chat_id: novo.zapi_chat_id.trim(),
      ativo: true,
    });
    setNovo({ cliente_id: '', nome_grupo: '', zapi_chat_id: '' });
  }

  return (
    <div className="space-y-2 text-xs">
      <ul className="space-y-1.5">
        {contatos.length === 0 && <li className="text-slate-500">Nenhum contato cadastrado ainda.</li>}
        {contatos.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded border border-white/10 bg-white/5 p-2">
            <input type="checkbox" checked={c.ativo}
              onChange={(e) => salvar.mutate({ id: c.id, nome_grupo: c.nome_grupo, zapi_chat_id: c.zapi_chat_id, ativo: e.target.checked })} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-100">{c.nome_grupo}</p>
              <p className="truncate text-[10px] text-slate-500">
                {c.cliente_nome ? `${c.cliente_nome} · ` : '(todas empresas) · '}{c.zapi_chat_id}
              </p>
            </div>
            <button onClick={() => { if (confirm(`Excluir ${c.nome_grupo}?`)) excluir.mutate(c.id); }}
              className="text-slate-400 hover:text-red-400" title="Excluir">🗑</button>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-2 rounded border border-dashed border-white/10 p-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Adicionar contato</p>
        <Select id="c" value={novo.cliente_id} onChange={(e) => setNovo({ ...novo, cliente_id: e.target.value })}
          options={[{ value: '', label: 'todas as empresas' }, ...((clientes ?? []).map((c) => ({ value: c.id, label: c.nome })))]} />
        <Input id="n" placeholder="Nome do grupo/contato" value={novo.nome_grupo} onChange={(e) => setNovo({ ...novo, nome_grupo: e.target.value })} />
        <Input id="z" placeholder="55119...@g.us OU 5511999999999" value={novo.zapi_chat_id} onChange={(e) => setNovo({ ...novo, zapi_chat_id: e.target.value })} />
        <Button onClick={add} disabled={salvar.isPending} className="w-full">+ Adicionar</Button>
      </div>
    </div>
  );
}
