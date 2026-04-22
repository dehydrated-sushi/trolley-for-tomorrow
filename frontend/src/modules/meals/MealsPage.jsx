import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import CategoryTag from '../../shared/CategoryTag'
import NutritionLegend from '../../shared/NutritionLegend'
import { getCategoryInfo } from '../../shared/nutrition'

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

/** Pill colour for each tag — distinct from the nutritional colours. */
const TAG_STYLES = {
  drink:        { bg: '#e0e7ff', fg: '#6366f1', icon: 'local_bar' },         // indigo
  high_protein: { bg: '#ccfbf1', fg: '#14b8a6', icon: 'fitness_center' },    // teal
  low_carb:     { bg: '#fef3c7', fg: '#b45309', icon: 'grain' },             // amber (strike-through visually implied)
  light:        { bg: '#ecfdf5', fg: '#059669', icon: 'air' },               // light green
  hearty:       { bg: '#fee2e2', fg: '#b91c1c', icon: 'restaurant' },        // red
  quick:        { bg: '#dbeafe', fg: '#2563eb', icon: 'bolt' },              // blue
  sweet:        { bg: '#fce7f3', fg: '#ec4899', icon: 'cake' },              // pink
  simple:       { bg: '#f3f4f6', fg: '#374151', icon: 'looks_one' },         // neutral
}

function TagPill({ tag, tagInfo, size = 'sm' }) {
  const style = TAG_STYLES[tag] || { bg: '#f3f4f6', fg: '#6b7280', icon: 'label' }
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

  const steps = meal.steps || []
  const STEPS_PREVIEW = 4
  const showAllSteps = expanded || steps.length <= STEPS_PREVIEW
  const visibleSteps = showAllSteps ? steps : steps.slice(0, STEPS_PREVIEW)

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] overflow-hidden editorial-shadow transition-transform hover:-translate-y-1">
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
        <div className="absolute top-4 right-4 bg-primary text-on-primary px-4 py-1.5 rounded-full font-bold text-xs tracking-wider uppercase">
          {Math.round(meal.match_score * 100)}% Match
        </div>
      </div>

      <div className="p-8">
        <h3 className="text-2xl font-headline font-bold text-on-surface mb-2">{meal.name}</h3>
        <div className="flex items-center gap-3 text-on-surface-variant text-sm flex-wrap mb-4">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">local_fire_department</span>
            {meal.calories ? `${Math.round(meal.calories)} kcal` : 'N/A'}
          </span>
          {meal.minutes != null && meal.minutes > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              {meal.minutes} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">egg</span>
            {meal.match_count}/{meal.total_ingredients} in fridge
          </span>
        </div>

        {/* Tag chips */}
        {meal.tags && meal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {meal.tags.map((t) => (
              <TagPill key={t} tag={t} tagInfo={tagDefs[t]} size="xs" />
            ))}
          </div>
        )}

        {/* Category summary */}
        {allIngredients.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold text-on-surface-variant uppercase mb-2">Recipe by category</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(
                allIngredients.reduce((acc, ing) => {
                  acc[ing.category] = (acc[ing.category] || 0) + 1
                  return acc
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <span key={cat} className="inline-flex items-center gap-1">
                    <CategoryTag category={cat} size="xs" />
                    <span className="text-xs text-on-surface-variant">×{count}</span>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Full ingredient list with fridge status */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-primary uppercase">Ingredients</p>
            <p className="text-xs text-on-surface-variant">
              <span className="text-primary font-semibold">{meal.match_count} have</span>
              {' · '}
              <span className="text-tertiary font-semibold">
                {meal.total_ingredients - meal.match_count} missing
              </span>
            </p>
          </div>
          <ul className="space-y-1.5">
            {allIngredients.map((ing, i) => {
              const info = getCategoryInfo(ing.category)
              return (
                <li
                  key={`${ing.name}-${i}`}
                  className="flex items-center gap-3 text-sm"
                >
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
          </ul>
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
    </div>
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
  const [page, setPage] = useState(1)

  // Metadata
  const [tagDefs, setTagDefs] = useState({})
  const [activePrefs, setActivePrefs] = useState([])
  const [prefLabels, setPrefLabels] = useState({})

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
      params.set('page', String(page))
      params.set('per_page', String(PER_PAGE))

      const data = await apiFetch(`/api/meals/recommendations?${params.toString()}`)
      setAvailableItems(data.available_items || [])
      setRecommendations(data.recommendations || [])
      setActivePrefs(data.active_preferences || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
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
  }, [strictOnly, hideDrinks, selectedTags, page])

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

  return (
    <div className="px-6 md:px-12">
      <header className="max-w-5xl mx-auto mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight mb-4">
            What&apos;s Cooking, <span className="text-primary">Friend?</span>
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed">
            Recipes matched to what&apos;s already in your fridge, filtered by your dietary preferences.
          </p>
        </div>
        <NutritionLegend />
      </header>

      {/* Cook Now / Hide drinks / Diet badges */}
      <section className="max-w-5xl mx-auto mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleToggleStrict}
          className={
            strictOnly
              ? 'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-sm shadow-md'
              : 'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-container-highest transition-colors'
          }
          title={strictOnly
            ? 'Showing only recipes where every ingredient is already in your fridge.'
            : 'Click to show only recipes you can cook right now without shopping.'}
        >
          <span className="material-symbols-outlined text-base">
            {strictOnly ? 'check_circle' : 'shopping_basket'}
          </span>
          {strictOnly ? 'Cook Now (strict)' : 'Cook Now'}
        </button>

        <button
          type="button"
          onClick={handleToggleDrinks}
          className={
            hideDrinks
              ? 'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-tertiary text-white font-semibold text-sm shadow-md'
              : 'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-container-highest transition-colors'
          }
          title={hideDrinks ? 'Drinks are hidden. Click to show them.' : 'Hide drink recipes from the list.'}
        >
          <span className="material-symbols-outlined text-base">
            {hideDrinks ? 'visibility_off' : 'local_bar'}
          </span>
          {hideDrinks ? 'Drinks hidden' : 'Hide drinks'}
        </button>

        {activePrefs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 ml-2">
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Diet:</span>
            {activePrefs.map((pref) => (
              <span
                key={pref}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-tertiary-container/30 text-on-tertiary-container text-xs font-semibold"
              >
                <span className="material-symbols-outlined text-xs">restaurant</span>
                {prefLabels[pref] || pref}
              </span>
            ))}
            <Link to="/profile" className="text-xs text-primary font-semibold hover:underline ml-1">
              Edit
            </Link>
          </div>
        )}
      </section>

      {/* Tag filter chip row */}
      {Object.keys(tagDefs).length > 0 && (
        <section className="max-w-5xl mx-auto mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mr-2">Filter by:</span>
            {Object.entries(tagDefs).map(([tag, info]) => {
              const active = selectedTags.includes(tag)
              const style = TAG_STYLES[tag] || { bg: '#f3f4f6', fg: '#6b7280', icon: 'label' }
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={
                    active
                      ? 'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm transition-transform scale-[1.02]'
                      : 'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold opacity-70 hover:opacity-100 transition-opacity'
                  }
                  style={{
                    backgroundColor: active ? style.fg : style.bg,
                    color: active ? 'white' : style.fg,
                    borderColor: style.fg,
                  }}
                  title={info.description}
                >
                  <span className="material-symbols-outlined text-sm">{style.icon}</span>
                  {info.label}
                </button>
              )
            })}
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={clearTags}
                className="ml-2 text-xs text-on-surface-variant hover:text-primary underline underline-offset-4"
              >
                Clear ({selectedTags.length})
              </button>
            )}
          </div>
        </section>
      )}

      {error && (
        <div className="max-w-5xl mx-auto mb-8 p-4 rounded-2xl bg-error-container/30 text-error text-sm font-medium">
          Could not load recommendations: {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <p className="text-on-surface-variant animate-pulse text-lg">Finding recipes from your fridge...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="max-w-5xl mx-auto mb-12">
            <div className="bg-surface-container-low rounded-3xl p-8 editorial-shadow">
              <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                Your fridge ingredients
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableItems.length > 0 ? (
                  availableItems.map((item) => {
                    const name = typeof item === 'string' ? item : item.name
                    const cat = typeof item === 'string' ? 'other' : item.category
                    const info = getCategoryInfo(cat)
                    return (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-sm"
                        style={{ backgroundColor: info.bg, color: info.colour }}
                        title={`${info.label} — ${info.description}`}
                      >
                        <span className="material-symbols-outlined text-sm">{info.icon}</span>
                        {name}
                      </span>
                    )
                  })
                ) : (
                  <p className="text-on-surface-variant text-sm">
                    No fridge items found.{' '}
                    <Link to="/upload-receipt" className="text-primary font-bold hover:underline">Upload a receipt</Link> first.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="max-w-5xl mx-auto">
            <div className="flex justify-between items-end mb-6 gap-4 flex-wrap">
              <h2 className="text-2xl font-headline font-bold text-on-surface">Ranked Recommendations</h2>
              <span className="text-sm text-on-surface-variant">
                {total === 0
                  ? 'No recipes found'
                  : `Showing ${Math.min((page - 1) * PER_PAGE + 1, total)}–${Math.min(page * PER_PAGE, total)} of ${total}`}
              </span>
            </div>

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
                        Turn off Cook Now
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
