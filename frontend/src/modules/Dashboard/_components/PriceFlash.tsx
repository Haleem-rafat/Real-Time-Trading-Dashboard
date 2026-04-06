import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shadecn/lib/utils';

interface Props {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

const FLASH_DURATION_MS = 450;

/**
 * Wraps a numeric value and briefly flashes green on up-tick / red on
 * down-tick. The previous value lives in a ref so the comparison
 * doesn't cause additional renders.
 */
function PriceFlash({
  value,
  format = (n) => n.toFixed(2),
  className,
}: Props) {
  const prevRef = useRef(value);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value > prevRef.current) {
      setDirection('up');
    } else if (value < prevRef.current) {
      setDirection('down');
    }
    prevRef.current = value;

    if (value !== prevRef.current) return;
    const timer = window.setTimeout(() => setDirection(null), FLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <span
      className={cn(
        'num inline-block rounded px-1 py-0.5 transition-colors duration-300',
        direction === 'up' && 'bg-up/15 text-up',
        direction === 'down' && 'bg-down/15 text-down',
        direction === null && 'bg-transparent',
        className,
      )}
    >
      {format(value)}
    </span>
  );
}

export default PriceFlash;
