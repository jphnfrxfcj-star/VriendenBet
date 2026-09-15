import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  attribute: { findMany: vi.fn() },
  participantAttribute: { upsert: vi.fn() },
  gameTemplateAttribute: { upsert: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({ requireRole: mocks.requireRole }))
vi.mock('@/lib/prisma', () => ({ prisma: mocks }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { setParticipantScoresAction, setTemplateWeightsAction } from '../app/admin/actions'

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireRole.mockResolvedValue({ userId: 'admin' })
  mocks.attribute.findMany.mockResolvedValue([{ id: 'kracht', minValue: 0, maxValue: 10 }, { id: 'IQ', minValue: 0, maxValue: 10 }])
})
describe('Samen opslaan in beheer', () => {
  it('slaat nul en decimalen op en laat lege scores ongemoeid', async () => {
    await setParticipantScoresAction(form({ participantId: 'p1', 'score:kracht': '0', 'score:IQ': '7.5', 'score:EQ': '' }))
    expect(mocks.participantAttribute.upsert).toHaveBeenCalledTimes(2)
    expect(mocks.participantAttribute.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { score: 0 } }))
    expect(mocks.participantAttribute.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { score: 7.5 } }))
    expect(mocks.$transaction).toHaveBeenCalledTimes(1)
  })
  it('weigert alle wijzigingen als een score buiten de schaal valt', async () => {
    await expect(setParticipantScoresAction(form({ participantId: 'p1', 'score:kracht': '5', 'score:IQ': '11' }))).rejects.toThrow()
    expect(mocks.participantAttribute.upsert).not.toHaveBeenCalled()
    expect(mocks.$transaction).not.toHaveBeenCalled()
  })
  it('slaat alle spelgewichten samen op', async () => {
    await setTemplateWeightsAction(form({ gameTemplateId: 'g1', 'weight:kracht': '0.7', 'weight:IQ': '0.3' }))
    expect(mocks.gameTemplateAttribute.upsert).toHaveBeenCalledTimes(2)
    expect(mocks.$transaction).toHaveBeenCalledTimes(1)
  })
  it('weigert ongeldige gewichten voordat er iets wordt opgeslagen', async () => {
    await expect(setTemplateWeightsAction(form({ gameTemplateId: 'g1', 'weight:kracht': 'NaN' }))).rejects.toThrow()
    expect(mocks.gameTemplateAttribute.upsert).not.toHaveBeenCalled()
  })
})
