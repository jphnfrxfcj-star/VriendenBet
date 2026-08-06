import { AdminCard, AdminPageShell, EmptyState } from '../shared'
import { prisma } from '@/lib/prisma'

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string }>
}) {
  const params = await searchParams
  const logs = await prisma.auditLog.findMany({
    where: {
      action: params.action ? { contains: params.action, mode: 'insensitive' } : undefined,
      entityType: params.entityType ? { contains: params.entityType, mode: 'insensitive' } : undefined,
    },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <AdminPageShell title="Auditlog" subtitle="Filterbare log van kritieke beheeracties, odds-overrides en walletmutaties.">
      <AdminCard title="Filters">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-2 text-sm font-black">
            Actie
            <input name="action" defaultValue={params.action} className="min-h-11 rounded-md border bg-background px-3" />
          </label>
          <label className="grid gap-2 text-sm font-black">
            Entiteit
            <input name="entityType" defaultValue={params.entityType} className="min-h-11 rounded-md border bg-background px-3" />
          </label>
          <button className="self-end rounded-md bg-primary px-4 py-3 text-sm font-black text-primary-foreground">
            Filter
          </button>
        </form>
      </AdminCard>

      <AdminCard title="Laatste auditacties">
        <div className="grid gap-2">
          {logs.length ? (
            logs.map((log) => (
              <div key={log.id} className="grid gap-2 rounded-md border bg-secondary p-3 text-sm md:grid-cols-[180px_160px_1fr_180px]">
                <strong>{log.action}</strong>
                <span className="text-muted-foreground">{log.entityType}</span>
                <span className="text-muted-foreground">
                  {log.entityId} · {log.user?.displayName ?? 'System'}
                </span>
                <span className="text-muted-foreground">{log.createdAt.toLocaleString('nl-BE')}</span>
              </div>
            ))
          ) : (
            <EmptyState>Geen auditlogs gevonden.</EmptyState>
          )}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}
