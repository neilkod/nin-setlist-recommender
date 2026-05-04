import Link from 'next/link'
import type { ShowIndex } from '@/lib/types'
import { RarityBadge } from './RarityBadge'

export function ShowRowHeader({ scoreCol = false }: { scoreCol?: boolean }) {
  return (
    <tr className="text-dimmer border-b border-faint select-none">
      <th scope="col" className="text-right py-1 font-normal pr-3">#</th>
      <th scope="col" className="text-left py-1 font-normal">DATE</th>
      <th scope="col" className="text-left py-1 font-normal">VENUE / CITY</th>
      <th scope="col" className="text-left py-1 font-normal">TIER</th>
      <th scope="col" className="text-right py-1 font-normal">
        {scoreCol ? 'SCORE' : 'SONGS'}
      </th>
    </tr>
  )
}

export function ShowRowMobile({ show }: { show: ShowIndex }) {
  const location = [show.city, show.state].filter(Boolean).join(', ')
  return (
    <Link
      href={`/shows/${encodeURIComponent(show.id)}`}
      className="group block border-b border-border py-2 px-1 hover:bg-faint transition-colors min-h-[44px]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-foreground text-sm font-bold truncate group-hover:text-green transition-colors">
          {show.venue}
        </span>
        <RarityBadge tier={show.rarity_tier} />
      </div>
      <div className="flex items-center gap-2 text-xs text-dim mt-0.5">
        {location && <><span>{location}</span><span>·</span></>}
        <span className="tabular-nums">{show.date}</span>
        <span>·</span>
        <span className="text-green tabular-nums font-bold">{show.song_count}</span>
      </div>
    </Link>
  )
}

interface ShowRowProps {
  show: ShowIndex
  rank?: number
  rightCol?: React.ReactNode
}

export default function ShowRow({ show, rank, rightCol }: ShowRowProps) {
  const href = `/shows/${encodeURIComponent(show.id)}`
  const location = [show.city, show.state].filter(Boolean).join(', ')
  const venueCity = location ? `${show.venue}, ${location}` : show.venue
  const right = rightCol ?? (
    <span className="text-green tabular-nums font-bold">{show.song_count}</span>
  )

  return (
    <tr className="group border-b border-border hover:bg-faint transition-colors">
      <td className="py-0.5 text-right text-dimmer tabular-nums align-middle pr-3">
        <a href={href} className="block">{rank ?? ''}</a>
      </td>
      <td className="py-0.5 text-dim tabular-nums align-middle whitespace-nowrap">
        <a href={href} className="block">{show.date}</a>
      </td>
      <td className="py-0.5 font-bold align-middle overflow-hidden">
        <a href={href} className="block whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-green transition-colors">
          {venueCity}
        </a>
      </td>
      <td className="py-0.5 align-middle whitespace-nowrap">
        <a href={href} className="block">
          <RarityBadge tier={show.rarity_tier} />
        </a>
      </td>
      <td className="py-0.5 text-right align-middle whitespace-nowrap">
        <a href={href} className="block">{right}</a>
      </td>
    </tr>
  )
}
