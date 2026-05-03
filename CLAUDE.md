# NIN Setlist Recommender — Claude guidance

## Project overview

A NIN concert setlist recommender. The core idea: every show has a **feature vector** (nostalgia score, album distribution, rarity tier, production style, cover count). When a user describes what they want, we score every real historical show against those preferences and return the closest matches.

**No synthetic setlists.** The app only ever surfaces real documented NIN setlists. Gemini is used solely to parse freeform text input into a structured target vector — it never generates or fabricates a setlist.

## Data pipeline order

Always run in this sequence — each step depends on the previous:

```
scrape_ninlive.py → scrape_albums.py → enrich_songs.py → compute_features.py
```

- **scrape_ninlive.py**: Hits ninlive.com, writes one JSON per show to `data/shows/`. Fully restartable — skips files that already exist. Use `--update` flag to only fetch new shows.
- **scrape_albums.py**: Scrapes all 24 ninlive album pages, writes `data/albums.json` with song→album mappings. Re-run whenever KNOWN_COVERS or CANONICAL_ALBUM_OVERRIDES changes.
- **enrich_songs.py**: Reads all show JSONs + albums.json, writes `data/songs.json` with rarity scores and album attribution.
- **compute_features.py**: Reads songs.json + all show JSONs, computes feature vectors, writes them back into each show JSON and produces `data/features_index.json`.

Do NOT re-run the full scrape unless you need fresh ninlive data. It takes ~25 minutes and hits ninlive ~1,200 times.

## Key architectural decisions

### Relative nostalgia score
`nostalgia_score = avg_song_age_at_show / (show_year - 1989)`

The denominator is the maximum possible age — how old PHM would be at the time of the show. This makes a 2025 show playing 1989 songs score the same (1.0) as a 1993 show playing 1989 songs. Both are maximally nostalgic *relative to their era*.

Covers are excluded from the nostalgia calculation to avoid distortion from the original artist's release year.

### Count-based rarity tiers (not average-based)
Show rarity is determined by counting how many songs fall into each rarity bucket, not by averaging rarity scores. Thresholds are based on the actual distribution across all 1,176 shows:

- `n_unicorn >= 2` → tier: `"unicorn"`
- `n_unicorn + n_deep_cut >= 4` → tier: `"deep-cuts"`
- `n_unicorn + n_deep_cut >= 2` → tier: `"mixed"`
- `>60%` of songs are staples → tier: `"hits-heavy"`
- otherwise → tier: `"balanced"`

Per-song rarity buckets: unicorn (0.97, 1.0], deep cut (0.92, 0.97], album track (0.75, 0.92], familiar (0.50, 0.75], staple [0.00, 0.50].

### Album priority for song→album mapping
When a song appears on multiple releases (e.g. "Something I Can Never Have" on both PHM and Still), the canonical album is chosen by release type priority: studio > ep > live > soundtrack > single. See `CANONICAL_ALBUM_OVERRIDES` in `scrape_albums.py` for manual exceptions.

### Cover handling
ninlive does not flag covers in its HTML. We maintain `KNOWN_COVERS` in `scrape_albums.py`. Covers that appear on a NIN release (e.g. Dead Souls on TDS) keep their NIN album attribution with `is_cover: True`. Covers not on any NIN release (e.g. I'm Afraid of Americans) get `album_slug: "cover"`.

## Important files

```
scraper/
  scrape_ninlive.py     — show scraper (ninlive.com)
  scrape_albums.py      — album/song catalog builder (ninlive.com)
  enrich_songs.py       — song catalog with rarity scores
  compute_features.py   — feature vector computation
  requirements.txt

data/
  shows/                — 1,176 individual show JSONs
  index.json            — compact show index (no setlists)
  albums.json           — 24 releases + 209 song→album mappings
  songs.json            — 191 songs with rarity, album, cover info
  features_index.json   — all shows with feature vectors (web app loads this)

.github/workflows/
  update-data.yml       — weekly GitHub Action for new show detection
```

## Known gaps to address

See TODO.md for the full list. Key data issues:

1. **50 songs with unknown album** — many are covers from early tours (Bowie/Numan/Joy Division co-headline shows), plus some unreleased Peel It Back material. Add them to `KNOWN_COVERS` in `scrape_albums.py`.

2. **218 shows with no setlist data** — mostly 1988–1991. Could supplement from setlist.fm API using the user's API key.

3. **Still (2002) songs** — ambient/instrumental tracks filed under Still but not really live songs. Low priority since they have near-zero play counts.

## Constants that matter

- `NIN_DEBUT_YEAR = 1989` in compute_features.py — nostalgia denominator
- `DELAY_BETWEEN_REQUESTS = 1.2` in scrape_ninlive.py — be polite to ninlive.com
- Rarity thresholds: 0.97 / 0.92 / 0.75 / 0.50 — changing these requires re-running compute_features.py

## Scraper rate limiting

The scraper uses 1.2s between requests. Do not reduce this — ninlive.com is a fan-run site. The GitHub Action runs weekly, which is appropriate.
