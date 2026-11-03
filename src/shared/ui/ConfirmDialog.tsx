import { useEffect, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';

const EVENTO = 'startip:confirmar';
interface Pedido { msg: string; resolver: (ok: boolean) => void }

// Substitui window.confirm: `if (!(await confirmar('Excluir?'))) return;`
export function confirmar(msg: string): Promise<boolean> {
  return new Promise((resolver) => {
    window.dispatchEvent(new CustomEvent<Pedido>(EVENTO, { detail: { msg, resolver } }));
  });
}

export function ConfirmHost() {
  const [pedido, setPedido] = useState<Pedido | null>(null);

  useEffect(() => {
    const on = (e: Event) => setPedido((e as CustomEvent<Pedido>).detail);
    window.addEventListener(EVENTO, on);
    return () => window.removeEventListener(EVENTO, on);
  }, []);

  function responder(ok: boolean) {
    pedido?.resolver(ok);
    setPedido(null);
  }

  return (
    <Modal
      open={!!pedido}
      onClose={() => responder(false)}
      title="Confirmar"
      footer={
        <>
          <Button variant="secondary" onClick={() => responder(false)}>Cancelar</Button>
          <Button onClick={() => responder(true)} autoFocus>Confirmar</Button>
        </>
      }
    >
      <p className="whitespace-pre-line text-sm text-slate-200">{pedido?.msg}</p>
    </Modal>
  );
}
