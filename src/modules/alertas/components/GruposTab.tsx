import { useMemo, useState } from 'react';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import {
  useAdicionarContato, useAlertasConfig, useGruposAlerta, useSalvarGrupo, useSincronizarGrupos,
} from '@/modules/alertas/api/alertasApi';
import { formatarHora } from '@/modules/alertas/lib/format';
import { DIAS_SEMANA, type GrupoAlerta } from '@/modules/alertas/types';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { Table, type Column } from '@/shared/ui/Table';

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');

export function GruposTab() {
  const gruposQ = useGruposAlerta();
  const cfgQ = useAlertasConfig();
  const salvar = useSalvarGrupo();
  const sync = useSincronizarGrupos();
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<GrupoAlerta | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [novoContato, setNovoContato] = useState(false);

  const internoId = cfgQ.data?.grupo_interno_id ?? null;
  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (gruposQ.data ?? []).filter((g) =>
      !t || `${g.nome_grupo ?? ''} ${g.cliente_nome ?? ''}`.toLowerCase().includes(t));
  }, [gruposQ.data, busca]);

  async function sincronizar() {
    setAviso(null);
    try {
      const r = await sync.mutateAsync();
      setAviso(r.aviso ?? `${r.total} grupo(s) encontrados na Z-API.`);
    } catch (e) {
      setAviso(`Não foi possível buscar os grupos: ${(e as Error).message}`);
    }
  }

  const colunas: Column<GrupoAlerta>[] = [
    { header: 'Monitorar', render: (g) => (
      g.chat_id === internoId
        ? <Badge tone="blue">Grupo interno</Badge>
        : (
          <label className="inline-flex cursor-pointer items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={g.monitorar}
              onChange={(e) => salvar.mutate({ id: g.id, monitorar: e.target.checked })}
              className="h-4 w-4 accent-brand-500"
            />
            <span className="text-xs">{g.monitorar ? 'Ativo' : 'Desativado'}</span>
          </label>
        )
    ) },
    { header: 'Grupo / contato', render: (g) => (
      <span className="font-medium text-white">
        {g.nome_grupo ?? g.chat_id} {g.tipo === 'contato' && <Badge tone="blue">Contato</Badge>}
      </span>
    ) },
    { header: 'Cliente', render: (g) => g.cliente_nome ?? <span className="text-slate-500">Não definido</span> },
    { header: 'Prazo', render: (g) => (g.prazo_min ? `${g.prazo_min} min` : `Padrão (${cfgQ.data?.nivel1_min ?? 10} min)`) },
    { header: 'Última msg do cliente', render: (g) => (
      g.ultima_msg_cliente_em ? (
        <div className="max-w-xs">
          <div className="truncate">{g.ultima_msg_cliente_texto}</div>
          <div className="text-xs text-slate-500">{formatarHora(g.ultima_msg_cliente_em)}</div>
        </div>
      ) : <span className="text-slate-500">—</span>
    ) },
    { header: 'Última resposta', render: (g) => (
      g.ultima_resposta_em
        ? <span>{formatarHora(g.ultima_resposta_em)}{g.ultima_resposta_por ? ` · ${g.ultima_resposta_por}` : ''}</span>
        : <span className="text-slate-500">—</span>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72"><Input placeholder="Buscar grupo ou cliente" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <Button variant="secondary" onClick={sincronizar} disabled={sync.isPending}>
          {sync.isPending ? 'Buscando…' : 'Buscar grupos na Z-API'}
        </Button>
        <Button variant="secondary" onClick={() => setNovoContato(true)}>Adicionar contato</Button>
      </div>
      {aviso && <p className="text-sm text-slate-300">{aviso}</p>}
      <p className="text-xs text-slate-500">
        Grupos novos entram desativados. Só os ativos são monitorados — e só mensagens recebidas depois da ativação são registradas.
      </p>

      <Card className="overflow-hidden">
        {gruposQ.isLoading ? <div className="flex justify-center p-10"><Spinner /></div> : (
          <Table
            columns={colunas}
            data={lista}
            keyOf={(g) => g.id}
            onRowClick={setEditando}
            emptyMessage="Nenhum grupo catalogado ainda. Clique em “Buscar grupos na Z-API”."
          />
        )}
      </Card>

      {novoContato && <NovoContato onClose={() => setNovoContato(false)} />}
      {editando && <EditarGrupo grupo={editando} internoId={internoId} onClose={() => setEditando(null)} />}
    </div>
  );
}

function EditarGrupo({ grupo, internoId, onClose }: { grupo: GrupoAlerta; internoId: string | null; onClose: () => void }) {
  const salvar = useSalvarGrupo();
  const cfgQ = useAlertasConfig();
  const clientesQ = useClientes('');
  const [cliente, setCliente] = useState(grupo.cliente_nome ?? '');
  const [clienteId, setClienteId] = useState(grupo.cliente_id ?? '');
  const [monitorar, setMonitorar] = useState(grupo.monitorar);
  const [prazo, setPrazo] = useState(grupo.prazo_min ? String(grupo.prazo_min) : '');
  const [hc, setHc] = useState<'global' | 'sim' | 'nao'>(grupo.hc_ativo == null ? 'global' : grupo.hc_ativo ? 'sim' : 'nao');
  const [ini, setIni] = useState(hhmm(grupo.hc_inicio) || hhmm(cfgQ.data?.hc_inicio) || '08:00');
  const [fim, setFim] = useState(hhmm(grupo.hc_fim) || hhmm(cfgQ.data?.hc_fim) || '18:00');
  const [dias, setDias] = useState<number[]>(grupo.hc_dias ?? cfgQ.data?.hc_dias ?? [1, 2, 3, 4, 5]);
  const [erro, setErro] = useState<string | null>(null);
  const ehInterno = grupo.chat_id === internoId;

  async function gravar() {
    const p = prazo.trim() === '' ? null : Number(prazo);
    if (p !== null && (!Number.isInteger(p) || p < 1 || p > 1440)) { setErro('Prazo deve ser um número entre 1 e 1440 minutos.'); return; }
    if (hc === 'sim' && (ini >= fim || dias.length === 0)) { setErro('Informe um horário comercial válido (início antes do fim e ao menos um dia).'); return; }
    try {
      await salvar.mutateAsync({
        id: grupo.id,
        cliente_nome: cliente.trim() || null,
        cliente_id: clienteId || null,
        monitorar: ehInterno ? false : monitorar,
        prazo_min: p,
        hc_ativo: hc === 'global' ? null : hc === 'sim',
        hc_inicio: hc === 'sim' ? ini : null,
        hc_fim: hc === 'sim' ? fim : null,
        hc_dias: hc === 'sim' ? dias : null,
      });
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <Modal
      open onClose={onClose} title={grupo.nome_grupo ?? 'Grupo'} size="lg" fecharSoPorBotao
      footer={(
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={gravar} disabled={salvar.isPending}>Salvar</Button>
        </div>
      )}
    >
      <div className="space-y-4">
        {ehInterno && (
          <p className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-3 text-sm text-blue-200">
            Este é o grupo interno de alertas e não pode ser monitorado como grupo de cliente.
          </p>
        )}
        <Input label="Nome do cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        <Select
          label="Cliente cadastrado (opcional)"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          options={[{ value: '', label: '— sem vínculo —' }, ...(clientesQ.data ?? []).map((c) => ({ value: c.id, label: c.nome }))]}
        />
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={monitorar && !ehInterno}
            disabled={ehInterno} onChange={(e) => setMonitorar(e.target.checked)} />
          Monitorar este grupo
        </label>
        <Input
          label={`Prazo de resposta em minutos (vazio = padrão de ${cfgQ.data?.nivel1_min ?? 10})`}
          type="number" min={1} max={1440} value={prazo} onChange={(e) => setPrazo(e.target.value)}
        />
        <Select
          label="Horário comercial"
          value={hc}
          onChange={(e) => setHc(e.target.value as 'global' | 'sim' | 'nao')}
          options={[
            { value: 'global', label: 'Seguir configuração geral' },
            { value: 'sim', label: 'Usar horário comercial específico' },
            { value: 'nao', label: 'Monitorar 24 horas' },
          ]}
        />
        {hc === 'sim' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Início" type="time" value={ini} onChange={(e) => setIni(e.target.value)} />
              <Input label="Fim" type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((d) => (
                <label key={d.n} className="flex items-center gap-1 text-sm text-slate-300">
                  <input type="checkbox" className="accent-brand-500" checked={dias.includes(d.n)}
                    onChange={(e) => setDias(e.target.checked ? [...dias, d.n] : dias.filter((x) => x !== d.n))} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
          <div>Última mensagem do cliente: {formatarHora(grupo.ultima_msg_cliente_em)}</div>
          <div>Última resposta identificada: {formatarHora(grupo.ultima_resposta_em)}{grupo.ultima_resposta_por ? ` · ${grupo.ultima_resposta_por}` : ''}</div>
        </div>
        {erro && <p className="text-sm text-red-300">{erro}</p>}
      </div>
    </Modal>
  );
}

function NovoContato({ onClose }: { onClose: () => void }) {
  const add = useAdicionarContato();
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cliente, setCliente] = useState('');
  const [prazo, setPrazo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function gravar() {
    let d = telefone.replace(/\D/g, '');
    if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
    if (!nome.trim()) { setErro('Informe o nome do contato.'); return; }
    if (d.length !== 10 && d.length !== 11) { setErro('Telefone inválido. Use DDD + número.'); return; }
    const p = prazo.trim() === '' ? null : Number(prazo);
    if (p !== null && (!Number.isInteger(p) || p < 1 || p > 1440)) { setErro('Prazo deve estar entre 1 e 1440 minutos.'); return; }
    try {
      await add.mutateAsync({ nome: nome.trim(), telefone, cliente_nome: cliente.trim() || null, prazo_min: p });
      onClose();
    } catch (e) {
      const m = (e as Error).message;
      setErro(/duplicate|unique/i.test(m) ? 'Este contato já está cadastrado.' : m);
    }
  }

  return (
    <Modal
      open onClose={onClose} title="Adicionar contato monitorado" fecharSoPorBotao
      footer={(
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={gravar} disabled={add.isPending}>Adicionar</Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <Input label="Nome do contato" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input label="WhatsApp com DDD" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <Input label="Nome do cliente/empresa (opcional)" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        <Input label="Prazo em minutos (vazio = padrão)" type="number" min={1} max={1440} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        <p className="text-xs text-slate-500">
          Conversas privadas de números que não estão cadastrados aqui nunca são registradas.
          A resposta da equipe é a enviada pelo número conectado (celular ou inbox do Startip OS).
        </p>
        {erro && <p className="text-sm text-red-300">{erro}</p>}
      </div>
    </Modal>
  );
}
