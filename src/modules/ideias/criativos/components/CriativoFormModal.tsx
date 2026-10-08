import { useEffect, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { IMPORTANCIA_LABEL, AUTOR_LABEL } from '@/modules/ideias/types';
import type { IdeiaAutor, IdeiaImportancia } from '@/modules/ideias/types';
import { ClientesMultiSelect } from './ClientesMultiSelect';
import { AnexosCriativo } from './AnexosCriativo';
import { descartarAnexo, useSalvarCriativo } from '@/modules/ideias/criativos/criativosApi';
import {
  FORMATO_LABEL, OBJETIVO_LABEL, STATUS_LABEL, hojeISO,
  type Criativo, type CriativoAnexo, type CriativoFormato, type CriativoObjetivo, type CriativoStatus,
} from '@/modules/ideias/criativos/types';

interface Props {
  open: boolean;
  onClose: () => void;
  criativo?: Criativo;
}

function optionsDe<T extends string>(labels: Record<T, string>, vazio: string) {
  return [{ value: '', label: vazio }, ...(Object.keys(labels) as T[]).map((k) => ({ value: k, label: labels[k] }))];
}

function urlValida(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function CriativoFormModal({ open, onClose, criativo }: Props) {
  const salvar = useSalvarCriativo();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [clienteIds, setClienteIds] = useState<string[]>([]);
  const [geral, setGeral] = useState(false);
  const [formato, setFormato] = useState<CriativoFormato | ''>('');
  const [objetivo, setObjetivo] = useState<CriativoObjetivo | ''>('');
  const [anexos, setAnexos] = useState<CriativoAnexo[]>([]);
  const [novos, setNovos] = useState<string[]>([]);
  const [link, setLink] = useState('');
  const [autor, setAutor] = useState<IdeiaAutor>('iuri');
  const [data, setData] = useState(hojeISO());
  const [importancia, setImportancia] = useState<IdeiaImportancia>('simples');
  const [status, setStatus] = useState<CriativoStatus>('nova');
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setErros([]);
    setNovos([]);
    if (criativo) {
      setTitulo(criativo.titulo);
      setDescricao(criativo.descricao);
      setClienteIds(criativo.cliente_ids);
      setGeral(criativo.geral);
      setFormato(criativo.formato ?? '');
      setObjetivo(criativo.objetivo ?? '');
      setAnexos(criativo.anexos);
      setLink(criativo.link_referencia ?? '');
      setAutor(criativo.autor);
      setData(criativo.data_ideia);
      setImportancia(criativo.importancia);
      setStatus(criativo.status);
    } else {
      setTitulo(''); setDescricao(''); setClienteIds([]); setGeral(false);
      setFormato(''); setObjetivo(''); setAnexos([]); setLink('');
      setAutor('iuri'); setData(hojeISO()); setImportancia('simples'); setStatus('nova');
    }
  }, [open, criativo]);

  async function fechar() {
    // anexos enviados e nao salvos viram lixo no storage
    await Promise.all(novos.map((p) => descartarAnexo(p)));
    setNovos([]);
    onClose();
  }

  function validar(): string[] {
    const e: string[] = [];
    if (!titulo.trim()) e.push('Informe o título da ideia.');
    if (!geral && clienteIds.length === 0) {
      e.push('Marque ao menos um cliente ou escolha "Ideia geral".');
    }
    if (link.trim() && !urlValida(link.trim())) {
      e.push('O link de referência precisa começar com http:// ou https://.');
    }
    return e;
  }

  function handleSalvar() {
    const e = validar();
    setErros(e);
    if (e.length > 0) return;

    salvar.mutate(
      {
        id: criativo?.id,
        dados: {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          formato: formato || null,
          objetivo: objetivo || null,
          link_referencia: link.trim() || null,
          autor,
          data_ideia: data,
          importancia,
          status,
          geral,
          anexos,
          cliente_ids: geral ? [] : clienteIds,
        },
      },
      {
        onSuccess: () => { setNovos([]); onClose(); },
        onError: (err) => setErros([`Não foi possível salvar: ${(err as { message?: string }).message ?? 'erro desconhecido'}`]),
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={() => void fechar()}
      title={criativo ? 'Editar ideia de criativo' : 'Nova ideia de criativo'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => void fechar()}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : criativo ? 'Salvar' : 'Registrar ideia'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {erros.length > 0 && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {erros.map((m) => <p key={m}>{m}</p>)}
          </div>
        )}

        <Input
          label="Título da ideia *"
          placeholder="Ex: Vídeo de bastidores mostrando o antes e depois"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          autoFocus
        />

        <Textarea
          label="Descrição da ideia"
          placeholder="Explique o conceito, o gancho, o roteiro, a referência..."
          rows={4}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-slate-300">Para quais clientes? *</p>
          <ClientesMultiSelect value={clienteIds} geral={geral} onChange={setClienteIds} onGeralChange={setGeral} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Formato do criativo"
            value={formato}
            onChange={(e) => setFormato(e.target.value as CriativoFormato | '')}
            options={optionsDe(FORMATO_LABEL, 'Não definido')}
          />
          <Select
            label="Objetivo"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value as CriativoObjetivo | '')}
            options={optionsDe(OBJETIVO_LABEL, 'Não definido')}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-slate-300">Anexos</p>
          <AnexosCriativo anexos={anexos} onChange={setAnexos} novos={novos} onNovos={setNovos} />
        </div>

        <Input
          label="Link de referência"
          type="url"
          inputMode="url"
          placeholder="https:// anúncio de concorrente ou vídeo de inspiração"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-slate-300">Ideia de</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(AUTOR_LABEL) as IdeiaAutor[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAutor(a)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  autor === a ? 'border-brand-400/60 bg-brand-500/10 text-brand-100' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
                }`}
              >
                {AUTOR_LABEL[a]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          <Select
            label="Nível da ideia"
            value={importancia}
            onChange={(e) => setImportancia(e.target.value as IdeiaImportancia)}
            options={(Object.keys(IMPORTANCIA_LABEL) as IdeiaImportancia[]).map((k) => ({ value: k, label: IMPORTANCIA_LABEL[k] }))}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CriativoStatus)}
            options={(Object.keys(STATUS_LABEL) as CriativoStatus[]).map((k) => ({ value: k, label: STATUS_LABEL[k] }))}
          />
        </div>
      </div>
    </Modal>
  );
}
