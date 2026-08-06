import { adjustWalletAction } from '../actions'
import { AdminCard, AdminPageShell, EmptyState, Field, SelectField, SubmitButton } from '../shared'
import { prisma } from '@/lib/prisma'
import { formatCredits } from '@/lib/utils'

export default async function AdminWalletPage() {
  const wallets = await prisma.wallet.findMany({
    include: {
      user: true,
      transactions: { orderBy: { createdAt: 'desc' }, take: 25 },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <AdminPageShell title="Walletbeheer" subtitle="Beheer Miels saldo, bonussen, correcties en transactielog.">
      <AdminCard title="Saldo aanpassen">
        {wallets.length ? (
          <form action={adjustWalletAction} className="grid gap-4 md:grid-cols-2">
            <SelectField
              name="walletId"
              label="Wallet"
              options={wallets.map((wallet) => ({
                value: wallet.id,
                label: `${wallet.user.displayName} · ${formatCredits(Number(wallet.balance))}`,
              }))}
            />
            <SelectField
              name="type"
              label="Type"
              defaultValue="ADMIN_ADJUSTMENT"
              options={[
                { value: 'ADMIN_ADJUSTMENT', label: 'Correctie' },
                { value: 'BONUS', label: 'Bonus' },
              ]}
            />
            <Field name="amount" label="Bedrag" type="number" step="1" required />
            <Field name="reason" label="Reden" placeholder="Verplicht" required />
            <div className="md:col-span-2">
              <SubmitButton>Saldo aanpassen</SubmitButton>
            </div>
          </form>
        ) : (
          <EmptyState>Geen wallets gevonden. Alleen Miel hoort een wallet te hebben.</EmptyState>
        )}
      </AdminCard>

      <AdminCard title="Wallets en transacties">
        <div className="grid gap-4">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="rounded-md border bg-secondary p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-black">{wallet.user.displayName}</h2>
                <strong className="text-primary">{formatCredits(Number(wallet.balance))}</strong>
              </div>
              <div className="mt-3 grid gap-2">
                {wallet.transactions.map((transaction) => (
                  <div key={transaction.id} className="grid gap-1 rounded-md bg-background p-3 text-sm md:grid-cols-[160px_120px_1fr]">
                    <span className="font-black">{transaction.type}</span>
                    <span className={Number(transaction.amount) >= 0 ? 'text-primary' : 'text-destructive'}>
                      {formatCredits(Number(transaction.amount))}
                    </span>
                    <span className="text-muted-foreground">{transaction.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}
