"""Recipe image cache — fetches from Pixabay, stores bytes locally.

Design
------
- `recipe_images` table holds one row per recipe whose image has ever been
  requested. Columns:
    recipe_id         PK, FK-ish to recipes.id
    image_filename    filename on disk, or NULL = known-negative (Pixabay
                      had no hit for this recipe's name)
    pixabay_id        for credit + debugging
    pixabay_user      contributor name (for the "Photos by" credit)
    pixabay_user_id   for building the contributor profile link
    pixabay_page_url  deep-link back to the photo's Pixabay page
    fetched_at

- Image bytes live at `backend/data/recipe-covers/<recipe_id>.jpg`, relative
  to the backend CWD (matching the project's existing OCR-CSV convention).

- Pixabay's TOS requires images be downloaded before serving (hotlinking
  forbidden, `webformatURL` expires in 24 hours). We download once and
  serve from our own origin forever.

- Known-negative rows are persisted so "smurf juice" doesn't re-hit the
  rate-limited API on every request.

- If PIXABAY_API_KEY is absent from the environment the feature is inert:
  `fetch_and_cache()` returns None, no filesystem / DB writes happen, the
  route that depends on it returns 404, and the frontend falls back to the
  existing gradient + category-icon hero.
"""

import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

from core.database import db
from sqlalchemy import text


IMAGE_DIR = Path("data/recipe-covers")  # relative to backend CWD

# Pixabay search is brittle on junk tokens; strip filler before querying.
_FILLER_WORDS = {
    "a", "an", "the", "and", "or", "with", "from", "for", "in", "on",
    "quick", "easy", "best", "original", "my", "your", "our", "his", "her",
    "mom", "moms", "dad", "dads", "grandma", "grandmas", "grandpa", "grandpas",
    "simple", "fast", "instant", "homemade", "favorite", "favourite",
    "recipe", "perfect", "amazing", "ultimate", "super", "ever",
}
_MAX_QUERY_WORDS = 4

# Safety caps.
_SEARCH_TIMEOUT_S = 4
_DOWNLOAD_TIMEOUT_S = 6
_PIXABAY_API = "https://pixabay.com/api/"

# Pixabay's CDN rejects the default Python-urllib User-Agent with HTTP 403.
# A plain browser-style UA is enough to get past it.
_UA_HEADER = {
    "User-Agent": "TrolleyForTomorrow/1.0 (+https://pixabay.com/api/docs/)"
}

_TABLE_INITIALISED = False


def _ensure_table():
    global _TABLE_INITIALISED
    if _TABLE_INITIALISED:
        return
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS recipe_images (
            recipe_id        INTEGER PRIMARY KEY,
            image_filename   TEXT,
            pixabay_id       BIGINT,
            pixabay_user     TEXT,
            pixabay_user_id  BIGINT,
            pixabay_page_url TEXT,
            fetched_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.session.commit()
    _TABLE_INITIALISED = True


def _clean_query(recipe_name: str) -> str:
    """Turn a messy recipe name into a concise Pixabay search phrase."""
    lowered = re.sub(r"[^a-z\s]", " ", (recipe_name or "").lower())
    words = [
        w for w in lowered.split()
        if len(w) >= 2 and w not in _FILLER_WORDS
    ]
    return " ".join(words[:_MAX_QUERY_WORDS])


def _pixabay_search(query: str, api_key: str) -> Optional[dict]:
    if not query:
        return None
    params = urllib.parse.urlencode({
        "key":         api_key,
        "q":           query,
        "image_type":  "photo",
        "category":    "food",
        "safesearch":  "true",
        "orientation": "horizontal",
        "per_page":    3,  # Pixabay's minimum
    })
    url = f"{_PIXABAY_API}?{params}"
    try:
        with urllib.request.urlopen(url, timeout=_SEARCH_TIMEOUT_S) as resp:
            if resp.status != 200:
                return None
            data = json.loads(resp.read())
    except Exception:
        return None
    hits = data.get("hits") or []
    return hits[0] if hits else None


def _download_bytes(image_url: str) -> Optional[bytes]:
    req = urllib.request.Request(image_url, headers=_UA_HEADER)
    try:
        with urllib.request.urlopen(req, timeout=_DOWNLOAD_TIMEOUT_S) as resp:
            if resp.status != 200:
                return None
            return resp.read()
    except Exception:
        return None


def get_cached_image(recipe_id: int) -> Optional[dict]:
    """Return the cache row (positive or known-negative), or None if uncached."""
    _ensure_table()
    row = db.session.execute(text("""
        SELECT recipe_id, image_filename, pixabay_user,
               pixabay_user_id, pixabay_page_url
        FROM recipe_images
        WHERE recipe_id = :rid
    """), {"rid": recipe_id}).fetchone()
    return dict(row._mapping) if row else None


def fetch_and_cache(recipe_id: int, recipe_name: str) -> Optional[dict]:
    """Cache-miss path: search Pixabay, download best hit, persist row."""
    api_key = os.environ.get("PIXABAY_API_KEY")
    if not api_key:
        return None  # feature disabled, no writes

    hit = _pixabay_search(_clean_query(recipe_name), api_key)

    image_filename = None
    pixabay_id = pixabay_user = pixabay_user_id = pixabay_page_url = None

    if hit:
        img_url = hit.get("webformatURL")
        blob = _download_bytes(img_url) if img_url else None
        if blob:
            IMAGE_DIR.mkdir(parents=True, exist_ok=True)
            image_filename = f"{recipe_id}.jpg"
            (IMAGE_DIR / image_filename).write_bytes(blob)
            pixabay_id       = hit.get("id")
            pixabay_user     = hit.get("user")
            pixabay_user_id  = hit.get("user_id")
            pixabay_page_url = hit.get("pageURL")

    _ensure_table()
    db.session.execute(text("""
        INSERT INTO recipe_images
            (recipe_id, image_filename, pixabay_id,
             pixabay_user, pixabay_user_id, pixabay_page_url)
        VALUES
            (:rid, :fname, :pid, :puser, :puid, :purl)
        ON CONFLICT (recipe_id) DO UPDATE SET
            image_filename   = EXCLUDED.image_filename,
            pixabay_id       = EXCLUDED.pixabay_id,
            pixabay_user     = EXCLUDED.pixabay_user,
            pixabay_user_id  = EXCLUDED.pixabay_user_id,
            pixabay_page_url = EXCLUDED.pixabay_page_url,
            fetched_at       = CURRENT_TIMESTAMP
    """), {
        "rid":   recipe_id,
        "fname": image_filename,
        "pid":   pixabay_id,
        "puser": pixabay_user,
        "puid":  pixabay_user_id,
        "purl":  pixabay_page_url,
    })
    db.session.commit()

    return {
        "recipe_id":        recipe_id,
        "image_filename":   image_filename,
        "pixabay_user":     pixabay_user,
        "pixabay_user_id":  pixabay_user_id,
        "pixabay_page_url": pixabay_page_url,
    }
