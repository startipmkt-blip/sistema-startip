import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useStoryIdeias, useStorySettings } from '@/modules/stories/api/storiesApi';
import { StoryCard, StoryView } from '@/modules/stories/components/StoryCard';
import { StoryEditor } from '@/modules/stories/components/StoryEditor';
import { STORY_STEPS, configPadrao, regrasDe, textoDoStory } from '@/modules/stories/types';
import type { StoryIdea, StoryStep } from '@/modules/stories/types';

export const AVISO_EXEMPLO = 'Exemplo ilustrativo. Troque a foto, os valores e as condições pelos reais antes de postar.';

interface ClienteOpt { id: string; nome: string }

interface Props {
  clientes: ClienteOpt[];
  /** Cliente final: perfil fixo, sem seletor. */
  clienteFixo?: string;
}

const pill = (ativo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
    ativo ? 'border-transparent bg-gradient-brand text-white shadow-glow' : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
  }`;

export function StoriesView({ clientes, clienteFixo }: Props) {
  const [clienteSel, setClienteSel] = useState(clienteFixo ?? clientes[0]?.id ?? '');
  const clienteId = clienteFixo ?? clienteSel;
  const [etapa, setEtapa] = useState<'all' | StoryStep>('all');
  const [modo, setModo] = useState<'banco' | 'seq'>('banco');
  const [aberta, setAberta] = useState<StoryIdea | null>(null);
  const [editando, setEditando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const { data: ideias, isLoading } = useStoryIdeias(clienteId);
  const { data: todasConfig } = useStorySettings();
  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';
  const config = useMemo(
    () => todasConfig?.find((s) => s.client_id === clienteId) ?? configPadrao(clienteId, clienteNome),
    [todasConfig, clienteId, clienteNome],
  );
  const ativas = useMemo(() => (ideias ?? []).filter((i) => i.active), [ideias]);

  const sequencia = useMemo(() => STORY_STEPS.map((s) => {
    const doPasso = ativas.filter((i) => i.step === s.id);
    return s.id === 'oferta' ? doPasso[doPasso.length - 1] : doPasso[0];
  }).filter((i): i is StoryIdea => Boolean(i)), [ativas]);

  const filtradas = ativas.filter((i) => etapa === 'all' || i.step === etapa);
  const regras = regrasDe(config);

  function abrir(i: StoryIdea) { setAberta(i); setEditando(false); setCopiado(false); }
  function fechar() { setAberta(null); setEditando(false); }

  async function copiar(i: StoryIdea) {
    try {
      await navigator.clipboard.writeText(textoDoStory(i));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1400);
    } catch {
      window.prompt('Copie o texto abaixo:', textoDoStory(i));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        {!clienteFixo && (
          <div className="min-w-[220px]">
            <Select
              label="Cliente"
              value={clienteSel}
              onChange={(e) => { setClienteSel(e.target.value); setEtapa('all'); }}
              options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
            />
          </div>
        )}
        <div role="group" aria-label="Modo de visualização" className="inline-flex overflow-hidden rounded-xl border border-white/15">
          {(['banco', 'seq'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={modo === m}
              onClick={() => setModo(m)}
              className={`px-3.5 py-2 text-sm font-semibold ${modo === m ? 'bg-gradient-brand text-white' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
            >
              {m === 'banco' ? 'Banco de ideias' : 'Ver como sequência'}
            </button>
          ))}
        </div>
      </div>

      {modo === 'banco' && (
        <div role="group" aria-label="Etapa da jornada" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={etapa === 'all'} className={pill(etapa === 'all')} onClick={() => setEtapa('all')}>Todas as etapas</button>
          {STORY_STEPS.map((s) => (
            <button key={s.id} type="button" aria-pressed={etapa === s.id} className={pill(etapa === s.id)} onClick={() => setEtapa(s.id)}>
              {s.n} {s.label}
            </button>
          ))}
        </div>
      )}

      <Card className="grid gap-4 p-4 text-sm sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Identidade de {config.display_name}</div>
          <div className="text-slate-300">Cores do perfil</div>
          <div className="mt-1.5 flex gap-1.5">
            {[config.accent_color, config.accent_text_color, config.bg_from, config.bg_to].map((c, k) => (
              <span key={k} title={c} className="h-6 w-6 rounded-md border border-white/20" style={{ background: c }} />
            ))}
          </div>
          <div className="mt-2 text-slate-400">Fonte: {config.font_family === 'montserrat' ? 'Montserrat' : 'Poppins'}</div>
        </div>
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Regras que valem para todas as ideias</div>
          {regras.length ? (
            <ul className="space-y-1 text-slate-200">{regras.map((r, k) => <li key={k}>• {r}</li>)}</ul>
          ) : <p className="text-slate-400">Nenhuma regra cadastrada ainda.</p>}
        </div>
      </Card>

      <p className="text-xs text-slate-400">{AVISO_EXEMPLO}</p>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : modo === 'seq' ? (
        sequencia.length ? (
          <div>
            <p className="mb-3 text-sm text-slate-400">
              Exemplo de sequência de {sequencia.length} Stories no mesmo dia: participar, conhecer, confiar e só então ver a oferta. Role para o lado.
            </p>
            <div className="st-seq">
              {sequencia.map((i, k) => (
                <StoryCard key={i.id} titulo={i.title} conteudo={i} config={config} indice={k} total={sequencia.length} onAbrir={() => abrir(i)} />
              ))}
            </div>
          </div>
        ) : <Card><EmptyState message="Ainda não há ideias cadastradas para este cliente." /></Card>
      ) : filtradas.length ? (
        <div className="st-grid">
          {filtradas.map((i) => (
            <StoryCard key={i.id} titulo={i.title} conteudo={i} config={config} onAbrir={() => abrir(i)} />
          ))}
        </div>
      ) : (
        <Card><EmptyState message={ativas.length ? 'Ainda não há ideias nesta etapa.' : 'Ainda não há ideias cadastradas para este cliente.'} /></Card>
      )}

      <Modal
        open={Boolean(aberta)}
        onClose={fechar}
        title={editando ? 'Editar com minha foto' : aberta?.title ?? ''}
        size={editando ? '2xl' : 'xl'}
      >
        {aberta && (editando ? (
          <StoryEditor ideia={aberta} config={config} onVoltar={() => setEditando(false)} />
        ) : (
          <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
            <div className="st-phone mx-auto w-full max-w-[260px] md:max-w-none"><StoryView conteudo={aberta} config={config} /></div>
            <div className="flex min-w-0 flex-col gap-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {STORY_STEPS.find((s) => s.id === aberta.step)?.n}. {STORY_STEPS.find((s) => s.id === aberta.step)?.label} · {config.display_name}
              </div>
              <Bloco titulo="Por que funciona">{aberta.tip}</Bloco>
              <Bloco titulo="Foto sugerida">{aberta.photo_hint}</Bloco>
              <Bloco titulo="Texto do Story"><span className="whitespace-pre-line">{textoDoStory(aberta)}</span></Bloco>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setEditando(true)}>Editar com minha foto</Button>
                <Button variant="secondary" onClick={() => void copiar(aberta)}>{copiado ? 'Copiado' : 'Copiar texto'}</Button>
              </div>
              <p className="text-xs text-slate-400">{AVISO_EXEMPLO}</p>
            </div>
          </div>
        ))}
      </Modal>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-xs font-bold uppercase tracking-widest text-slate-400">{titulo}</div>
      <div className="text-sm text-slate-100">{children}</div>
    </div>
  );
}
