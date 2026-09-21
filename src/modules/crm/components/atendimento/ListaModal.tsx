import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { useEnviarLista } from '@/modules/crm/api/crmApi';

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

interface Opcao { title: string; description: string; }

export function ListaModal({ open, onClose, leadId }: Props) {
  const [texto, setTexto] = useState('');
  const [tituloLista, setTituloLista] = useState('');
  const [rotuloBotao, setRotuloBotao] = useState('Ver opções');
  const [opcoes, setOpcoes] = useState<Opcao[]>([{ title: '', description: '' }, { title: '', description: '' }]);
  const enviar = useEnviarLista();

  const validas = opcoes.map((o) => ({ title: o.title.trim(), description: o.description.trim() })).filter((o) => o.title);
  const pode = texto.trim().length > 0 && validas.length >= 1;

  function atualizar(i: number, campo: keyof Opcao, v: string) {
    setOpcoes((arr) => arr.map((x, idx) => (idx === i ? { ...x, [campo]: v } : x)));
  }
  function adicionar() {
    if (opcoes.length < 10) setOpcoes((arr) => [...arr, { title: '', description: '' }]);
  }
  function remover(i: number) {
    if (opcoes.length > 1) setOpcoes((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function handleEnviar() {
    await enviar.mutateAsync({
      leadId,
      texto: texto.trim(),
      tituloLista: tituloLista.trim() || 'Selecione',
      rotuloBotao: rotuloBotao.trim() || 'Ver opções',
      opcoes: validas.map((o) => ({ title: o.title, description: o.description || undefined })),
    });
    setTexto(''); setTituloLista(''); setRotuloBotao('Ver opções');
    setOpcoes([{ title: '', description: '' }, { title: '', description: '' }]);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lista interativa"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleEnviar} disabled={!pode || enviar.isPending}>
            {enviar.isPending ? 'Enviando…' : 'Enviar'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Textarea
          id="txt"
          label="Mensagem"
          rows={2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="ex: Escolha o horário que funciona pra você"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input id="tit" label="Título da lista" value={tituloLista} onChange={(e) => setTituloLista(e.target.value)} placeholder="Selecione" />
          <Input id="rot" label="Texto do botão" value={rotuloBotao} onChange={(e) => setRotuloBotao(e.target.value)} placeholder="Ver opções" maxLength={20} />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Opções (máx 10)</div>
          {opcoes.map((o, i) => (
            <div key={i} className="space-y-1.5 rounded-md border border-white/10 bg-white/5 p-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={o.title}
                  onChange={(e) => atualizar(i, 'title', e.target.value)}
                  placeholder={`Opção ${i + 1}`}
                  maxLength={24}
                  className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
                />
                {opcoes.length > 1 && (
                  <button onClick={() => remover(i)} className="rounded-md px-2 text-sm text-slate-400 hover:bg-white/5" title="Remover">✕</button>
                )}
              </div>
              <input
                type="text"
                value={o.description}
                onChange={(e) => atualizar(i, 'description', e.target.value)}
                placeholder="Descrição (opcional)"
                maxLength={72}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:border-brand-400 focus:outline-none"
              />
            </div>
          ))}
          {opcoes.length < 10 && (
            <button onClick={adicionar} className="text-xs text-brand-300 hover:underline">
              + adicionar opção
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
