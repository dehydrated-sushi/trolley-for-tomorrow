import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import NutritionLegend from '../../shared/NutritionLegend'
import { getCategoryInfo } from '../../shared/nutrition'
import { TAG_STYLES, TAG_STYLE_FALLBACK } from '../../shared/recipeTags'
import NutritionPopover from './NutritionPopover'
import SortDropdown from './SortDropdown'

const SORT_OPTIONS = [
  { key: 'match',            label: 'Best match' },
  { key: 'highest_protein',  label: 'Highest protein' },
  { key: 'lowest_calories',  label: 'Lowest calories' },
  { key: 'highest_calories', label: 'Highest calories' },
]

/** Dominant category across the full ingredient list (for hero tint). */
function dominantCategory(recipe) {
  const counts = {}
  for (const ing of recipe.ingredients || []) {
    const c = typeof ing === 'string' ? 'other' : ing.category
    if (c && c !== 'other') counts[c] = (counts[c] || 0) + 1
  }
  let best = null
  let bestN = 0
  for (const [c, n] of Object.entries(counts)) {
    if (n > bestN) { best = c; bestN = n }
  }
  return best || 'other'
}

/**
 * Elevated filter chip — white pill with category-coloured icon when
 * inactive, fully filled with the accent colour when active.
 * Lifts on hover, snaps on tap.
 */
function FilterChip({ active, onClick, icon, label, activeBg, activeFg, inactiveFg, title }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      whileHover={{
        y: -1,
        scale: 1.02,
        transition: { type: 'spring', stiffness: 420, damping: 22 },
      }}
      whileTap={{ scale: 0.96, y: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-0"
      style={{
        backgroundColor: active ? activeBg : '#ffffff',
        color: active ? activeFg : '#334155', // slate-700
        boxShadow: active
          ? `0 8px 20px -6px ${activeBg}80, 0 0 0 1px ${activeBg}`
          : '0 1px 2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.08)',
      }}
    >
      <motion.span
        key={active ? 'on' : 'off'}
        initial={{ scale: 0.55, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        className="material-symbols-outlined text-[18px] inline-flex"
        style={{
          color: active ? activeFg : inactiveFg,
          fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        {icon}
      </motion.span>
      {label}
    </motion.button>
  )
}

function TagPill({ tag, tagInfo, size = 'sm' }) {
  const style = TAG_STYLES[tag] || TAG_STYLE_FALLBACK
  const label = tagInfo?.label || tag
  const description = tagInfo?.description || ''
  const padding = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${padding}`}
      style={{ backgroundColor: style.bg, color: style.fg }}
      title={description}
    >
      <span className="material-symbols-outlined" style={{ fontSize: size === 'xs' ? 12 : 14 }}>
        {style.icon}
      </span>
      {label}
    </span>
  )
}

function RecipeCard({ meal, tagDefs }) {
  const [expanded, setExpanded] = useState(false)
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false)
  const heroCat = dominantCategory(meal)
  const heroInfo = getCategoryInfo(heroCat)

  const matchedSet = new Set(
    (meal.matched_ingredients || []).map((m) =>
      typeof m === 'string' ? m : m.name
    )
  )
  const allIngredients = (meal.ingredients || []).map((ing) => {
    const name = typeof ing === 'string' ? ing : ing.name
    const category = typeof ing === 'string' ? 'other' : ing.category
    return { name, category, inFridge: matchedSet.has(name) }
  })
  const missingIngredients = allIngredients.filter((i) => !i.inFridge)

  const steps = meal.steps || []
  const STEPS_PREVIEW = 4
  const showAllSteps = expanded || steps.length <= STEPS_PREVIEW
  const visibleSteps = showAllSteps ? steps : steps.slice(0, STEPS_PREVIEW)

  return (
    <motion.div
      whileHover={{ y: -3, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
      className="bg-surface-container-lowest rounded-[2rem] overflow-hidden editorial-shadow"
    >
      <div
        className="relative h-40 overflow-hidden flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${heroInfo.bg} 0%, ${heroInfo.bg} 55%, ${heroInfo.colour}33 100%)`,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 100, color: heroInfo.colour, opacity: 0.75 }}
        >
          {heroInfo.icon}
        </span>
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.1 }}
            className="bg-primary text-on-primary px-4 py-1.5 rounded-full font-bold text-xs tracking-wider uppercase shadow-md"
          >
            {Math.round(meal.match_score * 100)}% Match
          </motion.div>
          {(() => {
            const missing = meal.total_ingredients - meal.match_count
            if (missing === 0) {
              return (
                <div className="inline-flex items-center gap-1 bg-emerald-500 text-white px-3 py-1 rounded-full font-bold text-[10px] tracking-wider uppercase shadow-md">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                  No shopping
                </div>
              )
            }
            return (
              <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-3 py-1 rounded-full font-bold text-[10px] tracking-wider uppercase shadow-sm">
                <span className="material-symbols-outlined text-[12px]">shopping_basket</span>
                Need {missing} {missing === 1 ? 'item' : 'items'}
              </div>
            )
          })()}
        </div>
      </div>

      <div className="p-8">
        <h3 className="text-2xl font-headline font-bold text-on-surface mb-2">{meal.name}</h3>
        <div className="mb-4">
          <NutritionPopover recipe={meal}>
            <div className="flex items-center gap-3 text-on-surface-variant text-sm flex-wrap rounded-xl px-2 py-1.5 -mx-2 hover:bg-surface-container/60 transition-colors">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">local_fire_department</span>
                {meal.calories != null ? `${Math.round(meal.calories)} kcal` : 'N/A'}
              </span>
              {meal.minutes != null && meal.minutes > 0 && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {meal.minutes} min
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">kitchen</span>
                {meal.match_count}/{meal.total_ingredients} in fridge
              </span>
              <span className="material-symbols-outlined text-[14px] opacity-50 ml-auto">info</span>
            </div>
          </NutritionPopover>
        </div>

        {/* Tag chips */}
        {meal.tags && meal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {meal.tags.map((t) => (
              <TagPill key={t} tag={t} tagInfo={tagDefs[t]} size="xs" />
            ))}
          </div>
        )}

        {/* Missing-ingredients summary — the only useful delta when you already have a virtual fridge */}
        <div className="mb-6">
          {missingIngredients.length === 0 ? (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold">
              <span className="material-symbols-outlined text-base">check_circle</span>
              You have everything to make this
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm">
              <span className="material-symbols-outlined text-tertiary text-base mt-0.5">shopping_basket</span>
              <p className="leading-relaxed">
                <span className="font-bold text-on-surface">Still need:</span>{' '}
                <span className="text-on-surface-variant">
                  {missingIngredients.map((i) => i.name).join(', ')}
                </span>
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIngredientsExpanded((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
          >
            <span className="material-symbols-outlined text-sm">
              {ingredientsExpanded ? 'expand_less' : 'expand_more'}
            </span>
            {ingredientsExpanded ? 'Hide full ingredient list' : `View all ${allIngredients.length} ingredients`}
          </button>

          <AnimatePresence initial={false}>
            {ingredientsExpanded && (
              <motion.ul
                key="ing-list"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-1.5 mt-3 overflow-hidden"
              >
                {allIngredients.map((ing, i) => {
                  const info = getCategoryInfo(ing.category)
                  return (
                    <li key={`${ing.name}-${i}`} className="flex items-center gap-3 text-sm">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          ing.inFridge ? '' : 'border border-outline-variant/40'
                        }`}
                        style={ing.inFridge ? { backgroundColor: info.colour } : undefined}
                      >
                        {ing.inFridge && (
                          <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>check</span>
                        )}
                      </span>
                      <span
                        className={ing.inFridge ? 'text-on-surface' : 'text-on-surface-variant'}
                        style={{ fontWeight: ing.inFridge ? 500 : 400 }}
                      >
                        {ing.name}
                      </span>
                      <span
                        className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: info.bg, color: info.colour }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{info.icon}</span>
                        {info.label}
                      </span>
                    </li>
                  )
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Full step list (expandable) */}
        {steps.length > 0 && (
          <div>
            <p className="text-xs font-bold text-primary uppercase mb-3">Steps</p>
            <ol className="space-y-3">
              {visibleSteps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-sm text-on-surface leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
            {steps.length > STEPS_PREVIEW && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="mt-4 text-sm text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">
                  {expanded ? 'expand_less' : 'expand_more'}
                </span>
                {expanded
                  ? 'Show fewer steps'
                  : `Show all ${steps.length} steps`}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

const PER_PAGE = 20

export default function MealsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [availableItems, setAvailableItems] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [strictOnly, setStrictOnly] = useState(false)
  const [hideDrinks, setHideDrinks] = useState(false)
  const [selectedTags, setSelectedTags] = useState([])
  const [sortKey, setSortKey] = useState('match')
  const [page, setPage] = useState(1)

  // Metadata
  const [tagDefs, setTagDefs] = useState({})
  const [activePrefs, setActivePrefs] = useState([])
  const [prefLabels, setPrefLabels] = useState({})
  const [strictCount, setStrictCount] = useState(0)
  const [oneMissingCount, setOneMissingCount] = useState(0)

  // UI state
  const [fridgeExpanded, setFridgeExpanded] = useState(false)

  // Fetch tag definitions once
  useEffect(() => {
    apiFetch('/api/meals/tags')
      .then((d) => setTagDefs(d?.tags || {}))
      .catch(() => { /* ignore */ })
  }, [])

  const loadRecommendations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      try {
        const pref = await apiFetch('/api/profile/preferences')
        setPrefLabels(pref?.labels || {})
      } catch { /* ignore */ }

      const params = new URLSearchParams()
      if (strictOnly) params.set('strict_only', 'true')
      if (hideDrinks) params.set('hide_drinks', 'true')
      if (selectedTags.length) params.set('tags', selectedTags.join(','))
      if (sortKey && sortKey !== 'match') params.set('sort', sortKey)
      params.set('page', String(page))
      params.set('per_page', String(PER_PAGE))

      const data = await apiFetch(`/api/meals/recommendations?${params.toString()}`)
      setAvailableItems(data.available_items || [])
      setRecommendations(data.recommendations || [])
      setActivePrefs(data.active_preferences || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
      setStrictCount(data.strict_count || 0)
      setOneMissingCount(data.one_missing_count || 0)
      // Server may clamp page — sync state
      if (data.page && data.page !== page) {
        setPage(data.page)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strictOnly, hideDrinks, selectedTags, sortKey, page])

  useEffect(() => {
    loadRecommendations()
  }, [loadRecommendations])

  // When any filter changes, reset to page 1
  const handleToggleStrict = () => {
    setStrictOnly((v) => !v)
    setPage(1)
  }
  const handleToggleDrinks = () => {
    setHideDrinks((v) => !v)
    setPage(1)
  }
  const handleToggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
    setPage(1)
  }
  const clearTags = () => {
    setSelectedTags([])
    setPage(1)
  }

  const goPrev = () => setPage((p) => Math.max(1, p - 1))
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1))

  const filtersActive = strictOnly || hideDrinks || selectedTags.length > 0 || activePrefs.length > 0

  // Summary of fridge contents — shown as a one-line preview when collapsed.
  const fridgeSummary = useMemo(() => {
    if (!availableItems.length) return null
    const counts = availableItems.reduce((acc, item) => {
      const cat = typeof item === 'string' ? 'other' : item.category || 'other'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
    const top = Object.entries(counts)
      .filter(([c]) => c !== 'other')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([c]) => getCategoryInfo(c).label.toLowerCase())
    return { count: availableItems.length, top }
  }, [availableItems])

  return (
    <div className="px-6 md:px-12">
      <header className="max-w-5xl mx-auto mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight mb-4">
            Smart meals <span className="text-primary">from your fridge</span>
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed">
            Recipes matched to what&apos;s already in your fridge, filtered by your dietary preferences.
          </p>
        </div>
        <NutritionLegend recipeTagDefs={tagDefs} />
      </header>

      {error && (
        <div className="max-w-5xl mx-auto mb-8 p-4 rounded-2xl bg-error-container/30 text-error text-sm font-medium">
          Could not load recommendations: {error}
        </div>
      )}

      {/* Filter & sort bar — lightweight, two clearly separated groups */}
      <section className="max-w-5xl mx-auto mb-5 space-y-4">

        {/* Group 1 — Show (global modes) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold shrink-0">
            Show
          </span>
          <FilterChip
            active={strictOnly}
            onClick={handleToggleStrict}
            icon="check_circle"
            label="Cook without shopping"
            activeBg="#059669"
            activeFg="#ffffff"
            inactiveFg="#047857"
            title={strictOnly
              ? 'Showing only recipes where every ingredient is already in your fridge.'
              : 'Only show recipes you can cook right now without buying anything.'}
          />
          <FilterChip
            active={hideDrinks}
            onClick={handleToggleDrinks}
            icon="local_bar"
            label="Hide drinks"
            activeBg="#6366f1"
            activeFg="#ffffff"
            inactiveFg="#4f46e5"
            title={hideDrinks ? 'Drinks are hidden. Click to show them.' : 'Hide beverage-only recipes.'}
          />

          <div className="ml-auto">
            <SortDropdown
              value={sortKey}
              options={SORT_OPTIONS}
              onChange={(v) => {
                setSortKey(v)
                setPage(1)
              }}
              label="Sort"
            />
          </div>
        </div>

        {/* Group 2 — Recipe type tag filters (drink tag hidden; Hide-drinks covers it) */}
        {Object.keys(tagDefs).length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold shrink-0">
              Recipe type
            </span>
            {Object.entries(tagDefs)
              .filter(([tag]) => tag !== 'drink')
              .map(([tag, info]) => {
                const active = selectedTags.includes(tag)
                const style = TAG_STYLES[tag] || TAG_STYLE_FALLBACK
                return (
                  <FilterChip
                    key={tag}
                    active={active}
                    onClick={() => handleToggleTag(tag)}
                    icon={style.icon}
                    label={info.label}
                    activeBg={style.fg}
                    activeFg="#ffffff"
                    inactiveFg={style.fg}
                    title={info.description}
                  />
                )
              })}

            {(selectedTags.length > 0 || strictOnly || hideDrinks) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTags([])
                  setStrictOnly(false)
                  setHideDrinks(false)
                  setPage(1)
                }}
                className="ml-1 text-xs font-semibold text-on-surface-variant hover:text-primary underline underline-offset-4"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Active-sort indicator (only when non-default) */}
        <AnimatePresence>
          {sortKey !== 'match' && (
            <motion.div
              key="sort-indicator"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="flex"
            >
              <button
                type="button"
                onClick={() => {
                  setSortKey('match')
                  setPage(1)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
                title="Reset to Best match"
              >
                <span className="material-symbols-outlined text-sm">sort</span>
                Sorted by {SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? sortKey}
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Meta line — fridge summary · diet · results count */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-surface-variant">
          {availableItems.length > 0 ? (
            <button
              type="button"
              onClick={() => setFridgeExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-base">kitchen</span>
              <span className="font-bold text-on-surface">{fridgeSummary?.count} ingredients</span>
              {fridgeSummary?.top?.length > 0 && (
                <span className="hidden sm:inline">· {fridgeSummary.top.join(', ')}</span>
              )}
              <motion.span
                animate={{ rotate: fridgeExpanded ? 180 : 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="material-symbols-outlined text-sm"
              >
                expand_more
              </motion.span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">kitchen</span>
              No fridge items yet ·{' '}
              <Link to="/upload-receipt" className="text-primary font-semibold hover:underline">
                Upload a receipt
              </Link>
            </span>
          )}

          {activePrefs.length > 0 && (
            <>
              <span aria-hidden="true" className="hidden md:block h-4 w-px bg-outline-variant/40" />
              <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
                <span className="uppercase tracking-widest font-bold">Diet:</span>
                {activePrefs.map((pref) => (
                  <span
                    key={pref}
                    className="px-2 py-0.5 rounded-full bg-tertiary-container/40 text-on-tertiary-container font-semibold"
                  >
                    {prefLabels[pref] || pref}
                  </span>
                ))}
                <Link to="/profile" className="text-primary font-semibold hover:underline ml-1">
                  Edit
                </Link>
              </span>
            </>
          )}

          <div className="ml-auto text-xs">
            {loading
              ? 'Finding recipes…'
              : total === 0
                ? 'No matching recipes'
                : `${total} ${total === 1 ? 'recipe' : 'recipes'} · showing ${Math.min((page - 1) * PER_PAGE + 1, total)}–${Math.min(page * PER_PAGE, total)}`}
          </div>
        </div>

        {/* Expanded fridge panel */}
        <AnimatePresence initial={false}>
          {fridgeExpanded && availableItems.length > 0 && (
            <motion.div
              key="fridge-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-surface-container-low/60 p-4">
                <div className="flex flex-wrap gap-2">
                  {availableItems.map((item) => {
                    const name = typeof item === 'string' ? item : item.name
                    const cat = typeof item === 'string' ? 'other' : item.category
                    const info = getCategoryInfo(cat)
                    return (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-sm"
                        style={{ backgroundColor: info.bg, color: info.colour }}
                        title={`${info.label} — ${info.description}`}
                      >
                        <span className="material-symbols-outlined text-sm">{info.icon}</span>
                        {name}
                      </span>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <p className="text-on-surface-variant animate-pulse text-lg">Finding recipes from your fridge...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="max-w-5xl mx-auto">

            {recommendations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-4">restaurant_menu</span>
                <p className="text-on-surface-variant max-w-md">
                  {strictOnly
                    ? "No recipes can be made using only what's in your fridge right now."
                    : filtersActive
                      ? 'No recipes match your current filters.'
                      : 'No recommendations yet. Upload a receipt so we have ingredients to match.'}
                </p>
                {filtersActive && (
                  <div className="flex gap-3 mt-4 flex-wrap justify-center">
                    {strictOnly && (
                      <button
                        type="button"
                        onClick={handleToggleStrict}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Allow shopping
                      </button>
                    )}
                    {hideDrinks && (
                      <button
                        type="button"
                        onClick={handleToggleDrinks}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Show drinks
                      </button>
                    )}
                    {selectedTags.length > 0 && (
                      <button
                        type="button"
                        onClick={clearTags}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Clear tag filters
                      </button>
                    )}
                    {activePrefs.length > 0 && (
                      <Link to="/profile" className="text-xs text-primary font-semibold hover:underline">
                        Edit preferences
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {recommendations.map((meal) => (
                <RecipeCard key={meal.id} meal={meal} tagDefs={tagDefs} />
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-container-highest disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                  Previous
                </button>

                <span className="text-sm font-bold text-on-surface-variant">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                >
                  Next
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
