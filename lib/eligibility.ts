import type { EventForEligibility, FootballSelectionInput } from './domain'

export function getEligibleSelectionsForMiel(event: EventForEligibility, mielParticipantId?: string) {
  if (!mielParticipantId) {
    return event.teams.map((team) => team.id)
  }

  const mielTeam = event.teams.find((team) => team.memberParticipantIds.includes(mielParticipantId))

  if (!mielTeam) {
    return event.teams.map((team) => team.id)
  }

  if (event.format === 'INDIVIDUAL') {
    return [mielTeam.id]
  }

  return [mielTeam.id]
}

export function assertEventSelectionAllowed(
  event: EventForEligibility,
  selectedTeamId: string,
  mielParticipantId?: string,
) {
  const eligible = getEligibleSelectionsForMiel(event, mielParticipantId)
  if (!eligible.includes(selectedTeamId)) {
    throw new Error('Miel mag niet inzetten op een uitkomst waarbij hij zelf verliest')
  }
}

export function getEligibleFootballSelectionsForMiel(
  selections: FootballSelectionInput[],
  mielPlays: boolean,
) {
  return selections.filter((selection) => {
    if (selection.eligibilityType === 'ADMIN_ONLY') {
      return false
    }

    if (selection.isManipulable) {
      return false
    }

    if (mielPlays && selection.eligibilityType === 'NOT_WHEN_MIEL_PLAYS') {
      return false
    }

    return true
  })
}

export function assertFootballSelectionAllowed(
  selections: FootballSelectionInput[],
  selectedId: string,
  mielPlays: boolean,
) {
  const eligibleIds = getEligibleFootballSelectionsForMiel(selections, mielPlays).map((item) => item.id)
  if (!eligibleIds.includes(selectedId)) {
    throw new Error('Deze voetbalselectie is niet toegestaan voor Miel')
  }
}
