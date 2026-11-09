import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
  // Mantido por compatibilidade: agora todo modal (exceto `compacto`) só fecha pelos botões.
  fecharSoPorBotao?: boolean;
  // Diálogo curto (ex.: confirmação): tamanho de `size` e fecha ao clicar fora/Esc.
  compacto?: boolean;
  // Sem backdrop-filter: vídeo/iframe dentro de elemento com blur renderiza controles duplicados no celular.
  semBlur?: boolean;
}

const SIZES = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-6xl', full: 'max-w-[95vw]' } as const;

export function Modal({ open, onClose, title, children, footer, size = 'md', compacto = false, semBlur = false }: ModalProps) {
  // Trava a rolagem da página atrás do modal (no celular o fundo "vazava" no arraste).
  useEffect(() => {
    if (!open) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, [open]);

  useEffect(() => {
    if (!open || !compacto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, compacto]);

  if (!open) return null;

  // Portal no <body>: dentro de um cartão com backdrop-blur o `fixed` passa a ser
  // relativo ao cartão e o modal sai da tela (rodapé com os botões fica cortado).
  return createPortal(
    <div
      // Celular: modal grande ocupa a tela toda; o compacto vira folha que sobe de baixo.
      className={`fundo-escuro anim-fundo fixed inset-0 z-50 flex justify-center ${compacto ? 'items-end sm:items-center sm:p-4' : 'items-stretch sm:items-center sm:p-2'} ${semBlur ? 'bg-slate-950/90' : 'bg-slate-950/70'}`}
      role="dialog"
      aria-modal="true"
      onClick={compacto ? onClose : undefined}
    >
      <div
        className={`flex w-full flex-col overflow-hidden border-white/10 bg-[#121a24] shadow-pop sm:rounded-xl sm:border ${
          compacto
            ? `anim-folha max-h-[92dvh] rounded-t-2xl border-t ${SIZES[size]}`
            : 'pt-seguro h-[100dvh] sm:h-[calc(100dvh-1rem)] sm:max-w-[calc(100vw-1rem)] sm:pt-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {compacto && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" aria-hidden />}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 py-2 pl-4 pr-2 sm:py-3 sm:pl-5 sm:pr-3">
          <h2 className="min-w-0 truncate text-base font-semibold text-white">{glassify(title)}</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-200"
            aria-label="Fechar"
          >
            <GlassIcon name="x" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"><div className={compacto ? '' : 'mx-auto w-full max-w-[1400px]'}>{children}</div></div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:[&>button]:min-h-[44px] max-sm:[&>button]:flex-1 sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
