"""
Builds data/songs.json — a catalog of every song NIN has played live, enriched with:
  - album attribution (from data/albums.json built by scrape_albums.py)
  - era group
  - release year
  - rarity score (0 = played every show, 1 = played at only 1 show)
  - cover flag + original artist
  - first/last performance dates

Run after scrape_ninlive.py and scrape_albums.py.
"""

import json
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
SHOWS_DIR = DATA_DIR / "shows"


def build_songs_catalog():
    albums_path = DATA_DIR / "albums.json"
    if not albums_path.exists():
        print("ERROR: data/albums.json not found. Run scrape_albums.py first.")
        return {}

    album_data = json.loads(albums_path.read_text())
    song_to_album = album_data["song_to_album"]  # slug → {album_slug, year, era_group, is_cover, ...}

    # Tally appearances from all scraped shows
    # song_slug → list of (show_id, show_date, show_year)
    song_appearances = defaultdict(list)
    total_shows = 0

    for f in sorted(SHOWS_DIR.glob("*.json")):
        try:
            show = json.loads(f.read_text())
        except Exception:
            continue
        total_shows += 1
        show_id = show["id"]
        show_date = show.get("date", "")
        try:
            show_year = int(show_date[:4])
        except Exception:
            show_year = None

        for entry in show.get("setlist", []):
            slug = entry.get("slug", "")
            if slug:
                song_appearances[slug].append((show_id, show_date, show_year))

    print(f"Found {len(song_appearances)} unique songs across {total_shows} shows")

    # Get display names from actual show data (more reliable than slug→title transform)
    slug_to_name = {}
    for f in sorted(SHOWS_DIR.glob("*.json")):
        try:
            show = json.loads(f.read_text())
            for entry in show.get("setlist", []):
                slug = entry.get("slug", "")
                if slug and slug not in slug_to_name:
                    slug_to_name[slug] = entry["song"]
        except Exception:
            pass

    catalog = {}
    for slug, appearances in sorted(song_appearances.items()):
        album_info = song_to_album.get(slug, {})
        count = len(appearances)
        # Rarity: fraction of total shows where this song was NOT played.
        # 1.0 = played at exactly 1 show (maximum rarity)
        # 0.0 = played at every show
        rarity_score = 1.0 - (count / total_shows) if total_shows > 0 else 1.0

        dates = sorted(a[1] for a in appearances if a[1])
        years = [a[2] for a in appearances if a[2]]

        catalog[slug] = {
            "slug": slug,
            "name": slug_to_name.get(slug, _prettify(slug)),
            # Album attribution
            "album_slug": album_info.get("album_slug", "unknown"),
            "album_year": album_info.get("album_year"),
            "era_group": album_info.get("era_group", "Unknown"),
            # Cover info
            "is_cover": album_info.get("is_cover", False),
            "cover_artist": album_info.get("cover_artist"),
            # Live stats
            "play_count": count,
            "rarity_score": round(rarity_score, 4),
            "first_played": dates[0] if dates else None,
            "last_played": dates[-1] if dates else None,
            "years_played": sorted(set(y for y in years if y)),
        }

    out_path = DATA_DIR / "songs.json"
    out_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False))
    print(f"Wrote {len(catalog)} songs → {out_path}")

    # Print songs with unknown album (need supplementary data)
    unknown = [s for s, d in catalog.items() if d["album_slug"] == "unknown"]
    if unknown:
        print(f"\n{len(unknown)} songs with unknown album attribution:")
        for s in sorted(unknown):
            print(f"  {s} (played {catalog[s]['play_count']}x)")

    return catalog


def _prettify(slug: str) -> str:
    return " ".join(w.capitalize() for w in slug.replace("-", " ").split())


if __name__ == "__main__":
    build_songs_catalog()
