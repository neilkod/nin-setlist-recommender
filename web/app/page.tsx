import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import Nav from '@/components/Nav'
import ShowRow, { ShowRowHeader, ShowRowMobile } from '@/components/ShowRow'
import TourFilter from '@/components/TourFilter'
import { getAllCuratedLists } from '@/lib/curated'
import { filterShowsByTour, filterLabel } from '@/lib/tourGroups'
import { RARITY_LABELS, RARITY_COLORS, RARITY_DESCRIPTIONS, type ShowIndex, type RarityTier } from '@/lib/types'

const TIERS: RarityTier[] = ['unicorn', 'deep-cuts', 'mixed', 'balanced', 'hits-heavy']

interface PageProps {
  searchParams: Promise<{ era?: string; tour?: string }>
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const { era, tour } = await searchParams

  const allShows = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'public/data/features_index.json'), 'utf-8')
  ) as ShowIndex[]

  const shows = filterShowsByTour(allShows, era, tour)
  const lists = getAllCuratedLists(shows)
  const activeFilter = filterLabel(era, tour)

  return (
    <div className="min-h-screen">
      <Nav active="discover" />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">

        {/* Hero */}
        <header className="mb-6">
          <p className="text-xs text-dim tracking-widest mb-1">NINE INCH NAILS — LIVE ARCHIVE</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">SETLIST RECOMMENDER</h1>

          <p className="text-dim text-xs mt-3 leading-relaxed max-w-2xl">
            In December 2018, NIN played{' '}
            <Link
              href="/shows/2018-12-11-the-palladium"
              className="text-foreground hover:text-green transition-colors"
            >
              The Palladium in Los Angeles
            </Link>
            . Every song was from 1994 or earlier — a 2018 show where the average
            song was 26 years old. Discovering that setlist prompted this question:
            what other shows in their 35-year archive are worth finding?
          </p>
          <p className="text-dim text-xs mt-2 leading-relaxed max-w-2xl">
            NIN has played {allShows.length} documented concerts since 1988. Each one is different.
            This surfaces the ones that stand out.
          </p>

          <div className="mt-4">
            <Link
              href="/browse"
              className="text-xs text-green border border-green px-3 py-2 hover:bg-green hover:text-background transition-colors tracking-wider inline-block"
            >
              BROWSE ALL SHOWS →
            </Link>
          </div>
        </header>

        {/* Tour filter */}
        <div className="mb-5 py-3 border-y border-border">
          <TourFilter selectedEra={era} selectedTour={tour} />
          {activeFilter && (
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="text-green font-bold">{activeFilter}</span>
              <span className="text-dim">— {shows.length} shows</span>
              <Link href="/" className="text-dimmer hover:text-dim transition-colors ml-auto">
                CLEAR FILTER ×
              </Link>
            </div>
          )}
        </div>

        {/* Tier legend */}
        <div className="mb-6 py-3 border-b border-border text-xs">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {TIERS.map((tier) => (
              <span key={tier} title={RARITY_DESCRIPTIONS[tier]}>
                <span className={`font-bold ${RARITY_COLORS[tier]}`}>
                  [{RARITY_LABELS[tier]}]
                </span>
                <span className="text-dimmer ml-1 hidden sm:inline">
                  — {RARITY_DESCRIPTIONS[tier]}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* How it works */}
        <details className="mb-8 group">
          <summary className="text-xs text-dim cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-2 select-none">
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span>
            HOW THIS WORKS
          </summary>
          <div className="mt-3 text-xs text-dim space-y-2 border-l border-border pl-4">
            <p>
              <span className="text-foreground font-bold">GLOBAL RARITY</span> — each song is
              scored by how rarely it appears across all {allShows.length} shows. A song played
              once ever scores 1.0; a song played at every show scores 0.0.
            </p>
            <p>
              <span className="text-foreground font-bold">TOUR RARITY</span> — measures how
              off-script a show was within its own tour leg. A setlist full of songs never
              repeated on that tour scores near 1.0; the standard nightly setlist scores near 0.0.
            </p>
            <p>
              <span className="text-foreground font-bold">NOSTALGIA</span> — how old the material
              was relative to when it was played. A 2025 show playing only 1989 songs scores 1.0,
              same as a 1993 show doing the same — both are maximally nostalgic for their era.
            </p>
            <p>
              <span className="text-foreground font-bold">MICRO-SHOWS</span> — radio sessions,
              festival slots, and warmup sets with fewer than 8 songs. Historically interesting
              but not representative of a full concert experience.
            </p>
            <p className="text-dimmer">
              All recommendations are real documented performances from ninlive.com. No synthetic
              setlists are ever generated.
            </p>
          </div>
        </details>

        {/* Curated lists */}
        {shows.length === 0 ? (
          <p className="text-dim text-xs">NO SHOWS FOUND FOR THIS FILTER.</p>
        ) : (
          <div className="space-y-12">
            {lists.map((list) => (
              <section key={list.id}>
                <div className="flex items-center gap-3 mb-1 pb-2 border-b border-border-bright">
                  <span className="text-green text-xs select-none">──</span>
                  <h2 className="text-xs font-bold tracking-widest">{list.label}</h2>
                  {list.description && (
                    <span className="text-dimmer text-xs hidden md:block truncate flex-1">
                      — {list.description}
                    </span>
                  )}
                  <span className="text-dimmer text-xs shrink-0 ml-auto">
                    {list.shows.length}
                  </span>
                </div>

                {/* Desktop: HTML table guarantees column alignment */}
                <table
                  className="hidden sm:table w-full text-xs"
                  style={{ tableLayout: 'fixed' }}
                >
                  <colgroup>
                    <col style={{ width: '36px' }} />
                    <col style={{ width: '92px' }} />
                    <col />
                    <col style={{ width: '104px' }} />
                    <col style={{ width: '52px' }} />
                  </colgroup>
                  <thead>
                    <ShowRowHeader />
                  </thead>
                  <tbody>
                    {list.shows.map((show, i) => (
                      <ShowRow key={show.id} show={show} rank={i + 1} />
                    ))}
                  </tbody>
                </table>

                {/* Mobile: stacked cards */}
                <div className="sm:hidden">
                  {list.shows.map((show) => (
                    <ShowRowMobile key={show.id} show={show} />
                  ))}
                </div>

                {list.browseHref && !activeFilter && (
                  <div className="mt-2 text-right">
                    <Link
                      href={list.browseHref}
                      className="text-xs text-dim hover:text-green transition-colors"
                    >
                      BROWSE MORE →
                    </Link>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        <footer className="mt-16 pt-6 border-t border-border text-xs text-dimmer space-y-1.5">
          <p>
            DATA FROM{' '}
            <a href="https://www.ninlive.com" target="_blank" rel="noopener noreferrer" className="hover:text-dim transition-colors">
              NINLIVE.COM
            </a>
            {' '}· UPDATED WEEKLY · NO SYNTHETIC SETLISTS
          </p>
          <p>
            <a href="https://github.com/neilkod/nin-setlist-recommender" target="_blank" rel="noopener noreferrer" className="hover:text-dim transition-colors">
              GITHUB
            </a>
            {' '}· FEEDBACK &amp; CONTRIBUTIONS WELCOME ·{' '}
            <a href="mailto:nkodner@gmail.com" className="hover:text-dim transition-colors">
              NKODNER@GMAIL.COM
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}
