import { AdminSection } from '../shared'
import { attributes } from '@/lib/demo-data'

export default function AdminAttributesPage() {
  return <AdminSection title="Eigenschappenbeheer" rows={attributes.map((item) => [item, 'Score 1-10', 'Actief'])} />
}
