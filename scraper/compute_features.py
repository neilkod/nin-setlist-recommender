"""
Computes feature vectors for every scraped show and writes them back into
each show's JSON file, plus a lightweight features-only index at
data/features_index.json for fast loading in the web app.

A feature vector is a set of numbers describing a show on every recommender
dimension. The web app scores shows by measuring the distance between a
user's target vector and each show's actual vector.

Run after enrich_songs.py.
"""

import json
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "data"
SHOWS_DIR = DATA_DIR / "shows"

NIN_DEBUT_YEAR = 1989  # Pretty Hate Machine — used as the nostalgia denominator

# When a song's album_year is None (covers, unknowns), fall back to the show year
# so they contribute 0 to the nostalgia calculation (neutral effect).

# Proper NIN releases — songs attributed to these are "album tracks".
# Singles, minor soundtracks, covers, and unreleased material are "non-album cuts".
ALBUM_TRACK_SLUGS = frozenset({
    "pretty-hate-machine", "broken", "the-downward-spiral", "the-fragile",
    "with-teeth", "year-zero", "ghosts-i-iv", "the-slip", "hesitation-marks",
    "not-the-actual-events", "add-violence", "bad-witch", "tron-ares",
})

# Section name keywords that indicate stripped/intimate production
STRIPPED_KEYWORDS = ["stripped", "b-stage", "acoustic", "intimate", "solo", "quiet"]
FULL_KEYWORDS = ["full production", "main stage", "full band"]

# Minimum shows in a tour leg before we compute within-tour rarity.
# Smaller legs don't have enough data for a meaningful comparison.
MIN_TOUR_SHOWS = 3

# Tour rarity tier thresholds — derived from the empirical distribution of
# tour_rarity_score across all 943 scoreable shows:
#   P10=0.074  P25=0.113  median=0.186  P75=0.292  P90=0.405  max=0.944
TOUR_RARITY_THRESHOLDS = [
    (0.40, "off-script"),   # top ~10%: genuinely unique nights
    (0.25, "varied"),       # top ~35%: notably different from the tour norm
    (0.10, "typical"),      # middle bulk: standard tour setlist
    (0.0,  "rigid"),        # bottom ~10%: setlist robots
]


def load_songs() -> dict:
    path = DATA_DIR / "songs.json"
    if not path.exists():
        raise FileNotFoundError("data/songs.json not found — run enrich_songs.py first")
    return json.loads(path.read_text())


def build_tour_frequency_maps(shows_dir: Path) -> dict:
    """
    First pass: load every show JSON and build per-tour song frequency maps.

    Returns a dict keyed by tour name. Each value is a dict:
        { song_slug: play_count_in_tour, "__total__": n_shows_in_tour }

    Only tours with MIN_TOUR_SHOWS or more shows are included.
    """
    tour_shows: dict[str, list] = defaultdict(list)

    for f in sorted(shows_dir.glob("*.json")):
        try:
            show = json.loads(f.read_text())
        except Exception:
            continue
        tour = (show.get("tour") or "").strip()
        if not tour or not show.get("setlist"):
            continue
        tour_shows[tour].append(show)

    freq_maps: dict[str, dict] = {}
    for tour, shows in tour_shows.items():
        if len(shows) < MIN_TOUR_SHOWS:
            continue
        song_counts: dict[str, int] = defaultdict(int)
        for show in shows:
            for entry in show["setlist"]:
                slug = entry.get("slug", "")
                if slug:
                    song_counts[slug] += 1
        freq_maps[tour] = dict(song_counts)
        freq_maps[tour]["__total__"] = len(shows)

    return freq_maps


def tour_rarity_tier(score: float) -> str:
    for threshold, label in TOUR_RARITY_THRESHOLDS:
        if score >= threshold:
            return label
    return "rigid"


def production_style(sections: list) -> str:
    """Infer show production style from set section names."""
    has_stripped = any(
        any(kw in s.lower() for kw in STRIPPED_KEYWORDS) for s in sections
    )
    has_full = any(
        any(kw in s.lower() for kw in FULL_KEYWORDS) for s in sections
    )
    if has_stripped and has_full:
        return "mixed"
    if has_stripped:
        return "stripped"
    return "full"


def compute_show_features(show: dict, songs: dict, tour_freq_maps: Optional[dict] = None) -> dict:
    setlist = show.get("setlist", [])
    if not setlist:
        return {}

    try:
        show_year = int(show["date"][:4])
    except Exception:
        return {}

    # --- Per-song data ---
    song_ages = []           # years old at time of show
    album_counts = defaultdict(int)
    era_counts = defaultdict(int)
    rarity_scores = []
    cover_count = 0
    non_album_count = 0      # songs not on any proper studio/EP release
    special_count = 0        # songs with non-empty notes (remixes, reworked, etc.)
    sections = []

    for entry in setlist:
        slug = entry.get("slug", "")
        section = entry.get("section", "")
        notes = entry.get("notes", "")
        is_cover_in_show = entry.get("is_cover", False)

        if section and section not in sections:
            sections.append(section)

        song_info = songs.get(slug, {})
        album_year = song_info.get("album_year")
        album_slug = song_info.get("album_slug", "unknown")
        era_group = song_info.get("era_group", "Unknown")
        rarity = song_info.get("rarity_score")
        is_cover = song_info.get("is_cover", False) or is_cover_in_show

        # For covers with no NIN release year, skip them from the nostalgia
        # calculation — they'd distort the score based on the original artist's year.
        if album_year and album_year <= show_year and not song_info.get("is_cover"):
            song_ages.append(show_year - album_year)

        album_counts[album_slug] += 1
        era_counts[era_group] += 1

        if rarity is not None:
            rarity_scores.append(rarity)

        if is_cover:
            cover_count += 1

        if album_slug not in ALBUM_TRACK_SLUGS:
            non_album_count += 1

        if notes.strip():
            special_count += 1

    total = len(setlist)

    # --- Rarity buckets (count-based, not average-based) ---
    # Thresholds derived from the actual play-count distribution across 1176 shows.
    n_unicorn   = sum(1 for r in rarity_scores if r > 0.97)   # <3% of shows — almost never played
    n_deep_cut  = sum(1 for r in rarity_scores if 0.92 < r <= 0.97)  # 3–8% of shows
    n_album_trk = sum(1 for r in rarity_scores if 0.75 < r <= 0.92)  # 8–25% of shows
    n_familiar  = sum(1 for r in rarity_scores if 0.50 < r <= 0.75)  # 25–50% of shows
    n_staple    = sum(1 for r in rarity_scores if r <= 0.50)          # 50%+ of shows

    # Show-level rarity tier based on composition
    n_rare_total = n_unicorn + n_deep_cut
    if n_unicorn >= 2:
        rarity_tier = "unicorn"      # multiple songs almost never played — historic night
    elif n_rare_total >= 4:
        rarity_tier = "deep-cuts"    # packed with songs true fans rarely hear live
    elif n_rare_total >= 2:
        rarity_tier = "mixed"        # a few surprises alongside the familiar
    elif rarity_scores and n_staple / len(rarity_scores) > 0.6:
        rarity_tier = "hits-heavy"   # majority are 50%+ staples
    else:
        rarity_tier = "balanced"     # healthy mix of familiar and less-common

    # --- Nostalgia (absolute avg song age; normalized globally in compute_all_features) ---
    # nostalgia_score is a placeholder here — overwritten after all shows are processed
    # so the denominator is the observed maximum across the whole archive, not per-show era.
    avg_age = statistics.mean(song_ages) if song_ages else None
    nostalgia_score = None

    # --- Album distribution (fraction of setlist per album) ---
    album_distribution = {
        album: round(count / total, 4)
        for album, count in sorted(album_counts.items(), key=lambda x: -x[1])
    }
    era_distribution = {
        era: round(count / total, 4)
        for era, count in sorted(era_counts.items(), key=lambda x: -x[1])
    }

    # Primary album/era = the one with the most songs
    primary_album = max(album_counts, key=album_counts.get) if album_counts else None
    primary_era = max(era_counts, key=era_counts.get) if era_counts else None

    avg_rarity = round(statistics.mean(rarity_scores), 4) if rarity_scores else None

    # --- Production style ---
    prod_style = production_style(sections)

    # --- Within-tour rarity ---
    t_score = None
    t_tier = None
    tour_name = (show.get("tour") or "").strip()
    if tour_freq_maps and tour_name and tour_name in tour_freq_maps:
        freq = tour_freq_maps[tour_name]
        n_tour_shows = freq["__total__"]
        slugs = [e.get("slug", "") for e in setlist if e.get("slug")]
        if slugs:
            per_song = [1.0 - freq.get(s, 0) / n_tour_shows for s in slugs]
            raw = statistics.mean(per_song)
            t_score = round(raw, 4)
            t_tier = tour_rarity_tier(raw)

    return {
        # Nostalgia
        "nostalgia_score": nostalgia_score,
        "avg_song_age_at_show": round(avg_age, 1) if avg_age is not None else None,
        # Album/era concentration
        "album_distribution": album_distribution,
        "era_distribution": era_distribution,
        "primary_album": primary_album,
        "primary_era": primary_era,
        # Global rarity
        "avg_rarity_score": avg_rarity,
        "rarity_tier": rarity_tier if rarity_scores else None,
        "n_unicorn": n_unicorn,
        "n_deep_cut": n_deep_cut,
        "n_album_track": n_album_trk,
        "n_familiar": n_familiar,
        "n_staple": n_staple,
        # Covers
        "cover_count": cover_count,
        "cover_fraction": round(cover_count / total, 4),
        # Non-album cuts
        "n_non_album": non_album_count,
        "non_album_fraction": round(non_album_count / total, 4),
        # Special/unique moments
        "special_notes_count": special_count,
        "special_fraction": round(special_count / total, 4),
        # Production
        "production_style": prod_style,
        "has_stripped_section": prod_style in ("stripped", "mixed"),
        # Show shape
        "song_count": total,
        "section_count": len(sections),
        "sections": sections,
        # Within-tour rarity
        "tour_rarity_score": t_score,
        "tour_rarity_tier": t_tier,
    }


def compute_nostalgia_outlier_scores(results: list) -> None:
    """
    Mutates each feature dict to add nostalgia_outlier_score.

    Score = percentile rank of avg_song_age_at_show among shows within ±WINDOW years.
    0.0 = played the youngest material of any show in that era window.
    1.0 = played the oldest material of any show in that era window.
    """
    WINDOW = 2
    MIN_PEERS = 5

    year_ages: dict[int, list] = defaultdict(list)
    for _, show, feat in results:
        age = feat.get("avg_song_age_at_show")
        if age is None:
            continue
        try:
            year = int(show["date"][:4])
        except Exception:
            continue
        year_ages[year].append(age)

    all_ages = [a for ages in year_ages.values() for a in ages]

    for _, show, feat in results:
        age = feat.get("avg_song_age_at_show")
        if age is None:
            feat["nostalgia_outlier_score"] = None
            continue
        try:
            year = int(show["date"][:4])
        except Exception:
            feat["nostalgia_outlier_score"] = None
            continue

        peers: list = []
        for dy in range(-WINDOW, WINDOW + 1):
            peers.extend(year_ages.get(year + dy, []))
        if len(peers) < MIN_PEERS:
            peers = all_ages

        below = sum(1 for p in peers if p < age)
        equal = sum(1 for p in peers if p == age)
        pct = (below + 0.5 * equal) / len(peers)
        feat["nostalgia_outlier_score"] = round(pct, 4)


def compute_all_features():
    songs = load_songs()
    print(f"Loaded {len(songs)} songs from catalog")

    print("Building tour frequency maps (first pass)...")
    tour_freq_maps = build_tour_frequency_maps(SHOWS_DIR)
    print(f"  {len(tour_freq_maps)} tours with ≥{MIN_TOUR_SHOWS} shows")

    results = []  # (path, show_dict, features_dict)
    n_no_setlist = 0

    for f in sorted(SHOWS_DIR.glob("*.json")):
        try:
            show = json.loads(f.read_text())
        except Exception as e:
            print(f"  [warn] {f.name}: {e}")
            continue

        features = compute_show_features(show, songs, tour_freq_maps)
        if not features:
            n_no_setlist += 1
            continue

        results.append((f, show, features))

    # Normalize nostalgia globally: divide by the maximum avg_song_age_at_show observed
    # across all shows. This means a 1990 show playing 1-year-old PHM songs scores near 0
    # (correctly — those weren't nostalgic) while a show like 2018-12-11 playing 26-year-old
    # material scores near 1.0 (correctly — that's the whole point of that night).
    ages = [feat["avg_song_age_at_show"] for _, _, feat in results if feat.get("avg_song_age_at_show")]
    max_avg_age = max(ages) if ages else 1.0
    print(f"Max avg_song_age_at_show: {max_avg_age:.1f} yrs → nostalgia denominator")
    for _, _, feat in results:
        age = feat.get("avg_song_age_at_show")
        feat["nostalgia_score"] = round(age / max_avg_age, 4) if age is not None else None

    # Nostalgia outlier: percentile rank within ±2-year peer window.
    # High score = this show played unusually old material for its era.
    # Peel It Back shows score ~0.5 (expected for 2025-26); the 2018-12-11 Palladium
    # scores near 1.0 (played 26-yr-old material when contemporaries averaged ~15 yrs).
    compute_nostalgia_outlier_scores(results)
    n_outlier = sum(1 for _, _, f in results if f.get("nostalgia_outlier_score") is not None)
    print(f"Nostalgia outlier scores computed for {n_outlier} shows")

    # Write updated show JSONs and build index
    features_index = []
    for f, show, features in results:
        show["features"] = features
        f.write_text(json.dumps(show, indent=2, ensure_ascii=False))

        features_index.append({
            "id": show["id"],
            "date": show["date"],
            "venue": show["venue"],
            "city": show["city"],
            "state": show.get("state", ""),
            "country": show["country"],
            "tour": show.get("tour", ""),
            "era_slug": show.get("era_slug", ""),
            **features,
        })

    features_index.sort(key=lambda x: x["date"])
    out_path = DATA_DIR / "features_index.json"
    out_path.write_text(json.dumps(features_index, indent=2, ensure_ascii=False))
    print(f"\nComputed features for {len(results)} shows ({n_no_setlist} had no setlist)")
    print(f"Wrote features index → {out_path}")

    # Summary stats
    with_nostalgia = [s for s in features_index if s.get("nostalgia_score") is not None]
    if with_nostalgia:
        scores = [s["nostalgia_score"] for s in with_nostalgia]
        print(f"\nNostalgia score range: {min(scores):.3f} – {max(scores):.3f}")

    with_outlier = [s for s in features_index if s.get("nostalgia_outlier_score") is not None]
    if with_outlier:
        print(f"\nTop nostalgia outliers (era-relative):")
        for s in sorted(with_outlier, key=lambda x: -x["nostalgia_outlier_score"])[:10]:
            print(f"  {s['date']}  avg_age={s['avg_song_age_at_show']:.1f}  "
                  f"outlier={s['nostalgia_outlier_score']:.3f}  {s['venue']}, {s['city']}")

    with_tour = [s for s in features_index if s.get("tour_rarity_score") is not None]
    print(f"\nShows with tour_rarity_score: {len(with_tour)}")
    if with_tour:
        t_scores = [s["tour_rarity_score"] for s in with_tour]
        print(f"Tour rarity range: {min(t_scores):.3f} – {max(t_scores):.3f}")
        print(f"Most off-script shows:")
        for s in sorted(with_tour, key=lambda x: -x["tour_rarity_score"])[:5]:
            print(f"  {s['date']} {s['venue']}, {s['city']}  "
                  f"tour_rarity={s['tour_rarity_score']}  [{s['tour_rarity_tier']}]")


if __name__ == "__main__":
    compute_all_features()
