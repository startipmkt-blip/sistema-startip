import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { glassify } from '@/shared/ui/GlassIcon';

export function CopiarLinkButton({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de clipboard (ex.: http): mostra o link para copiar à mão.
      prompt('Copie o link:', link);
    }
  }

  return (
    <Button variant="secondary" onClick={copiar}>
      {glassify(copiado ? '✓ Link copiado' : '🔗 Copiar link do cliente')}
    </Button>
  );
}
