import { useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from 'react';
import { Textarea } from '@/shared/ui/Textarea';

interface Props extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> {
  id: string;
  label: string;
  value: string;
}

// Textarea compacta com "Ver mais": aberta, cresce até caber o texto inteiro, sem rolagem interna.
export function TextareaExpansivel({ id, label, value, rows = 3, className = '', ...props }: Props) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '';
    if (aberto) el.style.height = `${el.scrollHeight + 2}px`;
  }, [aberto, value]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-300">{label}</label>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls={id}
          className="text-xs font-medium text-brand-300 hover:text-brand-200"
        >
          {aberto ? 'Ver menos' : 'Ver mais'}
        </button>
      </div>
      <Textarea
        ref={ref}
        id={id}
        value={value}
        rows={rows}
        className={`${aberto ? 'resize-none overflow-hidden' : ''} ${className}`}
        {...props}
      />
    </div>
  );
}
