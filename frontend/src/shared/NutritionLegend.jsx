import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../lib/api'
import { CATEGORY_FALLBACK } from './nutrition'

/**
 * Floating "Legend" button that opens a popover explaining the colour scheme.
 * Fetches live legend from /api/ingredients/categories; falls back to static config.
 */
export default function NutritionLegend() {
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
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 p-5 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-on-surface">Nutritional categories</h4>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-on-surface-variant hover:text-on-surface"
              aria-label="Close legend"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mb-4">
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
        </div>
      )}
    </div>
  )
}
