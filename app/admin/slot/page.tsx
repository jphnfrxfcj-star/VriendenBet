import { Prisma } from '@prisma/client'
import { AdminCard, AdminPageShell, CheckField, EmptyState, Field, SubmitButton, TextField } from '../shared'
import {
  completeSlotChallengeAssignmentAction,
  createSlotChallengeAction,
  createSlotDraftFromActiveAction,
  publishSlotConfigurationAction,
  updateSlotBonusSegmentAction,
  updateSlotConfigurationAction,
  updateSlotJackpotAction,
  updateSlotSymbolAction,
} from './actions'
import { prisma } from '@/lib/prisma'
import { formatCredits } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminSlotPage() {
  const data = await getAdminSlotData()
  const editableConfig = data.draft ?? data.active
  const canEdit = editableConfig?.status === 'DRAFT'

  return (
    <AdminPageShell
      title="Slotbeheer"
      subtitle="Beheer Miel Smash zonder losse spinresultaten te manipuleren. Gepubliceerde configuraties blijven read-only; wijzigingen gebeuren via een conceptversie."
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Status" value={data.active ? 'Actief' : 'Niet actief'} />
        <Metric label="Versie" value={data.active ? `v${data.active.version}` : '-'} />
        <Metric label="Spins" value={String(data.totalSpins)} />
        <Metric label="Ingezet" value={formatCredits(data.totalStake)} />
        <Metric label="Uitgekeerd" value={formatCredits(data.totalWin)} />
        <Metric label="RTP" value={`${Math.round(data.rtp * 100)}%`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <AdminCard title="Configuratie">
          {editableConfig ? (
            <form action={updateSlotConfigurationAction} className="grid gap-3">
              <input type="hidden" name="id" value={editableConfig.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Naam" name="name" defaultValue={editableConfig.name} required />
                <Field label="Inzetten" name="availableStakes" defaultValue={stakesText(editableConfig.availableStakesJson)} required />
                <Field label="Max winst multiplier" name="maxWinMultiplier" type="number" defaultValue={editableConfig.maxWinMultiplier} min={1} required />
                <Field label="Volatiliteit" name="volatility" defaultValue={editableConfig.volatility} required />
                <Field label="Target RTP" name="targetRtp" type="number" step="0.01" defaultValue={editableConfig.targetRtp ? Number(editableConfig.targetRtp) : ''} />
                <Field label="Miel Smash kans" name="gorillaFeatureChance" type="number" step="0.001" defaultValue={Number(editableConfig.gorillaFeatureChance)} />
                <Field label="Scatter kans" name="scatterFeatureChance" type="number" step="0.001" defaultValue={Number(editableConfig.scatterFeatureChance)} />
                <Field label="Bonus kans" name="bonusFeatureChance" type="number" step="0.001" defaultValue={Number(editableConfig.bonusFeatureChance)} />
              </div>
              <Field label="Free spin retrigger kans" name="freeSpinRetriggerChance" type="number" step="0.001" defaultValue={Number(editableConfig.freeSpinRetriggerChance)} />
              <div className="flex flex-wrap gap-2">
                <SubmitButton disabled={!canEdit}>Concept opslaan</SubmitButton>
              </div>
              {!canEdit ? <p className="text-sm text-muted-foreground">Maak eerst een conceptversie om instellingen te wijzigen.</p> : null}
            </form>
          ) : (
            <EmptyState>Geen slotconfiguratie gevonden. Draai de seed opnieuw.</EmptyState>
          )}
        </AdminCard>

        <AdminCard title="Publicatie">
          <div className="grid gap-3">
            <div className="rounded-md bg-secondary p-3 text-sm">
              <p className="font-black">Actief: {data.active ? `v${data.active.version} - ${data.active.name}` : 'geen'}</p>
              <p className="text-muted-foreground">Concept: {data.draft ? `v${data.draft.version} - ${data.draft.name}` : 'geen'}</p>
            </div>
            <form action={createSlotDraftFromActiveAction}>
              <SubmitButton>Nieuw concept maken</SubmitButton>
            </form>
            {data.draft ? (
              <form action={publishSlotConfigurationAction}>
                <input type="hidden" name="id" value={data.draft.id} />
                <SubmitButton>Concept publiceren</SubmitButton>
              </form>
            ) : null}
          </div>
        </AdminCard>
      </section>

      <AdminCard title="Symbolen">
        <div className="grid gap-3 lg:grid-cols-2">
          {(editableConfig?.symbols ?? []).map((symbol) => (
            <form key={symbol.id} action={updateSlotSymbolAction} className="grid gap-3 rounded-md border bg-secondary p-3">
              <input type="hidden" name="id" value={symbol.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Naam" name="name" defaultValue={symbol.name} />
                <Field label="Asset" name="assetUrl" defaultValue={symbol.assetUrl} />
                <Field label="Gewicht" name="reelWeight" type="number" defaultValue={symbol.reelWeight} min={0} />
                <Field label="3-symbol multiplier" name="payoutMultiplierThree" type="number" defaultValue={symbol.payoutMultiplierThree ? Number(symbol.payoutMultiplierThree) : ''} min={0} />
              </div>
              <CheckField label="Actief" name="isActive" defaultChecked={symbol.isActive} />
              <SubmitButton disabled={!canEdit}>Symbool opslaan</SubmitButton>
            </form>
          ))}
        </div>
      </AdminCard>

      <section className="grid gap-5 xl:grid-cols-2">
        <AdminCard title="Paylines">
          <div className="grid gap-2">
            {(editableConfig?.paylines ?? []).map((payline) => (
              <div key={payline.id} className="rounded-md bg-secondary p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <strong>{payline.name}</strong>
                  <span className={payline.isActive ? 'text-primary' : 'text-muted-foreground'}>{payline.isActive ? 'Actief' : 'Uit'}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{JSON.stringify(payline.positionsJson)}</p>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Bonuswiel">
          <div className="grid gap-3">
            {(editableConfig?.bonusWheelConfigurations[0]?.segments ?? []).map((segment) => (
              <form key={segment.id} action={updateSlotBonusSegmentAction} className="grid gap-3 rounded-md bg-secondary p-3">
                <input type="hidden" name="id" value={segment.id} />
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Label" name="label" defaultValue={segment.label} />
                  <Field label="Waarde" name="value" type="number" defaultValue={segment.value} />
                  <Field label="Gewicht" name="weight" type="number" defaultValue={segment.weight} min={0} />
                </div>
                <CheckField label="Actief" name="isActive" defaultChecked={segment.isActive} />
                <SubmitButton disabled={!canEdit}>Segment opslaan</SubmitButton>
              </form>
            ))}
          </div>
        </AdminCard>
      </section>

      <AdminCard title="Jackpots">
        <div className="grid gap-3 lg:grid-cols-3">
          {data.jackpots.map((jackpot) => (
            <form key={jackpot.id} action={updateSlotJackpotAction} className="grid gap-3 rounded-md border bg-secondary p-3">
              <input type="hidden" name="id" value={jackpot.id} />
              <h3 className="text-lg font-black">{jackpot.type}</h3>
              <Field label="Start" name="startAmount" type="number" defaultValue={Number(jackpot.startAmount)} />
              <Field label="Huidig" name="currentAmount" type="number" defaultValue={Number(jackpot.currentAmount)} />
              <Field label="Groei per spin" name="contributionRate" type="number" step="0.001" defaultValue={Number(jackpot.contributionRate)} />
              <Field label="Triggerkans" name="triggerChance" type="number" step="0.0001" defaultValue={jackpot.triggerChance ? Number(jackpot.triggerChance) : 0} />
              <TextField label="Reden" name="reason" rows={2} placeholder="Waarom wijzig je deze jackpot?" />
              <CheckField label="Actief" name="isActive" defaultChecked={jackpot.isActive} />
              <SubmitButton>Jackpot opslaan</SubmitButton>
            </form>
          ))}
        </div>
      </AdminCard>

      <section className="grid gap-5 xl:grid-cols-2">
        <AdminCard title="Mystery challenges">
          <form action={createSlotChallengeAction} className="mb-4 grid gap-3 rounded-md border bg-secondary p-3">
            <Field label="Titel" name="title" placeholder="Nieuwe opdracht" required />
            <TextField label="Omschrijving" name="description" rows={3} placeholder="Korte opdracht voor Miel" />
            <Field label="Beloning credits" name="rewardCredits" type="number" min={0} />
            <SubmitButton>Challenge toevoegen</SubmitButton>
          </form>
          <div className="grid gap-2">
            {data.challenges.map((challenge) => (
              <div key={challenge.id} className="rounded-md bg-secondary p-3 text-sm">
                <strong>{challenge.title}</strong>
                <p className="mt-1 text-muted-foreground">{challenge.description}</p>
                <p className="mt-2 font-bold text-primary">Beloning: {formatCredits(challenge.rewardCredits ?? 0)}</p>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Openstaande challenges">
          <div className="grid gap-3">
            {data.openAssignments.length ? (
              data.openAssignments.map((assignment) => (
                <form key={assignment.id} action={completeSlotChallengeAssignmentAction} className="rounded-md bg-secondary p-3 text-sm">
                  <input type="hidden" name="id" value={assignment.id} />
                  <strong>{assignment.challenge.title}</strong>
                  <p className="mt-1 text-muted-foreground">{assignment.challenge.description}</p>
                  <p className="mt-2 text-xs font-black uppercase text-primary">{assignment.user.displayName}</p>
                  <div className="mt-3">
                    <SubmitButton>Voltooid en belonen</SubmitButton>
                  </div>
                </form>
              ))
            ) : (
              <EmptyState>Geen openstaande slotchallenges.</EmptyState>
            )}
          </div>
        </AdminCard>
      </section>

      <AdminCard title="Recente spins">
        <div className="grid gap-2">
          {data.recentSpins.length ? (
            data.recentSpins.map((spin) => (
              <div key={spin.id} className="grid gap-2 rounded-md bg-secondary p-3 text-sm md:grid-cols-6">
                <strong>{spin.user.displayName}</strong>
                <span>Inzet {formatCredits(Number(spin.stake))}</span>
                <span>Winst {formatCredits(Number(spin.finalWin))}</span>
                <span>{spin.featureType ?? 'Basis'}</span>
                <span>{spin.status}</span>
                <span className="text-muted-foreground">v{spin.configuration.version}</span>
              </div>
            ))
          ) : (
            <EmptyState>Nog geen spins.</EmptyState>
          )}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-2xl font-black text-primary">{value}</p>
    </div>
  )
}

async function getAdminSlotData() {
  const [active, draft, spinsAggregate, totalSpins, hitSpins, jackpots, challenges, openAssignments, recentSpins] =
    await Promise.all([
      prisma.slotConfiguration.findFirst({
        where: { status: 'ACTIVE', isPublished: true },
        include: {
          symbols: { orderBy: { sortOrder: 'asc' } },
          paylines: { orderBy: { sortOrder: 'asc' } },
          bonusWheelConfigurations: { include: { segments: { orderBy: { sortOrder: 'asc' } } } },
        },
      }),
      prisma.slotConfiguration.findFirst({
        where: { status: 'DRAFT' },
        orderBy: { version: 'desc' },
        include: {
          symbols: { orderBy: { sortOrder: 'asc' } },
          paylines: { orderBy: { sortOrder: 'asc' } },
          bonusWheelConfigurations: { include: { segments: { orderBy: { sortOrder: 'asc' } } } },
        },
      }),
      prisma.slotSpin.aggregate({ _sum: { stake: true, finalWin: true }, _max: { finalWin: true } }),
      prisma.slotSpin.count(),
      prisma.slotSpin.count({ where: { finalWin: { gt: 0 } } }),
      prisma.slotJackpot.findMany({ orderBy: { type: 'asc' } }),
      prisma.slotChallenge.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.slotChallengeAssignment.findMany({
        where: { status: 'PENDING' },
        include: { challenge: true, user: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.slotSpin.findMany({
        include: { user: true, configuration: true },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ])

  const totalStake = Number(spinsAggregate._sum.stake ?? 0)
  const totalWin = Number(spinsAggregate._sum.finalWin ?? 0)

  return {
    active,
    draft,
    totalSpins,
    hitFrequency: totalSpins ? hitSpins / totalSpins : 0,
    biggestWin: Number(spinsAggregate._max.finalWin ?? 0),
    totalStake,
    totalWin,
    rtp: totalStake ? totalWin / totalStake : 0,
    jackpots,
    challenges,
    openAssignments,
    recentSpins,
  }
}

function stakesText(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value.join(', ') : ''
}
