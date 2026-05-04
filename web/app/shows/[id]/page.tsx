import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import SongRow from '@/components/SongRow'
import ScoreBar from '@/components/ScoreBar'
import { RarityBadge, TourRarityBadge } from '@/components/RarityBadge'
import { generateShowSummary } from '@/lib/blurbs'
import {
  ninliveUrl,
  formatDate,
  RARITY_LABELS,
  TOUR_RARITY_LABELS,
  type Show,
  type ShowIndex,
  type SongEntry,
} from '@/lib/types'

const DATA_DIR = path.join(process.cwd(), 'public/data')

export async function generateStaticParams() {
  const index = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'features_index.json'), 'utf-8')
  ) as ShowIndex[]
  return index.map((s) => ({ id: encodeURIComponent(s.id) }))
}

function loadShow(id: string): Show | null {
  const decoded = decodeURIComponent(id)
  const filePath = path.join(DATA_DIR, 'shows', `${decoded}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Show
}

function tourRank(show: Show, allShows: ShowIndex[]): { rank: number; total: number } | null {
  const tourShows = allShows
    .filter((s) => s.tour === show.tour && s.tour_rarity_score !== null)
    .sort((a, b) => (b.tour_rarity_score ?? 0) - (a.tour_rarity_score ?? 0))
  const rank = tourShows.findIndex((s) => s.id === show.id) + 1
  if (rank === 0) return null
  return { rank, total: tourShows.length }
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ShowPage({ params }: Props) {
  const { id } = await params
  const show = loadShow(id)
  if (!show) notFound()

  const allShows = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'features_index.json'), 'utf-8')
  ) as ShowIndex[]

  const songs = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'songs.json'), 'utf-8')
  ) as Record<string, SongEntry>

  const feat = show.features
  const ranking = feat.tour_rarity_score !== null ? tourRank(show, allShows) : null

  // Group setlist by section
  const sections: Record<string, typeof show.setlist> = {}
  for (const entry of show.setlist) {
    const sec = entry.section || 'Main Set'
    if (!sections[sec]) sections[sec] = []
    sections[sec].push(entry)
  }

  // Summary blurb — general + specific song examples for rare songs
  const showIndex = allShows.find((s) => s.id === show.id)
  const generalSummary = showIndex ? generateShowSummary(showIndex) : ''

  // Find the specific rare/unicorn songs in this setlist and name them
  const TOTAL_SHOWS = 1176
  type NotableSong = { name: string; pct: number; tier: 'unicorn' | 'rare' }
  const notableSongs: NotableSong[] = show.setlist
    .filter((e) => !e.is_cover && songs[e.slug])
    .map((e) => {
      const s = songs[e.slug]
      return { name: e.song, pct: Math.round((1 - s.rarity_score) * 100 * 10) / 10, score: s.rarity_score }
    })
    .filter((s) => s.score > 0.92)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ name, pct, score }) => ({
      name,
      pct,
      tier: (score > 0.97 ? 'unicorn' : 'rare') as 'unicorn' | 'rare',
    }))

  const songExamples = notableSongs.length > 0
    ? notableSongs
        .map((s) => `${s.name} (${s.pct < 1 ? '<1' : s.pct}% of ${TOTAL_SHOWS} shows)`)
        .join(', ')
    : ''

  // Non-album songs in this setlist
  const ALBUM_TRACK_SLUGS = new Set([
    'pretty-hate-machine', 'broken', 'the-downward-spiral', 'the-fragile',
    'with-teeth', 'year-zero', 'ghosts-i-iv', 'the-slip', 'hesitation-marks',
    'not-the-actual-events', 'add-violence', 'bad-witch', 'tron-ares',
  ])
  const nonAlbumSongs = show.setlist
    .filter((e) => {
      const s = songs[e.slug]
      return s && !ALBUM_TRACK_SLUGS.has(s.album_slug)
    })
    .map((e) => e.song)

  // Browse URL pre-seeded with this show's feature vector
  const browseParams = new URLSearchParams()
  if (feat.nostalgia_score != null) browseParams.set('nostalgia', feat.nostalgia_score.toFixed(2))
  if (feat.avg_rarity_score != null) browseParams.set('rarity', feat.avg_rarity_score.toFixed(2))
  if (feat.tour_rarity_score != null) browseParams.set('tourRarity', feat.tour_rarity_score.toFixed(2))

  const location = [show.city, show.state, show.country !== 'United States' ? show.country : '']
    .filter(Boolean)
    .join(', ')

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Back link */}
        <Link href="/" className="text-dim text-xs hover:text-foreground transition-colors">
          ← DISCOVER
        </Link>

        {/* Show header */}
        <div className="mt-6 pb-6 border-b border-border">
          <p className="text-dim text-xs tracking-widest mb-1">NINE INCH NAILS</p>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug">
            {show.venue}
          </h1>
          <p className="text-dim text-sm mt-1">{location}</p>
          <p className="text-foreground text-sm mt-0.5 font-bold">{formatDate(show.date)}</p>
          {show.tour && (
            <p className="text-dim text-xs mt-2 tracking-wide uppercase">{show.tour}</p>
          )}
        </div>

        {/* Feature stats */}
        <div className="py-6 border-b border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {/* Global rarity */}
            <div className="flex items-center gap-3">
              <span className="text-dim text-xs w-28 shrink-0">GLOBAL RARITY</span>
              <ScoreBar value={feat.avg_rarity_score} />
              <RarityBadge tier={feat.rarity_tier} />
            </div>

            {/* Nostalgia */}
            <div className="flex items-center gap-3">
              <span className="text-dim text-xs w-28 shrink-0">NOSTALGIA</span>
              <ScoreBar value={feat.nostalgia_score} />
              <span className="text-dim text-xs">
                {feat.avg_song_age_at_show != null
                  ? `${feat.avg_song_age_at_show}yr avg`
                  : '─'}
              </span>
            </div>

            {/* Tour rarity */}
            <div className="flex items-center gap-3">
              <span className="text-dim text-xs w-28 shrink-0">TOUR RARITY</span>
              {feat.tour_rarity_score !== null ? (
                <>
                  <ScoreBar value={feat.tour_rarity_score} />
                  <TourRarityBadge tier={feat.tour_rarity_tier} />
                  {ranking && (
                    <span className="text-dimmer text-xs">
                      #{ranking.rank}/{ranking.total}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-dimmer text-xs">N/A</span>
              )}
            </div>

          </div>

          {/* Composition pills */}
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <span className="text-dim">{feat.song_count} songs</span>
            {feat.cover_count > 0 && (
              <span className="text-dim">· {feat.cover_count} covers</span>
            )}
            {feat.n_unicorn > 0 && (
              <span className="text-rarity-unicorn font-bold">· {feat.n_unicorn} unicorn</span>
            )}
            {feat.n_deep_cut > 0 && (
              <span className="text-rarity-rare font-bold">· {feat.n_deep_cut} deep cut{feat.n_deep_cut !== 1 ? 's' : ''}</span>
            )}
            {feat.special_notes_count > 0 && (
              <span className="text-dim">· {feat.special_notes_count} special moments</span>
            )}
            {feat.n_non_album > 0 && (
              <span className="text-dim">· {feat.n_non_album} non-album cut{feat.n_non_album !== 1 ? 's' : ''}</span>
            )}
          </div>

          {(generalSummary || songExamples || nonAlbumSongs.length > 0) && (
            <div className="mt-2 text-xs text-dim space-y-0.5 leading-relaxed">
              {generalSummary && <p>{generalSummary}</p>}
              {songExamples && (
                <p>
                  <span className="text-dimmer">RARE SONGS: </span>{songExamples}
                </p>
              )}
              {nonAlbumSongs.length > 0 && (
                <p>
                  <span className="text-dimmer">NON-ALBUM: </span>{nonAlbumSongs.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="py-5 flex flex-wrap gap-3 border-b border-border">
          <Link
            href={`/browse?${browseParams.toString()}`}
            className="text-xs text-green border border-green px-3 py-2 hover:bg-green hover:text-background transition-colors tracking-wider"
          >
            FIND SIMILAR SHOWS →
          </Link>
          <a
            href={ninliveUrl(show.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-dim border border-border px-3 py-2 hover:border-dim hover:text-foreground transition-colors tracking-wider"
          >
            VIEW ON NINLIVE ↗
          </a>
        </div>

        {/* Setlist */}
        <div className="py-8">
          <div className="space-y-8">
            {Object.entries(sections).map(([sectionName, sectionSongs]) => (
              <div key={sectionName}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-green text-xs select-none">──</span>
                  <h2 className="text-xs font-bold tracking-wider text-foreground">
                    {sectionName.toUpperCase()}
                  </h2>
                  <div className="flex-1 border-t border-border" />
                  <span className="text-dimmer text-xs">{sectionSongs.length}</span>
                </div>
                <div>
                  {sectionSongs.map((song) => (
                    <SongRow key={song.position} song={song} catalog={songs} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border flex justify-between items-center text-xs text-dimmer">
          <Link href="/" className="hover:text-dim transition-colors">
            ← BACK TO DISCOVER
          </Link>
          <a
            href={ninliveUrl(show.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-dim transition-colors"
          >
            NINLIVE SOURCE ↗
          </a>
        </div>
      </main>
    </div>
  )
}
