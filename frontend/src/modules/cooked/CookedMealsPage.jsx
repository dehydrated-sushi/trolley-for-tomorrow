import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../../lib/api'

const EASE = [0.22, 1, 0.36, 1]

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

function formatGrams(value) {
  const grams = Number(value)
  if (!Number.isFinite(grams) || grams <= 0) return null
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`
  return `${Math.round(grams)} g`
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

function CookedMealCard({ meal, index }) {
  const weight = formatGrams(meal.quantity_grams)
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04, ease: EASE }}
      className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 px-5 py-4 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-emerald-700" style={{ fontVariationSettings: "'FILL' 1" }}>
            restaurant
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-headline text-lg font-bold text-on-surface leading-tight truncate">
                {meal.recipe_name || meal.name}
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                {formatDate(meal.cooked_date)}
                {daysAgo(meal.cooked_date) ? ` · ${daysAgo(meal.cooked_date)}` : ''}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold shrink-0">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Cooked
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {meal.servings && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-semibold">
                <span className="material-symbols-outlined text-sm">room_service</span>
                {meal.servings}
              </span>
            )}
            {weight && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-semibold">
                <span className="material-symbols-outlined text-sm">scale</span>
                {weight}
              </span>
            )}
          </div>

          {meal.notes && (
            <p className="mt-3 text-sm text-on-surface-variant bg-amber-50/70 rounded-xl px-3 py-2">
              {meal.notes}
            </p>
          )}
        </div>
      </div>
    </motion.article>
  )
}

export default function CookedMealsPage() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    apiFetch('/api/waste/cooked-meals?days=30')
      .then((data) => {
        if (!ignore) setMeals(data?.cooked_meals || [])
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

  const stats = useMemo(() => {
    const totalGrams = meals.reduce((sum, meal) => sum + Number(meal.quantity_grams || 0), 0)
    const uniqueRecipes = new Set(meals.map((meal) => meal.recipe_id || meal.recipe_name || meal.name)).size
    const todayCount = meals.filter((meal) => daysAgo(meal.cooked_date) === 'Today').length
    return {
      totalGrams,
      uniqueRecipes,
      todayCount,
    }
  }, [meals])

  return (
    <div className="px-6 md:px-12 max-w-6xl mx-auto pb-12">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Cooked History</p>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">
            Cooked meals
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed mt-3">
            Meals you marked as cooked from your recommendations. This feeds the low-waste analytics view.
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
            Go to Meal Plans and press Mark cooked on a recipe. It will appear here.
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
        <section className="space-y-3">
          {meals.map((meal, index) => (
            <CookedMealCard key={meal.event_id || meal.id} meal={meal} index={index} />
          ))}
        </section>
      )}
    </div>
  )
}
