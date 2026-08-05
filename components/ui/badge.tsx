import * as React from 'react'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  OPEN: 'border-primary/50 bg-primary/15 text-primary',
  ODDS_READY: 'border-primary/50 bg-primary/15 text-primary',
  LIVE: 'border-amber-400/50 bg-amber-400/15 text-amber-300',
  SETTLED: 'border-sky-300/50 bg-sky-300/15 text-sky-200',
  CANCELLED: 'border-destructive/50 bg-destructive/15 text-destructive',
  DRAFT: 'border-muted bg-muted text-muted-foreground',
}

export function Badge({
  className,
  children,
  status,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { status?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black uppercase',
        status ? statusStyles[status] ?? statusStyles.DRAFT : statusStyles.DRAFT,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
