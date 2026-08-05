import { AdminSection } from '../shared'

export default function AdminAuditPage() {
  return <AdminSection title="Auditlog" rows={[['SEED_DATABASE', 'System', 'Basisdata'], ['ODDS_OVERRIDE', 'EventTeam', 'Reden verplicht'], ['WALLET_ADJUSTMENT', 'Wallet', 'Saldo-impact gelogd']]} />
}
