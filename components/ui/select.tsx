import * as React from 'react'
import { cn } from '@/lib/utils'

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'min-h-11 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring',
        className,
      )}
      {...props}
    />
  )
}
