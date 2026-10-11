import { useState } from 'react';
import { useSalvarTemplate } from '@/modules/onboarding/api/onboardingApi';
import type { OnboardingTemplate } from '@/modules/onboarding/types';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';

interface EtapaForm {
  key: string;
  titulo: string;
  tempo: string;
  itensTexto: string;
}

interface Props {
  onClose: () => void;
  template?: OnboardingTemplate; // edição
  base?: OnboardingTemplate; // novo modelo partindo de uma cópia
}

function etapaVazia(): EtapaForm {
  return { key: crypto.randomUUID(), titulo: '', tempo: '', itensTexto: '' };
}

function paraForm(t?: OnboardingTemplate): EtapaForm[] {
  if (!t) return [etapaVazia()];
  return t.etapas.map((e) => ({
    key: crypto.randomUUID(),
    titulo: e.titulo,
    tempo: e.tempo,
    itensTexto: e.itens.join('\n'),
  }));
}

// Montado só enquanto aberto, para o estado nascer do modelo recebido.
export function TemplateFormModal({ onClose, template, base }: Props) {
  const salvar = useSalvarTemplate();
  const [nome, setNome] = useState(template?.nome ?? (base ? `${base.nome} (cópia)` : ''));
  const [etapas, setEtapas] = useState<EtapaForm[]>(() => paraForm(template ?? base));
  const [erro, setErro] = useState('');

  function alterar(key: string, campo: keyof Omit<EtapaForm, 'key'>, valor: string) {
    setEtapas((lista) => lista.map((e) => (e.key === key ? { ...e, [campo]: valor } : e)));
  }
  function mover(i: number, delta: number) {
    setEtapas((lista) => {
      const j = i + delta;
      if (j < 0 || j >= lista.length) return lista;
      const nova = [...lista];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      return nova;
    });
  }

  const validas = etapas.filter((e) => e.titulo.trim());

  async function handleSalvar() {
    setErro('');
    try {
      await salvar.mutateAsync({
        id: template?.id,
        nome: nome.trim(),
        etapas: validas.map((e) => ({
          titulo: e.titulo.trim(),
          tempo: e.tempo.trim(),
          itens: e.itensTexto.split('\n').map((s) => s.trim()).filter(Boolean),
        })),
      });
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o modelo.');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={template ? 'Editar modelo de onboarding' : 'Novo modelo de onboarding'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending || !nome.trim() || validas.length === 0}>
            {salvar.isPending ? 'Salvando…' : 'Salvar modelo'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          id="tpl-nome"
          label="Nome do modelo"
          placeholder="Ex.: Onboarding tráfego + social"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        {template && (
          <p className="text-xs text-slate-400">
            Alterações valem para os próximos onboardings. Os que já estão em andamento não mudam.
          </p>
        )}

        {etapas.map((e, i) => (
          <div key={e.key} className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Etapa {i + 1}</span>
              <div className="flex items-center gap-1 text-xs">
                <button
                  className="rounded px-2 py-1 text-slate-300 hover:bg-white/10 disabled:opacity-30"
                  disabled={i === 0}
                  onClick={() => mover(i, -1)}
                  aria-label="Mover para cima"
                >↑</button>
                <button
                  className="rounded px-2 py-1 text-slate-300 hover:bg-white/10 disabled:opacity-30"
                  disabled={i === etapas.length - 1}
                  onClick={() => mover(i, 1)}
                  aria-label="Mover para baixo"
                >↓</button>
                <button
                  className="rounded px-2 py-1 font-medium text-red-400 hover:bg-white/10 disabled:opacity-30"
                  disabled={etapas.length === 1}
                  onClick={() => setEtapas((lista) => lista.filter((x) => x.key !== e.key))}
                >
                  Remover
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
              <Input id={`t-${e.key}`} label="Título" value={e.titulo} onChange={(ev) => alterar(e.key, 'titulo', ev.target.value)} />
              <Input id={`p-${e.key}`} label="Tempo (opcional)" placeholder="Ex.: 1 dia" value={e.tempo} onChange={(ev) => alterar(e.key, 'tempo', ev.target.value)} />
            </div>
            <Textarea
              id={`i-${e.key}`}
              label="Passos (um por linha)"
              value={e.itensTexto}
              onChange={(ev) => alterar(e.key, 'itensTexto', ev.target.value)}
            />
          </div>
        ))}

        <Button variant="secondary" onClick={() => setEtapas((lista) => [...lista, etapaVazia()])}>
          + Adicionar etapa
        </Button>
        {erro && <p className="text-sm text-red-300">{erro}</p>}
      </div>
    </Modal>
  );
}
