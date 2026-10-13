import { useMemo, useState } from 'react';
import { enviarCs, useInvalidarEnvios, useSalvarCsConfig } from '@/modules/cs-clientes/api/csEnviosApi';
import {
  MARCADOR_LINK, dataCurta, enviadoNestaSemana, linkCs, montarMensagem,
} from '@/modules/cs-clientes/lib/mensagens';
import type { Cliente } from '@/shared/types/database';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';
import { Badge } from '@/shared/ui/Badge';

// Pausa entre um grupo e outro: envios colados em sequência aumentam o
// risco de o WhatsApp tratar o número como spam.
const INTERVALO_MS = 2500;

type Estado = 'aguardando' | 'enviando' | 'ok' | 'erro';

interface Props {
  clientes: Cliente[];
  links: Record<string, string>;
  ultimoEnvio: Record<string, string>;
  msgPadrao: string;
  nomeGrupo: (chatId: string | null | undefined) => string | undefined;
  onClose: () => void;
}

export function DispararCsModal({ clientes, links, ultimoEnvio, msgPadrao, nomeGrupo, onClose }: Props) {
  const salvarConfig = useSalvarCsConfig();
  const invalidarEnvios = useInvalidarEnvios();
  const aptos = useMemo(() => clientes.filter((c) => !!c.whatsapp_chat_id && !!links[c.id]), [clientes, links]);
  const semGrupo = clientes.filter((c) => !c.whatsapp_chat_id);

  const [modelo, setModelo] = useState(msgPadrao);
  const [marcados, setMarcados] = useState<Set<string>>(
    () => new Set(aptos.filter((c) => !enviadoNestaSemana(ultimoEnvio[c.id])).map((c) => c.id)),
  );
  const [estados, setEstados] = useState<Record<string, { estado: Estado; erro?: string }>>({});
  const [fase, setFase] = useState<'preparo' | 'enviando' | 'fim'>('preparo');

  function alternar(id: string) {
    setMarcados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function disparar() {
    const fila = aptos.filter((c) => marcados.has(c.id));
    if (!confirm(`Enviar o CS de sexta agora para ${fila.length} grupo(s)?`)) return;
    setFase('enviando');
    setEstados(Object.fromEntries(fila.map((c) => [c.id, { estado: 'aguardando' as Estado }])));
    for (const [i, c] of fila.entries()) {
      setEstados((e) => ({ ...e, [c.id]: { estado: 'enviando' } }));
      try {
        await enviarCs(c.id, 'semanal', montarMensagem(modelo, linkCs(links[c.id])));
        setEstados((e) => ({ ...e, [c.id]: { estado: 'ok' } }));
      } catch (err) {
        setEstados((e) => ({ ...e, [c.id]: { estado: 'erro', erro: (err as Error).message } }));
      }
      if (i < fila.length - 1) await new Promise((r) => setTimeout(r, INTERVALO_MS));
    }
    void invalidarEnvios();
    setFase('fim');
  }

  const total = Object.keys(estados).length;
  const ok = Object.values(estados).filter((e) => e.estado === 'ok').length;
  const erros = Object.values(estados).filter((e) => e.estado === 'erro').length;

  return (
    <Modal open onClose={fase === 'enviando' ? () => undefined : onClose} title="Disparar CS de sexta" size="lg">
      <div className="space-y-3">
        {fase === 'preparo' && (
          <>
            <Textarea
              id="cs-modelo"
              label={`Mensagem (o trecho ${MARCADOR_LINK} vira o link de cada cliente)`}
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              rows={8}
            />
            {modelo.trim() !== msgPadrao.trim() && (
              <button
                onClick={() => salvarConfig.mutate({ msg_semanal: modelo.trim() })}
                disabled={salvarConfig.isPending || !modelo.trim()}
                className="text-xs text-brand-300 hover:underline"
              >
                Salvar este texto como mensagem padrão
              </button>
            )}
          </>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {fase === 'preparo'
              ? `${marcados.size} de ${aptos.length} cliente(s) selecionado(s)`
              : `${ok} de ${total} enviado(s)${erros ? ` · ${erros} com erro` : ''}`}
          </span>
          {fase === 'preparo' && (
            <span className="flex gap-3">
              <button onClick={() => setMarcados(new Set(aptos.map((c) => c.id)))} className="text-brand-300 hover:underline">Marcar todos</button>
              <button onClick={() => setMarcados(new Set())} className="text-brand-300 hover:underline">Desmarcar</button>
            </span>
          )}
        </div>

        <ul className="max-h-[38vh] divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10">
          {aptos.filter((c) => fase === 'preparo' || estados[c.id]).map((c) => {
            const st = estados[c.id];
            return (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                {fase === 'preparo' && (
                  <input type="checkbox" checked={marcados.has(c.id)} onChange={() => alternar(c.id)} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-slate-100">{c.nome}</div>
                  <div className="truncate text-[11px] text-slate-500">
                    {nomeGrupo(c.whatsapp_chat_id) ?? c.whatsapp_chat_id}
                    {st?.erro && <span className="text-red-300"> · {st.erro}</span>}
                  </div>
                </div>
                {fase === 'preparo' && enviadoNestaSemana(ultimoEnvio[c.id]) && (
                  <Badge tone="amber">Já enviado em {dataCurta(ultimoEnvio[c.id])}</Badge>
                )}
                {st?.estado === 'aguardando' && <Badge tone="slate">Na fila</Badge>}
                {st?.estado === 'enviando' && <Badge tone="blue">Enviando…</Badge>}
                {st?.estado === 'ok' && <Badge tone="green">Enviado</Badge>}
                {st?.estado === 'erro' && <Badge tone="red">Erro</Badge>}
              </li>
            );
          })}
          {aptos.length === 0 && <li className="p-6 text-center text-xs text-slate-500">Nenhum cliente com grupo vinculado.</li>}
        </ul>

        {fase === 'preparo' && semGrupo.length > 0 && (
          <p className="text-[11px] text-amber-300">
            Sem grupo vinculado (não recebem): {semGrupo.map((c) => c.nome).join(', ')}.
          </p>
        )}
        {fase === 'enviando' && (
          <p className="text-xs text-slate-400">Enviando com uma pequena pausa entre os grupos. Não feche esta janela.</p>
        )}

        <div className="flex justify-end gap-2">
          {fase === 'preparo' && (
            <>
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => void disparar()} disabled={marcados.size === 0 || !modelo.trim()}>
                Enviar para {marcados.size} grupo(s)
              </Button>
            </>
          )}
          {fase === 'fim' && <Button onClick={onClose}>Fechar</Button>}
        </div>
      </div>
    </Modal>
  );
}
