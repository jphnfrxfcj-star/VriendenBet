import { formatOdd } from '@/lib/utils'

export function OddsButton({
  label,
  odds,
  disabled,
}: {
  label: string
  odds: number
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex min-h-16 w-full items-center justify-between rounded-md border bg-secondary px-3 py-2 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="text-sm font-extrabold leading-tight">{label}</span>
      <span className="rounded bg-primary px-2.5 py-1 text-sm font-black text-primary-foreground">
        {formatOdd(odds)}
      </span>
    </button>
  )
}
