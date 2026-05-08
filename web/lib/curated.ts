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
  // Primary sort: count of genuinely rare songs (unicorns + deep cuts).
  // avg_rarity_score as tiebreaker — it can be high on early shows that
  // played obscure tracks even with 0 unicorns, which is misleading.
  return fullShows(shows)
    .sort((a, b) => {
      const aRare = a.n_unicorn + a.n_deep_cut
      const bRare = b.n_unicorn + b.n_deep_cut
      return bRare - aRare || b.avg_rarity_score - a.avg_rarity_score
    })
    .slice(0, limit)
}

export function getMostNostalgicShows(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  // Sort by nostalgia_outlier_score: percentile rank within ±2-year peer window.
  // This surfaces shows that played unusually old material for their era —
  // Easter eggs across NIN's history rather than just the most recent retro tour.
  return fullShows(shows)
    .filter((s) => s.nostalgia_outlier_score != null)
    .sort((a, b) => (b.nostalgia_outlier_score ?? 0) - (a.nostalgia_outlier_score ?? 0))
    .slice(0, limit)
}

export function getLongestShows(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  return fullShows(shows)
    .filter((s) => !s.venue.toLowerCase().includes('rehearsal'))
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

export function getNonAlbumCuts(shows: ShowIndex[], limit = DEFAULT_LIMIT): ShowIndex[] {
  return fullShows(shows)
    .filter((s) => s.n_non_album >= 2)
    .sort((a, b) => b.n_non_album - a.n_non_album || b.non_album_fraction - a.non_album_fraction)
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
      browseHref: '/browse?rarity=0.85',
      shows: getRarestShows(shows),
    },
    {
      id: 'nostalgia',
      label: 'MAXIMUM NOSTALGIA',
      description: 'Shows with the oldest material in absolute terms — deep dives into NIN\'s back catalog',
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
      id: 'non-album',
      label: 'NON-ALBUM CUTS',
      description: 'Shows with the most songs not from any proper NIN release — singles, covers, unreleased',
      browseHref: '/browse',
      shows: getNonAlbumCuts(shows),
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
