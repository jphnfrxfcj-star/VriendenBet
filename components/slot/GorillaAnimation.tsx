import Image from 'next/image'
import { cn } from '@/lib/utils'

export type GorillaAnimationState = 'idle' | 'entrance' | 'smash' | 'nudge' | 'celebrate'

const assetByState: Record<GorillaAnimationState, string> = {
  idle: '/slot/miel-gorilla/idle/placeholder.svg',
  entrance: '/slot/miel-gorilla/entrance/placeholder.svg',
  smash: '/slot/miel-gorilla/smash/placeholder.svg',
  nudge: '/slot/miel-gorilla/nudge/placeholder.svg',
  celebrate: '/slot/miel-gorilla/celebrate/placeholder.svg',
}

export function GorillaAnimation({
  state,
  reduced,
  className,
}: {
  state: GorillaAnimationState
  reduced?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative aspect-[4/3] min-h-36 overflow-hidden rounded-md border border-amber-300/35 bg-[#102616]',
        !reduced && state === 'smash' ? 'animate-[slot-smash_500ms_ease-in-out_1]' : '',
        !reduced && state === 'celebrate' ? 'animate-[slot-bounce_900ms_ease-in-out_infinite]' : '',
        className,
      )}
      aria-label="Originele cartoon-gorillaversie van Miel met voetbaltruitje nummer 20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.25),transparent_58%)]" />
      <Image src={assetByState[state]} alt="" fill sizes="280px" className="object-contain p-3" />
    </div>
  )
}
