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

function formatDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(value) {
  if (!value) return 'Not recorded'
  const [hourRaw, minuteRaw] = String(value).split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw || 0)
  if (!Number.isFinite(hour)) return value
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
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

function getIngredients(meal) {
  return Array.isArray(meal?.ingredient_usage) ? meal.ingredient_usage : []
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

function SummaryCard({ icon, label, value, detail }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-primary mt-0.5">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-on-surface-variant">{label}</p>
          <p className="text-2xl font-black text-on-surface mt-1">{value}</p>
          {detail && <p className="text-xs text-on-surface-variant mt-1">{detail}</p>}
        </div>
      </div>
    </div>
  )
}

function CookedMealCard({ meal, index, active, onSelect }) {
  const weight = Number(meal.quantity_grams || 0)
  const ingredients = getIngredients(meal)

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.035, ease: EASE }}
      onClick={() => onSelect(meal)}
      className={`w-full text-left rounded-2xl border px-4 py-4 shadow-sm transition-all ${
        active
          ? 'bg-primary/8 border-primary/25 ring-2 ring-primary/15'
          : 'bg-surface-container-lowest border-outline-variant/10 hover:border-primary/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-emerald-700" style={{ fontVariationSettings: "'FILL' 1" }}>
            restaurant
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-headline text-base font-bold text-on-surface leading-tight line-clamp-2">
              {prettyName(meal.recipe_name || meal.name)}
            </h2>
            <span className="material-symbols-outlined text-on-surface-variant text-lg shrink-0">
              chevron_right
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {formatDate(meal.cooked_date)}
            {daysAgo(meal.cooked_date) ? ` · ${daysAgo(meal.cooked_date)}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Cooked
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-semibold">
              <span className="material-symbols-outlined text-sm">scale</span>
              {formatGrams(weight)}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-semibold">
              <span className="material-symbols-outlined text-sm">inventory_2</span>
              {ingredients.length} ingredient{ingredients.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

function IngredientUsageTable({ meal, onWasteIngredient, savingKey }) {
  const ingredients = getIngredients(meal)

  if (!ingredients.length) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low px-5 py-8 text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">inventory_2</span>
        <p className="font-bold text-on-surface">No ingredient usage saved for this meal</p>
        <p className="text-sm text-on-surface-variant mt-1">
          New meals marked cooked from Meal Plans will store the ingredients used here.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/10">
      <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_1fr] gap-4 bg-surface-container-high px-5 py-3 text-xs uppercase tracking-widest text-on-surface-variant font-black">
        <span>Item</span>
        <span>Category</span>
        <span>Used</span>
        <span>Could throw</span>
        <span>Status</span>
      </div>
      <div className="divide-y divide-outline-variant/10">
        {ingredients.map((ingredient, index) => {
          const name = prettyName(
            ingredient.display_name
              || ingredient.name
              || ingredient.item
              || ingredient.fridge_item
              || ingredient.recipe_ingredient,
            'Ingredient'
          )
          const category = ingredient.category || 'other'
          const info = getCategoryInfo(category)
          const grams = ingredientGrams(ingredient)
          const cost = ingredientCost(ingredient)
          const key = `${meal.event_id || meal.id}-${ingredient.receipt_item_id || ingredient.name || ingredient.item || index}`

          return (
            <div
              key={key}
              className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_1fr] gap-4 items-center px-5 py-4 bg-surface-container-lowest even:bg-surface-container-low/40"
            >
              <div className="min-w-0">
                <p className="font-headline text-lg font-bold text-on-surface truncate">{name}</p>
                {ingredient.expiry_date && (
                  <p className="text-xs text-on-surface-variant mt-1">Expires {formatDate(ingredient.expiry_date)}</p>
                )}
              </div>
              <span
                className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ backgroundColor: info.bg, color: info.colour }}
              >
                <span className="material-symbols-outlined text-sm">{info.icon}</span>
                {info.label}
              </span>
              <span className="font-bold text-on-surface">{formatGrams(grams)} used</span>
              <span className="font-bold text-on-surface">{formatGrams(grams)}</span>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Tracked
                </span>
                <button
                  type="button"
                  onClick={() => onWasteIngredient(ingredient, index)}
                  disabled={savingKey === key || grams <= 0}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Throw
                </button>
              </div>
              {cost > 0 && (
                <p className="col-start-4 col-span-2 -mt-2 text-xs text-on-surface-variant">
                  Approx value: {formatMoney(cost)}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WasteControls({ meal, mode, setMode, onWasteMeal, savingKey }) {
  const totalGrams = Number(meal?.quantity_grams || 0)
  const totalCost = getIngredients(meal).reduce((sum, ingredient) => sum + ingredientCost(ingredient), 0)

  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/10 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-headline text-xl font-bold text-on-surface">Waste options</h2>
          <p className="text-sm text-on-surface-variant">Record waste by whole meal or by ingredient.</p>
        </div>
        <span className="material-symbols-outlined text-primary">compost</span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-container p-1 mb-4">
        {[
          ['meal', 'Meal-wise', 'room_service'],
          ['ingredient', 'Ingredient-wise', 'list_alt'],
        ].map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
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
        <div>
          <p className="text-sm text-on-surface-variant mb-3">
            How much of this cooked meal did you throw away?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {WASTE_PERCENTAGES.map((percentage) => {
              const grams = totalGrams * (percentage / 100)
              const cost = totalCost * (percentage / 100)
              const key = `meal-${percentage}`
              return (
                <button
                  key={percentage}
                  type="button"
                  onClick={() => onWasteMeal(percentage)}
                  disabled={savingKey === key || totalGrams <= 0}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left hover:bg-rose-100 disabled:opacity-50"
                >
                  <p className="text-lg font-black text-rose-700">{percentage}% wasted</p>
                  <p className="text-xs text-rose-700/80 mt-1">
                    {formatGrams(grams)} · {formatMoney(cost)}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">
          Use the Throw button in the ingredient usage table. It logs that ingredient as wasted without hiding the meal history.
        </p>
      )}
    </div>
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
    const totalGrams = meals.reduce((sum, meal) => sum + Number(meal.quantity_grams || 0), 0)
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
    const totalGrams = Number(selectedMeal.quantity_grams || 0)
    if (totalGrams <= 0) return

    const key = `meal-${percentage}`
    setSavingKey(key)
    const cost = getIngredients(selectedMeal).reduce((sum, ingredient) => sum + ingredientCost(ingredient), 0)
    try {
      await submitWaste({
        itemName: selectedMeal.recipe_name || selectedMeal.name,
        category: 'meal',
        quantityGrams: totalGrams * (percentage / 100),
        costImpact: cost * (percentage / 100),
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
        itemName: prettyName(
          ingredient.display_name
            || ingredient.name
            || ingredient.item
            || ingredient.fridge_item
            || ingredient.recipe_ingredient,
          'Ingredient'
        ),
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
      toast.show({
        message: `${prettyName(ingredient.name || ingredient.item || ingredient.recipe_ingredient, 'Ingredient')} waste logged`,
      })
    } catch (err) {
      toast.show({ message: err.message || 'Could not log ingredient waste', tone: 'error' })
    } finally {
      setSavingKey('')
    }
  }

  return (
    <div className="px-6 md:px-12 max-w-7xl mx-auto pb-12">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Cooked History</p>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">
            Cooked meals
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed mt-3">
            Open a cooked meal to see what ingredients were used, then log leftovers or waste by meal or ingredient.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/analytics"
            className="inline-flex items-center gap-2 rounded-full bg-surface-container-high text-on-surface px-5 py-2.5 text-sm font-bold hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-base">query_stats</span>
            Analytics
          </Link>
          <Link
            to="/meals"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">restaurant_menu</span>
            Find meals
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <SummaryCard icon="restaurant" label="Cooked meals" value={meals.length} detail="Last 30 days" />
        <SummaryCard icon="calendar_today" label="Cooked today" value={stats.todayCount} detail="Marked today" />
        <SummaryCard icon="scale" label="Food used" value={formatGrams(stats.totalGrams)} detail={`${stats.uniqueRecipes} unique recipe${stats.uniqueRecipes === 1 ? '' : 's'}`} />
        <SummaryCard icon="delete" label="Meal waste logged" value={formatGrams(stats.wastedGrams)} detail="From cooked meals" />
      </section>

      {error && (
        <div className="mb-6 rounded-2xl bg-error-container/30 text-error px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-on-surface-variant animate-pulse text-lg">Loading cooked meals...</p>
        </div>
      ) : meals.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 px-8 py-14 text-center shadow-sm">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">restaurant</span>
          <h2 className="text-xl font-headline font-bold text-on-surface">No cooked meals yet</h2>
          <p className="text-on-surface-variant max-w-md mx-auto mt-2">
            Go to Meal Plans and press Mark cooked on a recipe. It will appear here with the ingredients used.
          </p>
          <Link
            to="/meals"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">restaurant_menu</span>
            Open Meal Plans
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 items-start">
          <aside className="space-y-3 xl:sticky xl:top-24">
            {meals.map((meal, index) => (
              <CookedMealCard
                key={meal.event_id || meal.id}
                meal={meal}
                index={index}
                active={(meal.event_id || meal.id) === (selectedMeal?.event_id || selectedMeal?.id)}
                onSelect={(nextMeal) => setSelectedId(nextMeal.event_id || nextMeal.id)}
              />
            ))}
          </aside>

          {selectedMeal && (
            <main className="space-y-6">
              <section className="overflow-hidden rounded-[2rem] bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
                  <div className="min-h-[260px] bg-gradient-to-br from-emerald-100 via-teal-50 to-amber-50 flex items-center justify-center relative">
                    <span className="absolute left-5 top-5 rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-black">
                      Ready to confirm
                    </span>
                    <span className="material-symbols-outlined text-[96px] text-primary/70" style={{ fontVariationSettings: "'FILL' 1" }}>
                      ramen_dining
                    </span>
                  </div>
                  <div className="p-6 lg:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-3xl md:text-4xl font-headline font-black text-on-surface tracking-tight">
                          {prettyName(selectedMeal.recipe_name || selectedMeal.name)}
                        </h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-sm font-bold text-on-surface-variant">
                            <span className="material-symbols-outlined text-base">inventory_2</span>
                            Uses {getIngredients(selectedMeal).length} fridge items
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-sm font-bold text-on-surface-variant">
                            <span className="material-symbols-outlined text-base">room_service</span>
                            {selectedMeal.servings || '1 serving'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-sm font-bold text-on-surface-variant">
                            <span className="material-symbols-outlined text-base">eco</span>
                            Waste impact tracking
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 text-xs font-black">
                        Cooked
                      </span>
                    </div>

                    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-outline-variant/10 pt-5">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-on-surface-variant font-black mb-1">Cooked date</p>
                        <div className="rounded-xl bg-surface-container px-4 py-3 font-bold text-on-surface">
                          {formatDate(selectedMeal.cooked_date)}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-on-surface-variant font-black mb-1">Cooked time</p>
                        <div className="rounded-xl bg-surface-container px-4 py-3 font-bold text-on-surface">
                          {formatTime(selectedMeal.cooked_time)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                <section className="rounded-[2rem] bg-surface-container-lowest border border-outline-variant/10 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary">inventory_2</span>
                    <h2 className="font-headline text-xl font-bold text-on-surface">Ingredient usage</h2>
                  </div>
                  <IngredientUsageTable
                    meal={selectedMeal}
                    onWasteIngredient={handleWasteIngredient}
                    savingKey={savingKey}
                  />
                </section>

                <aside className="space-y-4">
                  <WasteControls
                    meal={selectedMeal}
                    mode={wasteMode}
                    setMode={setWasteMode}
                    onWasteMeal={handleWasteMeal}
                    savingKey={savingKey}
                  />

                  <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/10 p-5 shadow-sm">
                    <h2 className="font-headline text-xl font-bold text-on-surface mb-3">Waste history</h2>
                    {mealWasteHistory(selectedMeal).length ? (
                      <div className="space-y-3">
                        {mealWasteHistory(selectedMeal).slice(-5).reverse().map((event) => (
                          <div key={event.id || `${event.item_name}-${event.created_at}`} className="rounded-xl bg-surface-container px-3 py-2">
                            <p className="font-bold text-on-surface">{prettyName(event.item_name, 'Meal')}</p>
                            <p className="text-xs text-on-surface-variant">
                              {formatGrams(event.quantity_grams)} · {formatMoney(event.cost_impact)} · {event.reason || 'Wasted'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant">No waste logged for this cooked meal yet.</p>
                    )}
                  </div>
                </aside>
              </div>
            </main>
          )}
        </div>
      )}
    </div>
  )
}
