import { AnexosCriativo } from '@/modules/ideias/criativos/components/AnexosCriativo';
import { descartarAnexo, urlParaBaixar, useUrlAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import { GravadorAudio } from './GravadorAudio';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface Props {
  anexos: CriativoAnexo[];
  onChange: (anexos: CriativoAnexo[]) => void;
  /** Paths enviados nesta sessão do formulário (apagados se removidos/cancelados). */
  novos: string[];
  onNovos: (paths: string[]) => void;
}

export const ehAudio = (a: CriativoAnexo) => a.type.startsWith('audio/');

function AudioItem({ anexo, onRemover }: { anexo: CriativoAnexo; onRemover: () => void }) {
  const { data: url } = useUrlAnexo(anexo.path);
  return (
    <li className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2">
      <span className="text-lg"><GlassIcon name="mic" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] text-slate-400">{anexo.name}</p>
        {url ? <audio controls src={url} className="h-8 w-full" /> : <p className="text-[11px] text-slate-500">carregando…</p>}
      </div>
      <button
        type="button"
        onClick={() => void urlParaBaixar(anexo).then((u) => window.open(u, '_blank', 'noopener'))}
        className="rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
        title="Baixar áudio"
      >
        <GlassIcon name="download" /> Baixar
      </button>
      <button
        type="button"
        onClick={onRemover}
        className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
        title="Remover áudio"
      >
        <GlassIcon name="x" />
      </button>
    </li>
  );
}

// Referências (imagem/PDF) e áudios de briefing da demanda. Tudo vai na mesma lista `anexos`.
export function AnexosDemanda({ anexos, onChange, novos, onNovos }: Props) {
  const audios = anexos.filter(ehAudio);
  const arquivos = anexos.filter((a) => !ehAudio(a));

  async function removerAudio(a: CriativoAnexo) {
    onChange(anexos.filter((x) => x.path !== a.path));
    if (novos.includes(a.path)) {
      await descartarAnexo(a.path);
      onNovos(novos.filter((p) => p !== a.path));
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-medium text-slate-300"><GlassIcon name="mic" /> Briefing em áudio</p>
        <GravadorAudio
          onGravado={(a) => {
            onChange([...anexos, a]);
            onNovos([...novos, a.path]);
          }}
        />
        {audios.length > 0 && (
          <ul className="mt-2 space-y-2">
            {audios.map((a) => (
              <AudioItem key={a.path} anexo={a} onRemover={() => void removerAudio(a)} />
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-slate-300"><GlassIcon name="paperclip" /> Referências (imagens ou PDF)</p>
        <AnexosCriativo
          anexos={arquivos}
          onChange={(novosArquivos) => onChange([...audios, ...novosArquivos])}
          novos={novos}
          onNovos={onNovos}
        />
      </div>
    </div>
  );
}
