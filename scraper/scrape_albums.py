"""
Scrapes ninlive.com album pages to build a complete song→album mapping.
Outputs data/albums.json.

Run once after scrape_ninlive.py, before enrich_songs.py.
"""

import json
import re
import time
from pathlib import Path
from typing import Optional, List, Dict

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

BASE_URL = "https://www.ninlive.com"
DATA_DIR = Path(__file__).parent.parent / "data"

HEADERS = {
    "User-Agent": "NIN-Setlist-Archiver/1.0 (personal research project; respectful scraper)",
}
DELAY = 1.2

# Release metadata ninlive doesn't consistently expose — maintained here.
# type: studio | ep | single | soundtrack | live | remix
# era_group: the "marketing era" for the recommender UI
ALBUM_METADATA = {
    "down-in-it":                             {"year": 1989, "type": "single",    "era_group": "Pretty Hate Machine"},
    "pretty-hate-machine":                    {"year": 1989, "type": "studio",    "era_group": "Pretty Hate Machine"},
    "head-like-a-hole":                       {"year": 1990, "type": "single",    "era_group": "Pretty Hate Machine"},
    "sin":                                    {"year": 1990, "type": "single",    "era_group": "Pretty Hate Machine"},
    "broken":                                 {"year": 1992, "type": "ep",        "era_group": "Broken"},
    "closer-to-god":                          {"year": 1994, "type": "single",    "era_group": "The Downward Spiral"},
    "the-downward-spiral":                    {"year": 1994, "type": "studio",    "era_group": "The Downward Spiral"},
    "natural-born-killers":                   {"year": 1994, "type": "soundtrack","era_group": "The Downward Spiral"},
    "the-perfect-drug":                       {"year": 1997, "type": "single",    "era_group": "The Downward Spiral"},
    "the-fragile":                            {"year": 1999, "type": "studio",    "era_group": "The Fragile"},
    "were-in-this-together":                  {"year": 1999, "type": "single",    "era_group": "The Fragile"},
    "lara-croft-tomb-raider-music-from-the-motion-picture": {"year": 2001, "type": "soundtrack", "era_group": "The Fragile"},
    "still":                                  {"year": 2002, "type": "live",      "era_group": "The Fragile"},
    "with-teeth":                             {"year": 2005, "type": "studio",    "era_group": "With Teeth"},
    "year-zero":                              {"year": 2007, "type": "studio",    "era_group": "Year Zero"},
    "ghosts-i-iv":                            {"year": 2008, "type": "studio",    "era_group": "Ghosts"},
    "the-slip":                               {"year": 2008, "type": "studio",    "era_group": "The Slip"},
    "ninja-2009-summer-tour-ep":              {"year": 2009, "type": "ep",        "era_group": "The Slip"},
    "hesitation-marks":                       {"year": 2013, "type": "studio",    "era_group": "Hesitation Marks"},
    "not-the-actual-events":                  {"year": 2016, "type": "ep",        "era_group": "Trilogy"},
    "add-violence":                           {"year": 2017, "type": "ep",        "era_group": "Trilogy"},
    "bad-witch":                              {"year": 2018, "type": "ep",        "era_group": "Trilogy"},
    "isnt-everyone":                          {"year": 2021, "type": "single",    "era_group": "Peel It Back"},
    "tron-ares":                              {"year": 2025, "type": "soundtrack","era_group": "Peel It Back"},
}

# Songs that are covers of other artists. ninlive doesn't flag these.
# cover_artist: who originally wrote/recorded it
KNOWN_COVERS = {
    # --- Already-catalogued covers (on official NIN releases) ---
    "get-down-make-love":   {"cover_artist": "Queen",        "original_year": 1977},
    "supernaut":            {"cover_artist": "Black Sabbath","original_year": 1972},
    "physical":             {"cover_artist": "Adam Ant",     "original_year": 1981},
    "suck":                 {"cover_artist": "Pigface",      "original_year": 1991},
    "metal":                {"cover_artist": "Gary Numan",   "original_year": 1979},
    "dead-souls":           {"cover_artist": "Joy Division", "original_year": 1980},
    "memorabilia":          {"cover_artist": "Soft Cell",    "original_year": 1981},
    "im-afraid-of-americans": {"cover_artist": "David Bowie","original_year": 1997},
    "a-minute-to-breathe":  {"cover_artist": "Trent Reznor and Atticus Ross", "original_year": 2025},

    # --- David Bowie covers (NIN/Bowie co-headline tour 1995-96 + tribute) ---
    "hallo-spaceboy":       {"cover_artist": "David Bowie", "original_year": 1995},
    "scary-monsters":       {"cover_artist": "David Bowie", "original_year": 1980},
    "subterraneans":        {"cover_artist": "David Bowie", "original_year": 1977},
    "fashion":              {"cover_artist": "David Bowie", "original_year": 1980},
    "i-cant-give-everything-away": {"cover_artist": "David Bowie", "original_year": 2016},

    # --- Gary Numan covers ---
    "cars":                 {"cover_artist": "Gary Numan",   "original_year": 1979},
    "down-in-the-park":     {"cover_artist": "Tubeway Army","original_year": 1978},
    "i-die-you-die":        {"cover_artist": "Gary Numan",   "original_year": 1980},
    "we-take-mystery-to-bed": {"cover_artist": "Gary Numan", "original_year": 1982},
    "parasite":             {"cover_artist": "How To Destroy Angels", "original_year": 2010},

    # --- Joy Division covers ---
    "atmosphere":           {"cover_artist": "Joy Division", "original_year": 1980},
    "digital":              {"cover_artist": "Joy Division", "original_year": 1978},
    "twenty-four-hours":    {"cover_artist": "Joy Division", "original_year": 1980},
    "warsaw":               {"cover_artist": "Joy Division", "original_year": 1978},

    # --- Bauhaus covers ---
    "kick-in-the-eye":      {"cover_artist": "Bauhaus",     "original_year": 1981},
    "sanity-assassin":      {"cover_artist": "Bauhaus",     "original_year": 1980},
    "belalugosis-dead":     {"cover_artist": "Bauhaus",     "original_year": 1979},

    # --- How To Destroy Angels covers ---
    "bbb":                  {"cover_artist": "How To Destroy Angels", "original_year": 2010},
    "ice-age":              {"cover_artist": "How To Destroy Angels", "original_year": 2012},
    "on-the-wing":          {"cover_artist": "How To Destroy Angels", "original_year": 2012},
    "welcome-oblivion":     {"cover_artist": "How To Destroy Angels", "original_year": 2013},
    "drowning":             {"cover_artist": "How To Destroy Angels", "original_year": 2010},
    "the-loop-closes":      {"cover_artist": "How To Destroy Angels", "original_year": 2013},

    # --- Saul Williams covers ---
    "african-student-movement": {"cover_artist": "Saul Williams", "original_year": 2004},
    "banged-and-blown-through":  {"cover_artist": "Saul Williams", "original_year": 2007},
    "list-of-demands":      {"cover_artist": "Saul Williams", "original_year": 2004},

    # --- Trent Reznor & Atticus Ross covers (Social Network OST / Peel It Back era) ---
    "hand-covers-bruise":   {"cover_artist": "Trent Reznor and Atticus Ross", "original_year": 2010},
    "whatifwecould":        {"cover_artist": "Trent Reznor and Atticus Ross", "original_year": 2013},
    "you-made-it-feel-like-home": {"cover_artist": "Trent Reznor and Atticus Ross", "original_year": 2026},

    # --- Pop Will Eat Itself covers (Nights of Nothing tour 1996) ---
    "rvsp":                 {"cover_artist": "Pop Will Eat Itself", "original_year": 1989},
    "wise-up-sucker":       {"cover_artist": "Pop Will Eat Itself", "original_year": 1992},

    # --- Prick covers (Nights of Nothing tour 1996, Nothing Records showcase) ---
    "animal":               {"cover_artist": "Prick",        "original_year": 1995},
    "tough":                {"cover_artist": "Prick",        "original_year": 1995},

    # --- Adam Ant covers ---
    "beat-my-guest":        {"cover_artist": "Adam and the Ants", "original_year": 1980},
    "red-scab":             {"cover_artist": "Adam Ant",     "original_year": 1982},

    # --- Other post-punk/industrial covers ---
    "nightclubbing":        {"cover_artist": "Iggy Pop",     "original_year": 1977},
    "warm-leatherette":     {"cover_artist": "The Normal",   "original_year": 1978},
    "final-solution":       {"cover_artist": "Pere Ubu",     "original_year": 1978},
    "love-like-anthrax":    {"cover_artist": "Gang of Four", "original_year": 1981},
    "strange-kind-of-love": {"cover_artist": "Peter Murphy", "original_year": 1990},
    "hey-man-nice-shot":    {"cover_artist": "Filter",       "original_year": 1995},
    "the-beautiful-people": {"cover_artist": "Marilyn Manson","original_year": 1996},
    "my-god-is-the-sun":    {"cover_artist": "Queens of the Stone Age", "original_year": 2013},
    "greensleave":          {"cover_artist": "Traditional",  "original_year": 1500},
}
# Clean: remove any accidental non-covers
KNOWN_COVERS = {k: v for k, v in KNOWN_COVERS.items() if v["cover_artist"]}

# NIN original songs that were performed live but never officially released on any album.
# approx_year: estimated year first written/performed
# era_group: the marketing era used for UI display
UNRELEASED_NIN = {
    "now-im-nothing":   {"era_group": "Pretty Hate Machine", "approx_year": 1991},
    "maybe-just-once":  {"era_group": "Pretty Hate Machine", "approx_year": 1988},
    "twist":            {"era_group": "Pretty Hate Machine", "approx_year": 1988},
}

# Intro tapes, segue pieces, and ambient transitions performed between songs.
# These are not songs proper — they have no album attribution.
INTROS = [
    "intro",
    "intro-hate-1990",
    "pinion-the-eater-of-dreams",
]

# Songs that appear on remix/live albums where the canonical album attribution
# differs from ninlive's filing. Key = song slug, value = canonical album slug.
# (Only needed if ninlive files a song under a remix/live album instead of the original.)
CANONICAL_ALBUM_OVERRIDES = {
    # Still (2002) versions are acoustic/live recordings of originals — point back
    "adrift-and-at-peace":          "the-fragile",
    "and-all-that-could-have-been": "the-fragile",
    "gonestill":                    "the-fragile",
    "leaving-hope":                 "the-fragile",
    "the-persistence-of-loss":      "the-fragile",
    # "something-i-can-never-have", "the-becoming", etc. are on both PHM/TDS and Still —
    # ninlive will file them under their primary album, which is correct.
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
def fetch(client: httpx.Client, url: str) -> BeautifulSoup:
    resp = client.get(url, headers=HEADERS, follow_redirects=True, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def get_album_slugs(client: httpx.Client) -> List[str]:
    soup = fetch(client, f"{BASE_URL}/artists/nin/albums")
    time.sleep(DELAY)
    links = soup.find_all("a", href=re.compile(r"^/artists/nin/albums/[^/]+$"))
    slugs = list(dict.fromkeys(a["href"].split("/albums/")[-1] for a in links))
    return slugs


def scrape_album_tracks(client: httpx.Client, slug: str) -> List[Dict]:
    url = f"{BASE_URL}/artists/nin/albums/{slug}"
    soup = fetch(client, url)
    time.sleep(DELAY)

    tracks = []
    song_links = soup.find_all("a", href=re.compile(r"^/artists/nin/songs/"))
    seen = set()
    for a in song_links:
        song_slug = a["href"].split("/songs/")[-1]
        if song_slug in seen:
            continue
        seen.add(song_slug)
        tracks.append({
            "song_slug": song_slug,
            "song_name": a.get_text(strip=True),
        })
    return tracks


def build_album_catalog():
    albums = {}
    song_to_album = {}  # song_slug → album_slug (primary)

    with httpx.Client() as client:
        print("Fetching album list from ninlive...")
        slugs = get_album_slugs(client)
        print(f"Found {len(slugs)} albums/releases: {slugs}\n")

        for slug in slugs:
            meta = ALBUM_METADATA.get(slug, {"year": None, "type": "unknown", "era_group": "Unknown"})
            print(f"  Scraping: {slug} ({meta.get('year', '?')})")
            tracks = scrape_album_tracks(client, slug)
            print(f"    → {len(tracks)} songs")

            albums[slug] = {
                "slug": slug,
                "year": meta.get("year"),
                "type": meta.get("type", "unknown"),
                "era_group": meta.get("era_group", "Unknown"),
                "tracks": tracks,
            }

            for track in tracks:
                song_slug = track["song_slug"]
                # Apply canonical overrides (e.g. Still → original album)
                canonical_slug = CANONICAL_ALBUM_OVERRIDES.get(song_slug, slug)

                # Only update if not yet assigned, or if canonical override applies,
                # or if existing assignment is a non-studio release being trumped by studio
                if song_slug not in song_to_album:
                    song_to_album[song_slug] = canonical_slug
                elif canonical_slug != slug:
                    # Explicit override wins
                    song_to_album[song_slug] = canonical_slug
                else:
                    # Prefer studio > ep > single > soundtrack > live > remix
                    existing_type = ALBUM_METADATA.get(song_to_album[song_slug], {}).get("type", "unknown")
                    new_type = meta.get("type", "unknown")
                    TYPE_PRIORITY = ["studio", "ep", "live", "soundtrack", "single", "remix", "unknown"]
                    if TYPE_PRIORITY.index(new_type) < TYPE_PRIORITY.index(existing_type):
                        song_to_album[song_slug] = slug

    # Build the final enriched song→album lookup
    song_catalog = {}
    for song_slug, album_slug in song_to_album.items():
        album = albums.get(album_slug, {})
        cover_info = KNOWN_COVERS.get(song_slug, {})
        song_catalog[song_slug] = {
            "album_slug": album_slug,
            "album_year": album.get("year"),
            "album_type": album.get("type"),
            "era_group": album.get("era_group", "Unknown"),
            "is_cover": bool(cover_info),
            "cover_artist": cover_info.get("cover_artist"),
        }

    # Add entries for known covers that don't appear on any NIN album.
    # (e.g. "I'm Afraid of Americans" is a Bowie song — not on any NIN release.)
    for cover_slug, cover_info in KNOWN_COVERS.items():
        if cover_slug not in song_catalog:
            song_catalog[cover_slug] = {
                "album_slug": "cover",
                "album_year": None,
                "album_type": "cover",
                "era_group": "Covers",
                "is_cover": True,
                "cover_artist": cover_info["cover_artist"],
            }

    # Unreleased NIN originals — performed live but never on any studio/EP release.
    for slug, info in UNRELEASED_NIN.items():
        if slug not in song_catalog:
            song_catalog[slug] = {
                "album_slug": "unreleased",
                "album_year": info.get("approx_year"),
                "album_type": "unreleased",
                "era_group": info["era_group"],
                "is_cover": False,
                "cover_artist": None,
            }

    # Intro tapes / segues — not proper songs, excluded from nostalgia/rarity math.
    for slug in INTROS:
        if slug not in song_catalog:
            song_catalog[slug] = {
                "album_slug": "intro",
                "album_year": None,
                "album_type": "intro",
                "era_group": "Intro/Segue",
                "is_cover": False,
                "cover_artist": None,
            }

    out = {
        "albums": albums,
        "song_to_album": song_catalog,
        "known_covers": KNOWN_COVERS,
    }
    out_path = DATA_DIR / "albums.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"\nWrote {len(albums)} albums, {len(song_catalog)} song→album mappings → {out_path}")
    return out


if __name__ == "__main__":
    build_album_catalog()
