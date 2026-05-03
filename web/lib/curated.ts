import type { ShowIndex, CuratedList } from './types'

const DEFAULT_LIMIT = 10

// Shows with fewer than this many songs go to the micro-shows list only
export const MIN_SONGS = 8

function withSetlist(shows: ShowIndex[]): ShowIndex[] {
  return shows.filter((s) => s.song_count > 0)
}

function fullShows(shows: ShowIndex[]): ShowIndex[] {
  return shows.filter((s) => s.song_count >= MIN_SONGS)
}

export function getRarestShows(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  return fullShows(shows)
    .sort((a, b) => b.avg_rarity_score - a.avg_rarity_score || b.n_unicorn - a.n_unicorn)
    .slice(0, limit)
}

export function getMostNostalgicShows(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  return fullShows(shows)
    .sort((a, b) => b.nostalgia_score - a.nostalgia_score)
    .slice(0, limit)
}

export function getLongestShows(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  return fullShows(shows)
    .sort((a, b) => b.song_count - a.song_count)
    .slice(0, limit)
}

export function getMostCovers(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  return fullShows(shows)
    .filter((s) => s.cover_count > 0)
    .sort((a, b) => b.cover_count - a.cover_count || b.cover_fraction - a.cover_fraction)
    .slice(0, limit)
}

export function getStrippedShows(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  return fullShows(shows)
    .filter((s) => s.production_style === 'stripped' || s.has_stripped_section)
    .sort((a, b) => b.avg_rarity_score - a.avg_rarity_score)
    .slice(0, limit)
}

export function getTDSHeavyShows(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  return fullShows(shows)
    .filter((s) => s.primary_album === 'the-downward-spiral')
    .sort((a, b) => {
      const aTds = a.album_distribution['the-downward-spiral'] ?? 0
      const bTds = b.album_distribution['the-downward-spiral'] ?? 0
      return bTds - aTds
    })
    .slice(0, limit)
}

export function getOffScriptNights(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  return fullShows(shows)
    .filter((s) => s.tour_rarity_score !== null)
    .sort((a, b) => (b.tour_rarity_score ?? 0) - (a.tour_rarity_score ?? 0))
    .slice(0, limit)
}

export function getTinyShows(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  return withSetlist(shows)
    .filter((s) => s.song_count < MIN_SONGS)
    .sort((a, b) => b.avg_rarity_score - a.avg_rarity_score || b.song_count - a.song_count)
    .slice(0, limit)
}

export function getAllCuratedLists(shows: ShowIndex[]): CuratedList[] {
  return [
    {
      id: 'rarest',
      label: 'RAREST SETLISTS',
      description: 'Shows with the most songs rarely or never played at other concerts',
      browseHref: '/browse?rarity=0.95',
      shows: getRarestShows(shows),
    },
    {
      id: 'nostalgia',
      label: 'MAXIMUM NOSTALGIA',
      description: 'Shows where the material was oldest relative to the date performed',
      browseHref: '/browse?nostalgia=0.95',
      shows: getMostNostalgicShows(shows),
    },
    {
      id: 'longest',
      label: 'LONGEST SHOWS',
      description: 'Most songs played in a single night',
      browseHref: '/browse',
      shows: getLongestShows(shows),
    },
    {
      id: 'covers',
      label: 'MOST COVERS',
      description: 'Nights with the most non-NIN songs in the set',
      browseHref: '/browse?covers=yes',
      shows: getMostCovers(shows),
    },
    {
      id: 'stripped',
      label: 'STRIPPED & INTIMATE',
      description: 'Acoustic or B-stage sets — no full production',
      browseHref: '/browse?production=stripped',
      shows: getStrippedShows(shows),
    },
    {
      id: 'tds',
      label: 'THE DOWNWARD SPIRAL NIGHTS',
      description: 'Shows where The Downward Spiral dominated the setlist',
      browseHref: '/browse?album=the-downward-spiral',
      shows: getTDSHeavyShows(shows),
    },
    {
      id: 'off-script',
      label: 'OFF-SCRIPT NIGHTS',
      description: 'Shows most unlike the typical setlist for that tour leg',
      browseHref: '/browse?tourRarity=0.7',
      shows: getOffScriptNights(shows),
    },
    {
      id: 'tiny',
      label: 'MICRO-SHOWS',
      description: `Radio sessions, festival slots, and warmup shows — fewer than ${MIN_SONGS} songs`,
      browseHref: '/browse',
      shows: getTinyShows(shows),
    },
  ]
}
