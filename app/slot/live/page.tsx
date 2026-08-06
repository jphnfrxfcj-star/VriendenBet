import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { defaultSlotEngineConfig, type SlotGrid } from '@/lib/slot-machine'
import { formatCredits } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const fallbackGrid: SlotGrid = [
  ['pint', 'voetbal', 'bbq'],
  ['truitje-20', 'miel', 'banaan'],
  ['bus', 'premiumfles', 'wild'],
]

export default async function SlotLivePage() {
  await getSessionUser()
  const data = await getLiveData()

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:py-10">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-amber-300">Read-only</p>
        <h1 className="text-4xl font-black tracking-normal md:text-5xl">Miel Smash live</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Liveoverzicht van Miels virtuele credits, laatste spin, jackpots en recente winsten.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Credits" value={formatCredits(data.balance)} />
        <Metric label="Laatste inzet" value={formatCredits(data.lastSpin?.stake ?? 0)} />
        <Metric label="Laatste winst" value={formatCredits(data.lastSpin?.finalWin ?? 0)} />
        <Metric label="Free spins" value={String(data.freeSpins)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Laatste raster</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid aspect-square max-h-[520px] grid-cols-3 gap-2 rounded-md border border-amber-300/35 bg-[#08130d] p-2">
              {data.grid.flatMap((row, rowIndex) =>
                row.map((slug, reelIndex) => (
                  <div key={`${rowIndex}-${reelIndex}`} className="grid place-items-center rounded-md border border-white/10 bg-[#123121] p-2 text-center">
                    <div>
                      <p className="text-2xl font-black text-primary sm:text-4xl">{labelForSymbol(slug)}</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-muted-foreground">{data.symbolNames[slug] ?? slug}</p>
                    </div>
                  </div>
                )),
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Jackpots</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {data.jackpots.map((jackpot) => (
                <div key={jackpot.type} className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2">
                  <span className="font-black">{jackpot.type}</span>
                  <strong className="text-primary">{formatCredits(jackpot.currentAmount)}</strong>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recente spins</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {data.recentSpins.length ? (
                data.recentSpins.map((spin) => (
                  <div key={spin.id} className="grid gap-1 rounded-md bg-secondary px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <strong>{formatCredits(spin.stake)}</strong>
                      <strong className={spin.finalWin > 0 ? 'text-primary' : ''}>{formatCredits(spin.finalWin)}</strong>
                    </div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">{spin.featureType ?? 'Basis spin'}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Nog geen spinhistoriek.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 truncate text-2xl font-black text-primary">{value}</p>
      </CardContent>
    </Card>
  )
}

async function getLiveData() {
  try {
    const miel = await prisma.user.findFirst({ where: { role: 'MIEL', isActive: true }, include: { wallet: true } })
    const [configuration, jackpots, recentSpins, freeSpins] = await Promise.all([
      prisma.slotConfiguration.findFirst({ where: { status: 'ACTIVE', isPublished: true }, include: { symbols: true } }),
      prisma.slotJackpot.findMany({ where: { isActive: true }, orderBy: { type: 'asc' } }),
      miel ? prisma.slotSpin.findMany({ where: { userId: miel.id }, orderBy: { createdAt: 'desc' }, take: 8 }) : Promise.resolve([]),
      miel ? prisma.slotFreeSpinSession.findFirst({ where: { userId: miel.id, status: 'ACTIVE' } }) : Promise.resolve(null),
    ])
    const symbolNames = Object.fromEntries(
      (configuration?.symbols ?? defaultSlotEngineConfig.symbols).map((symbol) => [symbol.slug, symbol.name]),
    )
    return {
      balance: miel?.wallet ? Number(miel.wallet.balance) : 0,
      grid: (recentSpins[0]?.finalGridJson as SlotGrid | undefined) ?? fallbackGrid,
      symbolNames,
      lastSpin: recentSpins[0] ? { stake: Number(recentSpins[0].stake), finalWin: Number(recentSpins[0].finalWin) } : null,
      recentSpins: recentSpins.map((spin) => ({
        id: spin.id,
        stake: Number(spin.stake),
        finalWin: Number(spin.finalWin),
        featureType: spin.featureType,
      })),
      freeSpins: freeSpins?.remainingSpins ?? 0,
      jackpots: jackpots.length
        ? jackpots.map((jackpot) => ({ type: jackpot.type, currentAmount: Number(jackpot.currentAmount) }))
        : [
            { type: 'MINI', currentAmount: 100 },
            { type: 'MAJOR', currentAmount: 300 },
            { type: 'MIELPOT', currentAmount: 500 },
          ],
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error
    return {
      balance: 1000,
      grid: fallbackGrid,
      symbolNames: Object.fromEntries(defaultSlotEngineConfig.symbols.map((symbol) => [symbol.slug, symbol.name])),
      lastSpin: null,
      recentSpins: [],
      freeSpins: 0,
      jackpots: [
        { type: 'MINI', currentAmount: 100 },
        { type: 'MAJOR', currentAmount: 300 },
        { type: 'MIELPOT', currentAmount: 500 },
      ],
    }
  }
}

function labelForSymbol(slug: string) {
  if (slug === 'truitje-20') return '20'
  if (slug === 'gouden-gorilla') return 'GG'
  return slug.slice(0, 2).toUpperCase()
}
