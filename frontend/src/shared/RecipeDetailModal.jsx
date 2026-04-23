import { useEffect, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { API_BASE, apiFetch } from '../lib/api'
import { TAG_STYLES, TAG_STYLE_FALLBACK } from './recipeTags'

const EASE = [0.22, 1, 0.36, 1]

// Name-regex drink detector — same fallback the Favourites modal uses when
// the payload doesn't include the ingredient classifier output.
const _DRINK_NAME_RE = /\b(smoothie|juice|tea|coffee|latte|cocktail|mocktail|margarita|mojito|lemonade|punch|shake|milkshake|espresso|cider|sangria)\b/i

// Mirror of meal_plan.routes._compute_tags — thresholds must match the
// backend or the tag pills on this modal will disagree with the Meals page.
function deriveTags(recipe) {
  if (!recipe) return []
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

/**
 * Standalone recipe detail modal.
 *
 * Opened from TopNav search — fetches `GET /api/meals/recipe/:id` on open
 * and renders a full detail view (hero, meta, ingredients grid, steps,
 * nutrition grid). Mirrors the structure of the Favourites modal's
 * in-context DetailView but lives on its own shell so it can be opened
 * from anywhere in the app.
 *
 * The Favourites modal keeps its inline DetailView (no refactor needed
 * there). The slight duplication is deliberate: merging them into a
 * single prop-configurable component would drag header/back-button
 * variance into one place and make both harder to reason about.
 */
export default function RecipeDetailModal({ open, recipeId, onClose, tagDefs: tagDefsProp }) {
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tagDefs, setTagDefs] = useState(tagDefsProp || {})

  // Fetch tag defs once for the pill labels. If the parent passed them in,
  // skip the round-trip; otherwise grab them (cached by the browser after
  // the first call since the Meals page hits the same endpoint on mount).
  useEffect(() => {
    if (tagDefsProp) { setTagDefs(tagDefsProp); return }
    if (!open) return
    apiFetch('/api/meals/tags')
      .then((d) => setTagDefs(d?.tags || {}))
      .catch(() => { /* pills fall back to raw tag keys */ })
  }, [open, tagDefsProp])

  // Fetch the recipe whenever we open with a new id.
  useEffect(() => {
    if (!open || !recipeId) return
    let cancelled = false
    setLoading(true)
    setError('')
    setRecipe(null)
    apiFetch(`/api/meals/recipe/${recipeId}`)
      .then((d) => {
        if (cancelled) return
        setRecipe(d?.recipe || null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Could not load recipe')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, recipeId])

  // Escape closes; body scroll locks while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const handleJumpToMeals = useCallback(() => {
    if (!recipe) return
    onClose()
    // Let the modal exit animation start before the navigation.
    setTimeout(() => navigate(`/meals?highlight=${recipe.id}`), 120)
  }, [navigate, onClose, recipe])

  const derived = useMemo(() => deriveTags(recipe), [recipe])
  const ingredients = recipe?.ingredients || []
  const steps = recipe?.steps || []

  const nutritionRows = recipe ? [
    { key: 'calories',      label: 'Calories',      value: recipe.calories,      unit: 'kcal' },
    { key: 'protein',       label: 'Protein',       value: recipe.protein,       unit: '% DV' },
    { key: 'carbohydrates', label: 'Carbs',         value: recipe.carbohydrates, unit: '% DV' },
    { key: 'total_fat',     label: 'Total fat',     value: recipe.total_fat,     unit: '% DV' },
    { key: 'saturated_fat', label: 'Saturated fat', value: recipe.saturated_fat, unit: '% DV' },
    { key: 'sugar',         label: 'Sugar',         value: recipe.sugar,         unit: '% DV' },
    { key: 'sodium',        label: 'Sodium',        value: recipe.sodium,        unit: '% DV' },
  ] : []

  // Render via a portal to document.body so the scrim escapes any ancestor
  // containing block. Critical because this modal is mounted inside the
  // TopNav (for the search bar) and `.glass-nav` uses `backdrop-filter`,
  // which makes `position: fixed` resolve against the nav instead of the
  // viewport — the modal would float near the top of the page rather than
  // centering on the viewport without this escape hatch.
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="rdm-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rdm-title"
        >
          <motion.div
            key="rdm-modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[88vh] bg-surface-container-lowest rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header — close button right, no back button (standalone) */}
            <div className="flex items-center justify-between gap-3 px-4 md:px-6 pt-4 pb-3 border-b border-outline-variant/15 flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-emerald-700 font-bold">
                <span className="material-symbols-outlined text-[14px]">search</span>
                From search
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors"
                aria-label="Close recipe"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {loading && !recipe && (
                <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl animate-spin mb-2">progress_activity</span>
                  <p className="text-sm">Loading recipe…</p>
                </div>
              )}

              {error && !loading && (
                <div className="px-6 py-16 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl text-error/70 mb-2 block">error</span>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {recipe && (
                <>
                  <DetailHero recipeId={recipe.id} />

                  <div className="px-6 md:px-8 pt-5 pb-4">
                    <h2 id="rdm-title" className="text-2xl md:text-3xl font-extrabold font-headline text-on-surface tracking-tight leading-tight">
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

                  <section className="px-6 md:px-8 pb-6">
                    <h3 className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant font-bold mb-3">
                      Nutrition per serving
                    </h3>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {nutritionRows.filter((r) => r.value != null).map((r) => (
                        <div key={r.key} className="rounded-xl bg-surface-container-low p-3">
                          <dt className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                            {r.label}
                          </dt>
                          <dd className="text-lg font-bold text-on-surface mt-0.5">
                            {Math.round(r.value)}
                            <span className="text-xs text-on-surface-variant font-medium ml-1">
                              {r.unit}
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </>
              )}
            </div>

            {recipe && (
              <div className="flex items-center justify-end gap-2 px-4 md:px-6 py-3 border-t border-outline-variant/15 bg-surface-container-lowest flex-shrink-0">
                <button
                  type="button"
                  onClick={handleJumpToMeals}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high text-on-surface text-sm font-semibold hover:bg-surface-container-highest transition-colors"
                >
                  Open on Meals page
                  <span className="material-symbols-outlined text-base">arrow_outward</span>
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
