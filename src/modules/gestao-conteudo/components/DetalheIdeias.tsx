import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import {
  linkAprovacaoIdeias, useEnviarIdeias, useExcluirIdeia, useLembrarIdeias, useRecolherIdeia,
} from '@/modules/gestao-conteudo/api/ideiasApi';
import {
  STATUS_IDEIA, STATUS_IDEIA_ORDEM, mesLabel, type Ideia, type StatusIdeia,
} from '@/modules/gestao-conteudo/types';
import { semanasRotuladas } from '@/modules/gestao-conteudo/lib/semanas';
import type { ClienteGestao } from '@/modules/gestao-conteudo/utils';
import { IdeiaFormModal } from './IdeiaFormModal';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';
import { Linkify } from '@/shared/ui/Linkify';
import { useBancoIdeias } from '@/modules/gestao-conteudo/api/bancoIdeiasApi';
import { BancoIdeias } from './BancoIdeias';

interface Props {
  cliente: ClienteGestao;
  mes: string;
  ideias: Ideia[];
}

const FORMATO_LABEL: Record<string, string> = {
  reels: 'Reels / Vídeo', carrossel: 'Carrossel', estatico: 'Estático',
};

/** Só rascunhos e reprovadas voltam para o cliente. */
const ENVIAVEL: StatusIdeia[] = ['rascunho', 'reprovada'];

function IdeiasDoMes({ cliente, mes, ideias }: Props) {
  const enviar = useEnviarIdeias();
  const lembrar = useLembrarIdeias();
  const excluir = useExcluirIdeia();
  const recolher = useRecolherIdeia();

  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Ideia | undefined>();
  const [semanaNova, setSemanaNova] = useState(1);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const semanas = useMemo(() => semanasRotuladas(mes), [mes]);
  const link = cliente.central_slug ? linkAprovacaoIdeias(cliente.central_slug, mes) : null;
  const aguardando = ideias.filter((i) => i.status === 'enviada');
  const enviaveis = ideias.filter((i) => ENVIAVEL.includes(i.status));
  const contagem = Object.fromEntries(
    STATUS_IDEIA_ORDEM.map((s) => [s, ideias.filter((i) => i.status === s).length]),
  ) as Record<StatusIdeia, number>;

  const ok = (texto: string) => setAviso({ tipo: 'ok', texto });
  const erro = (e: unknown) => setAviso({ tipo: 'erro', texto: (e as Error).message });

  function alternar(id: string) {
    setSelecionadas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function abrirNova(semana: number) {
    setEditando(undefined); setSemanaNova(semana); setFormAberto(true);
  }

  function enviarSelecionadas() {
    if (!confirm(`Enviar ${selecionadas.length} ideia(s) para aprovação no WhatsApp de ${cliente.nome}?`)) return;
    setAviso(null);
    enviar.mutate(
      { clienteId: cliente.id, clienteNome: cliente.nome, slug: cliente.central_slug, mes, ids: selecionadas },
      { onSuccess: () => { setSelecionadas([]); ok('Enviado! O cliente recebeu o link das ideias no WhatsApp.'); }, onError: erro },
    );
  }

  function lembrarAgora() {
    if (!confirm(`Reenviar o link das ideias para ${cliente.nome} (${aguardando.length} aguardando)?`)) return;
    setAviso(null);
    lembrar.mutate(
      { clienteId: cliente.id, clienteNome: cliente.nome, slug: cliente.central_slug, mes, ids: aguardando.map((i) => i.id) },
      { onSuccess: () => ok('Lembrete enviado ao cliente.'), onError: erro },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-white">{cliente.nome}</h2>
        <span className="text-xs text-slate-400">Ideias de {mesLabel(mes)}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={!link}
            onClick={() => { if (link) { void navigator.clipboard.writeText(link); ok('Link das ideias copiado.'); } }}
          >
            <GlassIcon name="link" /> Copiar link
          </Button>
          <Button
            variant="secondary"
            onClick={lembrarAgora}
            disabled={aguardando.length === 0 || lembrar.isPending || !cliente.whatsapp_chat_id}
            title={aguardando.length === 0 ? 'Nada aguardando o cliente' : undefined}
          >
            {glassify(lembrar.isPending ? 'Enviando…' : `⏰ Lembrar cliente (${aguardando.length})`)}
          </Button>
          <Button
            onClick={enviarSelecionadas}
            disabled={selecionadas.length === 0 || enviar.isPending || !cliente.whatsapp_chat_id}
            title={!cliente.whatsapp_chat_id ? 'Cliente sem WhatsApp cadastrado' : undefined}
          >
            {glassify(enviar.isPending ? 'Enviando…' : `📤 Enviar para aprovação (${selecionadas.length})`)}
          </Button>
          <Button onClick={() => abrirNova(1)}>+ Nova ideia</Button>
        </div>
      </div>

      {aviso && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${
          aviso.tipo === 'ok'
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/40 bg-red-500/10 text-red-300'}`}
        >
          {aviso.texto}
        </p>
      )}
      {!cliente.whatsapp_chat_id && (
        <p className="text-xs text-amber-300">
          <GlassIcon name="alert" /> Este cliente não tem WhatsApp cadastrado — envio e lembrete ficam desativados. Você ainda pode copiar o link.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_IDEIA_ORDEM.map((s) => (
          <Badge key={s} tone={STATUS_IDEIA[s].tone}>
            <GlassIcon emoji={STATUS_IDEIA[s].emoji} /> {contagem[s]} {STATUS_IDEIA[s].label}
          </Badge>
        ))}
        {enviaveis.length > 0 && (
          <button
            className="text-xs text-brand-300 hover:underline"
            onClick={() => setSelecionadas(enviaveis.map((i) => i.id))}
          >
            Selecionar todas as pendentes de envio ({enviaveis.length})
          </button>
        )}
        {selecionadas.length > 0 && (
          <button className="text-xs text-slate-400 hover:underline" onClick={() => setSelecionadas([])}>
            Limpar seleção
          </button>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {semanas.map((s) => {
          const daSemana = ideias.filter((i) => i.semana === s.numero);
          return (
            <section key={s.numero} className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
              <div className="mb-2 px-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">Semana {s.numero}</span>
                  <span className="text-[11px] text-slate-400">{daSemana.length}</span>
                </div>
                <p className="text-[11px] text-slate-400"><GlassIcon name="calendar" /> {s.periodo}</p>
              </div>
              <div className="space-y-2">
                {daSemana.map((i) => {
                  const st = STATUS_IDEIA[i.status];
                  const podeSelecionar = ENVIAVEL.includes(i.status);
                  const marcada = selecionadas.includes(i.id);
                  return (
                    <div
                      key={i.id}
                      className={`rounded-lg border p-2 text-xs ${
                        marcada ? 'border-brand-400/60 bg-brand-500/10' : 'border-white/10 bg-white/[0.03]'}`}
                    >
                      <div className="flex items-start gap-2">
                        {podeSelecionar && (
                          <input type="checkbox" checked={marcada} onChange={() => alternar(i.id)}
                            className="mt-0.5" aria-label="Selecionar ideia" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-100">{i.titulo}</p>
                          <p className="text-[10px] text-slate-500">
                            {FORMATO_LABEL[i.formato] ?? i.formato}
                            {i.dia_postagem && ` · postar ${new Date(`${i.dia_postagem}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                          </p>
                          {i.descricao && (
                            <p className="mt-1 line-clamp-3 whitespace-pre-line text-[11px] text-slate-300"><Linkify texto={i.descricao} /></p>
                          )}
                        </div>
                      </div>

                      {i.status === 'reprovada' && i.justificativa && (
                        <p className="mt-1.5 rounded bg-red-500/10 p-1.5 text-[11px] text-red-300">
                          <strong>O cliente pediu:</strong> {i.justificativa}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-1.5">
                        <Badge tone={st.tone}><GlassIcon emoji={st.emoji} /> {st.label}</Badge>
                        <span className="ml-auto" />
                        {i.status === 'enviada' && (
                          <button
                            onClick={() => recolher.mutate(i.id)}
                            className="rounded px-1.5 py-1 text-slate-300 hover:bg-white/10"
                            title="Recolher (volta para rascunho e some do portal)"
                          >
                            ↩
                          </button>
                        )}
                        <button
                          onClick={() => { setEditando(i); setFormAberto(true); }}
                          className="rounded px-1.5 py-1 text-slate-300 hover:bg-white/10" title="Editar"
                        >
                          <GlassIcon name="pencil" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Excluir "${i.titulo}"?`)) excluir.mutate(i.id); }}
                          className="rounded px-1.5 py-1 text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Excluir"
                        >
                          <GlassIcon name="trash" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button
                  className="w-full rounded-lg border border-dashed border-white/15 py-1.5 text-xs text-slate-400 hover:border-brand-400/50 hover:text-slate-200"
                  onClick={() => abrirNova(s.numero)}
                >
                  + adicionar ideia
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {ideias.length === 0 && (
        <Card className="p-6 text-center text-sm text-slate-400">
          Nenhuma ideia cadastrada para {mesLabel(mes)}. Use <strong>+ adicionar ideia</strong> numa das semanas.
        </Card>
      )}

      <IdeiaFormModal
        open={formAberto} onClose={() => setFormAberto(false)}
        clienteId={cliente.id} mes={mes} ideia={editando} semanaInicial={semanaNova}
      />
    </div>
  );
}

/** Duas sub-abas: ideias do mês (por semana) e o banco de ideias gerais do cliente. */
export function DetalheIdeias(props: Props) {
  const [sub, setSub] = useState<'mes' | 'banco'>('mes');
  const banco = useBancoIdeias(props.cliente.id);
  const livres = (banco.data ?? []).filter((i) => !i.usada_em).length;

  const aba = (id: 'mes' | 'banco', texto: string) => (
    <button
      type="button"
      onClick={() => setSub(id)}
      className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
        sub === id ? 'border-brand-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
    >
      {glassify(texto)}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-white/10">
        {aba('mes', `📅 Ideias de ${mesLabel(props.mes)}`)}
        {aba('banco', `💡 Banco de ideias (${livres})`)}
      </div>
      {sub === 'mes'
        ? <IdeiasDoMes {...props} />
        : <BancoIdeias clienteId={props.cliente.id} mes={props.mes} ideias={banco.data ?? []} carregando={banco.isLoading} />}
    </div>
  );
}
