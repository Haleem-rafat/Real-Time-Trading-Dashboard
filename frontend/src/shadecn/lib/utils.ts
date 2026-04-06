import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes intelligently — clsx handles conditions,
 * tailwind-merge resolves conflicts (later utilities override earlier ones).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
