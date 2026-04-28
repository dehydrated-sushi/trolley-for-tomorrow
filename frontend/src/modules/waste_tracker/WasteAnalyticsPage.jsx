import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '../../shared/toastBus'
import {
  clearCookedMeal,
  getCookedMeals,
  logCookedMealAction,
  subscribeCookedMeals,
} from '../../shared/cookedMeals'

const EASE = [0.22, 1, 0.36, 1]

function formatDateTime(value) {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  return date.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function clampPortion(value, remaining) {
  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed <= 0) return 0
  return Math.min(parsed, remaining)
}

function SummaryCard({ icon, label, value, tone = 'emerald' }) {
  const toneStyles = {
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-100',
    lime: 'bg-lime-50 text-lime-950 border-lime-100',
    red: 'bg-red-50 text-red-900 border-red-100',
    slate: 'bg-slate-50 text-slate-900 border-slate-200',
  }

  return (
    <div className={`rounded-[1.75rem] border p-5 ${toneStyles[tone]}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined">{icon}</span>
        <span className="text-xs uppercase tracking-widest font-bold opacity-70">{label}</span>
      </div>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  )
}

function ActionButton({ icon, label, tone, onClick, disabled = false }) {
  const toneClasses = {
    emerald: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    red: 'bg-white border border-red-200 hover:bg-red-50 text-red-600',
    slate: 'bg-slate-100 hover:bg-slate-200 text-slate-800',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${toneClasses[tone]}`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  )
}

function CookedMealCard({ meal }) {
  const remaining = Math.max(meal.cookedAmount - meal.consumedAmount - meal.wastedAmount, 0)
  const [portion, setPortion] = useState(() => Math.min(meal.suggestedPortion || 25, remaining || 25))

  useEffect(() => {
    setPortion(Math.min(meal.suggestedPortion || 25, remaining || 25))
  }, [meal.suggestedPortion, remaining, meal.id])

  function handleEat() {
    const amount = clampPortion(portion, remaining)
    if (amount <= 0) {
      toast.show({ message: 'Enter an amount to log first.', tone: 'muted' })
      return
    }
    const applied = logCookedMealAction(meal.id, 'eat', amount)
    toast.show({ message: `Logged ${applied}g eaten from ${meal.name}.` })
  }

  function handleWaste() {
    const amount = clampPortion(portion, remaining)
    if (amount <= 0) {
      toast.show({ message: 'Enter an amount to log first.', tone: 'muted' })
      return
    }
    const applied = logCookedMealAction(meal.id, 'waste', amount)
    toast.show({
      message: `Logged ${applied}g wasted from ${meal.name}.`,
      tone: 'error',
    })
  }

  function handleRemove() {
    clearCookedMeal(meal.id)
    toast.show({ message: `${meal.name} removed from cooked meals.` })
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[11px] font-bold uppercase tracking-widest mb-3">
            Cooked {formatDateTime(meal.createdAt)}
          </div>
          <h2 className="text-2xl font-extrabold text-emerald-950">{meal.name}</h2>
          <p className="text-sm text-emerald-800/70 mt-2">
            Use this page to log what was eaten and what was wasted after cooking.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRemove}
          className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700/70 hover:text-red-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MiniMetric label="Cooked" value={`${meal.cookedAmount}g`} />
        <MiniMetric label="Eaten" value={`${meal.consumedAmount}g`} tone="emerald" />
        <MiniMetric label="Left" value={`${remaining}g`} tone="lime" />
        <MiniMetric label="Wasted" value={`${meal.wastedAmount}g`} tone="red" />
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2 text-sm font-semibold text-emerald-900">
          <span>Meal flow</span>
          <span>{meal.consumedAmount + meal.wastedAmount}g logged</span>
        </div>
        <div className="h-3 w-full rounded-full overflow-hidden bg-emerald-50">
          <div className="h-full flex">
            <div className="bg-emerald-600" style={{ width: `${meal.cookedAmount ? (meal.consumedAmount / meal.cookedAmount) * 100 : 0}%` }} />
            <div className="bg-lime-400" style={{ width: `${meal.cookedAmount ? (remaining / meal.cookedAmount) * 100 : 0}%` }} />
            <div className="bg-red-400" style={{ width: `${meal.cookedAmount ? (meal.wastedAmount / meal.cookedAmount) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-end">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700/60 block mb-2">
            Log amount (g)
          </span>
          <input
            type="number"
            min="1"
            max={remaining}
            value={portion}
            onChange={(event) => setPortion(event.target.value)}
            className="w-full rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-950 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionButton
            icon="restaurant"
            label="Eat"
            tone="emerald"
            onClick={handleEat}
            disabled={remaining <= 0}
          />
          <ActionButton
            icon="delete"
            label="Waste"
            tone="red"
            onClick={handleWaste}
            disabled={remaining <= 0}
          />
          <ActionButton
            icon="done_all"
            label="Eat all"
            tone="slate"
            onClick={() => {
              const applied = logCookedMealAction(meal.id, 'eat', remaining)
              toast.show({ message: `Logged the final ${applied}g as eaten.` })
            }}
            disabled={remaining <= 0}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        {meal.calories != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-3 py-1 font-semibold">
            <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
            {Math.round(meal.calories)} kcal
          </span>
        )}
        {meal.minutes != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-3 py-1 font-semibold">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {meal.minutes} min
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-3 py-1 font-semibold">
          <span className="material-symbols-outlined text-[14px]">payments</span>
          Est. cost ${meal.estimatedCost.toFixed(2)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-3 py-1 font-semibold">
          <span className="material-symbols-outlined text-[14px]">co2</span>
          Est. CO2e {meal.estimatedCarbon.toFixed(2)} kg
        </span>
      </div>
    </motion.article>
  )
}

function MiniMetric({ label, value, tone = 'slate' }) {
  const toneStyles = {
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    lime: 'bg-lime-50 border-lime-100 text-lime-950',
    red: 'bg-red-50 border-red-100 text-red-900',
  }

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneStyles[tone]}`}>
      <p className="text-[11px] uppercase tracking-widest font-bold opacity-60 mb-1">{label}</p>
      <p className="text-xl font-extrabold">{value}</p>
    </div>
  )
}

export default function WasteAnalyticsPage() {
  const [meals, setMeals] = useState(() => getCookedMeals())

  useEffect(() => {
    const syncMeals = (nextMeals) => {
      if (Array.isArray(nextMeals)) setMeals(nextMeals)
      else setMeals(getCookedMeals())
    }

    const unsubscribe = subscribeCookedMeals(syncMeals)
    syncMeals(getCookedMeals())
    return unsubscribe
  }, [])

  const activeMeals = meals.filter((meal) => meal.status !== 'finished' && meal.leftoverAmount > 0)
  const completedMeals = meals.filter((meal) => meal.status === 'finished' || meal.leftoverAmount === 0)

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => {
        acc.eaten += meal.consumedAmount || 0
        acc.wasted += meal.wastedAmount || 0
        acc.wasteCost += (meal.estimatedCost || 0) * ((meal.wastedAmount || 0) / Math.max(meal.cookedAmount || 1, 1))
        acc.wasteCarbon += (meal.estimatedCarbon || 0) * ((meal.wastedAmount || 0) / Math.max(meal.cookedAmount || 1, 1))
        return acc
      },
      { eaten: 0, wasted: 0, wasteCost: 0, wasteCarbon: 0 }
    )
  }, [meals])

  return (
    <div className="px-6 md:px-10 max-w-7xl mx-auto pb-12">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mb-8"
      >
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 md:p-7 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold uppercase tracking-widest mb-4">
                Meal Plan → Cook → Waste Tracking
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-emerald-950 mb-3">Waste Analytics</h1>
              <p className="text-emerald-800/75 leading-relaxed">
                Track what happened after cooking. Each meal can be eaten or wasted in simple portions, so you can see how much was used and how much was lost.
              </p>
            </div>

            <Link
              to="/meals"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-900 text-white px-5 py-3 font-bold hover:bg-emerald-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
              Cook another meal
            </Link>
          </div>
        </div>
      </motion.header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <SummaryCard icon="inventory_2" label="Active meals" value={String(activeMeals.length)} />
        <SummaryCard icon="restaurant" label="Eaten" value={`${totals.eaten}g`} tone="emerald" />
        <SummaryCard icon="delete" label="Wasted" value={`${totals.wasted}g`} tone="red" />
        <SummaryCard icon="payments" label="Waste cost" value={`$${totals.wasteCost.toFixed(2)}`} tone="slate" />
        <SummaryCard icon="co2" label="Waste CO2e" value={`${totals.wasteCarbon.toFixed(2)} kg`} tone="slate" />
      </section>

      {activeMeals.length === 0 ? (
        <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-10 text-center">
          <span className="material-symbols-outlined text-[56px] text-emerald-500 mb-4">skillet</span>
          <h2 className="text-2xl font-extrabold text-emerald-950 mb-3">No cooked meals yet</h2>
          <p className="text-emerald-800/75 max-w-xl mx-auto mb-6">
            Start from the Meal Plan page, choose a recipe, and press <strong>Cook Meal</strong>. It will appear here in your waste tracking flow with simple Eat and Waste controls.
          </p>
          <Link
            to="/meals"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-900 text-white px-5 py-3 font-bold hover:bg-emerald-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            Go to Meal Plans
          </Link>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-6">
            {activeMeals.map((meal) => (
              <CookedMealCard key={meal.id} meal={meal} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {completedMeals.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-emerald-700">history</span>
            <h2 className="text-2xl font-extrabold text-emerald-950">Completed meals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedMeals.slice(0, 6).map((meal) => (
              <div key={meal.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{meal.name}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Finished {formatDateTime(meal.lastActionAt || meal.createdAt)}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                    done
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                  <MiniMetric label="Cooked" value={`${meal.cookedAmount}g`} />
                  <MiniMetric label="Eaten" value={`${meal.consumedAmount}g`} tone="emerald" />
                  <MiniMetric label="Wasted" value={`${meal.wastedAmount}g`} tone="red" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
