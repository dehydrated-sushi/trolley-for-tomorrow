import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Recipe nutrition popover.
 *
 * The DB stores most nutrition values as % Daily Value (not grams), using
 * FDA reference amounts. We convert back to grams, then to kcal per macro,
 * to show "what fraction of this meal's calories comes from protein / carbs
 * / fat". More intuitive than raw %DV for non-technical users.
 *
 * `calories` is the only column already in kcal — we display it verbatim and
 * use it only for the big headline number. The stacked bar and percentages
 * are derived from the three energy-yielding macros.
 */

// FDA Daily Value reference amounts (2000 kcal reference diet).
const DV_GRAMS = {
  protein:       50,
  carbohydrates: 275,
  sugar:         50,   // "added sugars" DV; used for sub-detail only
  total_fat:     78,
  saturated_fat: 20,
  sodium:        2300, // mg
}

const KCAL_PER_GRAM_PROTEIN = 4
const KCAL_PER_GRAM_CARBS   = 4
const KCAL_PER_GRAM_FAT     = 9

// Colour palette — matches the Meals-page tag colours where sensible.
const COLOURS = {
  protein: '#14b8a6', // teal  (also the "high_protein" tag colour)
  carbs:   '#b45309', // amber (also the "low_carb" tag colour)
  fat:     '#6366f1', // indigo
  sodium:  '#64748b', // slate
}

export function computeMacros(recipe) {
  const proteinG = ((recipe.protein ?? 0) / 100) * DV_GRAMS.protein
  const carbsG   = ((recipe.carbohydrates ?? 0) / 100) * DV_GRAMS.carbohydrates
  const fatG     = ((recipe.total_fat ?? 0) / 100) * DV_GRAMS.total_fat
  const sugarG   = ((recipe.sugar ?? 0) / 100) * DV_GRAMS.sugar
  const satFatG  = ((recipe.saturated_fat ?? 0) / 100) * DV_GRAMS.saturated_fat
  const sodiumMg = ((recipe.sodium ?? 0) / 100) * DV_GRAMS.sodium

  const proteinKcal = proteinG * KCAL_PER_GRAM_PROTEIN
  const carbsKcal   = carbsG * KCAL_PER_GRAM_CARBS
  const fatKcal     = fatG * KCAL_PER_GRAM_FAT

  const macroTotal = proteinKcal + carbsKcal + fatKcal

  const pct = (part) => (macroTotal > 0 ? Math.round((part / macroTotal) * 100) : 0)

  return {
    displayKcal: Math.round(recipe.calories ?? macroTotal),
    protein: {
      grams: +proteinG.toFixed(1),
      kcal:  Math.round(proteinKcal),
      pct:   pct(proteinKcal),
    },
    carbs: {
      grams: +carbsG.toFixed(1),
      kcal:  Math.round(carbsKcal),
      pct:   pct(carbsKcal),
    },
    fat: {
      grams: +fatG.toFixed(1),
      kcal:  Math.round(fatKcal),
      pct:   pct(fatKcal),
    },
    sugar:  { grams: +sugarG.toFixed(1) },
    satFat: { grams: +satFatG.toFixed(1) },
    sodium: { mg: Math.round(sodiumMg) },
  }
}

/**
 * Wraps any trigger content — typically the whole hero meta strip of a
 * recipe card — and reveals the nutrition popover on hover / focus / click.
 *
 * Passing `children` lets the caller control the trigger area entirely;
 * we just add hover/focus listeners and render the popover beneath.
 */
export default function NutritionPopover({ recipe, children }) {
  const [open, setOpen] = useState(false)
  const m = computeMacros(recipe)

  const hasAny =
    (recipe.protein ?? 0) > 0 ||
    (recipe.carbohydrates ?? 0) > 0 ||
    (recipe.total_fat ?? 0) > 0

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Show nutrition breakdown"
        className="cursor-help rounded focus:outline-none focus:ring-2 focus:ring-primary/40 text-left"
      >
        {children}
      </button>

      <AnimatePresence>
        {open && hasAny && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-full mt-2 z-30 w-[320px] bg-white border border-outline-variant/30 rounded-2xl shadow-xl p-5 text-left"
          >
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Nutrition breakdown
                </p>
                <p className="text-3xl font-black text-on-surface leading-none mt-1">
                  {m.displayKcal}
                  <span className="text-sm text-on-surface-variant font-semibold ml-1">kcal</span>
                </p>
              </div>
            </div>

            {/* Stacked macro bar */}
            <div className="h-3 w-full rounded-full overflow-hidden bg-surface-container flex mb-3">
              {m.protein.pct > 0 && (
                <div
                  style={{ width: `${m.protein.pct}%`, backgroundColor: COLOURS.protein }}
                  title={`Protein · ${m.protein.pct}%`}
                />
              )}
              {m.carbs.pct > 0 && (
                <div
                  style={{ width: `${m.carbs.pct}%`, backgroundColor: COLOURS.carbs }}
                  title={`Carbs · ${m.carbs.pct}%`}
                />
              )}
              {m.fat.pct > 0 && (
                <div
                  style={{ width: `${m.fat.pct}%`, backgroundColor: COLOURS.fat }}
                  title={`Fat · ${m.fat.pct}%`}
                />
              )}
            </div>

            {/* Macro rows */}
            <div className="space-y-1.5 mb-3 text-sm">
              <MacroRow label="Protein" colour={COLOURS.protein} macro={m.protein} />
              <MacroRow label="Carbs"   colour={COLOURS.carbs}   macro={m.carbs} />
              <MacroRow label="Fat"     colour={COLOURS.fat}     macro={m.fat} />
            </div>

            {/* Sub-details */}
            {(m.sugar.grams > 0 || m.satFat.grams > 0 || m.sodium.mg > 0) && (
              <div className="pt-3 border-t border-outline-variant/20">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                  Also in this serving
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs text-on-surface-variant">
                  {m.sugar.grams > 0 && <SubFact label="Sugar" value={`${m.sugar.grams}g`} />}
                  {m.satFat.grams > 0 && <SubFact label="Sat fat" value={`${m.satFat.grams}g`} />}
                  {m.sodium.mg > 0 && <SubFact label="Sodium" value={`${m.sodium.mg}mg`} />}
                </div>
              </div>
            )}

            <p className="mt-4 text-[10px] text-on-surface-variant/70 leading-snug">
              Grams derived from FDA Daily Value reference amounts. Numbers are approximations per serving.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

function MacroRow({ label, colour, macro }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colour }} />
      <span className="font-semibold text-on-surface w-16">{label}</span>
      <span className="text-on-surface-variant">{macro.grams}g</span>
      <span className="text-on-surface-variant/60 ml-auto tabular-nums">
        {macro.kcal} kcal · {macro.pct}%
      </span>
    </div>
  )
}

function SubFact({ label, value }) {
  return (
    <div>
      <p className="font-bold text-on-surface tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider">{label}</p>
    </div>
  )
}
