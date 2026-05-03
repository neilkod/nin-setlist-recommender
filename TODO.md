# TODO

## Data cleanup

- [ ] **Add missing covers to KNOWN_COVERS** in `scraper/scrape_albums.py`
  - Bowie co-headline era covers: `hallo-spaceboy`, `scary-monsters`, `subterraneans`, `fashion` (~27–34 plays each)
  - `i-cant-give-everything-away` (Bowie, Blackstar, 2016 — played as tribute after his death, 14 plays)
  - `hand-covers-bruise` (Trent Reznor & Atticus Ross, The Social Network OST 2010, 15 plays)
  - Gary Numan: `cars`, `digital`, `i-die-you-die`, `down-in-the-park` (early tour covers)
  - Joy Division: `atmosphere`, `twenty-four-hours`, `warsaw`
  - Other early rarities: `animal` (Pigface?), `nightclubbing` (Iggy Pop), `beat-my-guest` (Adam Ant)
  - After adding, re-run: `scrape_albums.py → enrich_songs.py → compute_features.py`

- [ ] **Map unreleased / Peel It Back material** — investigate these slugs on ninlive song pages:
  - `whatifwecould` (8 plays), `you-made-it-feel-like-home` (13 plays), `banged-and-blown-through` (10 plays)
  - `now-im-nothing` (34 plays — Bowie collaboration?), `welcome-oblivion` (2 plays — NIN/How to Destroy Angels?)

- [ ] **Supplement 218 shows missing setlist data** using setlist.fm API (user has key)
  - Mostly 1988–1991 shows where ninlive has date/venue but no songs
  - setlist.fm endpoint: `GET /rest/1.0/search/setlists?artistMbid=b7ffd2af-418f-4be2-bdd1-22f8b48613da`

## Web app

### Completed ✅
- [x] **Scaffold** — Next.js 16 + TypeScript + Tailwind v4 + Geist Mono in `web/`
- [x] **Data** — all 1,176 show JSONs + features_index + songs + albums in `web/public/data/`
- [x] **Types** — `web/lib/types.ts` (`ShowIndex`, `Show`, `SetlistSong`, `TargetVector`, `ScoredShow`, helpers)
- [x] **Scorer** — `web/lib/scorer.ts` — weighted similarity + `findSimilarShows()`
- [x] **Curated lists** — `web/lib/curated.ts` — 6 top-10 list functions + `getAllCuratedLists()`

### Phase 3 — Components (next)
- [ ] **ShowRow** (`web/components/ShowRow.tsx`) — compact ranked-list row linking to show detail
- [ ] **ShowCard** (`web/components/ShowCard.tsx`) — expanded card with feature badges
- [ ] **RarityBadge** (`web/components/RarityBadge.tsx`) — per-song inline rarity label

### Phase 4 — Pages
- [ ] **Discover page** (`web/app/page.tsx`) — 6 curated top-10 lists, fully static, server-rendered
- [ ] **Show detail page** (`web/app/shows/[id]/page.tsx`) — full setlist, feature stats, ninlive link, "find similar" button
- [ ] **Browse page** (`web/app/browse/page.tsx`) — client component with sliders + live-ranked results; reads URL params for "find similar" deep links

### Phase 5 — Deploy
- [ ] **Deploy to Vercel** — connect GitHub repo, add `GEMINI_API_KEY` env var
- [ ] **Verify GitHub Action** (`update-data.yml`) — confirm Vercel redeploys after data commit

### Future — AI feature
- [ ] **Gemini integration** (`web/app/api/recommend/route.ts`) — freeform text → `TargetVector` via Gemini Flash; scorer already ready to consume the output

## Infrastructure

- [ ] **Deploy to Vercel**
  - Connect GitHub repo to Vercel
  - Add `GEMINI_API_KEY` environment variable in Vercel dashboard
  - Confirm auto-deploy on push to main

- [ ] **Verify GitHub Action** (`update-data.yml`)
  - Add `SETLISTFM_API_KEY` as GitHub repository secret if using setlist.fm supplement
  - Test manual trigger via `workflow_dispatch`
  - Confirm Vercel redeploys after data commit

## Browse page — deferred filters

- [ ] **Production style filter** — removed from Browse UI pending UX review; the data is in the feature vector (`production_style`: stripped/mixed/full). Decide if it's useful as a standalone filter or better expressed as a preset (e.g. "STRIPPED NIGHTS" preset that sets production=stripped).
- [ ] **Covers filter** — removed pending better UX. Most shows have 0–2 covers so a yes/no toggle isn't very informative. Better approach: filter by shows with *more covers than typical* (e.g. cover_fraction > 0.10), or expose as a "HEAVY ON COVERS" preset. Data is in `cover_count` and `cover_fraction`.

## Nice to have

- [ ] Show a "setlist matrix" view — songs as rows, shows as columns, heatmap of what gets played when
- [ ] "This show is most similar to..." card linking to the closest historical match
- [ ] Era timeline — browse shows by clicking on a year/era
- [ ] Rarity leaderboard — most and least played songs of all time
- [ ] Mobile-friendly layout
