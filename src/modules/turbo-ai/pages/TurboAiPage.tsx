import { useEffect, useState } from 'react';
import {
  useAiModulos, usePromptVersions, useSalvarVersao, useAtivarVersao, useApagarVersao,
  useAiTemplates, useSalvarTemplate, useApagarTemplate,
  type AiModuleKey,
} from '@/modules/turbo-ai/api/turboAiApi';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

export function TurboAiPage() {
  const { data: modulos, isLoading } = useAiModulos();
  const [key, setKey] = useState<AiModuleKey | null>(null);
  useEffect(() => { if (!key && modulos && modulos.length > 0) setKey(modulos[0].key); }, [modulos, key]);
  const [aba, setAba] = useState<'prompts' | 'templates'>('prompts');

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <header>
        <h1 className="text-xl font-semibold text-white">Turbo AI</h1>
        <p className="text-xs text-slate-400">
          Prompts versionados e biblioteca de modelos, por módulo. A execução (chamada ao LLM) usa a versão marcada como <strong>ativa</strong>.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Sidebar módulos */}
        <aside className="w-56 shrink-0 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-2">
          {isLoading ? <Spinner /> : (modulos ?? []).map((m) => (
            <button
              key={m.key}
              onClick={() => setKey(m.key)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                key === m.key ? 'bg-brand-500/15 text-brand-200' : 'text-slate-300 hover:bg-white/5'
              }`}
              title={m.descricao ?? ''}
            >
              {m.nome}
            </button>
          ))}
        </aside>

        {/* Área principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-1 rounded-md bg-white/5 p-1 w-fit">
            <button onClick={() => setAba('prompts')} className={`rounded px-3 py-1 text-xs ${aba === 'prompts' ? 'bg-brand-500 text-white' : 'text-slate-300'}`}>Prompts</button>
            <button onClick={() => setAba('templates')} className={`rounded px-3 py-1 text-xs ${aba === 'templates' ? 'bg-brand-500 text-white' : 'text-slate-300'}`}>Modelos</button>
          </div>
          {key && aba === 'prompts' && <PromptsPanel moduleKey={key} />}
          {key && aba === 'templates' && <TemplatesPanel moduleKey={key} />}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
function PromptsPanel({ moduleKey }: { moduleKey: AiModuleKey }) {
  const { data: versoes, isLoading } = usePromptVersions(moduleKey);
  const salvar = useSalvarVersao();
  const ativar = useAtivarVersao();
  const apagar = useApagarVersao();
  const [texto, setTexto] = useState('');

  const ativa = versoes?.find((v) => v.is_active) ?? null;
  useEffect(() => { setTexto(ativa?.prompt_body ?? ''); }, [ativa?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-0 flex-1 gap-3">
      {/* Editor */}
      <Card className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-100">Prompt do módulo</h2>
          {ativa && <Badge tone="green">v ativa</Badge>}
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={20}
          className="w-full flex-1 resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-100 focus:border-brand-400 focus:outline-none"
          placeholder="Descreva o comportamento esperado do modelo, formato, restrições, exemplos…"
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setTexto(ativa?.prompt_body ?? '')}>Descartar edições</Button>
          <Button
            onClick={async () => {
              const v = await salvar.mutateAsync({ moduleKey, prompt_body: texto });
              await ativar.mutateAsync({ moduleKey, versionId: v.id });
            }}
            disabled={salvar.isPending || !texto.trim()}
          >
            {salvar.isPending ? 'Salvando…' : 'Salvar nova versão + ativar'}
          </Button>
        </div>
      </Card>

      {/* Histórico */}
      <Card className="w-72 shrink-0 overflow-y-auto p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Histórico</h3>
        {isLoading ? <Spinner /> : !versoes || versoes.length === 0 ? (
          <EmptyState message="Nenhuma versão salva ainda." />
        ) : (
          <ul className="space-y-1">
            {versoes.map((v) => (
              <li key={v.id} className={`rounded-md border p-2 text-xs ${v.is_active ? 'border-brand-400/40 bg-brand-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-slate-300">{new Date(v.created_at).toLocaleString('pt-BR')}</span>
                  {v.is_active && <Badge tone="green">ativa</Badge>}
                </div>
                <div className="mb-2 text-[11px] text-slate-400">{v.tag ?? '—'}</div>
                <div className="line-clamp-3 text-[11px] text-slate-300">{v.prompt_body}</div>
                <div className="mt-2 flex justify-end gap-1">
                  <button onClick={() => setTexto(v.prompt_body)} className="rounded px-1.5 text-[11px] text-brand-300 hover:bg-white/5">carregar</button>
                  {!v.is_active && <button onClick={() => ativar.mutate({ moduleKey, versionId: v.id })} className="rounded px-1.5 text-[11px] text-emerald-300 hover:bg-white/5">ativar</button>}
                  <button onClick={() => { if (confirm('Apagar esta versão?')) apagar.mutate({ moduleKey, versionId: v.id }); }} className="rounded px-1.5 text-[11px] text-red-300 hover:bg-white/5">apagar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------
function TemplatesPanel({ moduleKey }: { moduleKey: AiModuleKey }) {
  const { data: templates, isLoading } = useAiTemplates(moduleKey);
  const salvar = useSalvarTemplate();
  const apagar = useApagarTemplate();
  const [novoNome, setNovoNome] = useState('');
  const [novoBody, setNovoBody] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editBody, setEditBody] = useState('');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">+ Novo modelo</h2>
        <div className="space-y-2">
          <Input id="tm-nome" label="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Resposta 5⭐ padrão" />
          <label className="block text-xs text-slate-300">
            Texto
            <textarea
              value={novoBody}
              onChange={(e) => setNovoBody(e.target.value)}
              rows={4}
              className="mt-1 w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
            />
          </label>
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                await salvar.mutateAsync({ moduleKey, nome: novoNome.trim(), body_text: novoBody.trim() });
                setNovoNome(''); setNovoBody('');
              }}
              disabled={salvar.isPending || !novoNome.trim() || !novoBody.trim()}
            >
              {salvar.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="min-h-0 flex-1 overflow-y-auto p-0">
        {isLoading ? <div className="p-10 text-center"><Spinner /></div>
          : !templates || templates.length === 0 ? <EmptyState message="Nenhum modelo salvo." />
          : (
            <ul className="divide-y divide-white/5">
              {templates.map((t) => {
                const editando = editandoId === t.id;
                return (
                  <li key={t.id} className="p-3">
                    {editando ? (
                      <div className="space-y-2">
                        <Input id={`ed-${t.id}`} label="Nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                        <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={4}
                          className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none" />
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => setEditandoId(null)}>Cancelar</Button>
                          <Button
                            onClick={async () => {
                              await salvar.mutateAsync({ id: t.id, moduleKey, nome: editNome.trim(), body_text: editBody.trim() });
                              setEditandoId(null);
                            }}
                            disabled={salvar.isPending || !editNome.trim() || !editBody.trim()}
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-100">{t.nome}</div>
                          <div className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-300">{t.body_text}</div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditandoId(t.id); setEditNome(t.nome); setEditBody(t.body_text); }} className="rounded px-2 text-xs text-slate-400 hover:bg-white/5">editar</button>
                          <button onClick={() => { if (confirm('Apagar modelo?')) apagar.mutate({ moduleKey, id: t.id }); }} className="rounded px-2 text-xs text-red-300 hover:bg-white/5">apagar</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </Card>
    </div>
  );
}
