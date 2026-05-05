# NIN Setlist Recommender

In December 2018, Nine Inch Nails played [The Palladium in Los Angeles](https://www.ninlive.com/artists/nin/concerts/2018-12-11-the-palladium). Every song was from 1994 or earlier. The average song was 26 years old. A 2018 show that felt like 1994.

Discovering that setlist ([via Reddit](https://www.reddit.com/r/nin/comments/1sznm8i/nine_inch_nails_los_angeles_20181211_full_show/)) prompted a question: what other shows in their 35-year archive are worth finding? NIN has played 1,176 documented concerts. Each one is different. This surfaces the ones that stand out.

---

An AI-powered tool that recommends Nine Inch Nails concert setlists based on your mood and preferences — nostalgia level, album focus, rarity, tour uniqueness, and more.

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
- **56 known covers** with original artist attribution

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

## The math

This is not a machine learning model in the trained-weights sense. There is no training data, no gradient descent, no neural network. It is a **content-based recommender system** built on hand-crafted features and a weighted similarity score — a classic information retrieval technique. Here's how it works end to end.

### Step 1 — Feature extraction (turning a show into numbers)

Every show is described by a **feature vector**: a fixed set of numbers that captures its musical character. Each number is computed directly from the setlist data using statistics, not learned parameters.

**Rarity score (per song)**

The simplest feature. For each song, count how often it has appeared across all 1,176 shows:

```
rarity_score = 1 − (play_count / total_shows)
```

A score of `1.0` means the song was played at exactly one show ever. A score of `0.0` means it appeared at every show. "Head Like A Hole" (played at 76% of shows) has rarity `0.24`. "A Warm Place" (played at 3.6%) has rarity `0.96`.

**Era play rate (per song) — correcting for age bias**

Raw play counts are biased toward older songs: "Suck" (1992) has 394 total plays; "Copy of A" (2013) has ~114. Globally, Copy of A *looks* like a deep cut. But during the Hesitation Marks tour, it was played at 90% of shows — it was the hit single.

To correct for this, each song also has an era-relative play rate:

```
era_play_rate = plays_within_primary_era / total_shows_in_that_era
```

"Copy of A" has global rarity `0.80` (looks rare) but `era_play_rate = 0.90` in the HM era (clearly a staple). The UI uses this to show context like *"Staple in Hesitation Marks era · last played 2014"* rather than falsely labeling it a deep cut.

**Nostalgia score (per show)**

For each song in the setlist, compute how old it was at the time of the show:

```
song_age = show_year − song.release_year
```

Then average across the whole setlist and normalize:

```
nostalgia_score = mean(song_ages) / (show_year − 1989)
```

The denominator is the maximum possible age at that point in time — the age of *Pretty Hate Machine*, NIN's debut. This makes the score **relative to the era**: a 2025 show playing 1989 songs scores `1.0`, and so does a 1993 show playing 1989 songs. Both are maximally nostalgic *for their time*. A 2025 Hesitation Marks tour show scores `0.04` — nearly all brand new material.

Covers are excluded from this calculation to avoid distortion from the original artist's release year.

**Album distribution (per show)**

A histogram of which albums the songs came from, expressed as fractions:

```
album_distribution = { "the-downward-spiral": 0.30, "the-fragile": 0.20, ... }
```

This is simply a count per album divided by total songs in the setlist.

**Show rarity tier (per show)**

Rather than averaging rarity scores across the setlist (which produces a misleading middle value), we count songs in each rarity bucket:

```
n_unicorn  = songs with rarity > 0.97   (played at <3% of all shows)
n_deep_cut = songs with rarity in (0.92, 0.97]
n_staple   = songs with rarity ≤ 0.50
```

Then classify the show:

```
if n_unicorn ≥ 2              → "unicorn"    (historic night)
elif n_unicorn + n_deep_cut ≥ 4 → "deep-cuts"
elif n_unicorn + n_deep_cut ≥ 2 → "mixed"
elif n_staple / total > 0.60    → "hits-heavy"
else                            → "balanced"
```

### Step 2 — Scoring (matching user preferences to shows)

When a user specifies preferences, they become a **target vector** — the same shape as a show's feature vector, but representing the ideal show rather than a real one.

Each show is then scored against the target:

```
score = w_nostalgia  × (1 − |show.nostalgia − target.nostalgia|)
      + w_albums     × album_similarity(show.distribution, target.albums)
      + w_rarity     × (1 − |show.avg_rarity − target.rarity|)
      + w_production × exact_match(show.production, target.production)
      + w_covers     × exact_match(show.has_covers, target.covers)
```

The weights `w_*` are set based on which dimensions the user actually specified — if they only mentioned album focus, that dimension gets all the weight. `album_similarity` is a dot product between the two album distributions (equivalent to cosine similarity when both sum to 1).

This is scored against all 958 documented shows in milliseconds — the feature vectors are pre-computed and load statically in the browser. No server call needed for the core matching.

### Step 3 — Where Gemini fits in

The scoring function above requires structured input (numbers and choices). Gemini's only job is to bridge the gap when a user types something like *"a stripped-down show heavy on The Fragile with a couple deep cuts"* — it maps that to the target vector the scorer expects. The actual show recommendations always come from real historical data.

This architecture means the recommender works instantly (no API latency) for slider/preset input, and falls back to a Gemini API call only when freeform text is used.

### What this is (and isn't)

| Technique | Used? | Where |
|---|---|---|
| Neural network / deep learning | No | — |
| Collaborative filtering (user ratings) | No | — |
| Content-based filtering | **Yes** | Core recommender |
| Feature engineering | **Yes** | All song/show statistics |
| Nearest-neighbor retrieval | **Yes** | Show scoring |
| Large language model | **Yes** | Freeform text parsing only |

## Auto-updates

A GitHub Action runs every Tuesday at 3am UTC, scrapes ninlive for new shows, rebuilds the catalog, and commits any changes. Vercel auto-deploys on push.

## Tech stack

- **Scraper**: Python 3.9+ (`httpx`, `beautifulsoup4`, `tenacity`)
- **Web app**: Next.js 16 + TypeScript + Tailwind v4 + Geist Mono — terminal/console aesthetic, three pages: Discover, Show Detail, Browse
- **AI**: Gemini 1.5 Flash for freeform text → parameter parsing only (no generated setlists)
- **Hosting**: Vercel (free tier)
- **Data source**: [ninlive.com](https://www.ninlive.com) (primary), [setlist.fm](https://www.setlist.fm) (supplement)

## Recommender dimensions

| Dimension | What it means |
|---|---|
| Nostalgia | How old the material was relative to the show date |
| Album focus | Weight toward specific records (e.g. "mostly Fragile + some TDS") |
| Rarity | Deep cuts vs. crowd pleasers |
| Tour rarity | How off-script a show was within its own tour leg |
| Year range | Filter to a specific era or date window |

## Contributing & feedback

Source is on [GitHub](https://github.com/neilkod/nin-setlist-recommender). Feedback and contributions are appreciated — open an issue or PR.

For anything else, reach out at [nkodner@gmail.com](mailto:nkodner@gmail.com).
