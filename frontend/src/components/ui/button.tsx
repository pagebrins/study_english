import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from './utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-white text-black hover:bg-zinc-200',
        outline: 'border border-zinc-700 bg-zinc-900 hover:bg-zinc-800',
        ghost: 'hover:bg-zinc-800',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

/**
 * Reusable button primitive.
 */
export const Button = ({ className, variant, size, ...props }: ButtonProps) => (
  <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
)
