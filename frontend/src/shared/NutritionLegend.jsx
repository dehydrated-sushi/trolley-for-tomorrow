import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../lib/api'
import { CATEGORY_FALLBACK } from './nutrition'
import { TAG_STYLES, TAG_STYLE_FALLBACK } from './recipeTags'

/**
 * Floating "Legend" button that opens a popover explaining the colour scheme.
 *
 * Always shows the ingredient-level "Nutritional categories" section (fetched
 * from /api/ingredients/categories, with a static fallback). When a caller
 * passes `recipeTagDefs` (the response of /api/meals/tags), a second section
 * "Recipe tags" is rendered below, explaining each filter chip on the Meals
 * page. Pages that don't need recipe tags simply omit the prop.
 */
export default function NutritionLegend({ recipeTagDefs }) {
  const [open, setOpen] = useState(false)
  const [legend, setLegend] = useState(CATEGORY_FALLBACK)
  const ref = useRef(null)

  useEffect(() => {
    apiFetch('/api/ingredients/categories')
      .then((data) => {
        if (data?.categories) setLegend(data.categories)
      })
      .catch(() => {
        // silent — fallback is already loaded
      })
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const tagEntries = recipeTagDefs
    ? Object.entries(recipeTagDefs).filter(([key]) => key !== 'drink')
    : []

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high text-on-surface text-sm font-semibold hover:bg-surface-container-highest transition-colors"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-base">info</span>
        Legend
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 p-5 z-50 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-on-surface">Legend</h4>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-on-surface-variant hover:text-on-surface"
              aria-label="Close legend"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {/* Section 1 — ingredient-level nutritional categories */}
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">
            Nutritional categories
          </p>
          <p className="text-xs text-on-surface-variant mb-3">
            Every ingredient is tagged with one nutritional category.
          </p>
          <div className="space-y-3">
            {Object.entries(legend).map(([key, info]) => (
              <div key={key} className="flex items-start gap-3">
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: info.bg, color: info.colour }}
                >
                  <span className="material-symbols-outlined text-base">{info.icon}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface">{info.label}</p>
                  <p className="text-xs text-on-surface-variant leading-tight">
                    {info.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Section 2 — recipe-level tags (optional) */}
          {tagEntries.length > 0 && (
            <>
              <hr className="my-5 border-outline-variant/20" />
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                Recipe tags
              </p>
              <p className="text-xs text-on-surface-variant mb-3">
                Filter chips that narrow the recipe list by a specific rule.
              </p>
              <div className="space-y-3">
                {tagEntries.map(([key, info]) => {
                  const style = TAG_STYLES[key] || TAG_STYLE_FALLBACK
                  return (
                    <div key={key} className="flex items-start gap-3">
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: style.bg, color: style.fg }}
                      >
                        <span className="material-symbols-outlined text-base">{style.icon}</span>
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface">{info.label}</p>
                        <p className="text-xs text-on-surface-variant leading-tight">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
