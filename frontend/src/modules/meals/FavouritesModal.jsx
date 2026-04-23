import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { API_BASE } from '../../lib/api'
import { TAG_STYLES, TAG_STYLE_FALLBACK } from '../../shared/recipeTags'
import SortDropdown from './SortDropdown'

const EASE = [0.22, 1, 0.36, 1]

const SORT_OPTIONS = [
  { key: 'recent',           label: 'Recently starred' },
  { key: 'highest_protein',  label: 'Highest protein' },
  { key: 'lowest_calories',  label: 'Lowest calories' },
  { key: 'highest_calories', label: 'Highest calories' },
]

// Drink keyword heuristic — the backend's real 'drink' tag relies on the
// ingredient classifier's dominant-category check, which isn't in the
// favourites payload. Name-based fallback catches the obvious cases
// (smoothie, juice, tea, cocktail) which is all the Hide-drinks toggle
// needs to be useful.
const _DRINK_NAME_RE = /\b(smoothie|juice|tea|coffee|latte|cocktail|mocktail|margarita|mojito|lemonade|punch|shake|milkshake|espresso|cider|sangria)\b/i

/**
 * Derive the same tag set the backend would attach to a recipe on the
 * recommendations endpoint, using only fields present in the favourites
 * payload. See meal_plan.routes::_compute_tags for the source of truth —
 * thresholds here mirror those exactly.
 */
function deriveTags(recipe) {
  const tags = []
  if (recipe.protein != null && recipe.protein >= 25) tags.push('high_protein')
  if (recipe.carbohydrates != null && recipe.carbohydrates < 20) tags.push('low_carb')
  if (recipe.calories != null) {
    if (recipe.calories < 300) tags.push('light')
    else if (recipe.calories >= 600) tags.push('hearty')
  }
  if (recipe.minutes != null && recipe.minutes > 0 && recipe.minutes <= 15) tags.push('quick')
  if (recipe.sugar != null && recipe.sugar > 25) tags.push('sweet')
  if (recipe.n_ingredients != null && recipe.n_ingredients > 0 && recipe.n_ingredients <= 5) {
    tags.push('simple')
  }
  if (_DRINK_NAME_RE.test(recipe.name || '')) tags.push('drink')
  return tags
}

function FavHeroThumb({ recipeId }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary-container/40 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          restaurant
        </span>
      </div>
    )
  }
  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-surface-container-high animate-pulse" />
      )}
      <img
        src={`${API_BASE}/api/meals/recipe-image/${recipeId}`}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  )
}

function TagPillMini({ tag, tagDefs }) {
  const style = TAG_STYLES[tag] || TAG_STYLE_FALLBACK
  const label = tagDefs[tag]?.label || tag
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: style.bg, color: style.fg }}
      title={tagDefs[tag]?.description || ''}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>
        {style.icon}
      </span>
      {label}
    </span>
  )
}

/**
 * Favourites modal — scrollable list of starred recipes with the same
 * sort/filter grammar as the Meals page.
 *
 * Filters / sort run client-side against the `favourites` array the parent
 * already holds. The modal never calls the backend on its own — it just
 * presents a filtered view of what MealsPage already fetched.
 *
 * Click a row to close the modal and deep-link to that card on the Meals
 * page (reuses the existing `?highlight=<id>` mechanism so the user lands
 * with an emerald pulse framing their starred recipe).
 */
export default function FavouritesModal({
  open,
  onClose,
  favourites,
  favouriteIds,
  onToggleFavourite,
  tagDefs,
}) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState('recent')
  const [selectedTags, setSelectedTags] = useState([])
  const [hideDrinks, setHideDrinks] = useState(false)
  // When non-null, the modal renders a recipe detail view instead of the
  // list. Back button clears it. The detail view is fed entirely from the
  // favourites payload — no extra network call needed.
  const [detailRecipe, setDetailRecipe] = useState(null)

  // Escape closes the detail view first (if open), then the modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (detailRecipe) setDetailRecipe(null)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, detailRecipe])

  // Reset the detail view when the modal is closed so reopening always
  // lands back on the list.
  useEffect(() => {
    if (!open) setDetailRecipe(null)
  }, [open])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const toggleTag = useCallback((t) => {
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    )
  }, [])

  const clearFilters = () => {
    setSelectedTags([])
    setHideDrinks(false)
  }

  // Decorate each favourite with its derived tags once per render; the list
  // is already small (dozens at most), so client-side work is cheap.
  const decorated = useMemo(() => {
    return (favourites || [])
      .filter((r) => favouriteIds.has(r.id)) // drop un-starred on the fly
      .map((r) => ({ ...r, _tags: deriveTags(r) }))
  }, [favourites, favouriteIds])

  const filtered = useMemo(() => {
    let list = decorated
    if (hideDrinks) list = list.filter((r) => !r._tags.includes('drink'))
    if (selectedTags.length) {
      // AND semantics — same as Meals page (recipe must have every selected tag)
      list = list.filter((r) => selectedTags.every((t) => r._tags.includes(t)))
    }
    const arr = list.slice()
    switch (sortKey) {
      case 'highest_protein':
        arr.sort((a, b) => (b.protein ?? -1) - (a.protein ?? -1))
        break
      case 'lowest_calories':
        arr.sort((a, b) => (a.calories ?? Infinity) - (b.calories ?? Infinity))
        break
      case 'highest_calories':
        arr.sort((a, b) => (b.calories ?? -1) - (a.calories ?? -1))
        break
      case 'recent':
      default:
        // `favourited_at` is already the server-side order, but re-sort
        // explicitly so the UI is defensive against shuffled input.
        arr.sort((a, b) => {
          const ta = a.favourited_at ? Date.parse(a.favourited_at) : 0
          const tb = b.favourited_at ? Date.parse(b.favourited_at) : 0
          return tb - ta
        })
    }
    return arr
  }, [decorated, hideDrinks, selectedTags, sortKey])

  const handleOpenRecipe = (recipe) => {
    setDetailRecipe(recipe)
  }

  // Secondary action on the detail view — for when the user wants to see
  // the recipe in the full Meals-page context (adjacent to the filter bar,
  // other recipes, etc.). Closes the modal and defers nav so the exit
  // animation plays.
  const handleJumpToMeals = (recipe) => {
    onClose()
    setTimeout(() => {
      navigate(`/meals?highlight=${recipe.id}`)
    }, 120)
  }

  const filtersActive = selectedTags.length > 0 || hideDrinks

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[88vh] bg-surface-container-lowest rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
            {detailRecipe ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="flex-1 min-h-0 flex flex-col"
              >
                <DetailView
                  recipe={detailRecipe}
                  tagDefs={tagDefs}
                  isFavourited={favouriteIds.has(detailRecipe.id)}
                  onToggleFavourite={() => onToggleFavourite(detailRecipe.id)}
                  onBack={() => setDetailRecipe(null)}
                  onClose={onClose}
                  onJumpToMeals={() => handleJumpToMeals(detailRecipe)}
                />
              </motion.div>
            ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="flex-1 min-h-0 flex flex-col"
            >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-6 md:px-8 pt-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-extrabold text-on-surface tracking-tight">
                    Your favourites
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    {filtered.length === decorated.length
                      ? `${decorated.length} starred recipe${decorated.length !== 1 ? 's' : ''}`
                      : `${filtered.length} of ${decorated.length}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Close favourites"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Filter & sort bar — condensed version of the Meals page bar */}
            {decorated.length > 0 && (
              <div className="px-6 md:px-8 py-4 border-b border-outline-variant/15 space-y-3 flex-shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHideDrinks((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                      hideDrinks
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-white text-on-surface border-outline-variant/40 hover:border-indigo-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: hideDrinks ? "'FILL' 1" : "'FILL' 0" }}>
                      local_bar
                    </span>
                    Hide drinks
                  </button>

                  {Object.entries(tagDefs || {})
                    .filter(([tag]) => tag !== 'drink')
                    .map(([tag, info]) => {
                      const active = selectedTags.includes(tag)
                      const style = TAG_STYLES[tag] || TAG_STYLE_FALLBACK
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          title={info.description}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border"
                          style={{
                            backgroundColor: active ? style.fg : '#ffffff',
                            color: active ? '#ffffff' : '#334155',
                            borderColor: active ? style.fg : 'rgba(30, 41, 59, 0.15)',
                          }}
                        >
                          <span
                            className="material-symbols-outlined text-sm"
                            style={{
                              color: active ? '#ffffff' : style.fg,
                              fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                            }}
                          >
                            {style.icon}
                          </span>
                          {info.label}
                        </button>
                      )
                    })}

                  {filtersActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="ml-1 text-[11px] font-semibold text-on-surface-variant hover:text-primary underline underline-offset-4"
                    >
                      Clear
                    </button>
                  )}

                  <div className="ml-auto">
                    <SortDropdown
                      value={sortKey}
                      options={SORT_OPTIONS}
                      onChange={setSortKey}
                      label="Sort"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4">
              {decorated.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant">star_border</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface mb-1">No favourites yet</h3>
                  <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                    Tap the ★ on any recipe to save it here for quick access.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <p className="text-sm text-on-surface-variant mb-3">
                    No favourites match these filters.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-semibold text-primary hover:underline underline-offset-4"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <motion.ul
                  className="space-y-2"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
                  }}
                >
                  <AnimatePresence initial={false}>
                    {filtered.map((recipe) => (
                      <motion.li
                        key={recipe.id}
                        layout
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
                        }}
                        exit={{ opacity: 0, x: -10, transition: { duration: 0.2 } }}
                        className="relative group bg-white rounded-2xl border border-outline-variant/15 overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-stretch">
                          {/* Thumb */}
                          <button
                            type="button"
                            onClick={() => handleOpenRecipe(recipe)}
                            className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden"
                            aria-label={`Open ${recipe.name}`}
                          >
                            <FavHeroThumb recipeId={recipe.id} />
                          </button>

                          {/* Main */}
                          <button
                            type="button"
                            onClick={() => handleOpenRecipe(recipe)}
                            className="flex-1 min-w-0 text-left px-4 py-3 flex flex-col justify-center"
                          >
                            <h3 className="font-bold text-on-surface text-sm md:text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                              {recipe.name}
                            </h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
                              {recipe.calories != null && (
                                <span className="inline-flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
                                  {Math.round(recipe.calories)} kcal
                                </span>
                              )}
                              {recipe.protein != null && (
                                <span className="inline-flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[13px]">fitness_center</span>
                                  {Math.round(recipe.protein)}% DV protein
                                </span>
                              )}
                              {recipe.minutes != null && recipe.minutes > 0 && (
                                <span className="inline-flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                                  {recipe.minutes} min
                                </span>
                              )}
                            </div>
                            {recipe._tags.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {recipe._tags.slice(0, 4).map((t) => (
                                  <TagPillMini key={t} tag={t} tagDefs={tagDefs || {}} />
                                ))}
                              </div>
                            )}
                          </button>

                          {/* Actions */}
                          <div className="flex items-center pr-3 md:pr-4 gap-1 flex-shrink-0">
                            <motion.button
                              type="button"
                              onClick={() => onToggleFavourite(recipe.id)}
                              whileTap={{ scale: 0.85 }}
                              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-amber-50 transition-colors"
                              title="Remove from favourites"
                              aria-label={`Remove ${recipe.name} from favourites`}
                            >
                              <span
                                className="material-symbols-outlined text-xl text-amber-500"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                            </motion.button>
                            <button
                              type="button"
                              onClick={() => handleOpenRecipe(recipe)}
                              className="w-9 h-9 rounded-full hidden md:flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                              title="View recipe"
                              aria-label={`View ${recipe.name}`}
                            >
                              <span className="material-symbols-outlined text-xl">chevron_right</span>
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </div>
            </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// DetailView
// ============================================================================
//
// Full recipe detail rendered inside the favourites modal. Fed entirely
// from the favourites payload (ingredients + steps split, nutrition
// columns) — no extra network call. Shows a hero image, meta row,
// ingredient list, step-by-step instructions, and nutrition breakdown.
//
// Separate from the Meals-page RecipeCard because this modal version
// deliberately doesn't show match scores or fridge overlap — those
// belong on the Meals recommendations surface, not on a "here's the
// recipe you bookmarked" view.

function DetailHero({ recipeId }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative w-full h-48 md:h-56 bg-gradient-to-br from-primary/15 to-primary-container/30 overflow-hidden flex-shrink-0">
      {!failed && (
        <img
          src={`${API_BASE}/api/meals/recipe-image/${recipeId}`}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-400 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/10" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-primary/50" style={{ fontVariationSettings: "'FILL' 1" }}>
            restaurant
          </span>
        </div>
      )}
    </div>
  )
}

function DetailView({ recipe, tagDefs, isFavourited, onToggleFavourite, onBack, onClose, onJumpToMeals }) {
  const ingredients = recipe.ingredients || []
  const steps = recipe.steps || []
  const derived = useMemo(() => deriveTags(recipe), [recipe])

  const nutritionRows = [
    { key: 'calories',      label: 'Calories',      value: recipe.calories,      unit: 'kcal', isDv: false },
    { key: 'protein',       label: 'Protein',       value: recipe.protein,       unit: '% DV', isDv: true },
    { key: 'carbohydrates', label: 'Carbs',         value: recipe.carbohydrates, unit: '% DV', isDv: true },
    { key: 'total_fat',     label: 'Total fat',     value: recipe.total_fat,     unit: '% DV', isDv: true },
    { key: 'saturated_fat', label: 'Saturated fat', value: recipe.saturated_fat, unit: '% DV', isDv: true },
    { key: 'sugar',         label: 'Sugar',         value: recipe.sugar,         unit: '% DV', isDv: true },
    { key: 'sodium',        label: 'Sodium',        value: recipe.sodium,        unit: '% DV', isDv: true },
  ]

  return (
    <>
      {/* Sticky header with back + close */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 pt-4 pb-3 border-b border-outline-variant/15 flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Back to favourites list"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Favourites
        </button>
        <div className="flex items-center gap-1">
          <motion.button
            type="button"
            onClick={onToggleFavourite}
            whileTap={{ scale: 0.85 }}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-amber-50 transition-colors"
            title={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
            aria-pressed={isFavourited}
          >
            <span
              className="material-symbols-outlined text-xl text-amber-500"
              style={{ fontVariationSettings: isFavourited ? "'FILL' 1" : "'FILL' 0" }}
            >
              star
            </span>
          </motion.button>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <DetailHero recipeId={recipe.id} />

        {/* Title + meta */}
        <div className="px-6 md:px-8 pt-5 pb-4">
          <h2 className="text-2xl md:text-3xl font-extrabold font-headline text-on-surface tracking-tight leading-tight">
            {recipe.name}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-on-surface-variant">
            {recipe.minutes != null && recipe.minutes > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-base">schedule</span>
                {recipe.minutes} min
              </span>
            )}
            {recipe.n_ingredients != null && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-base">inventory_2</span>
                {recipe.n_ingredients} ingredient{recipe.n_ingredients !== 1 ? 's' : ''}
              </span>
            )}
            {recipe.calories != null && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-base">local_fire_department</span>
                {Math.round(recipe.calories)} kcal
              </span>
            )}
          </div>
          {derived.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {derived.map((t) => (
                <TagPillMini key={t} tag={t} tagDefs={tagDefs || {}} />
              ))}
            </div>
          )}
        </div>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <section className="px-6 md:px-8 pb-5">
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant font-bold mb-3">
              Ingredients
            </h3>
            <motion.ul
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.02, delayChildren: 0.05 } },
              }}
            >
              {ingredients.map((ing, i) => {
                const name = typeof ing === 'string' ? ing : ing.name
                return (
                  <motion.li
                    key={`${name}-${i}`}
                    variants={{
                      hidden: { opacity: 0, x: -6 },
                      show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE } },
                    }}
                    className="flex items-start gap-2 text-sm text-on-surface"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-[7px] flex-shrink-0" />
                    <span>{name}</span>
                  </motion.li>
                )
              })}
            </motion.ul>
          </section>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <section className="px-6 md:px-8 pb-5">
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant font-bold mb-3">
              Steps
            </h3>
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.03, duration: 0.25, ease: EASE }}
                  className="flex gap-3 items-start"
                >
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-on-surface leading-relaxed">{step}</p>
                </motion.li>
              ))}
            </ol>
          </section>
        )}

        {/* Nutrition */}
        <section className="px-6 md:px-8 pb-6">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant font-bold mb-3">
            Nutrition per serving
          </h3>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {nutritionRows.filter((r) => r.value != null).map((r) => (
              <div
                key={r.key}
                className="rounded-xl bg-surface-container-low p-3"
              >
                <dt className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  {r.label}
                </dt>
                <dd className="text-lg font-bold text-on-surface mt-0.5">
                  {r.isDv ? Math.round(r.value) : Math.round(r.value)}
                  <span className="text-xs text-on-surface-variant font-medium ml-1">
                    {r.unit}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* Sticky footer — secondary action to jump to the Meals page */}
      <div className="flex items-center justify-end gap-2 px-4 md:px-6 py-3 border-t border-outline-variant/15 bg-surface-container-lowest flex-shrink-0">
        <button
          type="button"
          onClick={onJumpToMeals}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high text-on-surface text-sm font-semibold hover:bg-surface-container-highest transition-colors"
        >
          Open on Meals page
          <span className="material-symbols-outlined text-base">arrow_outward</span>
        </button>
      </div>
    </>
  )
}
