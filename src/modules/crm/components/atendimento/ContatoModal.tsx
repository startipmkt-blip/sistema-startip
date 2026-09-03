import { useMemo, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useConversas } from '@/modules/crm/api/atendimentoApi';
import { useEnviarContato } from '@/modules/crm/api/crmApi';

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

export function ContatoModal({ open, onClose, leadId }: Props) {
  const { data: conversas } = useConversas('todas', 'todas');
  const enviar = useEnviarContato();
  const [busca, setBusca] = useState('');
  const [nomeManual, setNomeManual] = useState('');
  const [telManual, setTelManual] = useState('');
  const [aba, setAba] = useState<'lista' | 'manual'>('lista');

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (conversas ?? [])
      .filter((c) => !c.is_grupo && c.id !== leadId)
      .filter((c) => !q || c.nome.toLowerCase().includes(q) || c.telefone.includes(q))
      .slice(0, 30);
  }, [conversas, busca, leadId]);

  async function handleEscolher(nome: string, telefone: string) {
    await enviar.mutateAsync({ leadId, contatoNome: nome, contatoTelefone: telefone });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar contato"
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
    >
      <div className="space-y-3">
        <div className="flex gap-1 border-b border-white/10 text-xs">
          <button
            onClick={() => setAba('lista')}
            className={`border-b-2 px-2 py-1.5 ${aba === 'lista' ? 'border-brand-400 text-brand-200' : 'border-transparent text-slate-400'}`}
          >
            Da minha lista
          </button>
          <button
            onClick={() => setAba('manual')}
            className={`border-b-2 px-2 py-1.5 ${aba === 'manual' ? 'border-brand-400 text-brand-200' : 'border-transparent text-slate-400'}`}
          >
            Manual
          </button>
        </div>

        {aba === 'lista' ? (
          <>
            <input
              type="text"
              placeholder="Buscar por nome ou telefone…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
            />
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-2">
              {filtradas.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => handleEscolher(c.nome, c.telefone)}
                    disabled={enviar.isPending}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    <span aria-hidden>👤</span>
                    <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                    <span className="text-xs text-slate-500">{c.telefone}</span>
                  </button>
                </li>
              ))}
              {filtradas.length === 0 && (
                <li className="p-3 text-center text-xs text-slate-500">Nenhum contato encontrado.</li>
              )}
            </ul>
          </>
        ) : (
          <div className="space-y-3">
            <Input
              id="ct-nome"
              label="Nome"
              value={nomeManual}
              onChange={(e) => setNomeManual(e.target.value)}
              placeholder="Ex: João Silva"
            />
            <Input
              id="ct-tel"
              label="Telefone (com DDD, sem espaços)"
              value={telManual}
              onChange={(e) => setTelManual(e.target.value)}
              placeholder="5511999999999"
            />
            <div className="flex justify-end">
              <Button
                onClick={() => handleEscolher(nomeManual.trim(), telManual.trim())}
                disabled={enviar.isPending || !nomeManual.trim() || !telManual.trim()}
              >
                {enviar.isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
