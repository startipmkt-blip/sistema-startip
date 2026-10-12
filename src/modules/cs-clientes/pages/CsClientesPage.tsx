import { useMemo, useState } from 'react';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import {
  useEnviarMensagemCliente, useGruposWhatsapp, useVincularGrupo, useVincularVarios, type GrupoWhatsapp,
} from '@/modules/cs-clientes/api/csClientesApi';
import { sugerirGrupo } from '@/modules/cs-clientes/lib/sugerirGrupo';
import type { Cliente } from '@/shared/types/database';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { Textarea } from '@/shared/ui/Textarea';
import { GlassIcon } from '@/shared/ui/GlassIcon';

const OUTRO = '__outro__';

export function CsClientesPage() {
  const clientesQ = useClientes('');
  const gruposQ = useGruposWhatsapp();
  const vincularVarios = useVincularVarios();
  const [mensagemPara, setMensagemPara] = useState<Cliente | null>(null);
  const [revisando, setRevisando] = useState(false);

  const grupos = useMemo(() => gruposQ.data ?? [], [gruposQ.data]);
  const clientes = useMemo(
    () => (clientesQ.data ?? []).filter((c) => c.status === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome)),
    [clientesQ.data],
  );
  const comGrupo = clientes.filter((c) => !!c.whatsapp_chat_id).length;

  const sugestoes = useMemo(
    () => clientes
      .filter((c) => !c.whatsapp_chat_id)
      .map((c) => ({ cliente: c, grupo: sugerirGrupo(c.nome, grupos) }))
      .filter((s): s is { cliente: Cliente; grupo: GrupoWhatsapp } => s.grupo !== null),
    [clientes, grupos],
  );

  const nomeGrupo = (chatId: string | null | undefined) => grupos.find((g) => g.chatId === chatId)?.nome;

  return (
    <div className="space-y-4">
      <PageHeader title="💬 CS Clientes" subtitle="Grupo de WhatsApp de cada cliente — é para onde vão os envios de CS.">
        <span className="text-sm text-slate-300">
          <strong className="text-white">{comGrupo}</strong> de {clientes.length} com grupo
        </span>
        {sugestoes.length > 0 && (
          <Button onClick={() => setRevisando(true)}>Revisar sugestões</Button>
        )}
      </PageHeader>

      <Card className="p-4">
        {clientesQ.isLoading || gruposQ.isLoading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : (
          <>
            {grupos.length === 0 && (
              <div className="mb-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-300">
                Nenhum grupo encontrado no CRM. Os grupos aparecem aqui depois que recebem ou enviam uma mensagem pelo WhatsApp conectado.
              </div>
            )}
            <ul className="divide-y divide-white/5">
              {clientes.map((c) => (
                <LinhaCliente
                  key={c.id}
                  cliente={c}
                  grupos={grupos}
                  sugestao={sugestoes.find((s) => s.cliente.id === c.id)?.grupo ?? null}
                  compartilhadoCom={
                    c.whatsapp_chat_id
                      ? clientes.filter((o) => o.id !== c.id && o.whatsapp_chat_id === c.whatsapp_chat_id).map((o) => o.nome)
                      : []
                  }
                  onMensagem={() => setMensagemPara(c)}
                />
              ))}
              {clientes.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nenhum cliente ativo.</li>}
            </ul>
          </>
        )}
      </Card>

      {revisando && (
        <Modal open onClose={() => setRevisando(false)} title="Sugestões de grupo pelo nome" size="lg">
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Confira cada par antes de aplicar. Depois dá para trocar qualquer um na lista.</p>
            <ul className="max-h-[50vh] divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10">
              {sugestoes.map((s) => (
                <li key={s.cliente.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-1/2 truncate text-slate-100">{s.cliente.nome}</span>
                  <span className="text-slate-500">→</span>
                  <span className="w-1/2 truncate text-brand-200">{s.grupo.nome}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRevisando(false)}>Cancelar</Button>
              <Button
                disabled={vincularVarios.isPending}
                onClick={async () => {
                  await vincularVarios.mutateAsync(sugestoes.map((s) => ({ clienteId: s.cliente.id, chatId: s.grupo.chatId })));
                  setRevisando(false);
                }}
              >
                Aplicar {sugestoes.length} vínculo(s)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {mensagemPara && (
        <MensagemModal
          cliente={mensagemPara}
          grupoNome={nomeGrupo(mensagemPara.whatsapp_chat_id) ?? mensagemPara.whatsapp_chat_id ?? ''}
          onClose={() => setMensagemPara(null)}
        />
      )}
    </div>
  );
}

interface LinhaProps {
  cliente: Cliente;
  grupos: GrupoWhatsapp[];
  sugestao: GrupoWhatsapp | null;
  compartilhadoCom: string[];
  onMensagem: () => void;
}

function LinhaCliente({ cliente, grupos, sugestao, compartilhadoCom, onMensagem }: LinhaProps) {
  const vincular = useVincularGrupo();
  const atual = cliente.whatsapp_chat_id ?? '';
  const naLista = grupos.some((g) => g.chatId === atual);
  const [manual, setManual] = useState(!!atual && !naLista);
  const [idManual, setIdManual] = useState(naLista ? '' : atual);

  function escolher(valor: string) {
    if (valor === OUTRO) { setManual(true); return; }
    setManual(false);
    vincular.mutate({ clienteId: cliente.id, chatId: valor || null });
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-2.5">
      <div className="flex w-52 items-center gap-2">
        {cliente.logo_url
          ? <img src={cliente.logo_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
          : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px]"><GlassIcon name="building" /></span>}
        <span className="truncate text-sm text-slate-100">{cliente.nome}</span>
      </div>

      <select
        value={manual ? OUTRO : atual}
        onChange={(e) => escolher(e.target.value)}
        disabled={vincular.isPending}
        className="min-w-[14rem] flex-1 rounded-md border border-white/10 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 [color-scheme:dark]"
      >
        <option value="">— sem grupo —</option>
        {grupos.map((g) => <option key={g.chatId} value={g.chatId}>{g.nome}</option>)}
        <option value={OUTRO}>Outro (colar o ID do grupo)…</option>
      </select>

      {manual && (
        <input
          value={idManual}
          onChange={(e) => setIdManual(e.target.value)}
          onBlur={() => {
            const v = idManual.trim();
            if (v !== atual) vincular.mutate({ clienteId: cliente.id, chatId: v || null });
          }}
          placeholder="ID do grupo ou número com DDI"
          className="glass-field w-56 px-2 py-1.5 text-sm"
        />
      )}

      {atual
        ? <Badge tone="green">Vinculado</Badge>
        : sugestao
          ? (
            <button
              onClick={() => vincular.mutate({ clienteId: cliente.id, chatId: sugestao.chatId })}
              disabled={vincular.isPending}
              className="rounded-full border border-brand-400/40 bg-brand-500/10 px-2.5 py-0.5 text-xs text-brand-200 hover:bg-brand-500/20"
              title="Usar este grupo"
            >
              <GlassIcon name="sparkles" /> Usar "{sugestao.nome}"
            </button>
          )
          : <Badge tone="amber">Sem grupo</Badge>}

      {compartilhadoCom.length > 0 && (
        <span className="text-[11px] text-amber-300" title="Outro cliente usa o mesmo grupo">
          mesmo grupo de {compartilhadoCom.join(', ')}
        </span>
      )}

      <button
        onClick={onMensagem}
        disabled={!atual}
        className="ml-auto rounded-md border border-white/10 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Enviar mensagem
      </button>
    </li>
  );
}

function MensagemModal({ cliente, grupoNome, onClose }: { cliente: Cliente; grupoNome: string; onClose: () => void }) {
  const enviar = useEnviarMensagemCliente();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function confirmar() {
    setErro(null);
    try {
      await enviar.mutateAsync({ clienteId: cliente.id, texto: texto.trim() });
      setEnviado(true);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Mensagem para ${cliente.nome}`}>
      {enviado ? (
        <div className="space-y-3 text-center">
          <div className="text-3xl"><GlassIcon name="check-circle" /></div>
          <p className="text-sm text-slate-200">Mensagem enviada para <strong>{grupoNome}</strong>.</p>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-200">
            Será enviada <strong>agora</strong> no WhatsApp para: <strong>{grupoNome}</strong>. O cliente vai ver.
          </div>
          <Textarea id="cs-msg" label="Mensagem" value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-[120px]" />
          {erro && <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-300">{erro}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => void confirmar()} disabled={!texto.trim() || enviar.isPending}>
              {enviar.isPending ? 'Enviando…' : 'Enviar no grupo'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
