import { createContext } from 'react';

export type Theme = 'light' | 'dark';
/** What the user explicitly chose. `system` follows OS preference. */
export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  /** Resolved theme actually being applied to the document */
  theme: Theme;
  /** Raw user preference (may be `system`) */
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  /** Convenience: toggles light ↔ dark and clears `system` mode */
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
