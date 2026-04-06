import { cn } from '@/shadecn/lib/utils';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

function MainInput({ label, error, className, id, ref, ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium uppercase tracking-wider text-text-dim"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-10 rounded border border-border bg-surface px-3 text-sm text-text',
          'placeholder:text-text-dim',
          'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-down focus:border-down focus:ring-down/30',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-down">{error}</span>}
    </div>
  );
}

export default MainInput;
