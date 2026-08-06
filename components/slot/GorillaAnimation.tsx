import Image from 'next/image'
import { cn } from '@/lib/utils'

export type GorillaAnimationState = 'idle' | 'entrance' | 'smash' | 'nudge' | 'celebrate'

const assetByState: Record<GorillaAnimationState, string> = {
  idle: '/slot/miel-gorilla/generated/miel-gorilla-v1.png',
  entrance: '/slot/miel-gorilla/generated/miel-gorilla-v1.png',
  smash: '/slot/miel-gorilla/generated/miel-gorilla-v1.png',
  nudge: '/slot/miel-gorilla/generated/miel-gorilla-v1.png',
  celebrate: '/slot/miel-gorilla/generated/miel-gorilla-v1.png',
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
        'relative aspect-[3/4] min-h-52 overflow-hidden rounded-md border border-amber-300/35 bg-[#102616]',
        !reduced && state === 'entrance' ? 'animate-[slot-entrance_700ms_ease-out_1]' : '',
        !reduced && state === 'smash' ? 'animate-[slot-smash_500ms_ease-in-out_1]' : '',
        !reduced && state === 'nudge' ? 'animate-[slot-nudge_620ms_ease-in-out_1]' : '',
        !reduced && state === 'celebrate' ? 'animate-[slot-bounce_900ms_ease-in-out_infinite]' : '',
        className,
      )}
      aria-label="Originele cartoon-gorillaversie van Miel met voetbaltruitje nummer 20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.25),transparent_58%)]" />
      <Image
        src={assetByState[state]}
        alt=""
        width={576}
        height={720}
        priority
        className="absolute inset-0 h-full w-full object-contain p-1 drop-shadow-[0_0_18px_rgba(183,255,26,0.22)]"
      />
    </div>
  )
}
