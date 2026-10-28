import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import {
  useDuplicarConjunto, useSalvarStoryIdeia, useSalvarStorySettings, useStoryIdeias, useStorySettings,
} from '@/modules/stories/api/storiesApi';
import { StoryView } from '@/modules/stories/components/StoryCard';
import {
  STICKER_LABEL, STORY_STEPS, configPadrao, ideiaVazia,
} from '@/modules/stories/types';
import type {
  StickerType, StoryClientSettings, StoryFont, StoryIdea, StoryIdeaDraft, StoryStep,
} from '@/modules/stories/types';

interface ClienteOpt { id: string; nome: string }

const opt = (v: string | null | undefined) => v ?? '';
const vazioNull = (v: string) => (v.trim() ? v : null);

export function StoriesAdmin({ clientes }: { clientes: ClienteOpt[] }) {
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '');
  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';
  const { data: ideias, isLoading } = useStoryIdeias(clienteId);
  const { data: todasConfig } = useStorySettings();
  const salvar = useSalvarStoryIdeia();
  const config = useMemo(
    () => todasConfig?.find((s) => s.client_id === clienteId) ?? configPadrao(clienteId, clienteNome),
    [todasConfig, clienteId, clienteNome],
  );
  const [form, setForm] = useState<{ ideia?: StoryIdea; dados: StoryIdeaDraft } | null>(null);
  const [copiarAberto, setCopiarAberto] = useState(false);

  function duplicar(i: StoryIdea) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, client_id, created_at, sort_order, ...resto } = i;
    salvar.mutate({ clientId: clienteId, dados: { ...resto, title: `${i.title} (cópia)` } });
  }

  function alternar(i: StoryIdea) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, client_id, created_at, sort_order, ...resto } = i;
    salvar.mutate({ id: i.id, clientId: clienteId, dados: { ...resto, active: !i.active } });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <Select label="Cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} options={clientes.map((c) => ({ value: c.id, label: c.nome }))} />
        </div>
        <Button onClick={() => setForm({ dados: ideiaVazia() })}>Nova ideia</Button>
        <Button variant="secondary" onClick={() => setCopiarAberto(true)} disabled={!ideias?.length}>Duplicar conjunto para outro cliente</Button>
      </div>

      <ConfigForm key={clienteId} config={config} />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !ideias?.length ? (
          <EmptyState message="Este cliente ainda não tem ideias. Crie a primeira ou duplique o conjunto de outro cliente." />
        ) : (
          <ul className="divide-y divide-white/10">
            {ideias.map((i) => (
              <li key={i.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i.active ? '' : 'opacity-60'}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">{i.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    <Badge tone="blue">{STORY_STEPS.find((s) => s.id === i.step)?.label}</Badge>
                    <Badge tone="slate">{STICKER_LABEL[i.sticker_type]}</Badge>
                    {!i.active && <Badge tone="slate">Desativada</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" className="px-3 py-1.5" onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, client_id, created_at, sort_order, ...dados } = i;
                    setForm({ ideia: i, dados });
                  }}>Editar</Button>
                  <Button variant="secondary" className="px-3 py-1.5" onClick={() => duplicar(i)} disabled={salvar.isPending}>Duplicar</Button>
                  <Button variant="secondary" className="px-3 py-1.5" onClick={() => alternar(i)} disabled={salvar.isPending}>{i.active ? 'Desativar' : 'Ativar'}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {form && (
        <IdeiaForm
          key={form.ideia?.id ?? 'nova'}
          inicial={form.dados}
          editando={Boolean(form.ideia)}
          config={config}
          salvando={salvar.isPending}
          onClose={() => setForm(null)}
          onSalvar={(dados) => salvar.mutate({ id: form.ideia?.id, clientId: clienteId, dados }, { onSuccess: () => setForm(null) })}
        />
      )}

      {copiarAberto && (
        <CopiarConjunto clientes={clientes} origem={clienteId} onClose={() => setCopiarAberto(false)} />
      )}
    </div>
  );
}

function ConfigForm({ config }: { config: StoryClientSettings }) {
  const [c, setC] = useState(config);
  const [ok, setOk] = useState(false);
  const salvar = useSalvarStorySettings();
  useEffect(() => setC(config), [config]);
  const set = <K extends keyof StoryClientSettings>(k: K, v: StoryClientSettings[K]) => { setOk(false); setC((s) => ({ ...s, [k]: v })); };

  const cor = (label: string, k: 'accent_color' | 'accent_text_color' | 'bg_from' | 'bg_to') => (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">{label}
      <input type="color" value={c[k]} onChange={(e) => set(k, e.target.value)} className="h-9 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent p-0.5" />
    </label>
  );

  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-base font-semibold text-white">Visual e regras do cliente</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Nome" value={c.display_name} onChange={(e) => set('display_name', e.target.value)} />
        <Input label="@ do Instagram (sem @)" value={c.instagram_handle} onChange={(e) => set('instagram_handle', e.target.value)} />
        <Input label="Iniciais" maxLength={3} value={c.initials} onChange={(e) => set('initials', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cor('Cor de destaque', 'accent_color')}
        {cor('Texto do botão', 'accent_text_color')}
        {cor('Fundo, cor 1', 'bg_from')}
        {cor('Fundo, cor 2', 'bg_to')}
        <Select label="Fonte" value={c.font_family} onChange={(e) => set('font_family', e.target.value as StoryFont)} options={[{ value: 'poppins', label: 'Poppins' }, { value: 'montserrat', label: 'Montserrat' }]} />
      </div>
      <Textarea label="Regras do cliente (uma por linha)" value={c.rules} onChange={(e) => set('rules', e.target.value)} semLinks />
      <div className="flex items-center gap-3">
        <Button disabled={salvar.isPending || !c.client_id} onClick={() => salvar.mutate(c, { onSuccess: () => setOk(true) })}>Salvar visual e regras</Button>
        {ok && <span role="status" className="text-sm text-emerald-400">Salvo</span>}
        {salvar.isError && <span role="alert" className="text-sm text-red-400">Não foi possível salvar.</span>}
      </div>
    </Card>
  );
}

function IdeiaForm({ inicial, editando, config, salvando, onClose, onSalvar }: {
  inicial: StoryIdeaDraft; editando: boolean; config: StoryClientSettings; salvando: boolean;
  onClose: () => void; onSalvar: (d: StoryIdeaDraft) => void;
}) {
  const [d, setD] = useState(inicial);
  const set = <K extends keyof StoryIdeaDraft>(k: K, v: StoryIdeaDraft[K]) => setD((s) => ({ ...s, [k]: v }));
  const sd = (patch: Partial<StoryIdeaDraft['sticker_data']>) => setD((s) => ({ ...s, sticker_data: { ...s.sticker_data, ...patch } }));
  const t = d.sticker_type;
  const valido = d.title.trim() && d.headline.trim();

  return (
    <Modal
      open
      onClose={onClose}
      fecharSoPorBotao
      size="2xl"
      title={editando ? 'Editar ideia de Story' : 'Nova ideia de Story'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!valido || salvando} onClick={() => onSalvar({
          ...d,
          price_pre: d.price_value ? vazioNull(opt(d.price_pre)) : null,
          price_post: d.price_value ? vazioNull(opt(d.price_post)) : null,
          price_value: vazioNull(opt(d.price_value)),
        })}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </>}
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Título da ideia" value={d.title} onChange={(e) => set('title', e.target.value)} />
            <Select label="Etapa" value={d.step} onChange={(e) => set('step', e.target.value as StoryStep)} options={STORY_STEPS.map((s) => ({ value: s.id, label: `${s.n} ${s.label}` }))} />
          </div>
          <Input label="Foto sugerida" value={d.photo_hint} onChange={(e) => set('photo_hint', e.target.value)} />
          <Textarea label="Headline" value={d.headline} onChange={(e) => set('headline', e.target.value)} className="!min-h-[56px]" semLinks />
          <Textarea label="Subtexto" value={d.subtext} onChange={(e) => set('subtext', e.target.value)} className="!min-h-[56px]" semLinks />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Antes do preço" value={opt(d.price_pre)} onChange={(e) => set('price_pre', e.target.value)} />
            <Input label="Preço" value={opt(d.price_value)} onChange={(e) => set('price_value', e.target.value)} />
            <Input label="Condição" value={opt(d.price_post)} onChange={(e) => set('price_post', e.target.value)} />
          </div>
          <Select
            label="Sticker"
            value={t}
            onChange={(e) => set('sticker_type', e.target.value as StickerType)}
            options={(Object.keys(STICKER_LABEL) as StickerType[]).map((k) => ({ value: k, label: STICKER_LABEL[k] }))}
          />
          {t === 'poll' && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Pergunta" value={opt(d.sticker_data.q)} onChange={(e) => sd({ q: e.target.value })} />
              <Input label="Opção A" value={opt(d.sticker_data.a)} onChange={(e) => sd({ a: e.target.value })} />
              <Input label="Opção B" value={opt(d.sticker_data.b)} onChange={(e) => sd({ b: e.target.value })} />
            </div>
          )}
          {t === 'question' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Título da caixinha" value={opt(d.sticker_data.q)} onChange={(e) => sd({ q: e.target.value })} />
              <Input label="Texto de exemplo" value={opt(d.sticker_data.ph)} onChange={(e) => sd({ ph: e.target.value })} />
            </div>
          )}
          {t === 'quiz' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Pergunta" value={opt(d.sticker_data.q)} onChange={(e) => sd({ q: e.target.value })} />
              <Textarea label="Opções (uma por linha)" value={(d.sticker_data.opts ?? []).join('\n')} onChange={(e) => sd({ opts: e.target.value.split('\n') })} className="!min-h-[60px]" semLinks />
            </div>
          )}
          {t === 'countdown' && <Input label="Texto da contagem" value={opt(d.sticker_data.label)} onChange={(e) => sd({ label: e.target.value })} />}
          {t === 'button' && (
            <div className="space-y-2">
              <Input label="Texto do botão" value={opt(d.sticker_data.label)} onChange={(e) => sd({ label: e.target.value })} />
              <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={Boolean(d.sticker_data.wa)} onChange={(e) => sd({ wa: e.target.checked })} />Mostrar ícone de WhatsApp</label>
              <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={Boolean(d.sticker_data.min)} onChange={(e) => sd({ min: e.target.checked })} />Botão minimalista</label>
            </div>
          )}
          <Textarea label="Por que funciona" value={d.tip} onChange={(e) => set('tip', e.target.value)} className="!min-h-[64px]" semLinks />
          <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={d.show_logo} onChange={(e) => set('show_logo', e.target.checked)} />Mostrar logo no Story</label>
          <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={d.active} onChange={(e) => set('active', e.target.checked)} />Ideia ativa (visível para o cliente)</label>
        </div>
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Prévia</div>
          <div className="st-phone mx-auto w-full max-w-[240px]"><StoryView conteudo={d} config={config} /></div>
        </div>
      </div>
    </Modal>
  );
}

function CopiarConjunto({ clientes, origem, onClose }: { clientes: ClienteOpt[]; origem: string; onClose: () => void }) {
  const destinos = clientes.filter((c) => c.id !== origem);
  const [destino, setDestino] = useState(destinos[0]?.id ?? '');
  const { data: todasConfig } = useStorySettings();
  const copiar = useDuplicarConjunto();
  const [feito, setFeito] = useState<number | null>(null);
  const nomeOrigem = clientes.find((c) => c.id === origem)?.nome;
  const nomeDestino = clientes.find((c) => c.id === destino);

  function confirmar() {
    if (!nomeDestino) return;
    const semConfig = !todasConfig?.some((s) => s.client_id === destino);
    copiar.mutate(
      { origem, destino, configDestino: semConfig ? configPadrao(destino, nomeDestino.nome) : null },
      { onSuccess: (n) => setFeito(n) },
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Duplicar conjunto de ideias"
      footer={feito === null ? <>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!destino || copiar.isPending} onClick={confirmar}>{copiar.isPending ? 'Copiando...' : 'Duplicar'}</Button>
      </> : <Button onClick={onClose}>Fechar</Button>}
    >
      {feito === null ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">Copia todas as ideias de {nomeOrigem} para o cliente escolhido. As ideias já existentes do destino são mantidas.</p>
          <Select label="Cliente de destino" value={destino} onChange={(e) => setDestino(e.target.value)} options={destinos.map((c) => ({ value: c.id, label: c.nome }))} />
          <p className="text-xs text-slate-400">Se o destino ainda não tiver cores e regras, será criado um visual padrão para você ajustar depois.</p>
          {copiar.isError && <p role="alert" className="text-sm text-red-400">Não foi possível duplicar.</p>}
        </div>
      ) : (
        <p role="status" className="text-sm text-emerald-400">{feito} ideias copiadas para {nomeDestino?.nome}.</p>
      )}
    </Modal>
  );
}
