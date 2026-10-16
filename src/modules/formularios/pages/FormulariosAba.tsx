import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { useCliente } from '@/modules/clientes/api/clientesApi';
import { useCriarFormulario, useFormulariosDoCliente } from '@/modules/formularios/api/formulariosApi';
import { GerarFormularioModal } from '@/modules/formularios/components/GerarFormularioModal';
import { ListaFormularios } from '@/modules/formularios/components/ListaFormularios';

export function FormulariosAba({ clienteId }: { clienteId: string }) {
  const { data: cliente } = useCliente(clienteId);
  const { data: formularios, isLoading } = useFormulariosDoCliente(clienteId);
  const [abrirModal, setAbrirModal] = useState(false);
  const criar = useCriarFormulario(clienteId);
  const [aviso, setAviso] = useState('');

  async function gerarPadrao() {
    setAviso('');
    try {
      const f = await criar.mutateAsync({
        tipo: 'padrao',
        comTrafego: !!cliente?.servicos?.includes('trafego_pago'),
      });
      const link = `${window.location.origin}/formulario/${f.slug}`;
      await navigator.clipboard.writeText(link).catch(() => undefined);
      setAviso(`Briefing padrão gerado. Link copiado: ${link}`);
    } catch (e) {
      setAviso((e as Error).message ?? 'Erro ao gerar o briefing padrão.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            {formularios?.length ?? 0} formulário(s) gerado(s)
          </h3>
          <p className="text-xs text-slate-400">
            Gere um link único por cliente. Ao preencher, a equipe recebe aviso automático.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={gerarPadrao} disabled={criar.isPending}>
            {criar.isPending ? 'Gerando…' : 'Gerar briefing padrão'}
          </Button>
          <Button variant="secondary" onClick={() => setAbrirModal(true)}>+ Outro formulário</Button>
        </div>
      </div>
      {aviso && (
        <div className="rounded-md border border-white/10 bg-white/5 p-2 text-xs text-slate-200">{aviso}</div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-6"><Spinner /></div>
      ) : (
        <ListaFormularios
          clienteId={clienteId}
          formularios={formularios ?? []}
          nomeCliente={cliente?.nome ?? 'Cliente'}
          whatsappChatId={(cliente as unknown as { whatsapp_chat_id?: string | null })?.whatsapp_chat_id}
        />
      )}

      <GerarFormularioModal
        clienteId={clienteId}
        open={abrirModal}
        onClose={() => setAbrirModal(false)}
      />
    </div>
  );
}
