"""
Builds data/songs.json — a catalog of every song NIN has played live, enriched with:
  - album attribution (from data/albums.json built by scrape_albums.py)
  - era group
  - release year
  - global rarity score (0 = played every show, 1 = played at only 1 show)
  - era_play_rate: how often this song appeared within its primary era's shows
  - era_context: human-readable label like "Staple in HM era · last played 2014"
  - cover flag + original artist
  - first/last performance dates

Run after scrape_ninlive.py and scrape_albums.py.
"""

import json
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
SHOWS_DIR = DATA_DIR / "shows"

# Date ranges for each touring era. Used to compute era-relative play rates.
# A song's "primary era" is its era_group; we count how often it appeared
# within shows from that era's date range.
ERA_DATE_RANGES = {
    "Pretty Hate Machine": ("1988-01-01", "1991-12-31"),
    "Broken":              ("1992-01-01", "1993-12-31"),
    "The Downward Spiral": ("1994-01-01", "1997-12-31"),
    "The Fragile":         ("1999-01-01", "2002-12-31"),
    "With Teeth":          ("2005-01-01", "2006-12-31"),
    "Year Zero":           ("2007-01-01", "2007-12-31"),
    "Ghosts":              ("2008-01-01", "2009-12-31"),
    "The Slip":            ("2008-01-01", "2009-12-31"),
    "Hesitation Marks":    ("2013-01-01", "2014-12-31"),
    "Trilogy":             ("2017-01-01", "2018-12-31"),
    "Peel It Back":        ("2022-01-01", "2099-12-31"),
}


def build_songs_catalog():
    albums_path = DATA_DIR / "albums.json"
    if not albums_path.exists():
        print("ERROR: data/albums.json not found. Run scrape_albums.py first.")
        return {}

    album_data = json.loads(albums_path.read_text())
    song_to_album = album_data["song_to_album"]

    # Single pass: collect all show data we need
    # song_slug → list of (show_id, show_date)
    song_appearances = defaultdict(list)
    # era_group → set of show dates with setlist data (for era show counts)
    era_shows = defaultdict(set)
    # era_group → song_slug → count of appearances within era
    era_song_counts = defaultdict(lambda: defaultdict(int))
    total_shows = 0
    slug_to_name = {}

    for f in sorted(SHOWS_DIR.glob("*.json")):
        try:
            show = json.loads(f.read_text())
        except Exception:
            continue

        total_shows += 1
        show_date = show.get("date", "")
        show_id = show["id"]
        setlist = show.get("setlist", [])

        # Determine which era this show falls into by date
        show_era = _era_for_date(show_date)

        for entry in setlist:
            slug = entry.get("slug", "")
            if not slug:
                continue
            song_appearances[slug].append((show_id, show_date))
            if slug not in slug_to_name:
                slug_to_name[slug] = entry["song"]
            if show_era:
                era_song_counts[show_era][slug] += 1

        # Count this show toward its era (only if it has setlist data)
        if setlist and show_era:
            era_shows[show_era].add(show_date)

    # Also count shows without setlist toward era totals (for denominator accuracy)
    # — actually we only want to count shows WITH setlist data, since a show with no
    # setlist data can't penalise a song's era play rate.

    print(f"Found {len(song_appearances)} unique songs across {total_shows} shows")
    for era, shows in sorted(era_shows.items()):
        print(f"  {era}: {len(shows)} shows with setlist data")

    catalog = {}
    for slug, appearances in sorted(song_appearances.items()):
        album_info = song_to_album.get(slug, {})
        count = len(appearances)
        era_group = album_info.get("era_group", "Unknown")

        rarity_score = 1.0 - (count / total_shows) if total_shows > 0 else 1.0

        dates = sorted(a[1] for a in appearances if a[1])

        # --- Era-relative play rate ---
        # Try the song's release era first. If that era has no documented shows
        # (e.g. Broken 1992-93 — NIN barely toured then), fall back to whichever
        # era the song was most frequently played in.
        active_era = era_group
        era_total = len(era_shows.get(era_group, set()))
        era_count = era_song_counts.get(era_group, {}).get(slug, 0)

        if era_total == 0 or era_count == 0:
            # Find the era where this song appeared most
            best_era, best_count = None, 0
            for e, song_counts in era_song_counts.items():
                c = song_counts.get(slug, 0)
                if c > best_count:
                    best_count, best_era = c, e
            if best_era and best_count > 0:
                active_era = best_era
                era_total = len(era_shows.get(best_era, set()))
                era_count = best_count

        if era_total > 0:
            era_play_rate = round(era_count / era_total, 4)
        else:
            era_play_rate = None

        era_context = _era_context_label(
            active_era, era_play_rate, dates[-1] if dates else None
        )

        catalog[slug] = {
            "slug": slug,
            "name": slug_to_name.get(slug, _prettify(slug)),
            "album_slug": album_info.get("album_slug", "unknown"),
            "album_year": album_info.get("album_year"),
            "era_group": era_group,
            "is_cover": album_info.get("is_cover", False),
            "cover_artist": album_info.get("cover_artist"),
            "play_count": count,
            "rarity_score": round(rarity_score, 4),
            "era_play_rate": era_play_rate,
            "era_context": era_context,
            "first_played": dates[0] if dates else None,
            "last_played": dates[-1] if dates else None,
        }

    out_path = DATA_DIR / "songs.json"
    out_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False))
    print(f"\nWrote {len(catalog)} songs → {out_path}")

    unknown = [s for s, d in catalog.items() if d["album_slug"] == "unknown"]
    if unknown:
        print(f"\n{len(unknown)} songs with unknown album attribution:")
        for s in sorted(unknown):
            print(f"  {s} (played {catalog[s]['play_count']}x)")

    # Sanity-check a few well-known songs
    print("\nSanity check:")
    for slug in ["hurt", "copy-of-a", "suck", "a-warm-place", "came-back-haunted"]:
        s = catalog.get(slug)
        if s:
            print(f"  {s['name']:35s} global_rarity={s['rarity_score']:.3f}  "
                  f"era_play_rate={s['era_play_rate']}  context: {s['era_context']}")

    return catalog


def _era_for_date(date_str: str):
    """Return the era_group name for a show date, based on ERA_DATE_RANGES."""
    if not date_str:
        return None
    for era, (start, end) in ERA_DATE_RANGES.items():
        if start <= date_str <= end:
            return era
    return None


def _era_context_label(era_group: str, era_play_rate, last_played: str) -> str:
    """Human-readable era context for UI display."""
    if era_play_rate is None:
        return ""

    last_year = last_played[:4] if last_played else "unknown"

    if era_play_rate >= 0.60:
        tier = f"Staple in {era_group} era"
    elif era_play_rate >= 0.20:
        tier = f"Regular in {era_group} era"
    else:
        tier = f"Deep cut even in {era_group} era"

    if last_played and last_played[:4] < "2020":
        return f"{tier} · last played {last_year}"
    return tier


def _prettify(slug: str) -> str:
    return " ".join(w.capitalize() for w in slug.replace("-", " ").split())


def _prettify(slug: str) -> str:
    return " ".join(w.capitalize() for w in slug.replace("-", " ").split())


if __name__ == "__main__":
    build_songs_catalog()
