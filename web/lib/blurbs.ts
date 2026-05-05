import type { ShowIndex } from './types'

const ALBUM_SHORT: Record<string, string> = {
  'pretty-hate-machine':                          'PHM',
  'broken':                                       'Broken',
  'the-downward-spiral':                          'TDS',
  'the-fragile':                                  'The Fragile',
  'with-teeth':                                   'With Teeth',
  'year-zero':                                    'Year Zero',
  'ghosts-i-iv':                                  'Ghosts I–IV',
  'the-slip':                                     'The Slip',
  'hesitation-marks':                             'HM',
  'not-the-actual-events':                        'NTAE',
  'add-violence':                                 'Add Violence',
  'bad-witch':                                    'Bad Witch',
  'tron-ares':                                    'Tron: Ares',
  'cover':                                        'covers',
  'unreleased':                                   'unreleased',
  'closer-to-god':                                'Closer to God',
  'the-perfect-drug':                             'The Perfect Drug',
  'intro':                                        'intro material',
  'lara-croft-tomb-raider-music-from-the-motion-picture': 'Lara Croft OST',
  'ninja-2009-summer-tour-ep':                    'NIN|JA EP',
  'isnt-everyone':                                "Isn't Everyone",
}

function albumLabel(slug: string): string {
  return ALBUM_SHORT[slug] ?? slug
}

// Top N albums by fraction, filtering out tiny slices
function topAlbums(dist: Record<string, number>, n = 3): string {
  return Object.entries(dist)
    .filter(([, pct]) => pct >= 0.05)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([slug, pct]) => `${albumLabel(slug)} ${Math.round(pct * 100)}%`)
    .join(' · ')
}

function plural(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`
}

export function generateBlurb(show: ShowIndex, listId: string): string {
  switch (listId) {
    case 'rarest': {
      const parts: string[] = []
      if (show.n_unicorn > 0)
        parts.push(`${plural(show.n_unicorn, 'unicorn')} (<3% of all shows)`)
      if (show.n_deep_cut > 0)
        parts.push(`${plural(show.n_deep_cut, 'deep cut')} (3–8%)`)
      if (parts.length === 0 && show.n_album_track > 0)
        parts.push(`${plural(show.n_album_track, 'album track')} (8–25%)`)
      const rarityStr = parts.join(' + ')
      const albums = topAlbums(show.album_distribution, 2)
      return albums ? `${rarityStr} · ${albums}` : rarityStr
    }

    case 'nostalgia': {
      const age = show.avg_song_age_at_show
      const albums = topAlbums(show.album_distribution, 2)
      return [
        age != null ? `avg song age ${Math.round(age)} years at show date` : '',
        albums,
      ].filter(Boolean).join(' · ')
    }

    case 'longest': {
      const sets = show.section_count > 1
        ? `${show.section_count} sets`
        : '1 set'
      const albums = topAlbums(show.album_distribution, 2)
      return [`${show.song_count} songs across ${sets}`, albums].filter(Boolean).join(' · ')
    }

    case 'covers': {
      const pct = Math.round(show.cover_fraction * 100)
      const albums = topAlbums(show.album_distribution, 2)
      return [
        `${plural(show.cover_count, 'cover')} — ${pct}% of the setlist`,
        albums,
      ].filter(Boolean).join(' · ')
    }

    case 'stripped': {
      const note = show.has_stripped_section && show.song_count > 0
        ? `${show.song_count} songs incl. stripped/B-stage section`
        : `${show.song_count} songs`
      const albums = topAlbums(show.album_distribution, 2)
      return [note, albums].filter(Boolean).join(' · ')
    }

    case 'tds': {
      const tds = show.album_distribution['the-downward-spiral'] ?? 0
      const rest = Object.entries(show.album_distribution)
        .filter(([slug]) => slug !== 'the-downward-spiral')
        .filter(([, pct]) => pct >= 0.05)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([slug, pct]) => `${albumLabel(slug)} ${Math.round(pct * 100)}%`)
      const breakdown = [`TDS ${Math.round(tds * 100)}%`, ...rest].join(' · ')
      const rarityNote = show.n_unicorn > 0 || show.n_deep_cut > 0
        ? ` · ${show.n_unicorn > 0 ? plural(show.n_unicorn, 'unicorn') : ''}${show.n_unicorn > 0 && show.n_deep_cut > 0 ? ' + ' : ''}${show.n_deep_cut > 0 ? plural(show.n_deep_cut, 'deep cut') : ''}`
        : ''
      return breakdown + rarityNote
    }

    case 'off-script': {
      if (show.tour_rarity_score === null) return ''
      const estimated = Math.round(show.tour_rarity_score * show.song_count)
      const albums = topAlbums(show.album_distribution, 2)
      return [
        `~${estimated} of ${show.song_count} songs not in the typical nightly setlist for this tour leg`,
        albums,
      ].filter(Boolean).join(' · ')
    }

    case 'non-album': {
      const pct = Math.round(show.non_album_fraction * 100)
      const albums = topAlbums(show.album_distribution, 2)
      return [
        `${show.n_non_album} non-album cuts (${pct}% of setlist)`,
        albums,
      ].filter(Boolean).join(' · ')
    }

    case 'tiny': {
      const albums = topAlbums(show.album_distribution, 2)
      const note = show.tour ? show.tour : 'no associated tour'
      return [`${show.song_count} songs`, albums || note].filter(Boolean).join(' · ')
    }

    default:
      return topAlbums(show.album_distribution, 3)
  }
}

// Context-free summary for the show detail page — combines all notable dimensions
export function generateShowSummary(show: ShowIndex): string {
  const parts: string[] = []

  // Lead with rarity if interesting
  const rareParts: string[] = []
  if (show.n_unicorn > 0)
    rareParts.push(`${plural(show.n_unicorn, 'unicorn')} (<3% of shows)`)
  if (show.n_deep_cut > 0)
    rareParts.push(`${plural(show.n_deep_cut, 'deep cut')} (3–8%)`)
  if (rareParts.length > 0) parts.push(rareParts.join(' + '))

  // Nostalgia context if notably high
  if ((show.nostalgia_score ?? 0) >= 0.6 && show.avg_song_age_at_show != null)
    parts.push(`avg song age ${Math.round(show.avg_song_age_at_show)} years`)

  // Tour rarity context
  if (show.tour_rarity_score !== null && show.tour_rarity_score >= 0.25)
    parts.push(`~${Math.round(show.tour_rarity_score * show.song_count)} of ${show.song_count} songs off-script for the tour`)

  // Album breakdown
  const albums = topAlbums(show.album_distribution, 3)
  if (albums) parts.push(albums)

  return parts.join(' · ')
}
