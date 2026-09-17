import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  create: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('@/lib/prisma', () => ({ prisma: { gameSuggestion: { create: mocks.create } } }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { submitSuggestionAction } from '../app/actions/suggestions'

const request = {
  title: 'Kubb',
  description: '',
  proposedRules: '',
  proposedFormat: 'TEAM' as const,
  proposedTeamCount: 2,
  proposedPlayersPerTeam: 1,
  proposedAttributes: [],
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.create.mockResolvedValue({ id: 'request' })
})

describe('spelaanvraag indienen', () => {
  it('laat een anonieme aanvraag zonder omschrijving toe', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    await expect(submitSuggestionAction(request)).resolves.toEqual({
      ok: true,
      message: 'Spelaanvraag ingediend',
    })
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submittedByUserId: undefined,
        title: 'Kubb',
        description: '',
      }),
    })
  })

  it('koppelt de gebruiker wanneer die wel ingelogd is', async () => {
    mocks.getSessionUser.mockResolvedValue({ userId: 'viewer', role: 'VIEWER', displayName: 'Jan' })
    await submitSuggestionAction(request)
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ submittedByUserId: 'viewer' }),
    })
  })

  it('weigert een lege spelnaam maar niet een lege omschrijving', async () => {
    const result = await submitSuggestionAction({ ...request, title: ' ' })
    expect(result.ok).toBe(false)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
