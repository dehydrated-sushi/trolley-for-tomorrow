import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API_BASE, apiFetch } from '../../lib/api'
import { getCategoryInfo } from '../../shared/nutrition'
import { addItem as addToShopping } from '../../shared/shoppingList'
import { toast } from '../../shared/toastBus'

const EASE = [0.22, 1, 0.36, 1]
const WASTE_FRACTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: 'All', value: 1 },
]
const SMALL_NAME_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

function prettyName(value, fallback = 'Cooked meal') {
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

function formatDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTime(value) {
  if (!value) return 'Time not recorded'
  const [hours, minutes] = String(value).split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatGrams(value) {
  const grams = Number(value)
  if (!Number.isFinite(grams) || grams <= 0) return null
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`
  return `${Math.round(grams)} g`
}

function money(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return '$0.00'
  return `$${amount.toFixed(2)}`
}

function parseAmount(value, fallback = 0) {
  if (value === '' || value == null) return Number(fallback || 0)
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
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

function normaliseUsage(meal) {
  const rows = meal?.ingredient_usage || meal?.metadata?.ingredient_usage || []
  if (rows.length) {
    return rows.map((row, index) => ({
      id: row.id || `${row.item || row.recipe_ingredient || 'item'}-${index}`,
      item: prettyName(row.item || row.recipe_ingredient, `Ingredient ${index + 1}`),
      category: row.category || 'other',
      usage: row.usage || (row.grams_used ? `${formatGrams(row.grams_used)} used` : 'Used from fridge'),
      remaining: row.remaining || 'Tracked in fridge',
      status: row.status || 'partial',
      grams_used: Number(row.grams_used || row.quantity_grams || 0),
      cost_impact: Number(row.cost_impact || 0),
    }))
  }

  return [{
    id: 'meal-total',
    item: prettyName(meal?.recipe_name || meal?.name, 'Cooked meal'),
    category: 'other',
    usage: formatGrams(meal?.quantity_grams) ? `${formatGrams(meal.quantity_grams)} used` : 'Used from fridge',
    remaining: 'Ingredient detail not recorded',
    status: 'used',
    grams_used: Number(meal?.quantity_grams || 0),
    cost_impact: 0,
  }]
}

function scaledCost(row, grams) {
  const baseGrams = Number(row?.grams_used || 0)
  const baseCost = Number(row?.cost_impact || 0)
  if (!baseGrams || !baseCost) return 0
  return (Number(grams || 0) / baseGrams) * baseCost
}

function co2ForGrams(grams) {
  return Number(grams || 0) > 0
    ? ((Number(grams) / 1000) * 2.5).toFixed(1)
    : '0.0'
}

function actionLabel(action) {
  if (action === 'saved_leftover') return 'Saved leftovers'
  if (action === 'wasted') return 'Logged waste'
  return 'Cooked'
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

function RecipeHero({ meal }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [meal?.recipe_id])

  return (
    <div className="relative min-h-[260px] overflow-hidden rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none bg-emerald-100">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="material-symbols-outlined text-[112px] text-emerald-700/70">restaurant</span>
      </div>
      {meal?.recipe_id && !failed && (
        <img
          src={`${API_BASE}/api/meals/recipe-image/${meal.recipe_id}`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <span className="absolute left-4 top-4 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow-sm">
        Ready to confirm
      </span>
    </div>
  )
}

function IngredientUsageTable({
  rows,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
}) {
  return (
    <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xl font-headline font-black text-on-surface">
          <span className="material-symbols-outlined text-primary">inventory_2</span>
          Ingredient Usage
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'partial', 'used'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onStatusFilterChange(filter)}
              className={`rounded-full px-3 py-1 text-xs font-black transition-colors ${
                statusFilter === filter
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'partial' ? 'Partial' : 'Used up'}
            </button>
          ))}
        </div>
      </div>

      <label className="mb-4 flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface px-3 py-2">
        <span className="material-symbols-outlined text-base text-on-surface-variant">search</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search used ingredients"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/70"
        />
      </label>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant/20 text-xs uppercase tracking-widest text-on-surface-variant">
              <th className="py-3 pr-3 font-black">Item</th>
              <th className="py-3 pr-3 font-black">Category</th>
              <th className="py-3 pr-3 font-black">Usage</th>
              <th className="py-3 pr-3 font-black">Remaining</th>
              <th className="py-3 pr-3 font-black">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const info = getCategoryInfo(row.category)
              const selected = row.id === selectedId
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.id)}
                  className={`cursor-pointer border-b border-outline-variant/10 transition-colors last:border-0 ${
                    selected ? 'bg-primary/10' : 'hover:bg-surface-container-low'
                  }`}
                >
                  <td className="py-3 pr-3 font-bold text-on-surface">{row.item}</td>
                  <td className="py-3 pr-3">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black"
                      style={{ backgroundColor: info.bg, color: info.colour }}
                    >
                      {info.label}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-on-surface-variant font-semibold">{row.usage}</td>
                  <td className="py-3 pr-3 text-on-surface-variant font-semibold">{row.remaining}</td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-black ${
                      row.status === 'used' ? 'text-slate-500' : 'text-emerald-700'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        row.status === 'used' ? 'bg-slate-300' : 'bg-emerald-500'
                      }`} />
                      {row.status === 'used' ? 'Used' : 'Partial'}
                    </span>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                  No ingredients match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function UsageSnapshot({ rows, selectedRow }) {
  const totalGrams = rows.reduce((sum, row) => sum + Number(row.grams_used || 0), 0)
  const totalCost = rows.reduce((sum, row) => sum + Number(row.cost_impact || 0), 0)
  const partialCount = rows.filter((row) => row.status !== 'used').length

  return (
    <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Ingredients</p>
        <p className="mt-1 text-2xl font-black text-on-surface">{rows.length}</p>
      </div>
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Used weight</p>
        <p className="mt-1 text-2xl font-black text-on-surface">{formatGrams(totalGrams) || 'N/A'}</p>
      </div>
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Tracked cost</p>
        <p className="mt-1 text-2xl font-black text-on-surface">{money(totalCost)}</p>
      </div>
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Selected</p>
        <p className="mt-1 truncate text-lg font-black text-primary">{selectedRow?.item || 'None'}</p>
        <p className="text-xs text-on-surface-variant">{partialCount} partial item{partialCount === 1 ? '' : 's'}</p>
      </div>
    </section>
  )
}

function SelectedIngredientPanel({
  row,
  amountDraft,
  onAmountChange,
  usedAmount,
  throwAmount,
  throwCost,
  onWastePercent,
  onBringBack,
}) {
  const info = getCategoryInfo(row?.category || 'other')
  return (
    <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
      <h3 className="mb-4 text-sm uppercase tracking-widest text-on-surface-variant font-black">Selected ingredient</h3>
      <div className="flex items-start gap-3">
        <span
          className="material-symbols-outlined rounded-2xl p-3"
          style={{ color: info.colour, backgroundColor: info.bg }}
        >
          {info.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black text-on-surface">{row?.item || 'No ingredient selected'}</p>
          <p className="mt-1 text-sm font-semibold text-on-surface-variant">{row?.usage || 'Choose an ingredient row'}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface-container px-2 py-2">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Recorded</p>
          <p className="mt-1 text-sm font-black text-on-surface">{formatGrams(row?.grams_used) || 'N/A'}</p>
        </div>
        <div className="rounded-xl bg-surface-container px-2 py-2">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Could throw</p>
          <p className="mt-1 text-sm font-black text-red-600">{formatGrams(throwAmount) || '0 g'}</p>
        </div>
        <div className="rounded-xl bg-surface-container px-2 py-2">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Waste cost</p>
          <p className="mt-1 text-sm font-black text-red-600">{money(throwCost)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Used in meal (g)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={amountDraft.used}
            onChange={(event) => onAmountChange('used', event.target.value)}
            className="mt-1 w-full rounded-xl border border-outline-variant/30 bg-white px-3 py-2 text-sm font-black text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Could throw (g)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={amountDraft.throw}
            onChange={(event) => onAmountChange('throw', event.target.value)}
            className="mt-1 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-black text-on-surface focus:outline-none focus:ring-2 focus:ring-red-200"
          />
        </label>
      </div>

      <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
        Used {formatGrams(usedAmount) || '0 g'} in the meal. If wasted, log {formatGrams(throwAmount) || '0 g'}.
      </div>

      <div className="mt-3">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Meal wasted</p>
        <div className="grid grid-cols-4 gap-2">
          {WASTE_FRACTIONS.map((option) => {
            const target = Math.round(usedAmount * option.value)
            const selected = Math.round(throwAmount) === target
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => onWastePercent(option.value)}
                className={`rounded-xl px-2 py-2 text-xs font-black transition-colors ${
                  selected
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={!row}
        onClick={onBringBack}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high px-4 py-3 text-sm font-black text-on-surface hover:bg-primary/10 hover:text-primary disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">add_shopping_cart</span>
        Bring back to shopping list
      </button>
    </section>
  )
}

function CookedMealBrowser({ meals, selectedId, onSelect, query, onQueryChange }) {
  return (
    <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-black">All cooked meals</p>
          <h2 className="mt-1 text-2xl font-headline font-black text-on-surface">Choose a meal to inspect</h2>
        </div>
        <label className="flex min-w-[240px] items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface px-3 py-2">
          <span className="material-symbols-outlined text-base text-on-surface-variant">search</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search meals"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/70"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {meals.map((meal, index) => {
          const selected = (meal.event_id || meal.id) === selectedId
          const weight = formatGrams(meal.quantity_grams)
          return (
            <motion.button
              key={meal.event_id || meal.id}
              type="button"
              onClick={() => onSelect(meal)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: index * 0.025, ease: EASE }}
              className={`min-h-[132px] rounded-2xl border px-4 py-4 text-left transition-colors ${
                selected
                  ? 'border-primary bg-primary text-on-primary shadow-md'
                  : 'border-outline-variant/20 bg-surface-container-low text-on-surface hover:border-primary/40 hover:bg-surface-container'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-base font-black leading-tight">
                    {prettyName(meal.recipe_name || meal.name)}
                  </p>
                  <p className={`mt-1 text-xs font-semibold ${selected ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                    {formatDate(meal.cooked_date)}
                    {daysAgo(meal.cooked_date) ? ` · ${daysAgo(meal.cooked_date)}` : ''}
                  </p>
                </div>
                <span className={`material-symbols-outlined shrink-0 ${selected ? 'text-on-primary' : 'text-primary'}`}>
                  {selected ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                  selected ? 'bg-white/15 text-on-primary' : 'bg-surface text-on-surface-variant'
                }`}>
                  <span className="material-symbols-outlined text-sm">room_service</span>
                  {meal.servings || '1 serving'}
                </span>
                {weight && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                    selected ? 'bg-white/15 text-on-primary' : 'bg-surface text-on-surface-variant'
                  }`}>
                    <span className="material-symbols-outlined text-sm">scale</span>
                    {weight}
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {meals.length === 0 && (
        <div className="rounded-2xl bg-surface-container-low px-4 py-8 text-center text-sm text-on-surface-variant">
          No cooked meals match your search.
        </div>
      )}
    </section>
  )
}

export default function CookedMealsPage() {
  const [meals, setMeals] = useState([])
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [selectedWasteId, setSelectedWasteId] = useState('')
  const [wasteMode, setWasteMode] = useState('ingredient')
  const [wasteReason, setWasteReason] = useState('Expired')
  const [ingredientQuery, setIngredientQuery] = useState('')
  const [mealQuery, setMealQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activityLog, setActivityLog] = useState([])
  const [amountDrafts, setAmountDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionBusy, setActionBusy] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    apiFetch('/api/waste/cooked-meals?days=30')
      .then((data) => {
        if (ignore) return
        const cooked = data?.cooked_meals || []
        setMeals(cooked)
        setSelectedMeal((current) => current || cooked[0] || null)
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

  const ingredientRows = useMemo(() => normaliseUsage(selectedMeal), [selectedMeal])
  const visibleMeals = useMemo(() => {
    const q = mealQuery.trim().toLowerCase()
    if (!q) return meals
    return meals.filter((meal) => (
      (meal.recipe_name || meal.name || '').toLowerCase().includes(q)
      || formatDate(meal.cooked_date).toLowerCase().includes(q)
    ))
  }, [meals, mealQuery])
  const filteredIngredientRows = useMemo(() => {
    const q = ingredientQuery.trim().toLowerCase()
    return ingredientRows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter
      const matchesQuery = !q || row.item.toLowerCase().includes(q) || row.category.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [ingredientRows, ingredientQuery, statusFilter])
  const selectedWasteItem = ingredientRows.find((row) => row.id === selectedWasteId) || ingredientRows[0]
  const selectedMealId = selectedMeal?.event_id || selectedMeal?.id
  const mealUsedGrams = (
    ingredientRows.reduce((sum, row) => sum + Number(row.grams_used || 0), 0)
    || Number(selectedMeal?.quantity_grams || 0)
  )
  const totalCost = ingredientRows.reduce((sum, row) => sum + Number(row.cost_impact || 0), 0)
  const ingredientAmountKey = `${selectedMealId || 'meal'}:${selectedWasteItem?.id || 'ingredient'}`
  const mealAmountKey = `${selectedMealId || 'meal'}:whole-meal`
  const amountDraft = amountDrafts[ingredientAmountKey] || {
    used: selectedWasteItem?.grams_used ? String(Math.round(selectedWasteItem.grams_used)) : '',
    throw: selectedWasteItem?.grams_used ? String(Math.round(selectedWasteItem.grams_used)) : '',
  }
  const mealAmountDraft = amountDrafts[mealAmountKey] || {
    used: mealUsedGrams ? String(Math.round(mealUsedGrams)) : '',
    throw: mealUsedGrams ? String(Math.round(mealUsedGrams)) : '',
  }
  const usedAmount = parseAmount(amountDraft.used, selectedWasteItem?.grams_used || 0)
  const throwAmount = parseAmount(amountDraft.throw, selectedWasteItem?.grams_used || 0)
  const throwCost = scaledCost(selectedWasteItem, throwAmount)
  const mealUsedAmount = parseAmount(mealAmountDraft.used, mealUsedGrams)
  const mealThrowAmount = parseAmount(mealAmountDraft.throw, mealUsedGrams)
  const mealThrowCost = scaledCost({ grams_used: mealUsedGrams, cost_impact: totalCost }, mealThrowAmount)
  const isMealWasteMode = wasteMode === 'meal'
  const activeAmountDraft = isMealWasteMode ? mealAmountDraft : amountDraft
  const activeUsedAmount = isMealWasteMode ? mealUsedAmount : usedAmount
  const activeThrowAmount = isMealWasteMode ? mealThrowAmount : throwAmount
  const activeThrowCost = isMealWasteMode ? mealThrowCost : throwCost
  const activeThrowCo2 = co2ForGrams(activeThrowAmount)
  const activeWasteTarget = isMealWasteMode
    ? prettyName(selectedMeal?.recipe_name || selectedMeal?.name, 'Cooked meal')
    : (selectedWasteItem?.item || 'Ingredient')

  useEffect(() => {
    setSelectedWasteId(ingredientRows[0]?.id || '')
    setWasteMode('ingredient')
    setWasteReason('Expired')
    setIngredientQuery('')
    setStatusFilter('all')
  }, [selectedMealId, ingredientRows])

  const stats = useMemo(() => {
    const totalGrams = meals.reduce((sum, meal) => sum + Number(meal.quantity_grams || 0), 0)
    const uniqueRecipes = new Set(meals.map((meal) => meal.recipe_id || meal.recipe_name || meal.name)).size
    const todayCount = meals.filter((meal) => daysAgo(meal.cooked_date) === 'Today').length
    return { totalGrams, uniqueRecipes, todayCount }
  }, [meals])

  const updateAmountDraftForKey = (key, draft, field, value) => {
    setAmountDrafts((prev) => ({
      ...prev,
      [key]: {
        ...draft,
        [field]: value,
      },
    }))
  }

  const updateAmountDraft = (field, value) => {
    updateAmountDraftForKey(ingredientAmountKey, amountDraft, field, value)
  }

  const updateMealAmountDraft = (field, value) => {
    updateAmountDraftForKey(mealAmountKey, mealAmountDraft, field, value)
  }

  const updateActiveAmountDraft = (field, value) => {
    if (isMealWasteMode) updateMealAmountDraft(field, value)
    else updateAmountDraft(field, value)
  }

  const selectMeal = (meal) => {
    setSelectedMeal(meal)
    window.setTimeout(() => {
      document.getElementById('cooked-meal-detail')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 0)
  }

  const applyWastePercent = (fraction) => {
    const nextThrow = Math.round(activeUsedAmount * fraction)
    updateActiveAmountDraft('throw', String(nextThrow))
  }

  const applyIngredientWastePercent = (fraction) => {
    const nextThrow = Math.round(usedAmount * fraction)
    updateAmountDraft('throw', String(nextThrow))
  }

  const logWasteEvent = async (eventType) => {
    if (!selectedMeal || !selectedWasteItem) return
    const eventGrams = eventType === 'wasted' ? activeThrowAmount : activeUsedAmount
    if (eventGrams <= 0) {
      toast.show({
        message: 'Enter an amount greater than 0 g first',
        tone: 'error',
      })
      return
    }
    setActionBusy(eventType)
    try {
      await apiFetch('/api/waste/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: selectedMeal.recipe_id,
          recipe_name: selectedMeal.recipe_name || selectedMeal.name,
          item_name: activeWasteTarget,
          category: isMealWasteMode ? 'meal' : selectedWasteItem.category,
          event_type: eventType,
          quantity_grams: eventGrams,
          quantity_label: `${Math.round(eventGrams)} g`,
          cost_impact: eventType === 'wasted'
            ? activeThrowCost
            : (
                isMealWasteMode
                  ? scaledCost({ grams_used: mealUsedGrams, cost_impact: totalCost }, eventGrams)
                  : scaledCost(selectedWasteItem, eventGrams)
              ),
          reason: eventType === 'saved_leftover' ? 'Saved as leftover' : wasteReason,
          event_date: selectedMeal.cooked_date,
          metadata: {
            source: 'cooked_meals_page',
            cooked_event_id: selectedMeal.event_id || selectedMeal.id,
            waste_mode: wasteMode,
            selected_ingredient: selectedWasteItem.item,
            used_grams: activeUsedAmount,
            possible_waste_grams: activeThrowAmount,
          },
        }),
      })
      toast.show({
        message: eventType === 'saved_leftover'
          ? `${activeWasteTarget} saved as leftovers`
          : `${activeWasteTarget} logged as waste`,
      })
      setActivityLog((prev) => [
        {
          id: `${Date.now()}_${eventType}`,
          label: actionLabel(eventType),
          item: `${activeWasteTarget} · ${Math.round(eventGrams)} g`,
          at: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ].slice(0, 4))
    } catch (err) {
      toast.show({
        message: err.message || 'Could not log cooked meal action',
        tone: 'error',
      })
    } finally {
      setActionBusy('')
    }
  }

  const bringSelectedBackToShopping = () => {
    if (!selectedWasteItem) return
    const result = addToShopping(selectedWasteItem.item, { source: 'cooked' })
    if (result.added) {
      toast.show({ message: `${selectedWasteItem.item} added to shopping list` })
      setActivityLog((prev) => [
        {
          id: `${Date.now()}_shopping`,
          label: 'Added to shopping list',
          item: selectedWasteItem.item,
          at: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ].slice(0, 4))
      return
    }
    toast.show({ message: `${selectedWasteItem.item} is already in your shopping list`, tone: 'muted' })
  }

  return (
    <div className="px-6 md:px-12 max-w-7xl mx-auto pb-12">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Fridge cooked</p>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">
            Cooked meals
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed mt-3">
            Review what you cooked, which fridge items were used, and log leftovers or food waste from the same place.
          </p>
        </div>
        <Link
          to="/meals"
          className="inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-base">restaurant_menu</span>
          Find meals
        </Link>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <SummaryCard icon="restaurant" label="Cooked meals" value={meals.length} detail="Last 30 days" />
        <SummaryCard icon="calendar_today" label="Cooked today" value={stats.todayCount} detail="Marked today" />
        <SummaryCard
          icon="scale"
          label="Food used"
          value={formatGrams(stats.totalGrams) || 'N/A'}
          detail={`${stats.uniqueRecipes} unique recipe${stats.uniqueRecipes === 1 ? '' : 's'}`}
        />
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
            Go to Meal Plans and press Mark cooked on a recipe. It will appear here with usage data.
          </p>
          <Link
            to="/meals"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">restaurant_menu</span>
            Open Meal Plans
          </Link>
        </div>
      ) : selectedMeal && (
        <div className="space-y-6">
          <CookedMealBrowser
            meals={visibleMeals}
            selectedId={selectedMealId}
            onSelect={selectMeal}
            query={mealQuery}
            onQueryChange={setMealQuery}
          />

          <motion.section
            id="cooked-meal-detail"
            key={selectedMealId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="grid scroll-mt-28 grid-cols-1 lg:grid-cols-[0.95fr_1.9fr] overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm"
          >
            <RecipeHero meal={selectedMeal} />
            <div className="p-6 md:p-8 flex flex-col gap-7">
              <div>
                <h2 className="text-3xl md:text-4xl font-headline font-black text-on-surface leading-tight">
                  {prettyName(selectedMeal.recipe_name || selectedMeal.name)}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-bold">
                    <span className="material-symbols-outlined text-base">kitchen</span>
                    Uses {Math.max(ingredientRows.length, 1)} fridge item{ingredientRows.length === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-bold">
                    <span className="material-symbols-outlined text-base">room_service</span>
                    {selectedMeal.servings || '1 serving'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-bold">
                    <span className="material-symbols-outlined text-base">eco</span>
                    Waste impact tracking
                  </span>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-outline-variant/20 pt-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant font-black">Cooked date</p>
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm font-black text-on-surface">
                    {formatDate(selectedMeal.cooked_date)}
                    <span className="material-symbols-outlined text-base text-on-surface-variant">calendar_today</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant font-black">Cooked time</p>
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm font-black text-on-surface">
                    {formatTime(selectedMeal.cooked_time)}
                    <span className="material-symbols-outlined text-base text-on-surface-variant">schedule</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <UsageSnapshot rows={ingredientRows} selectedRow={selectedWasteItem} />

          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_0.75fr] gap-6">
            <div className="space-y-6">
              <IngredientUsageTable
                rows={filteredIngredientRows}
                selectedId={selectedWasteId}
                onSelect={setSelectedWasteId}
                query={ingredientQuery}
                onQueryChange={setIngredientQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
              <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
                <h3 className="mb-3 text-xl font-headline font-black text-on-surface">Cooking Notes</h3>
                <textarea
                  readOnly
                  value={selectedMeal.notes || ''}
                  placeholder="No cooking notes recorded for this meal."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm text-on-surface focus:outline-none"
                />
              </section>
            </div>

            <aside className="space-y-6">
              <SelectedIngredientPanel
                row={selectedWasteItem}
                amountDraft={amountDraft}
                onAmountChange={updateAmountDraft}
                usedAmount={usedAmount}
                throwAmount={throwAmount}
                throwCost={throwCost}
                onWastePercent={applyIngredientWastePercent}
                onBringBack={bringSelectedBackToShopping}
              />

              <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
                <h3 className="mb-4 text-sm uppercase tracking-widest text-on-surface-variant font-black">Confirm meal</h3>
                <div className="space-y-2">
                  <div className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-on-primary">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Marked as Cooked
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(actionBusy)}
                    onClick={() => logWasteEvent('saved_leftover')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3 text-sm font-black text-lime-950 hover:bg-lime-400 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-base">inventory</span>
                    Save Leftovers
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(actionBusy)}
                    onClick={() => logWasteEvent('wasted')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-black text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                    Waste It
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 shadow-sm">
                <h3 className="mb-4 flex items-center justify-between text-sm font-black text-on-surface">
                  Waste Log Entry
                  <span className="material-symbols-outlined text-base text-on-surface-variant">expand_more</span>
                </h3>
                <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setWasteMode('ingredient')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition-colors ${
                      wasteMode === 'ingredient'
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">nutrition</span>
                    Ingredient wise
                  </button>
                  <button
                    type="button"
                    onClick={() => setWasteMode('meal')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition-colors ${
                      wasteMode === 'meal'
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">room_service</span>
                    Meal wise
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {isMealWasteMode ? (
                    <div className="block">
                      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Target</span>
                      <div className="mt-1 rounded-xl border border-outline-variant/30 bg-white px-3 py-2 text-sm font-black text-on-surface">
                        Whole meal
                      </div>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Item</span>
                      <select
                        value={selectedWasteId}
                        onChange={(event) => setSelectedWasteId(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-outline-variant/30 bg-white px-3 py-2 text-sm font-semibold"
                      >
                        {ingredientRows.map((row) => (
                          <option key={row.id} value={row.id}>{row.item}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Reason</span>
                    <select
                      value={wasteReason}
                      onChange={(event) => setWasteReason(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-outline-variant/30 bg-white px-3 py-2 text-sm font-semibold"
                    >
                      <option>Expired</option>
                      <option>Cooked too much</option>
                      <option>Did not like it</option>
                      <option>Other</option>
                    </select>
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">
                      {isMealWasteMode ? 'Meal amount (g)' : 'Used in meal (g)'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={activeAmountDraft.used}
                      onChange={(event) => updateActiveAmountDraft('used', event.target.value)}
                      className="mt-1 w-full rounded-xl border border-outline-variant/30 bg-white px-3 py-2 text-sm font-semibold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Could throw (g)</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={activeAmountDraft.throw}
                      onChange={(event) => updateActiveAmountDraft('throw', event.target.value)}
                      className="mt-1 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold"
                    />
                  </label>
                </div>
                <div className="mt-3">
                  <p className="mb-2 text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Meal wasted</p>
                  <div className="grid grid-cols-4 gap-2">
                    {WASTE_FRACTIONS.map((option) => {
                      const target = Math.round(activeUsedAmount * option.value)
                      const selected = Math.round(activeThrowAmount) === target
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => applyWastePercent(option.value)}
                          className={`rounded-xl px-2 py-2 text-xs font-black transition-colors ${
                            selected
                              ? 'bg-red-600 text-white'
                              : 'bg-white text-red-700 hover:bg-red-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white p-3 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">Est. cost</p>
                    <p className="mt-1 text-lg font-black text-red-600">
                      {money(activeThrowCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">CO2e impact</p>
                    <p className="mt-1 text-lg font-black text-red-600">
                      {activeThrowCo2} kg
                    </p>
                  </div>
                </div>
              </section>

              {activityLog.length > 0 && (
                <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
                  <h3 className="mb-3 text-sm uppercase tracking-widest text-on-surface-variant font-black">Recent actions</h3>
                  <div className="space-y-2">
                    {activityLog.map((entry) => (
                      <div key={entry.id} className="rounded-xl bg-surface-container-low px-3 py-2">
                        <p className="text-sm font-black text-on-surface">{entry.label}</p>
                        <p className="text-xs text-on-surface-variant">{entry.item} · {entry.at}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
