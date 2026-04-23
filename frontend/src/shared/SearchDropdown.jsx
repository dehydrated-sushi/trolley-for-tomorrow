import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_BASE, apiFetch } from '../lib/api'
import RecipeDetailModal from './RecipeDetailModal'

const EASE = [0.22, 1, 0.36, 1]
const DEBOUNCE_MS = 250
const MIN_QUERY_LEN = 2
const MAX_RESULTS = 8

/**
 * TopNav recipe search.
 *
 * Shape inspired by Spotlight / Arc command bar: pill input, attached
 * dropdown beneath it, keyboard-driven. Tool-like, not flashy.
 *
 * Behaviour:
 * - Focus lights an emerald ring (overrides the browser's default blue)
 * - Typing debounces 250 ms, then hits `/api/meals/search?q=<q>&limit=8`
 * - Dropdown attaches to the bottom of the input (shared radius when open)
 * - Arrow keys move highlight, Enter navigates to `/meals?highlight=<id>`
 * - Esc closes the dropdown (first press), blurs the input (second press)
 * - Click-outside closes the dropdown but keeps focus
 *
 * The Meals page already reads `?highlight=<id>` and auto-expands the
 * target card; selecting here closes the loop into the existing feature.
 */
export default function SearchDropdown() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)

  const inputRef = useRef(null)
  const wrapperRef = useRef(null)
  const debounceRef = useRef(null)
  const fetchSeqRef = useRef(0)

  // When non-null, the recipe detail modal is mounted open for that id.
  // Selecting a search result stores the id here instead of navigating
  // to /meals?highlight=<id>, because the Meals page only pulses cards
  // that happen to be on the currently-rendered page of recommendations.
  const [openRecipeId, setOpenRecipeId] = useState(null)

  // --- Fetch + debounce -------------------------------------------------

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < MIN_QUERY_LEN) {
      setResults([])
      setLoading(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      // Sequence guard: a slow response for an outdated query must not
      // overwrite a faster response for the current query.
      const seq = ++fetchSeqRef.current
      setLoading(true)
      try {
        const data = await apiFetch(`/api/meals/search?q=${encodeURIComponent(q)}&limit=${MAX_RESULTS}`)
        if (seq !== fetchSeqRef.current) return
        setResults(data?.results || [])
        setHighlighted(0)
      } catch {
        if (seq === fetchSeqRef.current) setResults([])
      } finally {
        if (seq === fetchSeqRef.current) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // --- Click outside ----------------------------------------------------

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // --- Keyboard nav -----------------------------------------------------

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setHighlighted((h) => Math.min(h + 1, Math.max(0, results.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && results[highlighted]) {
        selectResult(results[highlighted])
      }
    } else if (e.key === 'Escape') {
      if (open) {
        setOpen(false)
      } else {
        inputRef.current?.blur()
      }
    }
  }

  const selectResult = (r) => {
    if (!r) return
    setOpen(false)
    setQuery('')
    setResults([])
    inputRef.current?.blur()
    // Open the recipe in a full detail modal on top of the current page
    // instead of navigating to /meals?highlight=<id>. The Meals page is
    // paginated; deep-linking to a recipe that isn't on page 1 silently
    // fails because the card never mounts for the highlight effect to
    // latch onto.
    setOpenRecipeId(r.id)
  }

  const handleFocus = () => {
    // Reopen the dropdown if there's a query already typed (common when
    // the user dismissed with Esc and comes back).
    if (query.trim().length >= MIN_QUERY_LEN) setOpen(true)
  }

  const showDropdown = open && query.trim().length >= MIN_QUERY_LEN

  return (
    <div ref={wrapperRef} className="relative w-64">
      {/* Input */}
      <div
        className={`relative flex items-center bg-surface-container-low transition-all ${
          showDropdown
            ? 'rounded-t-[20px] rounded-b-none ring-2 ring-emerald-400/50 border border-emerald-400/70'
            : open || query
              ? 'rounded-full ring-2 ring-emerald-400/40 border border-emerald-300/60'
              : 'rounded-full border border-transparent focus-within:ring-2 focus-within:ring-emerald-400/40 focus-within:border-emerald-300/60'
        }`}
      >
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search recipes..."
          className="w-full pl-10 pr-10 py-2 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/70 outline-none border-none"
          aria-label="Search recipes"
          aria-expanded={showDropdown}
          aria-controls="search-results"
          aria-activedescendant={showDropdown && results[highlighted] ? `search-r-${results[highlighted].id}` : undefined}
          role="combobox"
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
              setOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}

        {/* Thin loading bar under the input (visible while fetching) */}
        <AnimatePresence>
          {loading && showDropdown && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ transformOrigin: 'left' }}
              className="absolute left-3 right-3 bottom-0 h-[2px] rounded-full overflow-hidden"
            >
              <motion.span
                className="block w-1/3 h-full bg-emerald-500"
                animate={{ x: ['-120%', '360%'] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Attached dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
            style={{ transformOrigin: 'top' }}
            id="search-results"
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 bg-white border border-emerald-300/60 border-t-transparent rounded-b-[20px] shadow-xl overflow-hidden"
          >
            {results.length === 0 && !loading ? (
              <div className="px-4 py-4 text-sm text-on-surface-variant">
                No recipes match <span className="font-semibold text-on-surface">&ldquo;{query.trim()}&rdquo;</span>.
              </div>
            ) : (
              <motion.ul
                className="max-h-[320px] overflow-y-auto py-1"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.02, delayChildren: 0.04 } },
                }}
              >
                {results.map((r, i) => (
                  <ResultRow
                    key={r.id}
                    recipe={r}
                    query={query}
                    active={highlighted === i}
                    onMouseEnter={() => setHighlighted(i)}
                    onClick={() => selectResult(r)}
                  />
                ))}
              </motion.ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <RecipeDetailModal
        open={openRecipeId != null}
        recipeId={openRecipeId}
        onClose={() => setOpenRecipeId(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Result row

function ResultRow({ recipe, query, active, onMouseEnter, onClick }) {
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 4 },
        show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } },
      }}
      id={`search-r-${recipe.id}`}
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
        active ? 'bg-emerald-50' : 'hover:bg-emerald-50/60'
      }`}
    >
      <RecipeThumb recipeId={recipe.id} name={recipe.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-on-surface leading-tight line-clamp-1">
          <HighlightedName name={recipe.name} query={query} />
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono uppercase tracking-widest text-on-surface-variant/80">
          {recipe.calories != null && (
            <span className="inline-flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[11px]">local_fire_department</span>
              {Math.round(recipe.calories)} kcal
            </span>
          )}
          {recipe.minutes != null && recipe.minutes > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[11px]">schedule</span>
              {recipe.minutes} min
            </span>
          )}
        </div>
      </div>
      {active && (
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 flex-shrink-0 pr-1">
          ↵
        </span>
      )}
    </motion.li>
  )
}

// ---------------------------------------------------------------------------
// Small recipe image with first-letter fallback

function RecipeThumb({ recipeId, name }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    const letter = (name || '?').trim().charAt(0).toUpperCase() || '?'
    return (
      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-700 font-bold text-sm">
        {letter}
      </div>
    )
  }
  return (
    <img
      src={`${API_BASE}/api/meals/recipe-image/${recipeId}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-emerald-50"
    />
  )
}

// ---------------------------------------------------------------------------
// Bold every case-insensitive occurrence of `query` inside `name`

function HighlightedName({ name, query }) {
  const q = (query || '').trim()
  if (!q) return <>{name}</>
  const lower = name.toLowerCase()
  const target = q.toLowerCase()
  const parts = []
  let i = 0
  while (i < name.length) {
    const hit = lower.indexOf(target, i)
    if (hit === -1) {
      parts.push({ text: name.slice(i), match: false })
      break
    }
    if (hit > i) parts.push({ text: name.slice(i, hit), match: false })
    parts.push({ text: name.slice(hit, hit + q.length), match: true })
    i = hit + q.length
  }
  return (
    <>
      {parts.map((p, idx) =>
        p.match ? (
          <span key={idx} className="font-bold text-emerald-700">{p.text}</span>
        ) : (
          <span key={idx}>{p.text}</span>
        ),
      )}
    </>
  )
}
