import { AdminSection } from '../shared'
import { wallet } from '@/lib/demo-data'
import { formatCredits } from '@/lib/utils'

export default function AdminWalletPage() {
  return <AdminSection title="Walletbeheer" rows={[['Miel', formatCredits(wallet.balance), 'Correctie vereist reden'], ['Startsaldo', '1000 credits', 'STARTING_BALANCE']]} />
}
