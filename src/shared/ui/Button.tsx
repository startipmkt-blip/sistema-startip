import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-gradient-brand text-white shadow-glow hover:brightness-110 disabled:opacity-50',
  secondary:
    'border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10',
  ghost: 'text-slate-300 hover:bg-white/10',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-400/60 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
