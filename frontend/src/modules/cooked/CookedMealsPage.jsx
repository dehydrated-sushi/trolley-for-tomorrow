import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import { getCategoryInfo } from '../../shared/nutrition'
import { toast } from '../../shared/toastBus'

const EASE = [0.22, 1, 0.36, 1]
const WASTE_PERCENTAGES = [25, 50, 75, 100]
const SMALL_NAME_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

function prettyName(value, fallback = 'Recipe') {
  const clean = String(value || '')
    .replace(/[_|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!clean) return fallback

  return clean
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && SMALL_NAME_WORDS.has(lower)) return lower
      if (/^[A-Z0-9]{2,}$/.test(word)) return word
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value, withYear = true) {
  if (!value) return 'Unknown date'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

function formatTime(value) {
  if (!value) return 'Not recorded'
  const [hourRaw, minuteRaw] = String(value).split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw || 0)
  if (!Number.isFinite(hour)) return value
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}

function formatGrams(value) {
  const grams = Number(value)
  if (!Number.isFinite(grams) || grams <= 0) return '0 g'
  if (grams >= 1000) return `${(grams / 1000).toFixed(grams >= 10000 ? 1 : 2)} kg`
  return `${Math.round(grams)} g`
}

function formatMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '$0.00'
  return `$${number.toFixed(2)}`
}

function daysAgo(value) {
  if (!value) return ''
  const cooked = new Date(`${value}T00:00:00`)
  if (Number.isNaN(cooked.getTime())) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - cooked) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1) return `${diff} days ago`
  return ''
}

function getIngredientName(ingredient) {
  return prettyName(
    ingredient.display_name
      || ingredient.name
      || ingredient.item
      || ingredient.fridge_item
      || ingredient.recipe_ingredient,
    'Ingredient'
  )
}

function ingredientKey(ingredient) {
  return String(
    ingredient.receipt_item_id
      || ingredient.fridge_item
      || ingredient.display_name
      || ingredient.name
      || ingredient.item
      || ingredient.recipe_ingredient
      || 'ingredient'
  ).trim().toLowerCase()
}

function aggregateIngredientUsage(ingredients) {
  const grouped = new Map()

  for (const ingredient of ingredients || []) {
    const key = ingredientKey(ingredient)
    if (!grouped.has(key)) {
      grouped.set(key, {
        ...ingredient,
        name: ingredient.display_name || ingredient.fridge_item || ingredient.name || ingredient.item || ingredient.recipe_ingredient,
        display_name: ingredient.display_name || ingredient.fridge_item || ingredient.name || ingredient.item || ingredient.recipe_ingredient,
        grams_used: 0,
        quantity_grams: 0,
        estimated_cost: 0,
        cost_impact: 0,
        recipe_ingredients: [],
      })
    }

    const row = grouped.get(key)
    const grams = ingredientGrams(ingredient)
    const cost = ingredientCost(ingredient)
    row.grams_used += grams
    row.quantity_grams += grams
    row.estimated_cost += cost
    row.cost_impact += cost

    const recipeName = ingredient.recipe_ingredient || ingredient.name
    if (recipeName && !row.recipe_ingredients.includes(recipeName)) {
      row.recipe_ingredients.push(recipeName)
    }

    if (row.category === 'other' && ingredient.category) {
      row.category = ingredient.category
    }
    if (!row.expiry_date && ingredient.expiry_date) {
      row.expiry_date = ingredient.expiry_date
    }
  }

  return Array.from(grouped.values()).map((row) => ({
    ...row,
    grams_used: Math.round(row.grams_used * 100) / 100,
    quantity_grams: Math.round(row.quantity_grams * 100) / 100,
    estimated_cost: Math.round(row.estimated_cost * 100) / 100,
    cost_impact: Math.round(row.cost_impact * 100) / 100,
  }))
}

function getIngredients(meal) {
  return aggregateIngredientUsage(Array.isArray(meal?.ingredient_usage) ? meal.ingredient_usage : [])
}

function ingredientGrams(ingredient) {
  return Number(ingredient.grams_used || ingredient.quantity_grams || 0)
}

function ingredientCost(ingredient) {
  const direct = Number(ingredient.estimated_cost || 0)
  if (Number.isFinite(direct) && direct > 0) return direct
  const costImpact = Number(ingredient.cost_impact || 0)
  if (Number.isFinite(costImpact) && costImpact > 0) return costImpact
  const grams = ingredientGrams(ingredient)
  const pricePerGram = Number(ingredient.price_per_gram || 0)
  if (Number.isFinite(grams) && Number.isFinite(pricePerGram)) return grams * pricePerGram
  return 0
}

function mealWasteHistory(meal) {
  const history = meal?.metadata?.waste_history
  return Array.isArray(history) ? history : []
}

function totalWasteForMeal(meal) {
  return mealWasteHistory(meal).reduce(
    (sum, event) => sum + Number(event.quantity_grams || 0),
    0
  )
}

function mealTotals(meal) {
  const ingredients = getIngredients(meal)
  const ingredientWeight = ingredients.reduce((sum, ingredient) => sum + ingredientGrams(ingredient), 0)
  const totalWeight = Number(meal?.quantity_grams || 0) || ingredientWeight
  const cost = ingredients.reduce((sum, ingredient) => sum + ingredientCost(ingredient), 0)
  const wasted = totalWasteForMeal(meal)

  return {
    cost,
    ingredients,
    totalWeight,
    wasted,
    wastePct: totalWeight > 0 ? Math.min(100, Math.round((wasted / totalWeight) * 100)) : 0,
  }
}

function SummaryTile({ icon, label, value, detail, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-3 shadow-sm md:p-4">
      <div className="flex items-center gap-3 md:items-start">
        <span className={`material-symbols-outlined rounded-xl p-2 text-[20px] ${tones[tone] || tones.primary}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">{label}</p>
          <p className="mt-1 text-xl font-black leading-none text-on-surface md:text-2xl">{value}</p>
          {detail && <p className="mt-1 hidden text-xs text-on-surface-variant sm:block">{detail}</p>}
        </div>
      </div>
    </div>
  )
}

function CookedMealCard({ meal, index, active, onSelect }) {
  const totals = mealTotals(meal)

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.025, ease: EASE }}
      onClick={() => onSelect(meal)}
      className={`group w-full rounded-2xl border p-4 text-left transition-all ${
        active
          ? 'border-primary/30 bg-primary/8 shadow-sm ring-2 ring-primary/10'
          : 'border-outline-variant/10 bg-surface-container-lowest hover:border-primary/20 hover:bg-surface-container-low'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          active ? 'bg-primary text-on-primary' : 'bg-emerald-100 text-emerald-700'
        }`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            restaurant
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="line-clamp-2 font-headline text-base font-black leading-tight text-on-surface">
              {prettyName(meal.recipe_name || meal.name)}
            </h2>
            <span className={`material-symbols-outlined text-lg transition-transform group-hover:translate-x-0.5 ${
              active ? 'text-primary' : 'text-on-surface-variant'
            }`}>
              chevron_right
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-on-surface-variant">
            <span>{formatDate(meal.cooked_date, false)}</span>
            <span>{formatGrams(totals.totalWeight)}</span>
            <span>{totals.ingredients.length} item{totals.ingredients.length === 1 ? '' : 's'}</span>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className={totals.wastePct > 0 ? 'h-full rounded-full bg-rose-500' : 'h-full rounded-full bg-emerald-500'}
              style={{ width: `${Math.max(totals.wastePct || 12, 12)}%` }}
            />
          </div>
        </div>
      </div>
    </motion.button>
  )
}

function SelectedMealHeader({ meal }) {
  const totals = mealTotals(meal)

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/10 bg-gradient-to-r from-emerald-50 via-teal-50 to-white px-6 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Cooked
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-on-surface-variant">
                {daysAgo(meal.cooked_date) || formatDate(meal.cooked_date)}
              </span>
            </div>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight text-on-surface md:text-4xl">
              {prettyName(meal.recipe_name || meal.name)}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[440px]">
            <MiniMetric icon="calendar_today" label="Date" value={formatDate(meal.cooked_date, false)} />
            <MiniMetric icon="schedule" label="Time" value={formatTime(meal.cooked_time)} />
            <MiniMetric icon="inventory_2" label="Items" value={totals.ingredients.length} />
            <MiniMetric icon="scale" label="Used" value={formatGrams(totals.totalWeight)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-[1fr_260px]">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-bold text-on-surface">Meal outcome</span>
            <span className="font-bold text-on-surface-variant">{totals.wastePct}% waste logged</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="bg-emerald-500"
              style={{ width: `${Math.max(0, 100 - totals.wastePct)}%` }}
            />
            <div
              className="bg-rose-500"
              style={{ width: `${totals.wastePct}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-on-surface-variant">
            <span>{formatGrams(Math.max(0, totals.totalWeight - totals.wasted))} used or saved</span>
            <span>{formatGrams(totals.wasted)} wasted</span>
            <span>{formatMoney(totals.cost)} estimated value</span>
          </div>
        </div>

        <Link
          to="/analytics"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-on-primary transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined text-base">query_stats</span>
          View analytics
        </Link>
      </div>
    </section>
  )
}

function MiniMetric({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-black text-on-surface">{value}</p>
    </div>
  )
}

function IngredientUsagePanel({ meal, onWasteIngredient, savingKey }) {
  const ingredients = getIngredients(meal)

  if (!ingredients.length) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-outline-variant/30 bg-surface-container-lowest px-6 py-10 text-center shadow-sm">
        <span className="material-symbols-outlined mb-3 text-5xl text-on-surface-variant/30">inventory_2</span>
        <h2 className="font-headline text-xl font-black text-on-surface">No ingredient usage saved</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">
          New cooked meals from Meal Plans will store ingredient rows here.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest shadow-sm">
      <div className="flex flex-col gap-2 border-b border-outline-variant/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-headline text-xl font-black text-on-surface">Ingredient usage</h2>
          <p className="text-sm text-on-surface-variant">{ingredients.length} tracked ingredient{ingredients.length === 1 ? '' : 's'}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Fridge matched
        </span>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2">
        {ingredients.map((ingredient, index) => {
          const name = getIngredientName(ingredient)
          const category = ingredient.category || 'other'
          const info = getCategoryInfo(category)
          const grams = ingredientGrams(ingredient)
          const cost = ingredientCost(ingredient)
          const key = `${meal.event_id || meal.id}-${ingredient.receipt_item_id || ingredient.name || ingredient.item || index}`
          const isSaving = savingKey === key

          return (
            <article
              key={key}
              className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-headline text-lg font-black leading-tight text-on-surface">{name}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-on-surface-variant">
                    {ingredient.expiry_date && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                        <span className="material-symbols-outlined text-sm">event</span>
                        {formatDate(ingredient.expiry_date, false)}
                      </span>
                    )}
                    {ingredient.weight_confidence && (
                      <span className="rounded-full bg-white px-2.5 py-1">{ingredient.weight_confidence}</span>
                    )}
                  </div>
                  {ingredient.recipe_ingredients?.length > 1 && (
                    <p className="mt-2 text-xs font-semibold text-on-surface-variant">
                      Covers {ingredient.recipe_ingredients.map((item) => prettyName(item, item)).join(', ')}
                    </p>
                  )}
                </div>

                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black"
                  style={{ backgroundColor: info.bg, color: info.colour }}
                >
                  <span className="material-symbols-outlined text-sm">{info.icon}</span>
                  {info.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white px-3 py-2">
                  <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Used</p>
                  <p className="mt-0.5 text-lg font-black text-on-surface">{formatGrams(grams)}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2">
                  <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Value</p>
                  <p className="mt-0.5 text-lg font-black text-on-surface">{formatMoney(cost)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Used from fridge
                </span>
                <button
                  type="button"
                  onClick={() => onWasteIngredient(ingredient, index)}
                  disabled={isSaving || grams <= 0}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">{isSaving ? 'hourglass_top' : 'delete'}</span>
                  Waste this
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function WasteControls({ meal, mode, setMode, onWasteMeal, savingKey }) {
  const totals = mealTotals(meal)

  return (
    <section className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-black text-on-surface">Waste log</h2>
          <p className="text-sm text-on-surface-variant">{formatGrams(totals.totalWeight)} cooked</p>
        </div>
        <span className="material-symbols-outlined rounded-2xl bg-rose-50 p-2 text-rose-700">compost</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-surface-container p-1">
        {[
          ['meal', 'Meal', 'room_service'],
          ['ingredient', 'Ingredient', 'list_alt'],
        ].map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition-colors ${
              mode === key
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {mode === 'meal' ? (
        <div className="grid grid-cols-2 gap-2">
          {WASTE_PERCENTAGES.map((percentage) => {
            const grams = totals.totalWeight * (percentage / 100)
            const cost = totals.cost * (percentage / 100)
            const key = `meal-${percentage}`
            const isSaving = savingKey === key
            return (
              <button
                key={percentage}
                type="button"
                onClick={() => onWasteMeal(percentage)}
                disabled={isSaving || totals.totalWeight <= 0}
                className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left transition-colors hover:bg-rose-100 disabled:opacity-50"
              >
                <p className="text-xl font-black text-rose-700">{percentage}%</p>
                <p className="mt-1 text-xs font-bold text-rose-700/80">{formatGrams(grams)}</p>
                <p className="text-xs font-bold text-rose-700/80">{formatMoney(cost)}</p>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-container px-4 py-3">
          <p className="text-sm font-bold text-on-surface">Choose an ingredient row</p>
          <p className="mt-1 text-xs text-on-surface-variant">Each row has its own throw action.</p>
        </div>
      )}
    </section>
  )
}

function WasteHistory({ meal }) {
  const history = mealWasteHistory(meal).slice(-5).reverse()

  return (
    <section className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-headline text-xl font-black text-on-surface">Recent waste</h2>
        <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
          {history.length} log{history.length === 1 ? '' : 's'}
        </span>
      </div>

      {history.length ? (
        <div className="space-y-2">
          {history.map((event) => (
            <div key={event.id || `${event.item_name}-${event.created_at}`} className="rounded-2xl bg-surface-container px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-on-surface">{prettyName(event.item_name, 'Meal')}</p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">{event.reason || 'Wasted'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-rose-700">{formatGrams(event.quantity_grams)}</p>
                  <p className="text-xs font-bold text-on-surface-variant">{formatMoney(event.cost_impact)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-container px-4 py-5 text-sm font-semibold text-on-surface-variant">
          No waste logged for this meal.
        </div>
      )}
    </section>
  )
}

export default function CookedMealsPage() {
  const [meals, setMeals] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wasteMode, setWasteMode] = useState('meal')
  const [savingKey, setSavingKey] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    apiFetch('/api/waste/cooked-meals?days=30')
      .then((data) => {
        if (ignore) return
        const nextMeals = data?.cooked_meals || []
        setMeals(nextMeals)
        setSelectedId((current) => current || nextMeals[0]?.event_id || nextMeals[0]?.id || null)
      })
      .catch((err) => {
        if (!ignore) setError(err.message || 'Could not load cooked meals')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  const selectedMeal = useMemo(
    () => meals.find((meal) => (meal.event_id || meal.id) === selectedId) || meals[0],
    [meals, selectedId]
  )

  const stats = useMemo(() => {
    const totalGrams = meals.reduce((sum, meal) => sum + mealTotals(meal).totalWeight, 0)
    const wastedGrams = meals.reduce((sum, meal) => sum + totalWasteForMeal(meal), 0)
    const uniqueRecipes = new Set(meals.map((meal) => meal.recipe_id || meal.recipe_name || meal.name)).size
    const todayCount = meals.filter((meal) => daysAgo(meal.cooked_date) === 'Today').length
    return { totalGrams, wastedGrams, uniqueRecipes, todayCount }
  }, [meals])

  const patchMealWasteHistory = (mealId, event) => {
    setMeals((current) => current.map((meal) => {
      const id = meal.event_id || meal.id
      if (id !== mealId) return meal
      const metadata = meal.metadata || {}
      return {
        ...meal,
        metadata: {
          ...metadata,
          waste_history: [...(metadata.waste_history || []), event],
        },
      }
    }))
  }

  const submitWaste = async ({ itemName, category, quantityGrams, costImpact, reason, metadata, receiptItemId }) => {
    const payload = {
      event_type: 'wasted',
      event_date: todayValue(),
      item_name: itemName,
      category,
      recipe_id: selectedMeal?.recipe_id,
      recipe_name: selectedMeal?.recipe_name || selectedMeal?.name,
      receipt_item_id: receiptItemId || null,
      quantity_grams: quantityGrams,
      quantity_label: formatGrams(quantityGrams),
      cost_impact: costImpact,
      reason,
      metadata: {
        ...metadata,
        cooked_event_id: selectedMeal?.event_id || selectedMeal?.id,
        skip_inventory_update: true,
      },
    }

    const data = await apiFetch('/api/waste/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    patchMealWasteHistory(selectedMeal.event_id || selectedMeal.id, data.event)
    return data.event
  }

  const handleWasteMeal = async (percentage) => {
    if (!selectedMeal) return
    const totals = mealTotals(selectedMeal)
    if (totals.totalWeight <= 0) return

    const key = `meal-${percentage}`
    setSavingKey(key)
    try {
      await submitWaste({
        itemName: selectedMeal.recipe_name || selectedMeal.name,
        category: 'meal',
        quantityGrams: totals.totalWeight * (percentage / 100),
        costImpact: totals.cost * (percentage / 100),
        reason: `${percentage}% of cooked meal wasted`,
        metadata: { waste_mode: 'meal', percentage },
      })
      toast.show({ message: `${percentage}% meal waste logged` })
    } catch (err) {
      toast.show({ message: err.message || 'Could not log meal waste', tone: 'error' })
    } finally {
      setSavingKey('')
    }
  }

  const handleWasteIngredient = async (ingredient, index) => {
    if (!selectedMeal) return
    const grams = ingredientGrams(ingredient)
    if (grams <= 0) return
    const key = `${selectedMeal.event_id || selectedMeal.id}-${ingredient.receipt_item_id || ingredient.name || ingredient.item || index}`
    setSavingKey(key)
    try {
      await submitWaste({
        itemName: getIngredientName(ingredient),
        category: ingredient.category || 'other',
        receiptItemId: ingredient.receipt_item_id || null,
        quantityGrams: grams,
        costImpact: ingredientCost(ingredient),
        reason: 'Ingredient from cooked meal wasted',
        metadata: {
          waste_mode: 'ingredient',
          ingredient_index: index,
          original_ingredient: ingredient,
        },
      })
      toast.show({ message: `${getIngredientName(ingredient)} waste logged` })
    } catch (err) {
      toast.show({ message: err.message || 'Could not log ingredient waste', tone: 'error' })
    } finally {
      setSavingKey('')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-28 md:px-10 md:pb-12">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-primary">Cooked history</p>
          <h1 className="font-headline text-4xl font-black tracking-tight text-on-surface md:text-5xl">
            Cooked meals
          </h1>
          <p className="mt-3 max-w-2xl text-on-surface-variant">
            Meals, ingredient usage, and waste impact from the last 30 days.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/analytics"
            className="inline-flex items-center gap-2 rounded-2xl bg-surface-container-high px-4 py-2.5 text-sm font-black text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined text-base">query_stats</span>
            Analytics
          </Link>
          <Link
            to="/meals"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-black text-on-primary transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-base">restaurant_menu</span>
            Find meals
          </Link>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryTile icon="restaurant" label="Cooked meals" value={meals.length} detail="Last 30 days" tone="emerald" />
        <SummaryTile icon="calendar_today" label="Today" value={stats.todayCount} detail="Marked cooked" />
        <SummaryTile icon="scale" label="Food used" value={formatGrams(stats.totalGrams)} detail={`${stats.uniqueRecipes} unique recipe${stats.uniqueRecipes === 1 ? '' : 's'}`} tone="amber" />
        <SummaryTile icon="delete" label="Waste logged" value={formatGrams(stats.wastedGrams)} detail="Cooked meals" tone="rose" />
      </section>

      {error && (
        <div className="mb-6 rounded-2xl bg-error-container/30 px-4 py-3 text-sm font-bold text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <p className="animate-pulse text-lg text-on-surface-variant">Loading cooked meals...</p>
        </div>
      ) : meals.length === 0 ? (
        <div className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest px-8 py-14 text-center shadow-sm">
          <span className="material-symbols-outlined mb-4 text-6xl text-on-surface-variant/30">restaurant</span>
          <h2 className="font-headline text-xl font-black text-on-surface">No cooked meals yet</h2>
          <p className="mx-auto mt-2 max-w-md text-on-surface-variant">
            Mark a recipe as cooked from Meal Plans to start tracking ingredient usage.
          </p>
          <Link
            to="/meals"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-on-primary transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-base">restaurant_menu</span>
            Open Meal Plans
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-low p-3 shadow-sm xl:sticky xl:top-24">
            <div className="mb-3 flex items-center justify-between px-2">
              <h2 className="font-headline text-lg font-black text-on-surface">Meals</h2>
              <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">{meals.length} total</span>
            </div>
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1 xl:max-h-[calc(100vh-180px)]">
              {meals.map((meal, index) => (
                <CookedMealCard
                  key={meal.event_id || meal.id}
                  meal={meal}
                  index={index}
                  active={(meal.event_id || meal.id) === (selectedMeal?.event_id || selectedMeal?.id)}
                  onSelect={(nextMeal) => setSelectedId(nextMeal.event_id || nextMeal.id)}
                />
              ))}
            </div>
          </aside>

          {selectedMeal && (
            <main className="space-y-5">
              <SelectedMealHeader meal={selectedMeal} />

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
                <IngredientUsagePanel
                  meal={selectedMeal}
                  onWasteIngredient={handleWasteIngredient}
                  savingKey={savingKey}
                />

                <aside className="space-y-5">
                  <WasteControls
                    meal={selectedMeal}
                    mode={wasteMode}
                    setMode={setWasteMode}
                    onWasteMeal={handleWasteMeal}
                    savingKey={savingKey}
                  />
                  <WasteHistory meal={selectedMeal} />
                </aside>
              </div>
            </main>
          )}
        </div>
      )}
    </div>
  )
}
