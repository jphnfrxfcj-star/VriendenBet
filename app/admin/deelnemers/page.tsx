import { AdminSection } from '../shared'
import { participants } from '@/lib/demo-data'

export default function AdminParticipantsPage() {
  return <AdminSection title="Deelnemersbeheer" rows={participants.map((item) => [item.name, item.nickname ?? 'Actief', 'Scores gekoppeld'])} />
}
