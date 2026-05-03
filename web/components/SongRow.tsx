import type { SetlistSong, SongEntry } from '@/lib/types'
import { SongRarityBadge } from './RarityBadge'

interface SongRowProps {
  song: SetlistSong
  catalog?: Record<string, SongEntry>
}

export default function SongRow({ song, catalog }: SongRowProps) {
  const info = catalog?.[song.slug]

  return (
    <div className="flex items-start gap-3 py-2 border-b border-faint text-sm">
      <span className="text-dimmer text-xs w-5 text-right shrink-0 tabular-nums pt-0.5">
        {song.position}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-green font-bold">{song.song}</span>
          {song.is_cover && (
            <span className="text-dim text-xs">[COVER]</span>
          )}
          {info && <SongRarityBadge score={info.rarity_score} />}
        </div>
        {song.notes && (
          <p className="text-dimmer text-xs mt-0.5 leading-relaxed">{song.notes}</p>
        )}
        {info?.era_context && (
          <p className="text-dim text-xs mt-0.5 hidden sm:block">{info.era_context}</p>
        )}
      </div>
    </div>
  )
}
