import { Moon, Sun } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { useTheme } from '@hooks/useTheme';

/**
 * Single-button theme toggle. Click flips light ↔ dark and remembers
 * the choice. The OS-preference fallback is handled by ThemeProvider
 * when no explicit choice has ever been made.
 */
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded transition-colors',
        'text-text-dim hover:bg-surface-2 hover:text-text',
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export default ThemeToggle;
