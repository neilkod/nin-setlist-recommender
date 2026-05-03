import type { RarityTier, TourRarityTier } from '@/lib/types'
import { RARITY_LABELS, RARITY_COLORS, TOUR_RARITY_LABELS, TOUR_RARITY_COLORS } from '@/lib/types'

export function RarityBadge({ tier }: { tier: RarityTier | null | undefined }) {
  if (!tier) return null
  return (
    <span className={`text-xs font-bold ${RARITY_COLORS[tier]}`}>
      [{RARITY_LABELS[tier]}]
    </span>
  )
}

export function TourRarityBadge({ tier }: { tier: TourRarityTier | null | undefined }) {
  if (!tier) return null
  return (
    <span className={`text-xs font-bold ${TOUR_RARITY_COLORS[tier]}`}>
      [{TOUR_RARITY_LABELS[tier]}]
    </span>
  )
}

export function SongRarityBadge({ score }: { score: number | undefined }) {
  if (score === undefined || score <= 0.75) return null
  if (score > 0.97) return <span className="text-xs font-bold text-rarity-unicorn">[UNICORN]</span>
  if (score > 0.92) return <span className="text-xs font-bold text-rarity-rare">[RARE]</span>
  return <span className="text-xs text-dimmer">[UNCOMMON]</span>
}
