import { useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useSalvarIdeia, useExcluirIdeia, hoje } from '@/modules/ideias/api/ideiasApi';
import type { Ideia, IdeiaT, IdeiaImportancia, IdeiaAutor } from '@/modules/ideias/types';

interface Props {
  open: boolean;
  onClose: () => void;
  ideia?: Ideia;
}

const TIPOS: { value: IdeiaT; label: string; emoji: string }[] = [
  { value: 'agencia', label: 'Agência', emoji: '🏢' },
  { value: 'cliente', label: 'Cliente', emoji: '👤' },
  { value: 'projeto', label: 'Projeto', emoji: '📁' },
];

const IMPORTANCIAS: { value: IdeiaImportancia; label: string; desc: string }[] = [
  { value: 'simples', label: 'Simples', desc: 'Ideia interessante, sem prioridade' },
  { value: 'importante', label: 'Importante', desc: 'Merece atenção' },
  { value: 'muito_importante', label: 'Muito importante', desc: 'Grande potencial' },
];

const AUTORES: { value: IdeiaAutor; label: string }[] = [
  { value: 'iuri', label: 'Iuri' },
  { value: 'dhomini', label: 'Dhomini' },
];

const importanciaBorder: Record<IdeiaImportancia, string> = {
  simples: 'border-slate-500/40',
  importante: 'border-amber-500/60',
  muito_importante: 'border-red-500/60',
};
const importanciaBg: Record<IdeiaImportancia, string> = {
  simples: '',
  importante: 'bg-amber-500/5',
  muito_importante: 'bg-red-500/5',
};

export function IdeiaFormModal({ open, onClose, ideia }: Props) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<IdeiaT>('agencia');
  const [clienteNome, setClienteNome] = useState('');
  const [projetoNome, setProjetoNome] = useState('');
  const [autor, setAutor] = useState<IdeiaAutor>('iuri');
  const [importancia, setImportancia] = useState<IdeiaImportancia>('simples');
  const [dataIdeia, setDataIdeia] = useState(hoje());

  const { data: clientes } = useClientes('');
  const salvar = useSalvarIdeia();
  const excluir = useExcluirIdeia();

  useEffect(() => {
    if (!open) return;
    if (ideia) {
      setTitulo(ideia.titulo);
      setDescricao(ideia.descricao);
      setTipo(ideia.tipo);
      setClienteNome(ideia.cliente_nome ?? '');
      setProjetoNome(ideia.projeto_nome ?? '');
      setAutor(ideia.autor);
      setImportancia(ideia.importancia);
      setDataIdeia(ideia.data_ideia);
    } else {
      setTitulo('');
      setDescricao('');
      setTipo('agencia');
      setClienteNome('');
      setProjetoNome('');
      setAutor('iuri');
      setImportancia('simples');
      setDataIdeia(hoje());
    }
  }, [open, ideia]);

  function handleSalvar() {
    if (!titulo.trim()) return;
    salvar.mutate(
      {
        id: ideia?.id,
        dados: {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          tipo,
          cliente_nome: tipo === 'cliente' ? clienteNome || null : null,
          projeto_nome: tipo === 'projeto' ? projetoNome || null : null,
          autor,
          importancia,
          data_ideia: dataIdeia,
        },
      },
      { onSuccess: onClose },
    );
  }

  function handleExcluir() {
    if (!ideia || !confirm('Tem certeza que deseja excluir esta ideia?')) return;
    excluir.mutate(ideia.id, { onSuccess: onClose });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ideia ? 'Editar ideia' : 'Nova ideia'}
      size="lg"
      footer={
        <>
          {ideia && (
            <Button variant="ghost" className="mr-auto text-red-400 hover:text-red-300" onClick={handleExcluir}>
              Excluir
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={!titulo.trim() || salvar.isPending}>
            {salvar.isPending ? 'Salvando...' : ideia ? 'Salvar' : 'Registrar ideia'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {salvar.isError && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Não foi possível salvar: {(salvar.error as { message?: string })?.message ?? 'erro desconhecido'}
          </p>
        )}
        <Input
          label="Título da ideia"
          placeholder="Ex: Criar relatório automático de oportunidades perdidas"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          autoFocus
        />

        <Textarea
          label="Descrição"
          placeholder="Explique melhor a ideia..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
        />

        {/* Tipo */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Essa ideia é para:</label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                  tipo === t.value
                    ? 'border-brand-400/60 bg-brand-500/10 text-brand-300'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-300'
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tipo === 'cliente' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Qual cliente?</label>
            <input
              list="clientes-list"
              className="glass-field w-full px-3 py-2 text-sm transition-colors focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/50"
              placeholder="Selecione ou digite o nome do cliente"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
            />
            <datalist id="clientes-list">
              {(clientes ?? []).map((c) => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
          </div>
        )}

        {tipo === 'projeto' && (
          <Input
            label="Nome do projeto"
            placeholder="Ex: App de delivery interno"
            value={projetoNome}
            onChange={(e) => setProjetoNome(e.target.value)}
          />
        )}

        {/* Autor */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Ideia de:</label>
          <div className="flex gap-2">
            {AUTORES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAutor(a.value)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  autor === a.value
                    ? 'border-brand-400/60 bg-brand-500/10 text-brand-300'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-300'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Data */}
          <Input
            label="Data"
            type="date"
            value={dataIdeia}
            onChange={(e) => setDataIdeia(e.target.value)}
          />

          {/* Importância */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Nível da ideia</label>
            <div className="flex flex-col gap-1.5">
              {IMPORTANCIAS.map((imp) => (
                <button
                  key={imp.value}
                  type="button"
                  onClick={() => setImportancia(imp.value)}
                  className={`rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-all ${
                    importancia === imp.value
                      ? `${importanciaBorder[imp.value]} ${importanciaBg[imp.value]} text-slate-100`
                      : 'border-white/10 bg-white/[0.03] text-slate-500 hover:text-slate-400'
                  }`}
                >
                  {imp.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
