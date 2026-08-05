import { Badge } from '@/components/ui/badge'

const labels: Record<string, string> = {
  DRAFT: 'Concept',
  OPEN_FOR_SELECTION: 'Selectie open',
  ODDS_READY: 'Open',
  BET_PLACED: 'Bet geplaatst',
  IN_PROGRESS: 'Live',
  SETTLED: 'Afgehandeld',
  CANCELLED: 'Geannuleerd',
  OPEN: 'Open',
  LIVE: 'Live',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge status={status}>{labels[status] ?? status}</Badge>
}
