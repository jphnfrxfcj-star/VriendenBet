import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), transaction: vi.fn(), tx: { wallet: { updateMany: vi.fn() }, walletTransaction: { create: vi.fn() }, auditLog: { create: vi.fn() } } }))
vi.mock('@/lib/auth', () => ({ requireRole: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: mocks.transaction } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { adjustWalletAction } from '../app/admin/actions'

function form(amount = '25', reason = 'Bonus', type = 'BONUS') {
  const data = new FormData()
  Object.entries({ walletId: 'wallet', amount, reason, type }).forEach(([key, value]) => data.set(key, value))
  return data
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ userId: 'admin' })
  mocks.transaction.mockImplementation((fn) => fn(mocks.tx))
  mocks.tx.wallet.updateMany.mockResolvedValue({ count: 1 })
})

it('adds money with a short reason and records the transaction', async () => {
  expect((await adjustWalletAction(form())).ok).toBe(true)
  expect(mocks.tx.walletTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ description: 'Bonus', type: 'BONUS' }) })
  expect(mocks.tx.wallet.updateMany.mock.calls[0][0].data.balance.increment.toString()).toBe('25')
  expect(mocks.tx.auditLog.create).toHaveBeenCalled()
})
it.each(['12,50', '12.50'])('accepts decimal amount %s', async (amount) => {
  expect((await adjustWalletAction(form(amount))).ok).toBe(true)
  expect(mocks.tx.wallet.updateMany.mock.calls[0][0].data.balance.increment.toString()).toBe('12.5')
})
it.each(['', '0', 'abc', '1.234', '100000000', 'Infinity'])('rejects invalid amount %s without writes', async (amount) => {
  expect((await adjustWalletAction(form(amount))).ok).toBe(false)
  expect(mocks.transaction).not.toHaveBeenCalled()
})
it('rejects missing reason, invalid type and negative bonus', async () => {
  expect((await adjustWalletAction(form('25', ' '))).ok).toBe(false)
  expect((await adjustWalletAction(form('25', 'Bonus', 'BET_WIN'))).ok).toBe(false)
  expect((await adjustWalletAction(form('-25'))).ok).toBe(false)
  expect(mocks.transaction).not.toHaveBeenCalled()
})
it('uses an atomic balance condition for deductions and does not log a failed update', async () => {
  mocks.tx.wallet.updateMany.mockResolvedValue({ count: 0 })
  expect((await adjustWalletAction(form('-25', 'Fout', 'ADMIN_ADJUSTMENT'))).ok).toBe(false)
  expect(mocks.tx.wallet.updateMany.mock.calls[0][0].where.balance.gte.toString()).toBe('25')
  expect(mocks.tx.walletTransaction.create).not.toHaveBeenCalled()
  expect(mocks.tx.auditLog.create).not.toHaveBeenCalled()
})
it('requires admin access', async () => {
  mocks.auth.mockRejectedValue(new Error('Geen toegang'))
  await expect(adjustWalletAction(form())).rejects.toThrow('Geen toegang')
  expect(mocks.transaction).not.toHaveBeenCalled()
})
