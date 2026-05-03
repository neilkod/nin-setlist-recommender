"""
Scrapes ninlive.com for all NIN concert setlists.

Usage:
  python scrape_ninlive.py              # Full scrape (all years)
  python scrape_ninlive.py --year 2025  # Single year
  python scrape_ninlive.py --update     # Only shows newer than last known date
"""

import argparse
import json
import re
import time
from datetime import datetime, date
from pathlib import Path
from typing import Optional, List

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

BASE_URL = "https://www.ninlive.com"
DATA_DIR = Path(__file__).parent.parent / "data"
SHOWS_DIR = DATA_DIR / "shows"

HEADERS = {
    "User-Agent": "NIN-Setlist-Archiver/1.0 (personal research project; respectful scraper)",
}

DELAY_BETWEEN_REQUESTS = 1.2  # seconds — be polite


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
def fetch(client: httpx.Client, url: str) -> BeautifulSoup:
    resp = client.get(url, headers=HEADERS, follow_redirects=True, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def get_show_urls_for_year(client: httpx.Client, year: int) -> List[str]:
    url = f"{BASE_URL}/artists/nin/concerts?year={year}"
    soup = fetch(client, url)
    time.sleep(DELAY_BETWEEN_REQUESTS)

    links = soup.find_all("a", href=re.compile(r"^/artists/nin/concerts/\d{4}-"))
    # Each show appears multiple times (date link, venue link, icon links) — deduplicate
    # Strip fragment anchors (#concert-setlist etc.)
    seen = set()
    urls = []
    for a in links:
        href = a["href"].split("#")[0]
        if href not in seen:
            seen.add(href)
            urls.append(BASE_URL + href)
    return urls


def parse_show_page(soup: BeautifulSoup, url: str) -> Optional[dict]:
    # Date
    date_el = soup.find(class_="show-date")
    if not date_el:
        return None
    raw_date = date_el.get_text(strip=True)

    # Venue
    venue_el = soup.find(class_="show-venue")
    venue_name = ""
    venue_link = ""
    if venue_el:
        a = venue_el.find("a")
        if a:
            venue_name = a.get_text(strip=True)
            venue_link = a.get("href", "")

    # Location: city and country from links
    location_el = soup.find(class_="show-location")
    city = ""
    state = ""
    country = ""
    if location_el:
        loc_links = location_el.find_all("a")
        for a in loc_links:
            href = a.get("href", "")
            text = a.get_text(strip=True).rstrip(",").strip()
            if "/cities/" in href:
                city = text
            elif "/states/" in href:
                state = text
            elif "/countries/" in href:
                country = text

    # Tour name from breadcrumb/tour link
    tour_name = ""
    era_slug = ""
    tour_link = soup.find("a", href=re.compile(r"/artists/nin/tours/"))
    if tour_link:
        tour_name = tour_link.get_text(strip=True)
        era_slug = tour_link["href"].split("/tours/")[-1]

    # Era from eras link if no tour link
    if not tour_name:
        era_link = soup.find("a", href=re.compile(r"/artists/nin/eras/"))
        if era_link:
            era_slug = era_link["href"].split("/eras/")[-1].split("/")[0]

    # Setlist
    setlist_div = soup.find(id="concert-setlist")
    setlist = []
    if setlist_div:
        current_section = "Main Set"
        position = 0
        for li in setlist_div.find_all("li", class_="list-group-item"):
            classes = li.get("class", [])
            # Section header (encore-item without song-order)
            if "encore-item" in classes and "song-order" not in classes:
                current_section = li.get_text(strip=True)
                continue

            # Song item
            if "song-order" in classes:
                song_link = li.find("a", href=re.compile(r"/artists/nin/songs/"))
                if not song_link:
                    continue
                song_name = song_link.get_text(strip=True)
                song_slug = song_link["href"].split("/songs/")[-1]

                # Notes: cover flag, version notes, segue notes
                notes_div = li.find(class_="list-song-notes")
                notes_text = ""
                is_cover = False
                if notes_div:
                    notes_text = " ".join(notes_div.get_text(" ", strip=True).split())
                    if "cover" in notes_text.lower():
                        is_cover = True

                position += 1
                setlist.append({
                    "position": position,
                    "song": song_name,
                    "slug": song_slug,
                    "section": current_section,
                    "notes": notes_text,
                    "is_cover": is_cover,
                })

    # Slug from URL
    slug = url.rstrip("/").split("/concerts/")[-1]

    return {
        "id": slug,
        "url": url,
        "date": raw_date,
        "venue": venue_name,
        "venue_slug": venue_link.split("/venues/")[-1] if "/venues/" in venue_link else "",
        "city": city,
        "state": state,
        "country": country,
        "tour": tour_name,
        "era_slug": era_slug,
        "setlist": setlist,
        "song_count": len(setlist),
        "has_covers": any(s["is_cover"] for s in setlist),
        "source": "ninlive",
        "scraped_at": datetime.utcnow().isoformat() + "Z",
    }


def scrape_show(client: httpx.Client, url: str) -> Optional[dict]:
    slug = url.split("/concerts/")[-1]
    out_path = SHOWS_DIR / f"{slug}.json"

    if out_path.exists():
        print(f"  [skip] {slug} (already scraped)")
        return json.loads(out_path.read_text())

    print(f"  [fetch] {slug}")
    soup = fetch(client, url)
    time.sleep(DELAY_BETWEEN_REQUESTS)

    show = parse_show_page(soup, url)
    if show:
        out_path.write_text(json.dumps(show, indent=2, ensure_ascii=False))
    else:
        print(f"  [warn] could not parse {slug}")
    return show


def build_index():
    """Rebuild data/index.json from all scraped show files."""
    shows = []
    for f in sorted(SHOWS_DIR.glob("*.json")):
        try:
            d = json.loads(f.read_text())
            shows.append({
                "id": d["id"],
                "date": d["date"],
                "venue": d["venue"],
                "city": d["city"],
                "state": d.get("state", ""),
                "country": d["country"],
                "tour": d["tour"],
                "era_slug": d.get("era_slug", ""),
                "song_count": d["song_count"],
                "has_covers": d.get("has_covers", False),
                "source": d["source"],
            })
        except Exception as e:
            print(f"[warn] skipping {f.name}: {e}")

    shows.sort(key=lambda x: x["date"])
    index_path = DATA_DIR / "index.json"
    index_path.write_text(json.dumps(shows, indent=2, ensure_ascii=False))
    print(f"\nWrote index with {len(shows)} shows -> {index_path}")
    return shows


def get_last_scraped_date() -> Optional[str]:
    index_path = DATA_DIR / "index.json"
    if not index_path.exists():
        return None
    try:
        shows = json.loads(index_path.read_text())
        if shows:
            return max(s["date"] for s in shows)
    except Exception:
        pass
    return None


def main():
    parser = argparse.ArgumentParser(description="Scrape NIN setlists from ninlive.com")
    parser.add_argument("--year", type=int, help="Scrape only this year")
    parser.add_argument("--update", action="store_true", help="Only scrape shows newer than last known date")
    parser.add_argument("--no-index", action="store_true", help="Skip rebuilding the index")
    args = parser.parse_args()

    SHOWS_DIR.mkdir(parents=True, exist_ok=True)

    last_date = get_last_scraped_date() if args.update else None
    if last_date:
        print(f"Update mode: looking for shows after {last_date}")

    current_year = datetime.now().year

    if args.year:
        years = [args.year]
    elif args.update:
        # Only check current and previous year for new shows
        years = [current_year - 1, current_year]
    else:
        years = list(range(1988, current_year + 1))

    all_urls = []
    with httpx.Client() as client:
        for year in years:
            print(f"\nFetching show list for {year}...")
            urls = get_show_urls_for_year(client, year)
            print(f"  Found {len(urls)} shows")
            all_urls.extend(urls)

        # Filter if update mode
        if last_date:
            before = len(all_urls)
            all_urls = [u for u in all_urls if _url_date(u) > last_date]
            print(f"After date filter: {len(all_urls)} new shows (was {before})")

        print(f"\nScraping {len(all_urls)} shows...")
        for i, url in enumerate(all_urls, 1):
            print(f"[{i}/{len(all_urls)}]", end=" ")
            scrape_show(client, url)

    if not args.no_index:
        build_index()


def _url_date(url: str) -> str:
    """Extract YYYY-MM-DD from URL like .../2025-8-19-united-center"""
    slug = url.rstrip("/").split("/concerts/")[-1]
    parts = slug.split("-")
    try:
        y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
        return f"{y:04d}-{m:02d}-{d:02d}"
    except Exception:
        return "0000-00-00"


if __name__ == "__main__":
    main()
