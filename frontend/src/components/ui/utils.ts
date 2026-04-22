import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge tailwind class names safely.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
