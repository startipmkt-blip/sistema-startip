import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`glass-field px-3 py-2 text-sm transition-colors focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/50 ${className}`}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = 'Input';
