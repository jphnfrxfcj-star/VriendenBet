import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), transaction: vi.fn(), team: { findUniqueOrThrow: vi.fn(), update: vi.fn() }, selection: { findUniqueOrThrow: vi.fn(), update: vi.fn() }, create: vi.fn() }))
vi.mock('@/lib/auth', () => ({ requireRole: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: mocks.transaction, eventTeam: mocks.team, footballSelection: mocks.selection, oddsOverride: { create: mocks.create }, auditLog: { create: mocks.create } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { overrideEventTeamOddsAction, overrideFootballSelectionOddsAction } from '../app/admin/actions'
function form(odd = '2,50', reason = 'Fout') { const data = new FormData(); for (const [key, value] of Object.entries({ id: 'team', overriddenOdds: odd, reason })) data.set(key, value); return data }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ userId: 'admin' })
  mocks.team.findUniqueOrThrow.mockResolvedValue({ calculatedOdds: 2, event: { status: 'ODDS_READY' } })
  mocks.selection.findUniqueOrThrow.mockResolvedValue({ finalOdds: 2 })
})
it.each([overrideEventTeamOddsAction, overrideFootballSelectionOddsAction])('accepts short reasons and decimal commas', async (action) => {
  expect((await action(form())).ok).toBe(true)
  expect(mocks.transaction).toHaveBeenCalled()
  expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ overriddenOdds: 2.5, reason: 'Fout' }) })
})
it.each(['0', '-2', '1', 'NaN', '2.555', '1000000'])('rejects invalid odds %s', async (odd) => {
  expect((await overrideEventTeamOddsAction(form(odd))).ok).toBe(false)
  expect((await overrideFootballSelectionOddsAction(form(odd))).ok).toBe(false)
  expect(mocks.transaction).not.toHaveBeenCalled()
})
it('reports missing reason or missing calculated odds', async () => {
  expect((await overrideEventTeamOddsAction(form('2', ''))).ok).toBe(false)
  mocks.team.findUniqueOrThrow.mockResolvedValue({ event: { status: 'OPEN_FOR_SELECTION' } })
  expect((await overrideEventTeamOddsAction(form())).ok).toBe(false)
  expect(mocks.transaction).not.toHaveBeenCalled()
})
it('requires admin and protects finished games', async () => {
  mocks.team.findUniqueOrThrow.mockResolvedValue({ calculatedOdds: 2, event: { status: 'SETTLED' } })
  expect((await overrideEventTeamOddsAction(form())).ok).toBe(false)
  mocks.auth.mockRejectedValue(new Error('Geen toegang'))
  await expect(overrideEventTeamOddsAction(form())).rejects.toThrow()
  expect(mocks.transaction).not.toHaveBeenCalled()
})
