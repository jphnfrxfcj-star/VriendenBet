import { AdminSection } from '../shared'
import { weekendEvents } from '@/lib/demo-data'

export default function AdminEventsPage() {
  return <AdminSection title="Evenementenbeheer" rows={weekendEvents.map((event) => [event.title, event.status, event.startsAt])} />
}
