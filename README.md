# NIN Setlist Recommender

An AI-powered tool that recommends Nine Inch Nails concert setlists based on your mood and preferences — nostalgia level, album focus, rarity, production style, and more.

## How it works

The app is built on a comprehensive archive of all 1,176 NIN live performances (1988–2026), scraped from [ninlive.com](https://www.ninlive.com). Each show is analyzed and assigned a **feature vector** — a set of numbers describing it on every dimension a fan might care about:

- **Nostalgia score** — how old the material was *relative to when it was played* (a 2025 show playing 1989 songs scores higher than a 1994 show playing the same songs)
- **Album distribution** — what % of the setlist came from each record
- **Rarity tier** — from *hits-heavy* to *deep-cuts* to *unicorn* (songs played fewer than 3 times ever)
- **Production style** — stripped/intimate B-stage vs. full arena production
- **Covers & special moments** — reworked versions, guest appearances, one-off performances

When you describe what you want, the app scores every real historical show against your preferences and returns the closest matches — actual documented setlists from NIN's live history. Gemini is used only to interpret freeform text input, not to generate or fabricate setlists.

## Data pipeline

Run these in order after cloning:

```bash
cd scraper
pip install -r requirements.txt

# 1. Scrape all shows from ninlive.com (~25 min, fully restartable)
python scrape_ninlive.py

# 2. Scrape album/tracklist data to build song→album mapping
python scrape_albums.py

# 3. Build song catalog with rarity scores and album attribution
python enrich_songs.py

# 4. Compute feature vectors for all shows
python compute_features.py
```

To update with new shows after the initial scrape:
```bash
python scrape_ninlive.py --update   # only fetches shows newer than last known date
python enrich_songs.py
python compute_features.py
```

## Data files

| File | Description |
|---|---|
| `data/shows/*.json` | One JSON per show — full setlist with act structure, song notes, cover flags |
| `data/index.json` | Compact index of all shows (no setlists) |
| `data/albums.json` | All 24 NIN releases with tracklists; song→album mapping |
| `data/songs.json` | 191 unique songs with rarity scores, play counts, album attribution |
| `data/features_index.json` | All shows with pre-computed feature vectors (no setlists) — what the recommender loads |

## Stats

- **1,176 total shows** (1988–2026)
- **958 shows with setlist data** (218 early shows have no documented setlist)
- **191 unique songs** played across all shows
- **24 releases** tracked (studio albums, EPs, singles, soundtracks)
- **9 known covers** with proper attribution

## Rarity tiers

Songs are bucketed by how often they appear across all shows:

| Rarity score | % of shows | Label |
|---|---|---|
| (0.97, 1.0] | < 3% | Unicorn |
| (0.92, 0.97] | 3–8% | Deep cut |
| (0.75, 0.92] | 8–25% | Album track |
| (0.50, 0.75] | 25–50% | Familiar |
| [0.00, 0.50] | 50%+ | Staple |

Shows are then labeled based on their composition: a show with 4+ unicorns/deep cuts is a `unicorn` or `deep-cuts` night; a show dominated by 50%+ staples is `hits-heavy`.

## Auto-updates

A GitHub Action runs every Tuesday at 3am UTC, scrapes ninlive for new shows, rebuilds the catalog, and commits any changes. Vercel auto-deploys on push.

## Tech stack

- **Scraper**: Python 3.9+ (`httpx`, `beautifulsoup4`, `tenacity`)
- **Web app**: Next.js (TypeScript) — coming soon
- **AI**: Gemini 1.5 Flash for freeform text → parameter parsing only (no generated setlists)
- **Hosting**: Vercel (free tier)
- **Data source**: [ninlive.com](https://www.ninlive.com) (primary), [setlist.fm](https://www.setlist.fm) (supplement)

## Recommender dimensions

| Dimension | What it means |
|---|---|
| Nostalgia | How old the material was relative to the show date |
| Album focus | Weight toward specific records (e.g. "mostly Fragile + some TDS") |
| Rarity | Deep cuts vs. crowd pleasers |
| Production style | Stripped/intimate vs. full arena production |
| Covers | Whether covers are included |
| Special moments | Reworked versions, guest appearances, noted one-offs |
