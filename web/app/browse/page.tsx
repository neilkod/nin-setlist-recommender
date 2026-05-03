'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import ShowRow from '@/components/ShowRow'
import ScoreBar from '@/components/ScoreBar'
import { scoreShows } from '@/lib/scorer'
import type { ShowIndex, TargetVector, ProductionStyle } from '@/lib/types'

const ALBUM_OPTIONS = [
  { slug: 'pretty-hate-machine', label: 'Pretty Hate Machine' },
  { slug: 'broken',              label: 'Broken' },
  { slug: 'the-downward-spiral', label: 'The Downward Spiral' },
  { slug: 'the-fragile',         label: 'The Fragile' },
  { slug: 'with-teeth',          label: 'With Teeth' },
  { slug: 'year-zero',           label: 'Year Zero' },
  { slug: 'ghosts-i-iv',         label: 'Ghosts I–IV' },
  { slug: 'the-slip',            label: 'The Slip' },
  { slug: 'hesitation-marks',    label: 'Hesitation Marks' },
  { slug: 'not-the-actual-events', label: 'Not the Actual Events' },
  { slug: 'add-violence',        label: 'Add Violence' },
  { slug: 'bad-witch',           label: 'Bad Witch' },
  { slug: 'tron-ares',           label: 'Tron: Ares' },
]

type CoverFilter = 'yes' | 'no' | 'either'
type ProductionFilter = ProductionStyle | 'any'

interface Filters {
  nostalgia: number | null
  rarity: number | null
  tourRarity: number | null
  production: ProductionFilter
  covers: CoverFilter
  yearMin: number
  yearMax: number
  albums: string[]
}

const DEFAULT_FILTERS: Filters = {
  nostalgia: null,
  rarity: null,
  tourRarity: null,
  production: 'any',
  covers: 'either',
  yearMin: 1988,
  yearMax: 2026,
  albums: [],
}

function filtersToTarget(f: Filters): TargetVector {
  const target: TargetVector = {}
  if (f.nostalgia !== null)   target.nostalgia   = f.nostalgia
  if (f.rarity !== null)      target.rarity      = f.rarity
  if (f.tourRarity !== null)  target.tourRarity  = f.tourRarity
  if (f.production !== 'any') target.production  = f.production as ProductionStyle
  if (f.covers === 'yes')     target.coverSongs  = true
  if (f.covers === 'no')      target.coverSongs  = false
  if (f.yearMin > 1988)       target.yearMin     = f.yearMin
  if (f.yearMax < 2026)       target.yearMax     = f.yearMax
  if (f.albums.length > 0) {
    const weights: Record<string, number> = {}
    for (const slug of f.albums) weights[slug] = 1
    target.albumWeights = weights
  }
  return target
}

function isActive(f: Filters): boolean {
  return (
    f.nostalgia !== null ||
    f.rarity !== null ||
    f.tourRarity !== null ||
    f.production !== 'any' ||
    f.covers !== 'either' ||
    f.yearMin > 1988 ||
    f.yearMax < 2026 ||
    f.albums.length > 0
  )
}

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-dim">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`text-xs px-2 py-1 border transition-colors min-h-[32px] ${
              value === opt.value
                ? 'border-green text-green'
                : 'border-border text-dimmer hover:border-dim hover:text-dim'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BrowsePage() {
  const [shows, setShows] = useState<ShowIndex[]>([])
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [results, setResults] = useState<ReturnType<typeof scoreShows>>([])
  const [loading, setLoading] = useState(true)

  // Load data
  useEffect(() => {
    fetch('/data/features_index.json')
      .then((r) => r.json())
      .then((data) => {
        setShows(data as ShowIndex[])
        setLoading(false)
      })
  }, [])

  // Read URL params on mount to pre-seed filters (for "find similar" links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const patch: Partial<Filters> = {}
    const nostalgia  = params.get('nostalgia')
    const rarity     = params.get('rarity')
    const tourRarity = params.get('tourRarity')
    const production = params.get('production')
    const covers     = params.get('covers')
    const album      = params.get('album')
    if (nostalgia)  patch.nostalgia  = parseFloat(nostalgia)
    if (rarity)     patch.rarity     = parseFloat(rarity)
    if (tourRarity) patch.tourRarity = parseFloat(tourRarity)
    if (production) patch.production = production as ProductionFilter
    if (covers === 'yes') patch.covers = 'yes'
    if (covers === 'no')  patch.covers = 'no'
    if (album)      patch.albums = [album]
    if (Object.keys(patch).length > 0) {
      setFilters((prev) => ({ ...prev, ...patch }))
    }
  }, [])

  // Re-score whenever shows or filters change
  useEffect(() => {
    if (!shows.length) return
    const target = filtersToTarget(filters)
    if (isActive(filters)) {
      setResults(scoreShows(shows, target, 50))
    } else {
      setResults([])
    }
  }, [shows, filters])

  const set = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleAlbum = useCallback((slug: string) => {
    setFilters((prev) => {
      const next = prev.albums.includes(slug)
        ? prev.albums.filter((a) => a !== slug)
        : [...prev.albums, slug]
      return { ...prev, albums: next }
    })
  }, [])

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  const active = isActive(filters)

  return (
    <div className="min-h-screen">
      <Nav active="browse" />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">BROWSE SHOWS</h1>
            <p className="text-dim text-xs mt-1">
              Set filters to rank {shows.length || '958'} documented shows by similarity
            </p>
          </div>
          {active && (
            <button
              onClick={reset}
              className="text-xs text-dim border border-border px-3 py-2 hover:border-dim hover:text-foreground transition-colors shrink-0"
            >
              RESET
            </button>
          )}
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter panel */}
          <aside className="lg:w-64 shrink-0 space-y-6">
            <div className="border border-border p-4 space-y-6">
              {/* Sliders */}
              <div className="space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={filters.nostalgia !== null ? 'text-foreground font-bold' : 'text-dim'}>
                      NOSTALGIA
                    </span>
                    {filters.nostalgia !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green tabular-nums">{filters.nostalgia.toFixed(2)}</span>
                        <button onClick={() => set('nostalgia', null)} className="text-dimmer hover:text-dim text-xs">CLEAR</button>
                      </div>
                    ) : (
                      <span className="text-dimmer text-xs">not set</span>
                    )}
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={filters.nostalgia ?? 0.5}
                    onChange={(e) => set('nostalgia', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-dimmer select-none">
                    <span>CURRENT</span><span>CLASSIC</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={filters.rarity !== null ? 'text-foreground font-bold' : 'text-dim'}>
                      GLOBAL RARITY
                    </span>
                    {filters.rarity !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green tabular-nums">{filters.rarity.toFixed(2)}</span>
                        <button onClick={() => set('rarity', null)} className="text-dimmer hover:text-dim text-xs">CLEAR</button>
                      </div>
                    ) : (
                      <span className="text-dimmer text-xs">not set</span>
                    )}
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={filters.rarity ?? 0.5}
                    onChange={(e) => set('rarity', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-dimmer select-none">
                    <span>HITS</span><span>DEEP CUTS</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={filters.tourRarity !== null ? 'text-foreground font-bold' : 'text-dim'}>
                      TOUR RARITY
                    </span>
                    {filters.tourRarity !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green tabular-nums">{filters.tourRarity.toFixed(2)}</span>
                        <button onClick={() => set('tourRarity', null)} className="text-dimmer hover:text-dim text-xs">CLEAR</button>
                      </div>
                    ) : (
                      <span className="text-dimmer text-xs">not set</span>
                    )}
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={filters.tourRarity ?? 0.5}
                    onChange={(e) => set('tourRarity', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-dimmer select-none">
                    <span>TYPICAL</span><span>OFF-SCRIPT</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Year range */}
              <div className="space-y-2">
                <span className="text-xs text-dim">YEAR RANGE</span>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="number"
                    min={1988} max={filters.yearMax}
                    value={filters.yearMin}
                    onChange={(e) => set('yearMin', parseInt(e.target.value) || 1988)}
                    className="w-16 bg-faint border border-border px-2 py-1 text-green tabular-nums text-center"
                  />
                  <span className="text-dimmer">–</span>
                  <input
                    type="number"
                    min={filters.yearMin} max={2026}
                    value={filters.yearMax}
                    onChange={(e) => set('yearMax', parseInt(e.target.value) || 2026)}
                    className="w-16 bg-faint border border-border px-2 py-1 text-green tabular-nums text-center"
                  />
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Album focus */}
              <div className="space-y-2">
                <span className="text-xs text-dim">ALBUM FOCUS</span>
                <div className="space-y-1">
                  {ALBUM_OPTIONS.map((album) => (
                    <button
                      key={album.slug}
                      onClick={() => toggleAlbum(album.slug)}
                      className={`block w-full text-left text-xs px-2 py-1 transition-colors min-h-[32px] ${
                        filters.albums.includes(album.slug)
                          ? 'text-green bg-faint'
                          : 'text-dimmer hover:text-dim'
                      }`}
                    >
                      {filters.albums.includes(album.slug) ? '▸ ' : '  '}
                      {album.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Results panel */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <p className="text-dim text-xs">LOADING DATA...</p>
            ) : !active ? (
              <div className="text-dim text-xs space-y-3 pt-4">
                <p>SET AT LEAST ONE FILTER TO SEE RESULTS.</p>
                <p className="text-dimmer">
                  ADJUST THE SLIDERS OR TOGGLES TO RANK ALL {shows.length} SHOWS BY SIMILARITY TO YOUR TARGET.
                </p>
              </div>
            ) : results.length === 0 ? (
              <p className="text-dim text-xs pt-4">NO MATCHES FOUND — TRY ADJUSTING YOUR FILTERS.</p>
            ) : (
              <div>
                {/* Column headers */}
                <div className="hidden sm:flex items-center gap-3 px-1 py-1 text-xs text-dimmer border-b border-faint mb-0.5">
                  <span className="w-5" />
                  <span className="w-24">DATE</span>
                  <span className="flex-1">VENUE</span>
                  <span>TIER</span>
                  <span className="w-12 text-right">SCORE</span>
                </div>

                {results.map((show, i) => (
                  <ShowRow
                    key={show.id}
                    show={show}
                    rank={i + 1}
                    extra={
                      <span className="text-dimmer text-xs tabular-nums hidden sm:block">
                        {show.score.toFixed(2)}
                      </span>
                    }
                  />
                ))}

                <p className="text-dimmer text-xs pt-4">
                  SHOWING {results.length} OF {shows.filter((s) => s.song_count > 0).length} SHOWS
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
