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

- [ ] **Scaffold Next.js app** in `web/`
  - `npx create-next-app@latest web --typescript --tailwind --app`
  - Copy `data/features_index.json`, `data/songs.json`, `data/albums.json` into `web/public/data/`
  - Or load at build time via `getStaticProps` / `generateStaticParams`

- [ ] **Build scorer** (`web/src/lib/scorer.ts`)
  - Takes a user target vector + features_index array
  - Returns top-N shows sorted by weighted similarity score
  - Dimensions: nostalgia, album distribution, rarity tier, production style, covers

- [ ] **Build RecommenderForm** (`web/src/components/RecommenderForm.tsx`)
  - Quick presets: "Greatest Hits Night", "Deep Cuts", "Nostalgia Trip", "Album Deep Dive", "Stripped & Intimate"
  - Album multi-select (checkboxes for each era/album)
  - Sliders: Nostalgia ←→ Current, Crowd Pleasers ←→ Rarities, Stripped ←→ Full Production
  - Toggle: Include covers
  - Optional freeform text field (parsed by Gemini)

- [ ] **Build ShowCard** (`web/src/components/ShowCard.tsx`)
  - Date, venue, city
  - Feature badges: nostalgia score, rarity tier, primary album, production style
  - Song count + cover count
  - Link to full setlist view

- [ ] **Build Setlist view** (`web/src/components/Setlist.tsx`)
  - Songs grouped by section/act
  - Rarity badge per song (unicorn 🦄 / deep cut / staple)
  - Cover attribution
  - Song notes (reworked version, remix, etc.)

- [ ] **Gemini integration** (`web/src/app/api/generate/route.ts`)
  - Freeform text → structured target vector (parameter parsing)
  - Generate synthetic setlist from target params + top-5 matching real shows as context
  - Prompt budget: ~6,000 tokens per request (well within Gemini Flash free tier)

- [ ] **Show detail page** (`web/src/app/shows/[id]/page.tsx`)
  - Full setlist with all metadata
  - Feature vector visualized
  - Link to ninlive source
  - "Find similar shows" button

## Infrastructure

- [ ] **Deploy to Vercel**
  - Connect GitHub repo to Vercel
  - Add `GEMINI_API_KEY` environment variable in Vercel dashboard
  - Confirm auto-deploy on push to main

- [ ] **Verify GitHub Action** (`update-data.yml`)
  - Add `SETLISTFM_API_KEY` as GitHub repository secret if using setlist.fm supplement
  - Test manual trigger via `workflow_dispatch`
  - Confirm Vercel redeploys after data commit

## Nice to have

- [ ] Show a "setlist matrix" view — songs as rows, shows as columns, heatmap of what gets played when
- [ ] "This show is most similar to..." card linking to the closest historical match
- [ ] Era timeline — browse shows by clicking on a year/era
- [ ] Rarity leaderboard — most and least played songs of all time
- [ ] Mobile-friendly layout
