import { beforeEach, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), transaction: vi.fn(),
  tx: {
    event: { findUniqueOrThrow: vi.fn(), delete: vi.fn(), count: vi.fn() },
    gameSuggestion: { delete: vi.fn(), update: vi.fn() },
    gameTemplate: { deleteMany: vi.fn() },
    participant: { findUniqueOrThrow: vi.fn(), delete: vi.fn() },
    gameTemplateAttribute: { count: vi.fn() },
    attribute: { delete: vi.fn() },
    footballMatch: { delete: vi.fn() },
    footballMarket: { delete: vi.fn() },
    footballSelection: { delete: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))
vi.mock('@/lib/auth', () => ({ requireRole: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: mocks.transaction } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { deleteAdminItem } from '../app/admin/delete-actions'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ userId: 'admin' })
  mocks.transaction.mockImplementation((fn) => fn(mocks.tx))
})

it('requires admin authorization before touching data', async () => {
  mocks.auth.mockRejectedValue(new Error('Geen toegang'))
  await expect(deleteAdminItem('event', 'id')).rejects.toThrow('Geen toegang')
  expect(mocks.auth).toHaveBeenCalledWith(['ADMIN'])
  expect(mocks.transaction).not.toHaveBeenCalled()
})

it('preserves games with bets, including settled bets', async () => {
  mocks.tx.event.findUniqueOrThrow.mockResolvedValue({ _count: { bets: 1 }, status: 'SETTLED' })
  expect((await deleteAdminItem('event', 'id')).ok).toBe(false)
  expect(mocks.tx.event.delete).not.toHaveBeenCalled()
})

it('deletes unused games and keeps the source request out of the approval queue', async () => {
  mocks.tx.event.findUniqueOrThrow.mockResolvedValue({ _count: { bets: 0 }, sourceSuggestionId: 'request', gameTemplateId: 'config' })
  expect((await deleteAdminItem('event', 'id')).ok).toBe(true)
  expect(mocks.tx.gameSuggestion.update).toHaveBeenCalledWith({ where: { id: 'request' }, data: { status: 'REJECTED' } })
  expect(mocks.tx.auditLog.create).toHaveBeenCalled()
  expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
})

it('protects converted requests', async () => {
  mocks.tx.event.count.mockResolvedValue(1)
  expect((await deleteAdminItem('suggestion', 'id')).ok).toBe(false)
  expect(mocks.tx.gameSuggestion.delete).not.toHaveBeenCalled()
})

it.each(['user', 'events', 'teamMembers'])('protects participants with %s links', async (relation) => {
  mocks.tx.participant.findUniqueOrThrow.mockResolvedValue({ _count: { [relation]: 1 } })
  expect((await deleteAdminItem('participant', 'id')).ok).toBe(false)
  expect(mocks.tx.participant.delete).not.toHaveBeenCalled()
})

it('protects parameters used in game calculations', async () => {
  mocks.tx.gameTemplateAttribute.count.mockResolvedValue(1)
  expect((await deleteAdminItem('attribute', 'id')).ok).toBe(false)
  expect(mocks.tx.attribute.delete).not.toHaveBeenCalled()
})

it.each(['footballMatch', 'footballMarket', 'footballSelection'] as const)('reports protected %s without logging a deletion', async (kind) => {
  mocks.tx[kind].delete.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003', clientVersion: '6' }))
  expect(await deleteAdminItem(kind, 'id')).toEqual({ ok: false, message: expect.stringContaining('gekoppeld') })
  expect(mocks.tx.auditLog.create).not.toHaveBeenCalled()
})

it('rejects unsupported deletion types', async () => {
  expect((await deleteAdminItem('wallet', 'id')).ok).toBe(false)
  expect(mocks.tx.auditLog.create).not.toHaveBeenCalled()
})
