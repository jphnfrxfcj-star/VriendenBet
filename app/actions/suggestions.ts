'use server'

import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { suggestionSchema } from '@/lib/validation'

export async function submitSuggestionAction(input: unknown) {
  const parsed = suggestionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Controleer je voorstel' }
  }

  const session = await getSessionUser()
  if (!session) {
    return { ok: false, message: 'Log in om een spel voor te stellen' }
  }

  await prisma.gameSuggestion.create({
    data: {
      submittedByUserId: session.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      proposedRules: parsed.data.proposedRules,
      proposedFormat: parsed.data.proposedFormat,
      proposedTeamCount: parsed.data.proposedTeamCount,
      proposedPlayersPerTeam: parsed.data.proposedPlayersPerTeam,
      proposedAttributesJson: parsed.data.proposedAttributes.length
        ? { selected: parsed.data.proposedAttributes }
        : undefined,
    },
  })

  revalidatePath('/spel-voorstellen')
  return { ok: true, message: 'Voorstel ingediend' }
}
