import Link from 'next/link'
import { Shield, Tv } from 'lucide-react'
import { SlotMachine } from './SlotMachine'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { defaultSlotEngineConfig, type SlotSpinEvaluation } from '@/lib/slot-machine'
import { formatCredits } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function SlotPage() {
  const user = await getSessionUser()
  const data = await getSlotPageData(user?.userId)
  const canSpin = user?.role === 'MIEL'

  return (
    <div className="relative isolate w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[780px] bg-[url('/slot/miel-smash-backdrop.jpg')] bg-cover bg-center opacity-55" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[780px] bg-gradient-to-b from-background/10 via-background/62 to-background" />
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:py-10">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-black uppercase text-amber-300">Miel only</p>
          <h1 className="text-4xl font-black tracking-normal md:text-6xl">Miel Smash</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Originele virtuele slotmodule binnen MielBet. Credits hebben geen geldwaarde en er is geen cash-out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/slot/live" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-black">
            <Tv className="size-4" />
            Live
          </Link>
          {user?.role === 'ADMIN' ? (
            <Link href="/admin/slot" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-black text-primary-foreground">
              <Shield className="size-4" />
              Beheer
            </Link>
          ) : null}
        </div>
      </div>

      <SlotMachine
        canSpin={canSpin}
        initialBalance={data.balance}
        availableStakes={data.availableStakes}
        symbols={data.symbols}
        jackpots={data.jackpots}
        recentSpins={data.recentSpins}
        activeFreeSpins={data.activeFreeSpins}
        initialGrid={data.lastGrid}
      />

      <section className="grid gap-3 rounded-md border bg-card p-4 text-sm text-muted-foreground md:grid-cols-3">
        <p>
          <strong className="text-foreground">Paylines:</strong> vijf lijnen over een 3 bij 3 raster.
        </p>
        <p>
          <strong className="text-foreground">Wallet:</strong> huidige credits {formatCredits(data.balance)}.
        </p>
        <p>
          <strong className="text-foreground">Server:</strong> randomness, wallet en resultaat worden niet in de browser berekend.
        </p>
      </section>
    </div>
    </div>
  )
}

async function getSlotPageData(userId?: string) {
  try {
    const mielUser =
      userId ? await prisma.user.findUnique({ where: { id: userId }, include: { wallet: true } }) : null
    const fallbackMiel = mielUser?.role === 'MIEL' ? mielUser : await prisma.user.findFirst({ where: { role: 'MIEL', isActive: true }, include: { wallet: true } })
    const [configuration, jackpots, recentSpins, activeFreeSpinSession] = await Promise.all([
      prisma.slotConfiguration.findFirst({
        where: { status: 'ACTIVE', isPublished: true },
        include: {
          symbols: { orderBy: { sortOrder: 'asc' } },
          paylines: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      prisma.slotJackpot.findMany({ where: { isActive: true }, orderBy: { type: 'asc' } }),
      fallbackMiel
        ? prisma.slotSpin.findMany({ where: { userId: fallbackMiel.id }, orderBy: { createdAt: 'desc' }, take: 8 })
        : Promise.resolve([]),
      fallbackMiel
        ? prisma.slotFreeSpinSession.findFirst({ where: { userId: fallbackMiel.id, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } })
        : Promise.resolve(null),
    ])

    return {
      balance: fallbackMiel?.wallet ? Number(fallbackMiel.wallet.balance) : 0,
      availableStakes: Array.isArray(configuration?.availableStakesJson)
        ? configuration.availableStakesJson.map(Number).filter(Number.isFinite)
        : defaultSlotEngineConfig.availableStakes,
      symbols: (configuration?.symbols ?? defaultSlotEngineConfig.symbols).map((symbol) => ({
        slug: symbol.slug,
        name: symbol.name,
        assetUrl: symbol.assetUrl,
        type: symbol.type,
        isWild: symbol.isWild,
        isScatter: symbol.isScatter,
        isBonus: symbol.isBonus,
      })),
      jackpots: jackpots.length
        ? jackpots.map((jackpot) => ({ type: jackpot.type, currentAmount: Number(jackpot.currentAmount) }))
        : [
            { type: 'MINI', currentAmount: 100 },
            { type: 'MAJOR', currentAmount: 300 },
            { type: 'MIELPOT', currentAmount: 500 },
          ],
      recentSpins: recentSpins.map((spin) => ({
        id: spin.id,
        stake: Number(spin.stake),
        finalWin: Number(spin.finalWin),
        featureType: spin.featureType,
        createdAt: spin.createdAt.toISOString(),
      })),
      activeFreeSpins: activeFreeSpinSession?.remainingSpins ?? 0,
      lastGrid: recentSpins[0]?.finalGridJson as SlotSpinEvaluation['finalGrid'] | undefined,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }

    return {
      balance: 1000,
      availableStakes: defaultSlotEngineConfig.availableStakes,
      symbols: defaultSlotEngineConfig.symbols.map((symbol) => ({
        slug: symbol.slug,
        name: symbol.name,
        assetUrl: symbol.assetUrl,
        type: symbol.type,
        isWild: symbol.isWild,
        isScatter: symbol.isScatter,
        isBonus: symbol.isBonus,
      })),
      jackpots: [
        { type: 'MINI', currentAmount: 100 },
        { type: 'MAJOR', currentAmount: 300 },
        { type: 'MIELPOT', currentAmount: 500 },
      ],
      recentSpins: [],
      activeFreeSpins: 0,
      lastGrid: undefined,
    }
  }
}
