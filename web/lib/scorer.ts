import type { ShowIndex, TargetVector, ScoredShow } from './types'

function dotProduct(a: Record<string, number>, b: Record<string, number>): number {
  let sum = 0
  for (const key in b) {
    sum += (a[key] ?? 0) * b[key]
  }
  return sum
}

function normaliseWeights(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((s, v) => s + v, 0)
  if (total === 0) return weights
  const out: Record<string, number> = {}
  for (const k in weights) out[k] = weights[k] / total
  return out
}

export function scoreShows(
  shows: ShowIndex[],
  target: TargetVector,
  limit = 20,
): ScoredShow[] {
  const { nostalgia, rarity, tourRarity, coverSongs, albumWeights, yearMin, yearMax } = target

  const active = [
    nostalgia    !== undefined,
    rarity       !== undefined,
    tourRarity   !== undefined,
    coverSongs   !== undefined,
    albumWeights !== undefined,
  ].filter(Boolean).length

  if (active === 0) return []

  const w = 1 / active
  const wNostalgia  = nostalgia    !== undefined ? w : 0
  const wRarity     = rarity       !== undefined ? w : 0
  const wTourRarity = tourRarity   !== undefined ? w : 0
  const wCovers     = coverSongs   !== undefined ? w : 0
  const wAlbums     = albumWeights !== undefined ? w : 0

  const normAlbumWeights = albumWeights ? normaliseWeights(albumWeights) : undefined

  let candidates = shows.filter((s) => s.song_count > 0)

  if (tourRarity !== undefined)
    candidates = candidates.filter((s) => s.tour_rarity_score !== null)

  if (yearMin !== undefined) candidates = candidates.filter((s) => getYear(s) >= yearMin)
  if (yearMax !== undefined) candidates = candidates.filter((s) => getYear(s) <= yearMax)

  return candidates
    .map((show): ScoredShow => {
      let score = 0

      if (wNostalgia > 0 && nostalgia !== undefined)
        score += wNostalgia * (1 - Math.abs(show.nostalgia_score - nostalgia))

      if (wRarity > 0 && rarity !== undefined)
        score += wRarity * (1 - Math.abs(show.avg_rarity_score - rarity))

      if (wTourRarity > 0 && tourRarity !== undefined && show.tour_rarity_score !== null)
        score += wTourRarity * (1 - Math.abs(show.tour_rarity_score - tourRarity))

      if (wCovers > 0 && coverSongs !== undefined)
        score += wCovers * ((show.cover_count > 0) === coverSongs ? 1 : 0)

      if (wAlbums > 0 && normAlbumWeights !== undefined)
        score += wAlbums * dotProduct(show.album_distribution, normAlbumWeights)

      return { ...show, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function findSimilarShows(
  shows: ShowIndex[],
  target: ShowIndex,
  limit = 10,
): ScoredShow[] {
  return scoreShows(
    shows.filter((s) => s.id !== target.id),
    {
      nostalgia:    target.nostalgia_score,
      rarity:       target.avg_rarity_score,
      tourRarity:   target.tour_rarity_score ?? undefined,
      coverSongs:   target.cover_count > 0,
      albumWeights: target.album_distribution,
    },
    limit,
  )
}

function getYear(show: ShowIndex): number {
  return parseInt(show.date.substring(0, 4), 10)
}
