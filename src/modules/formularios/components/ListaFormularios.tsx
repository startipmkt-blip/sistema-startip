import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Badge } from '@/shared/ui/Badge';
import { formatDate } from '@/shared/lib/format';
import type { Formulario } from '@/modules/formularios/types';
import { TIPO_LABEL } from '@/modules/formularios/types';
import { EnviarWhatsappBtn } from './EnviarWhatsappBtn';
import { ExportarDiagnosticoBtn } from './ExportarDiagnosticoBtn';
import { RespostasView } from './RespostasView';

interface Props {
  formularios: Formulario[];
  nomeCliente: string;
  whatsappChatId: string | null | undefined;
}

function linkPublico(slug: string): string {
  return `${window.location.origin}/formulario/${slug}`;
}

export function ListaFormularios({ formularios, nomeCliente, whatsappChatId }: Props) {
  const [verRespostas, setVerRespostas] = useState<Formulario | null>(null);
  const [copiado, setCopiado] = useState<string>('');

  async function copiarLink(slug: string) {
    const link = linkPublico(slug);
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(slug);
      setTimeout(() => setCopiado(''), 1800);
    } catch { /* ignore */ }
  }

  if (!formularios.length) {
    return (
      <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
        Nenhum formulário gerado ainda. Clique em “Gerar novo formulário” acima.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {formularios.map((f) => {
          const link = linkPublico(f.slug);
          return (
            <div key={f.id} className="rounded-md border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{TIPO_LABEL[f.tipo]}</span>
                    {f.status === 'preenchido' ? (
                      <Badge tone="green">✅ Preenchido {f.preenchido_em ? `em ${formatDate(f.preenchido_em)}` : ''}</Badge>
                    ) : f.status === 'arquivado' ? (
                      <Badge tone="slate">Arquivado</Badge>
                    ) : (
                      <Badge tone="amber">⏳ Pendente</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Criado em {formatDate(f.criado_em)} · {f.perguntas.length} perguntas
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="flex-1 min-w-[260px] rounded-md border border-white/10 bg-slate-900/40 px-2 py-1 text-xs text-slate-300">
                  {link}
                </code>
                <Button variant="ghost" onClick={() => copiarLink(f.slug)}>
                  {copiado === f.slug ? '✅ Copiado' : '📋 Copiar link'}
                </Button>
                {f.status === 'pendente' && (
                  <EnviarWhatsappBtn
                    formulario={f}
                    whatsappChatId={whatsappChatId}
                    linkPublico={link}
                  />
                )}
                {f.status === 'preenchido' && (
                  <>
                    <Button variant="secondary" onClick={() => setVerRespostas(f)}>
                      👁 Ver respostas
                    </Button>
                    <ExportarDiagnosticoBtn formulario={f} nomeCliente={nomeCliente} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!verRespostas}
        onClose={() => setVerRespostas(null)}
        title={verRespostas ? `Respostas — ${TIPO_LABEL[verRespostas.tipo]}` : ''}
        size="xl"
        footer={
          verRespostas ? (
            <>
              <ExportarDiagnosticoBtn formulario={verRespostas} nomeCliente={nomeCliente} />
              <Button variant="secondary" onClick={() => setVerRespostas(null)}>Fechar</Button>
            </>
          ) : null
        }
      >
        {verRespostas && <RespostasView formulario={verRespostas} />}
      </Modal>
    </>
  );
}
