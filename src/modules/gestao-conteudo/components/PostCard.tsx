import { useState } from 'react';
import { Badge } from '@/shared/ui/Badge';
import { ETAPAS, ETAPA_INFO, driveInfo, type Etapa, type Post } from '@/modules/gestao-conteudo/types';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { miniaturaDrive, useArquivosPasta } from './CarrosselPasta';

interface Props {
  post: Post;
  /** Mostra o nome do cliente (agenda da semana). */
  clienteNome?: string;
  selecionado?: boolean;
  onSelecionar?: () => void;
  onEtapa: (e: Etapa) => void;
  onPrevia: () => void;
  onEditar?: () => void;
  onExcluir?: () => void;
  /** Aprovação em conjunto: quantos já aprovaram e quem falta. */
  aprovacoes?: { feitos: number; total: number; faltam: string[] };
}

export function PostCard({
  post, clienteNome, selecionado = false, onSelecionar, onEtapa, onPrevia, onEditar, onExcluir, aprovacoes,
}: Props) {
  const info = driveInfo(post.link_drive);
  const pasta = useArquivosPasta(info.tipo === 'pasta' ? info.id : undefined);
  const capa = info.tipo === 'pasta' ? pasta.data?.[0] : undefined;
  const etapa = ETAPA_INFO[post.etapa];
  const [thumbOk, setThumbOk] = useState(true);

  return (
    <div className={`rounded-lg border p-2 text-xs ${
      selecionado ? 'border-brand-400/60 bg-brand-500/10' : 'border-white/10 bg-white/[0.03]'}`}
    >
      <div className="flex items-start gap-2">
        {onSelecionar && (
          <input type="checkbox" checked={selecionado} onChange={onSelecionar} className="mt-0.5" aria-label="Selecionar" />
        )}
        <div className="min-w-0 flex-1">
          {clienteNome && <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-brand-300">{clienteNome}</p>}
          <p className="font-medium text-slate-100">{post.titulo}</p>
          <p className="text-[10px] text-slate-500">
            {post.formato}
            {post.dia_postagem && ` · ${new Date(post.dia_postagem + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
            {post.lembretes_enviados > 0 && ` · lembrete ${post.lembretes_enviados}x`}
          </p>
        </div>
        {capa && (
          <button onClick={onPrevia} className="relative shrink-0" title="Ver carrossel">
            <img src={miniaturaDrive(capa.id, 200)} alt="" className="h-12 w-12 rounded-md object-cover" loading="lazy" />
            <span className="absolute -bottom-1 -right-1 rounded bg-black/70 px-1 text-[9px] text-white">{pasta.data?.length}</span>
          </button>
        )}
        {info.tipo === 'arquivo' && thumbOk && info.thumbUrl && (
          <button onClick={onPrevia} className="shrink-0" title="Ver prévia">
            <img src={info.thumbUrl} alt="" onError={() => setThumbOk(false)}
              className="h-12 w-12 rounded-md object-cover" loading="lazy" />
          </button>
        )}
      </div>

      {post.etapa === 'reprovado' && post.justificativa && (
        <p className="mt-1.5 rounded bg-red-500/10 p-1.5 text-[11px] text-red-300">
          <strong>Alteração pedida:</strong> {post.justificativa}
        </p>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <select
          value={post.etapa}
          onChange={(e) => onEtapa(e.target.value as Etapa)}
          aria-label="Etapa"
          className="glass-field min-w-0 flex-1 px-1.5 py-1 text-[11px] [&>option]:bg-slate-900 [&>option]:text-slate-100"
        >
          {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        {post.link_drive && (
          <button onClick={onPrevia} className="rounded px-1.5 py-1 text-slate-300 hover:bg-white/10" title="Prévia"><GlassIcon name="eye" /></button>
        )}
        {onEditar && (
          <button onClick={onEditar} className="rounded px-1.5 py-1 text-slate-300 hover:bg-white/10" title="Editar"><GlassIcon name="pencil" /></button>
        )}
        {onExcluir && (
          <button onClick={onExcluir} className="rounded px-1.5 py-1 text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Excluir"><GlassIcon name="trash" /></button>
        )}
      </div>
      {aprovacoes && aprovacoes.total >= 2 && post.etapa === 'enviado' && (
        <p
          className="mt-1.5 rounded bg-amber-500/10 p-1.5 text-[11px] text-amber-200"
          title={aprovacoes.faltam.length ? `Faltam: ${aprovacoes.faltam.join(', ')}` : undefined}
        >
          Aprovações: <strong>{aprovacoes.feitos}/{aprovacoes.total}</strong>
          {aprovacoes.faltam.length > 0 && ` · faltam ${aprovacoes.faltam.join(', ')}`}
        </p>
      )}
      <div className="mt-1"><Badge tone={etapa.tone}><GlassIcon emoji={etapa.emoji} /> {etapa.label}</Badge></div>
    </div>
  );
}
