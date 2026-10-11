import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { useCliente } from '@/modules/clientes/api/clientesApi';
import { useFormulariosDoCliente } from '@/modules/formularios/api/formulariosApi';
import { GerarFormularioModal } from '@/modules/formularios/components/GerarFormularioModal';
import { ListaFormularios } from '@/modules/formularios/components/ListaFormularios';

export function FormulariosAba({ clienteId }: { clienteId: string }) {
  const { data: cliente } = useCliente(clienteId);
  const { data: formularios, isLoading } = useFormulariosDoCliente(clienteId);
  const [abrirModal, setAbrirModal] = useState(false);

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
        <Button onClick={() => setAbrirModal(true)}>+ Gerar novo formulário</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-6"><Spinner /></div>
      ) : (
        <ListaFormularios
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
