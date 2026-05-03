import Link from 'next/link'
import type { ShowIndex } from '@/lib/types'
import { RarityBadge } from './RarityBadge'

// Inline style guarantees grid-template-columns is applied regardless of
// Tailwind v4's CSS layer ordering (which can cause custom class conflicts).
const GRID_STYLE: React.CSSProperties = {
  gridTemplateColumns: '2ch 11ch 1fr 13ch 5ch',
  columnGap: '1rem',
}

export function ShowRowHeader() {
  return (
    <div
      className="hidden sm:grid items-baseline px-1 py-1 text-xs text-dimmer border-b border-faint select-none"
      style={GRID_STYLE}
    >
      <span className="text-right">#</span>
      <span>DATE</span>
      <span>VENUE / CITY</span>
      <span>TIER</span>
      <span className="text-right">SONGS</span>
    </div>
  )
}

interface ShowRowProps {
  show: ShowIndex
  rank?: number
  extra?: React.ReactNode
  blurb?: string
}

export default function ShowRow({ show, rank, extra, blurb }: ShowRowProps) {
  const location = [show.city, show.state].filter(Boolean).join(', ')
  const venueCity = location ? `${show.venue}, ${location}` : show.venue

  return (
    <Link
      href={`/shows/${encodeURIComponent(show.id)}`}
      className="group block border-b border-border hover:bg-faint transition-colors min-h-[44px]"
    >
      {/* Desktop: CSS grid with inline style */}
      <div
        className="hidden sm:grid px-1 pt-2.5 text-xs"
        style={{ ...GRID_STYLE, alignItems: 'baseline', paddingBottom: blurb ? '0.25rem' : '0.625rem' }}
      >
        <span className="text-dimmer text-right tabular-nums self-start">
          {rank ?? ''}
        </span>
        <span className="text-dim tabular-nums self-start">{show.date}</span>
        {/* min-w-0 lets truncate work inside a grid cell */}
        <span className="text-foreground font-bold truncate min-w-0 self-start group-hover:text-green transition-colors">
          {venueCity}
        </span>
        <span className="self-start">
          <RarityBadge tier={show.rarity_tier} />
          {extra && <span className="ml-2">{extra}</span>}
        </span>
        <span className="text-green tabular-nums text-right font-bold self-start">
          {show.song_count}
        </span>

        {/* Blurb: spans the venue + tier + songs columns */}
        {blurb && (
          <span
            className="text-dim pb-2 pt-0.5 leading-relaxed"
            style={{ gridColumn: '3 / -1' }}
          >
            {blurb}
          </span>
        )}
      </div>

      {/* Mobile: two-line stacked */}
      <div className="sm:hidden px-1 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-foreground text-sm font-bold truncate group-hover:text-green transition-colors">
            {show.venue}
          </span>
          <RarityBadge tier={show.rarity_tier} />
        </div>
        <div className="flex items-center gap-2 text-xs text-dim mt-0.5">
          <span>{location}</span>
          <span>·</span>
          <span className="tabular-nums">{show.date}</span>
          <span>·</span>
          <span className="text-green tabular-nums font-bold">{show.song_count}</span>
        </div>
        {blurb && (
          <p className="text-dim text-xs mt-1 leading-relaxed">{blurb}</p>
        )}
      </div>
    </Link>
  )
}
