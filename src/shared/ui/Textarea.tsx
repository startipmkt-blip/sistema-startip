import {
  forwardRef, useCallback, useLayoutEffect, useRef,
  type TextareaHTMLAttributes, type UIEvent,
} from 'react';
import { Linkify, extrairLinks } from '@/shared/ui/Linkify';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  /** Não transformar em link clicável as URLs digitadas no campo. */
  semLinks?: boolean;
}

const px = (v: string) => parseFloat(v) || 0;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, className = '', semLinks, onScroll, ...props }, ref) => {
    const campo = useRef<HTMLTextAreaElement | null>(null);
    const espelho = useRef<HTMLDivElement>(null);
    const texto = typeof props.value === 'string' ? props.value : '';
    const temLinks = !semLinks && extrairLinks(texto).length > 0;

    const setRef = useCallback((el: HTMLTextAreaElement | null) => {
      campo.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    }, [ref]);

    // <textarea> não aceita link dentro: com URL no texto, o texto do campo fica
    // transparente e um espelho por cima, com a mesma tipografia, desenha o texto
    // com os links clicáveis. O espelho copia as medidas reais do campo para não desalinhar.
    const alinhar = useCallback(() => {
      const ta = campo.current;
      const esp = espelho.current;
      if (!ta || !esp) return;
      const cs = getComputedStyle(ta);
      const barra = ta.offsetWidth - ta.clientWidth - px(cs.borderLeftWidth) - px(cs.borderRightWidth);
      Object.assign(esp.style, {
        width: `${ta.offsetWidth}px`,
        height: `${ta.offsetHeight}px`,
        font: cs.font,
        letterSpacing: cs.letterSpacing,
        lineHeight: cs.lineHeight,
        textAlign: cs.textAlign,
        tabSize: cs.tabSize,
        borderWidth: cs.borderWidth,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        paddingRight: `${px(cs.paddingRight) + Math.max(barra, 0)}px`,
      });
      esp.scrollTop = ta.scrollTop;
      ta.style.caretColor = getComputedStyle(esp).color;
    }, []);

    useLayoutEffect(() => {
      const ta = campo.current;
      if (!ta) return;
      if (!temLinks) {
        ta.style.removeProperty('color');
        ta.style.removeProperty('caret-color');
        return;
      }
      ta.style.setProperty('color', 'transparent', 'important');
      alinhar();
      const ro = new ResizeObserver(alinhar);
      ro.observe(ta);
      return () => ro.disconnect();
    }, [temLinks, texto, alinhar]);

    function aoRolar(e: UIEvent<HTMLTextAreaElement>) {
      if (espelho.current) espelho.current.scrollTop = e.currentTarget.scrollTop;
      onScroll?.(e);
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex flex-col">
          <textarea
            ref={setRef}
            id={id}
            onScroll={aoRolar}
            className={`glass-field min-h-[96px] px-3 py-2 text-sm transition-colors focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/50 ${className}`}
            {...props}
          />
          {temLinks && (
            <div
              ref={espelho}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 overflow-hidden whitespace-pre-wrap break-words border-solid border-transparent text-slate-100 [&_a]:pointer-events-auto [&_a]:[word-break:normal]"
            >
              <Linkify texto={texto} />{'​'}
            </div>
          )}
        </div>
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
