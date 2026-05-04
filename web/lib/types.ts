export type RarityTier = 'unicorn' | 'deep-cuts' | 'mixed' | 'balanced' | 'hits-heavy'
export type ProductionStyle = 'stripped' | 'mixed' | 'full'
export type TourRarityTier = 'off-script' | 'varied' | 'typical' | 'rigid'

// Flat show entry from features_index.json
export interface ShowIndex {
  id: string
  date: string
  venue: string
  city: string
  state: string
  country: string
  tour: string
  era_slug: string
  nostalgia_score: number
  avg_song_age_at_show: number
  album_distribution: Record<string, number>
  era_distribution: Record<string, number>
  primary_album: string
  primary_era: string
  avg_rarity_score: number
  rarity_tier: RarityTier
  n_unicorn: number
  n_deep_cut: number
  n_album_track: number
  n_familiar: number
  n_staple: number
  cover_count: number
  cover_fraction: number
  n_non_album: number
  non_album_fraction: number
  special_notes_count: number
  special_fraction: number
  production_style: ProductionStyle
  has_stripped_section: boolean
  song_count: number
  section_count: number
  sections: string[]
  tour_rarity_score: number | null
  tour_rarity_tier: TourRarityTier | null
}

// Feature sub-object inside individual show JSONs
export interface ShowFeatures {
  nostalgia_score: number
  avg_song_age_at_show: number
  album_distribution: Record<string, number>
  era_distribution: Record<string, number>
  primary_album: string
  primary_era: string
  avg_rarity_score: number
  rarity_tier: RarityTier
  n_unicorn: number
  n_deep_cut: number
  n_album_track: number
  n_familiar: number
  n_staple: number
  cover_count: number
  cover_fraction: number
  n_non_album: number
  non_album_fraction: number
  special_notes_count: number
  special_fraction: number
  production_style: ProductionStyle
  has_stripped_section: boolean
  song_count: number
  section_count: number
  sections: string[]
  tour_rarity_score: number | null
  tour_rarity_tier: TourRarityTier | null
}

// Single song within a setlist
export interface SetlistSong {
  position: number
  song: string
  slug: string
  section: string
  notes: string
  is_cover: boolean
}

// Full show from an individual show JSON (has setlist + nested features)
export interface Show {
  id: string
  url: string
  date: string
  venue: string
  venue_slug: string
  city: string
  state: string
  country: string
  tour: string
  era_slug: string
  song_count: number
  has_covers: boolean
  source: string
  scraped_at: string
  features: ShowFeatures
  setlist: SetlistSong[]
}

// Song catalog entry from songs.json
export interface SongEntry {
  slug: string
  name: string
  album_slug: string
  album_year: number
  era_group: string
  is_cover: boolean
  play_count: number
  rarity_score: number
  era_play_rate: number
  era_context: string
  first_played: string
  last_played: string
}

// User's desired show criteria — all fields optional
export interface TargetVector {
  nostalgia?: number        // 0 = current material, 1 = PHM-era
  rarity?: number           // 0 = all hits, 1 = all rarities
  tourRarity?: number       // 0 = standard tour setlist, 1 = most off-script night
  coverSongs?: boolean
  albumWeights?: Record<string, number>  // album_slug → weight (should sum to 1)
  yearMin?: number
  yearMax?: number
}

// A ShowIndex entry with a computed similarity score attached
export interface ScoredShow extends ShowIndex {
  score: number
}

// A named list of shows for the Discover page
export interface CuratedList {
  id: string
  label: string
  description?: string
  browseHref?: string
  shows: ShowIndex[]
}

// Derive the ninlive.com URL from a show id
export function ninliveUrl(id: string): string {
  return `https://www.ninlive.com/artists/nin/concerts/${id}`
}

// Format a date string (YYYY-MM-DD) as a readable label
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Rarity tier → short display label
export const RARITY_LABELS: Record<RarityTier, string> = {
  unicorn: 'UNICORN',
  'deep-cuts': 'DEEP CUTS',
  mixed: 'MIXED',
  balanced: 'BALANCED',
  'hits-heavy': 'HITS',
}

// Rarity tier → CSS color class (Tailwind) — desaturated, low-contrast
export const RARITY_COLORS: Record<RarityTier, string> = {
  unicorn:      'text-rarity-unicorn',
  'deep-cuts':  'text-rarity-rare',
  mixed:        'text-dim',
  balanced:     'text-dimmer',
  'hits-heavy': 'text-dimmer',
}

// Rarity tier → one-line explanation for legend/tooltip
export const RARITY_DESCRIPTIONS: Record<RarityTier, string> = {
  unicorn:      'Songs played at fewer than 3% of all shows',
  'deep-cuts':  'Songs played at 3–8% of all shows',
  mixed:        'A few rarities alongside the familiar',
  balanced:     'Healthy mix — no strong lean either way',
  'hits-heavy': 'Mostly crowd-pleasers, 50%+ staples',
}

// Tour rarity tier → short display label
export const TOUR_RARITY_LABELS: Record<TourRarityTier, string> = {
  'off-script': 'OFF-SCRIPT',
  varied: 'VARIED',
  typical: 'TYPICAL',
  rigid: 'RIGID',
}

// Tour rarity tier → CSS color class (Tailwind)
export const TOUR_RARITY_COLORS: Record<TourRarityTier, string> = {
  'off-script': 'text-green',
  varied: 'text-green-dim',
  typical: 'text-dim',
  rigid: 'text-dimmer',
}
