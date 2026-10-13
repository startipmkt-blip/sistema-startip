import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { LinksDoCampo } from '@/shared/ui/Linkify';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  /** Não listar embaixo os links encontrados no texto. */
  semLinks?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, className = '', semLinks, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={`glass-field min-h-[96px] px-3 py-2 text-sm transition-colors focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/50 ${className}`}
          {...props}
        />
        {!semLinks && <LinksDoCampo valor={props.value} />}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
