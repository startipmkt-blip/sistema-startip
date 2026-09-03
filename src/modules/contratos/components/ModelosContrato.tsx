import { useState } from 'react';
import { useContractTemplates, useSalvarTemplate, useApagarTemplate } from '@/modules/contratos/api/contratosApi';
import type { ContractTemplate } from '@/modules/contratos/types';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { uploadArquivo, urlDoArquivo, removerArquivo } from '@/shared/lib/storage';

export function ModelosContrato() {
  const { data: templates, isLoading } = useContractTemplates();
  const salvar = useSalvarTemplate();
  const apagar = useApagarTemplate();
  const [editando, setEditando] = useState<ContractTemplate | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);

  async function abrirArquivo(t: ContractTemplate) {
    if (!t.arquivo_path) return;
    try {
      const url = await urlDoArquivo('anexos-internos', t.arquivo_path);
      window.open(url, '_blank', 'noopener');
    } catch (e) { alert((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Modelos base para gerar contratos. Você pode anexar um <strong>PDF ou DOCX</strong> do modelo,
          ou colar o corpo em texto (usado pelo gerador de PDF interno).
        </p>
        <Button onClick={() => setNovoAberto(true)}>+ Novo modelo</Button>
      </div>

      {isLoading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : (templates ?? []).length === 0 ? (
        <Card><EmptyState message="Nenhum modelo cadastrado. Crie o primeiro." /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(templates ?? []).map((t) => (
            <Card key={t.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{t.nome}</div>
                  <div className="text-[11px] text-slate-500">
                    {t.arquivo_nome ? `📎 ${t.arquivo_nome}` : t.body_text ? `📝 corpo em texto (${t.body_text.length} chars)` : 'vazio'}
                  </div>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-1">
                {t.arquivo_path && (
                  <Button variant="secondary" onClick={() => void abrirArquivo(t)}>Abrir</Button>
                )}
                <Button variant="secondary" onClick={() => setEditando(t)}>Editar</Button>
                <button
                  onClick={async () => {
                    if (!confirm(`Apagar modelo "${t.nome}"?`)) return;
                    if (t.arquivo_path) { try { await removerArquivo('anexos-internos', t.arquivo_path); } catch {} }
                    apagar.mutate(t.id);
                  }}
                  className="rounded-md px-2 text-xs text-red-300 hover:bg-red-500/10"
                >🗑️</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(editando || novoAberto) && (
        <TemplateForm
          template={editando ?? undefined}
          onClose={() => { setEditando(null); setNovoAberto(false); }}
          onSalvar={(dados) => salvar.mutateAsync({ id: editando?.id, dados })}
        />
      )}
    </div>
  );
}

interface FormProps {
  template?: ContractTemplate;
  onClose: () => void;
  onSalvar: (dados: Partial<ContractTemplate> & { nome: string }) => Promise<void>;
}
function TemplateForm({ template, onClose, onSalvar }: FormProps) {
  const [nome, setNome] = useState(template?.nome ?? '');
  const [bodyText, setBodyText] = useState(template?.body_text ?? '');
  const [arquivoPath, setArquivoPath] = useState(template?.arquivo_path ?? null);
  const [arquivoNome, setArquivoNome] = useState(template?.arquivo_nome ?? null);
  const [arquivoTipo, setArquivoTipo] = useState(template?.arquivo_tipo ?? null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function anexar(file: File) {
    setErro(null); setEnviando(true);
    try {
      if (file.size > 20 * 1024 * 1024) { setErro('Máximo 20 MB.'); return; }
      // remove o antigo pra não deixar lixo
      if (arquivoPath) { try { await removerArquivo('anexos-internos', arquivoPath); } catch {} }
      const { path } = await uploadArquivo({ bucket: 'anexos-internos', file });
      setArquivoPath(path);
      setArquivoNome(file.name);
      setArquivoTipo(file.type || 'application/octet-stream');
    } catch (e) { setErro((e as Error).message); }
    finally { setEnviando(false); }
  }

  async function handleSalvar() {
    if (!nome.trim()) return;
    await onSalvar({
      nome: nome.trim(),
      body_text: bodyText,
      arquivo_path: arquivoPath,
      arquivo_nome: arquivoNome,
      arquivo_tipo: arquivoTipo,
    });
    onClose();
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title={template ? `Editar modelo — ${template.nome}` : 'Novo modelo de contrato'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSalvar} disabled={!nome.trim()}>Salvar</Button>
      </>}
    >
      <div className="space-y-4">
        <Input id="nome" label="Nome do modelo" value={nome} onChange={(e) => setNome(e.target.value)} />

        <div>
          <label className="mb-1 block text-xs text-slate-300">Arquivo do modelo (PDF ou DOCX — opcional)</label>
          {arquivoPath ? (
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5 text-xs">
              <span>📎</span>
              <span className="min-w-0 flex-1 truncate text-slate-200">{arquivoNome}</span>
              <button
                onClick={async () => { try { await removerArquivo('anexos-internos', arquivoPath); } catch {} setArquivoPath(null); setArquivoNome(null); setArquivoTipo(null); }}
                className="rounded px-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                type="button"
              >✕</button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-xs text-slate-300 hover:border-brand-400/50">
              <span>{enviando ? '⏳ Enviando…' : '📎 Selecionar arquivo (PDF, DOC, DOCX)'}</span>
              <input
                type="file"
                accept="application/pdf,.doc,.docx"
                className="hidden"
                disabled={enviando}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void anexar(f); e.target.value = ''; }}
              />
            </label>
          )}
          {erro && <div className="mt-1 text-[11px] text-red-400">{erro}</div>}
        </div>

        <Textarea
          id="body"
          label="Corpo em texto (opcional — usado pelo gerador de PDF interno)"
          className="min-h-[220px]"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
        />
      </div>
    </Modal>
  );
}
