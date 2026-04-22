import type { InputHTMLAttributes } from 'react'
import { cn } from './utils'

type InputProps = InputHTMLAttributes<HTMLInputElement>

/**
 * Reusable input primitive.
 */
export const Input = ({ className, ...props }: InputProps) => (
  <input
    className={cn(
      'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm outline-none',
      'focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600',
      className,
    )}
    {...props}
  />
)
