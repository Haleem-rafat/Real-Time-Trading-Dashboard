import { Loader2 } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';

type Variant = 'primary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-bg hover:brightness-110 active:brightness-95 disabled:opacity-50',
  ghost: 'bg-transparent text-text hover:bg-surface-2 disabled:opacity-50',
  outline:
    'border border-border bg-transparent text-text hover:bg-surface-2 hover:border-border-strong disabled:opacity-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ref,
  ...props
}: Props) {
  return (
    <button
      ref={ref}
      disabled={disabled ?? loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded font-medium transition-all',
        'focus:outline-none focus:ring-2 focus:ring-accent/40',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export default Button;
