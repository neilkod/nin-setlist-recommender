# NIN Setlist Recommender — Claude guidance

## What this project is

A NIN concert setlist recommender. Users describe what they want (via sliders, presets, or freeform text) and the app finds the closest matching real historical NIN shows. It never generates or fabricates setlists — it only surfaces documented performances from the archive.

**No synthetic setlists. Ever.** Gemini's only job is to parse freeform text into a structured target vector. All recommendations are real shows.

## Current state (as of last session)

### Data pipeline — COMPLETE ✅
All scripts are in `scraper/`. Run order: `scrape_ninlive.py → scrape_albums.py → enrich_songs.py → compute_features.py`

- **1,176 shows** scraped from ninlive.com (1988–2026)
- **958 shows** have full setlist data (218 early shows have no documented setlist)
- **191 unique songs** — all attributed to albums, 0 unknowns remaining
- **56 known covers** catalogued with original artist attribution
- Feature vectors computed for all 958 shows → `data/features_index.json`
- Song catalog with global rarity + era play rate → `data/songs.json`

### Web app — NOT STARTED ❌
Next session starts here. See Phase 2 below.

### GitHub
Repo: https://github.com/neilkod/nin-setlist-recommender  
All data and scraper code is committed. Auto-update GitHub Action is in place (weekly, Tuesdays).

---

## What to build next — Phase 2: Web app

### 1. Scaffold Next.js app
```bash
npx create-next-app@latest web --typescript --tailwind --app --no-git
```
The `web/` directory doesn't exist yet. After scaffolding, data files from `data/` need to be accessible — either copy into `web/public/data/` or load at build time via Next.js static generation.

### 2. Build the scorer (`web/src/lib/scorer.ts`)
The core matching algorithm. Takes a user target vector and the features index, returns top-N shows sorted by weighted similarity.

Scoring formula:
```
score = w_nostalgia  × (1 − |show.nostalgia_score − target.nostalgia|)
      + w_albums     × dotProduct(show.album_distribution, target.album_weights)
      + w_rarity     × (1 − |show.avg_rarity_score − target.rarity|)
      + w_production × (show.production_style === target.production ? 1 : 0)
      + w_covers     × (show.has_covers === target.covers ? 1 : 0)
```
Weights are proportional to which dimensions the user actually specified.

### 3. Build the UI
- `RecommenderForm` — presets + sliders + optional freeform text
- `ShowCard` — date, venue, city, feature badges (nostalgia, rarity tier, primary album)
- `Setlist` — songs grouped by section, rarity badge per song, cover attribution, song notes

### 4. Gemini API route (`web/src/app/api/recommend/route.ts`)
Only called when user submits freeform text. Parses it into a target vector, then the scorer runs client-side. The user has a Gemini API key — store as `GEMINI_API_KEY` env var.

### 5. Deploy to Vercel
Connect GitHub repo → Vercel auto-deploys on push to main. Add `GEMINI_API_KEY` in Vercel dashboard.

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

### Relative nostalgia score
```
nostalgia_score = mean(show_year − song.release_year) / (show_year − 1989)
```
Denominator = max possible age at that point in time (age of PHM). A 2025 show and a 1993 show both playing only PHM songs both score 1.0 — both are maximally nostalgic for their era. Covers excluded from calculation.

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
