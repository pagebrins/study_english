import type { PropsWithChildren } from 'react'
import { cn } from './utils'

type CardProps = PropsWithChildren<{ className?: string }>

/**
 * Card wrapper for dark minimalist layout.
 */
export const Card = ({ className, children }: CardProps) => (
  <section className={cn('rounded-xl border border-zinc-800 bg-card p-4', className)}>
    {children}
  </section>
)
