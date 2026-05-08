# NIN Setlist Recommender — Claude guidance

## What this project is

A NIN concert setlist recommender. Users describe what they want (via sliders, presets, or freeform text) and the app finds the closest matching real historical NIN shows. It never generates or fabricates setlists — it only surfaces documented performances from the archive.

**No synthetic setlists. Ever.** Gemini's only job is to parse freeform text into a structured target vector. All recommendations are real shows.

## Origin

Built after discovering the [2018-12-11 Palladium LA show](https://www.ninlive.com/artists/nin/concerts/2018-12-11-the-palladium) — a 2018 concert where every song was from 1994 or earlier (avg song age: 26 years). The question it raised: what other shows in NIN's archive are worth finding?

## Current state

### Data pipeline — COMPLETE ✅
All scripts are in `scraper/`. Run order: `scrape_ninlive.py → scrape_albums.py → enrich_songs.py → compute_features.py`

- **1,176 shows** scraped from ninlive.com (1988–2026)
- **958 shows** have full setlist data (218 early shows have no documented setlist)
- **191 unique songs** — all attributed to albums, 0 unknowns remaining
- **56 known covers** catalogued with original artist attribution
- Feature vectors computed for all 958 shows → `data/features_index.json`
- Song catalog with global rarity + era play rate → `data/songs.json`
- **Non-album cuts** (`n_non_album`, `non_album_fraction`) computed per show — songs not on any of the 13 proper NIN studio/EP releases

### Web app — LIVE ✅
Deployed at https://nin-setlist-recommender-neilkods-projects.vercel.app  
All three pages functional. Gemini 2.5 Flash freeform text parsing live.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + Geist Mono font  
**Design:** Black bg, white/green monospace terminal aesthetic. Muted desaturated rose/amber for rarity (no jarring red/orange). All color tokens in `web/app/globals.css`.  
**Data location:** `web/public/data/` — features_index.json + songs.json + albums.json + 1,176 individual show JSONs  

### GitHub
Repo: https://github.com/neilkod/nin-setlist-recommender  
All data and scraper code is committed. Auto-update GitHub Action is in place (weekly, Tuesdays).

---

## Web app — current state

### Pages
- **`/`** — Discover: 8 curated top-10 lists (Rarest, Nostalgia, Longest, Covers, Stripped, TDS Nights, Off-Script, Micro-Shows), tour filter dropdown (9 era groups × 57 tours), tier legend, collapsible "HOW THIS WORKS", per-show blurbs explaining each score
- **`/shows/[id]`** — Show detail: metadata, score bars, tour rank, full setlist by section with per-song rarity badges, FIND SIMILAR SHOWS → button, ninlive source link. 960 pages pre-rendered via `generateStaticParams`.
- **`/browse`** — Interactive filter: nostalgia/rarity/tour rarity sliders, year range, album multi-select, live-ranked results. Reads URL params to pre-seed from "FIND SIMILAR" links.

### Key library files
- `web/lib/types.ts` — all TypeScript types + label/color maps + `ninliveUrl()` / `formatDate()` helpers
- `web/lib/scorer.ts` — weighted similarity engine + `findSimilarShows()`
- `web/lib/curated.ts` — 8 top-N list functions, `MIN_SONGS = 8` threshold (micro-shows excluded from main lists)
- `web/lib/blurbs.ts` — generates context-specific one-line explanations per show per list (e.g. "5 unicorn songs + 2 deep cuts · HM 56% · The Fragile 22%")
- `web/lib/tourGroups.ts` — 9-era tour taxonomy with abbreviated display names; `filterShowsByTour()` for Discover page

### Components
- `web/components/ShowRow.tsx` — CSS grid table row with inline `style` (avoids Tailwind v4 layer conflicts); exports `ShowRowHeader`; accepts optional `blurb` prop
- `web/components/RarityBadge.tsx` — global, tour, and per-song rarity badges
- `web/components/ScoreBar.tsx` — unicode block bar (█░) for 0–1 scores
- `web/components/SongRow.tsx` — setlist entry with rarity badge + era context
- `web/components/Nav.tsx` — top navigation
- `web/components/TourFilter.tsx` — client component; grouped `<select>` with `<optgroup>` per era; navigates via URL params

### Important CSS note
Tailwind v4 CSS layers cause `grid-template-columns` in custom classes to be overridden by utilities. **Always use inline `style` props** for CSS Grid layout in this project — never define grid templates as Tailwind arbitrary classes.

## What to build next

### Near-term
- [ ] **Deploy to Vercel** — connect GitHub repo, set Root Directory to `web`, add `GEMINI_API_KEY` env var
- [ ] **Browse page: production/covers filters** — removed pending better UX; see `TODO.md` for design notes
- [ ] **Mobile layout review** — Browse sidebar is tall on mobile; may want collapsible filter panel

### Future
- [ ] **Gemini AI freeform text** — `web/app/api/recommend/route.ts` parses text → `TargetVector`; scorer is ready
- [ ] **Setlist.fm supplement** — fill 218 early shows with missing setlist data (user has API key)
- [ ] **Missing covers** — Bowie co-headline era, Gary Numan, Joy Division (see `TODO.md`)

---

## Data pipeline details

### Run order (IMPORTANT — each step depends on the previous)
```
scrape_ninlive.py → scrape_albums.py → enrich_songs.py → compute_features.py
```

**Do NOT re-run `scrape_ninlive.py` without reason** — it takes ~25 min and hits ninlive.com ~1,200 times. Use `--update` flag for incremental updates.

### Key data files
```
data/
  shows/              1,176 individual show JSONs (full setlist + feature vector)
  index.json          compact show index (no setlists)
  albums.json         24 releases + 256 song→album mappings + 56 known covers
  songs.json          191 songs: rarity_score, era_play_rate, era_context, album, cover info
  features_index.json all shows with feature vectors — what the web app loads
```

### Show JSON structure
```json
{
  "id": "2025-8-19-united-center",
  "date": "2025-08-19",
  "venue": "United Center",
  "city": "Chicago", "state": "IL", "country": "United States",
  "tour": "Peel It Back - Fall Arena Tour 2025 North America",
  "era_slug": "peel-it-back",
  "setlist": [
    { "position": 1, "song": "A Minute To Breathe", "slug": "a-minute-to-breathe",
      "section": "Act 1: B-Stage, Stripped Down", "notes": "...", "is_cover": true }
  ],
  "song_count": 20,
  "features": { ... }   ← feature vector, see below
}
```

### Feature vector structure
```json
"features": {
  "nostalgia_score": 0.41,          // 0=all new, 1=all PHM-era
  "avg_song_age_at_show": 14.8,     // average years old at time of show
  "album_distribution": { "tds": 0.20, "hm": 0.15, ... },
  "era_distribution": { "The Downward Spiral": 0.20, ... },
  "primary_album": "the-downward-spiral",
  "primary_era": "The Downward Spiral",
  "avg_rarity_score": 0.71,
  "rarity_tier": "mixed",           // unicorn | deep-cuts | mixed | balanced | hits-heavy
  "n_unicorn": 0, "n_deep_cut": 2, "n_album_track": 8, "n_familiar": 6, "n_staple": 4,
  "cover_count": 2,
  "cover_fraction": 0.10,
  "special_notes_count": 5,
  "production_style": "mixed",      // stripped | mixed | full
  "has_stripped_section": true,
  "song_count": 20,
  "sections": ["Act 1: B-Stage, Stripped Down", "Act 2: Main Stage, Full Production", ...]
}
```

### Song catalog structure (songs.json)
```json
"hurt": {
  "slug": "hurt",
  "name": "Hurt",
  "album_slug": "the-downward-spiral",
  "album_year": 1994,
  "era_group": "The Downward Spiral",
  "is_cover": false,
  "play_count": 799,
  "rarity_score": 0.321,          // global: 0=every show, 1=played once
  "era_play_rate": 0.6439,        // how often in its primary era's shows
  "era_context": "Staple in The Downward Spiral era",
  "first_played": "1994-03-17",
  "last_played": "2026-03-16"
}
```

---

## Key architectural decisions

### Absolute nostalgia score
```
nostalgia_score = avg_song_age_at_show / max(avg_song_age_at_show across all 958 shows)
```
Denominator = global maximum observed avg song age (~27.8 years, recomputed each run). A 1990 show playing 1-year-old PHM songs scores near 0 (correctly — not nostalgic). A show like 2018-12-11 playing 26-year-old material scores ~0.94. Covers excluded from calculation.

### Count-based rarity tiers (not average-based)
Show rarity uses song counts per bucket, not an average rarity score. Thresholds (0.97 / 0.92 / 0.75 / 0.50) are based on the actual distribution across all 1,176 shows.

### Era play rate fallback
If a song's release era has no documented shows (e.g. Broken 1992–93 — NIN barely toured), falls back to the era where the song appeared most frequently. "Suck" has no Broken-era shows but is a staple in the With Teeth era (79% of shows).

### Cover handling
ninlive doesn't flag covers in HTML. `KNOWN_COVERS` dict in `scrape_albums.py` has 56 entries. Covers on a NIN release keep their NIN album attribution with `is_cover: True`. Covers not on any NIN release get `album_slug: "cover"`. Covers are excluded from nostalgia score.

### Album priority
When a song appears on multiple releases, canonical album chosen by type priority: studio > ep > live > soundtrack > single. `CANONICAL_ALBUM_OVERRIDES` in `scrape_albums.py` handles exceptions (e.g. Still ambient tracks → The Fragile).

---

## Important constants

- `NIN_DEBUT_YEAR = 1989` in `compute_features.py` — nostalgia score denominator
- `DELAY_BETWEEN_REQUESTS = 1.2` in `scrape_ninlive.py` — be polite to ninlive.com (fan-run site)
- Rarity thresholds: 0.97 / 0.92 / 0.75 / 0.50 — changing requires re-running `compute_features.py`
- Era date ranges in `enrich_songs.py` — changing requires re-running `enrich_songs.py` + `compute_features.py`

## TODO

See `TODO.md` for the full task list. The current priority is Phase 2 (web app). Data cleanup is complete.
