import { AdminSection } from '../shared'
import { footballMatch } from '@/lib/demo-data'

export default function AdminFootballPage() {
  return <AdminSection title="Voetbalwedstrijdbeheer" rows={footballMatch.selections.map((selection) => [selection.label, `@ ${selection.finalOdds}`, selection.eligibilityType])} />
}
