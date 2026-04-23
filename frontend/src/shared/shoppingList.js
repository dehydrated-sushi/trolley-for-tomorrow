/**
 * localStorage-backed shopping list with an event-bus subscription model
 * and optimistic categorisation.
 *
 * Shape of each item:
 *   { id, name, category, checked, source, added_at }
 *
 * `source` tracks where an item came from: 'manual', 'recipe', 'staple',
 * 'favourite'. Used for display + analytics; doesn't affect behaviour.
 *
 * Categorisation strategy:
 *   1. Fast local keyword match via `_localClassify` — covers ~80% of
 *      common inputs instantly, no network call.
 *   2. Items that fall through to 'other' get an async backend refinement
 *      via `/api/ingredients/classify`. The item appears in the list the
 *      moment the user hits Enter; its category tag updates silently when
 *      the backend response lands (usually ~100-200 ms later).
 *
 * This pattern keeps the add-input feeling instantaneous without giving up
 * the accuracy of the backend's 14k-row keyword table.
 */

import { apiFetch } from '../lib/api'

const STORAGE_KEY = 'trolley_shopping_list_v1'
const listeners = new Set()

// ---------------------------------------------------------------------------
// Local keyword classifier
//
// Small map tuned for the most common grocery inputs — covers the fast path.
// Anything that misses falls through to 'other' and gets re-classified by
// the backend asynchronously. Keep this list short: it's a shortcut, not a
// replacement for the backend's full keyword table.

const _KEYWORD_MAP = [
  // protein
  [/\b(chicken|turkey|beef|pork|lamb|bacon|ham|sausage|salmon|tuna|fish|prawn|shrimp|crab|lobster|egg|eggs|cheese|yogurt|yoghurt|milk|butter|cream|tofu|tempeh)\b/, 'protein'],
  // vegetables
  [/\b(lettuce|spinach|kale|cabbage|broccoli|cauliflower|carrot|celery|onion|garlic|ginger|tomato|cucumber|pepper|capsicum|zucchini|eggplant|aubergine|potato|sweet potato|mushroom|pea|peas|bean|beans|asparagus|leek|arugula|rocket)\b/, 'vegetables'],
  // fruits
  [/\b(apple|banana|orange|lemon|lime|grape|grapes|berry|berries|strawberry|blueberry|raspberry|pear|peach|plum|cherry|pineapple|mango|papaya|watermelon|melon|kiwi|avocado|coconut|pomegranate|grapefruit)\b/, 'fruits'],
  // grains
  [/\b(bread|rice|pasta|noodle|noodles|flour|oats|oat|cereal|quinoa|barley|cornmeal|bagel|tortilla|cracker|crackers|pita)\b/, 'grains'],
  // fats
  [/\b(oil|olive oil|vegetable oil|canola|sesame oil|nuts|almond|almonds|cashew|cashews|peanut|peanuts|walnut|walnuts|pistachio|pecan|seed|seeds|chia|flax|avocado oil|ghee)\b/, 'fats'],
  // beverages
  [/\b(coffee|tea|juice|soda|water|wine|beer|cocktail)\b/, 'beverages'],
]

function _localClassify(name) {
  const n = (name || '').toLowerCase().trim()
  if (!n) return 'other'
  for (const [pattern, category] of _KEYWORD_MAP) {
    if (pattern.test(n)) return category
  }
  return 'other'
}

// ---------------------------------------------------------------------------
// Storage

function _read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function _write(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch { /* quota/private-mode — ignore */ }
  listeners.forEach((fn) => {
    try { fn(items) } catch { /* swallow subscriber errors */ }
  })
}

// ---------------------------------------------------------------------------
// Public API

/** Current items snapshot. */
export function getItems() {
  return _read()
}

/**
 * Check if an item is already in the list. Case-insensitive, trimmed match.
 * Used by Meals page to show "Already in list" state on + buttons.
 */
export function hasItem(name) {
  const key = (name || '').toLowerCase().trim()
  return _read().some((it) => it.name.toLowerCase().trim() === key)
}

/**
 * Find an existing item by name (case-insensitive). Used when the Meals
 * page wants to flash the existing row during a duplicate-add attempt.
 */
export function findByName(name) {
  const key = (name || '').toLowerCase().trim()
  return _read().find((it) => it.name.toLowerCase().trim() === key) || null
}

/**
 * Add an item. If `name` is already present (case-insensitive), returns
 * `{ added: false, existing }` without modifying the list — the caller can
 * decide how to indicate the duplicate (toast, flash highlight, etc.).
 */
export function addItem(name, { source = 'manual' } = {}) {
  const trimmed = (name || '').trim()
  if (!trimmed) return { added: false, existing: null }

  const items = _read()
  const existing = items.find(
    (it) => it.name.toLowerCase().trim() === trimmed.toLowerCase(),
  )
  if (existing) return { added: false, existing }

  const category = _localClassify(trimmed)
  const newItem = {
    id:        `sl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name:      trimmed,
    category,
    checked:   false,
    source,
    added_at:  new Date().toISOString(),
  }
  _write([...items, newItem])

  // Async refine if local classify returned 'other'. Backend uses the same
  // 14k-row keyword table the rest of the app relies on, so it's more
  // accurate. Only update if (a) the backend gave us something better AND
  // (b) the item is still in the list + still uncategorised (the user
  // might have removed or re-classified it by the time the fetch lands).
  if (category === 'other') {
    apiFetch(`/api/ingredients/classify?name=${encodeURIComponent(trimmed)}`)
      .then((data) => {
        const refined = data?.category
        if (!refined || refined === 'other') return
        const current = _read()
        const target = current.find((it) => it.id === newItem.id)
        if (!target || target.category !== 'other') return
        _write(current.map((it) =>
          it.id === newItem.id ? { ...it, category: refined } : it,
        ))
      })
      .catch(() => { /* keep 'other' on failure */ })
  }

  return { added: true, item: newItem }
}

export function toggleChecked(id) {
  _write(_read().map((it) =>
    it.id === id ? { ...it, checked: !it.checked } : it,
  ))
}

/**
 * Bulk-check a set of items by id. Idempotent — already-checked items stay
 * checked. Used by the receipt reconciliation panel to cross off everything
 * the user just bought in one write (one subscriber notification instead of N).
 */
export function markChecked(ids) {
  if (!ids || !ids.length) return
  const set = new Set(ids)
  _write(_read().map((it) => (set.has(it.id) ? { ...it, checked: true } : it)))
}

// ---------------------------------------------------------------------------
// Receipt reconciliation matcher
//
// Given a list of parsed receipt items ({ name, ... }), return the shopping
// list items (unchecked only) that a receipt entry plausibly satisfies.
//
// Matching is token-overlap on normalised words, with:
//   - stopwords stripped (colour / size / organic-style adjectives that
//     over-match)
//   - trailing-s stemming (apples → apple, tomatoes → tomatoe — coarse but
//     fine for grocery items)
//   - minimum token length of 3 to avoid "1", "of", "a" false positives
//
// Any single token in common is enough to count as a match. The user gets a
// checkbox next to each hit and confirms before anything is crossed off, so
// a slightly loose matcher is better than a strict one that misses real
// bought-it cases.

const _STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'fresh', 'organic', 'raw', 'whole', 'lean',
  'free', 'range', 'low', 'fat', 'full', 'light', 'extra', 'virgin', 'pure',
  'natural', 'plain', 'sweet', 'hot', 'cold', 'frozen', 'canned', 'dried',
  'red', 'green', 'yellow', 'white', 'black', 'brown', 'large', 'small',
  'medium', 'jumbo', 'mini', 'premium', 'select',
])

function _tokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !_STOPWORDS.has(t))
    .map((t) => (t.endsWith('s') && t.length > 3 ? t.slice(0, -1) : t))
}

function _overlap(a, b) {
  const ta = new Set(_tokens(a))
  if (ta.size === 0) return false
  const tb = _tokens(b)
  for (const t of tb) if (ta.has(t)) return true
  return false
}

/**
 * Given receipt items [{ name, ... }], return shopping-list items (only
 * unchecked ones) that match at least one receipt entry. Each result is
 * `{ item, matchedReceiptName }` so the UI can show "because you bought X".
 */
export function findUncheckedMatches(receiptItems) {
  const names = (receiptItems || [])
    .map((r) => (r?.name || '').trim())
    .filter(Boolean)
  if (names.length === 0) return []
  const unchecked = _read().filter((it) => !it.checked)
  const results = []
  for (const item of unchecked) {
    const hit = names.find((n) => _overlap(item.name, n))
    if (hit) results.push({ item, matchedReceiptName: hit })
  }
  return results
}

export function removeItem(id) {
  _write(_read().filter((it) => it.id !== id))
}

export function clearChecked() {
  _write(_read().filter((it) => !it.checked))
}

export function clearAll() {
  _write([])
}

/**
 * Subscribe to list changes (fires on every mutation from this tab or,
 * thanks to the `storage` event, from other tabs on the same origin).
 * Returns an unsubscribe function.
 */
export function subscribe(fn) {
  listeners.add(fn)
  // Cross-tab sync: localStorage's `storage` event fires in OTHER tabs
  // when this tab writes. Re-notify local subscribers so pages refresh
  // without a reload.
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) {
      try { fn(_read()) } catch { /* swallow */ }
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}
