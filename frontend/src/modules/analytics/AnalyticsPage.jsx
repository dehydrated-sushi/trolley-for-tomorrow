import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import { getCategoryInfo } from '../../shared/nutrition'

const EASE = [0.22, 1, 0.36, 1]
const SMALL_NAME_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

function prettyName(value, fallback = 'Unknown item') {
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

function kg(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0 kg'
  return `${number.toFixed(number >= 10 ? 1 : 2)} kg`
}

function money(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '$0.00'
  return `$${number.toFixed(2)}`
}

function percent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0%'
  return `${number.toFixed(number >= 10 ? 0 : 1)}%`
}

function grams(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '0 g'
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 1 : 2)} kg`
  return `${Math.round(number)} g`
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function trendValue(item) {
  return Number(item.weight_kg ?? item.food_waste_kg ?? 0)
}

function SummaryCard({ icon, label, value, detail, tone = 'primary' }) {
  const toneClass = tone === 'amber'
    ? 'bg-amber-100 text-amber-700'
    : tone === 'rose'
      ? 'bg-rose-100 text-rose-700'
      : 'bg-emerald-100 text-emerald-700'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined rounded-2xl p-2.5 ${toneClass}`}>{icon}</span>
        <div>
          <p className="text-sm font-semibold text-on-surface-variant">{label}</p>
          <p className="text-3xl font-black text-on-surface mt-1">{value}</p>
          {detail && <p className="text-xs text-on-surface-variant mt-1">{detail}</p>}
        </div>
      </div>
    </motion.div>
  )
}

function BreakdownBar({ item, total }) {
  const info = getCategoryInfo(item.category)
  const rawPct = total > 0 ? (Number(item.weight_grams || 0) / total) * 100 : 0
  const pct = rawPct > 0 ? Math.max(3, rawPct) : 0
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
        <span className="inline-flex items-center gap-2 font-semibold text-on-surface">
          <span className="material-symbols-outlined text-base" style={{ color: info.colour }}>
            {info.icon}
          </span>
          {info.label}
        </span>
        <span className="text-on-surface-variant tabular-nums">
          {kg(item.weight_kg)} · {percent(rawPct)}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-surface-container overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: info.colour }}
        />
      </div>
    </div>
  )
}

function MetricTile({ icon, label, value, detail, tone = 'primary' }) {
  const toneClass = tone === 'rose'
    ? 'bg-rose-50 text-rose-700'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-700'
      : tone === 'sky'
        ? 'bg-sky-50 text-sky-700'
        : 'bg-emerald-50 text-emerald-700'

  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined rounded-xl p-2 ${toneClass}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black">{label}</p>
          <p className="mt-1 text-xl font-black text-on-surface">{value}</p>
        </div>
      </div>
      {detail && <p className="mt-3 text-xs font-semibold leading-relaxed text-on-surface-variant">{detail}</p>}
    </div>
  )
}

function SavedVsWastedMeter({ savedKg, wastedKg }) {
  const total = savedKg + wastedKg
  const savedPct = total > 0 ? (savedKg / total) * 100 : 0
  const wastedPct = total > 0 ? (wastedKg / total) * 100 : 0

  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-bold text-on-surface">Food saved vs wasted</h2>
          <p className="text-sm text-on-surface-variant">How much cooked food was rescued compared with logged waste.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
          {percent(savedPct)} saved
        </span>
      </div>
      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-surface-container">
        <div className="h-full bg-emerald-500" style={{ width: `${savedPct}%` }} />
        <div className="h-full bg-rose-500" style={{ width: `${wastedPct}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-emerald-50 px-3 py-2">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-800">Saved</p>
          <p className="mt-1 font-black text-emerald-900">{kg(savedKg)}</p>
        </div>
        <div className="rounded-xl bg-rose-50 px-3 py-2">
          <p className="text-xs font-black uppercase tracking-widest text-rose-800">Wasted</p>
          <p className="mt-1 font-black text-rose-900">{kg(wastedKg)}</p>
        </div>
      </div>
    </div>
  )
}

function TrendBars({ trends, days }) {
  const max = Math.max(...trends.map((item) => trendValue(item)), 0.01)
  const scrollable = days >= 30
  const barWidth = days >= 60 ? 34 : 42
  const gap = days >= 60 ? 12 : 14
  const minChartWidth = scrollable
    ? `${Math.max(trends.length * (barWidth + gap), days >= 60 ? 1800 : 1280)}px`
    : undefined

  return (
    <div className={scrollable ? 'overflow-x-auto pb-3' : ''}>
      <div
        className="h-48 flex items-end"
        style={scrollable ? { minWidth: minChartWidth, gap: `${gap}px` } : { gap: '0.5rem' }}
      >
      {trends.map((item) => {
        const value = trendValue(item)
        return (
          <div
            key={`${item.date}-${item.end_date || item.date}`}
            className="flex flex-col items-center gap-2"
            style={scrollable ? { width: `${barWidth}px`, flex: `0 0 ${barWidth}px` } : { flex: '1 1 0', minWidth: 0 }}
          >
            <div className="w-full h-36 flex items-end rounded-xl bg-surface-container-low overflow-hidden">
              <div
                className="w-full rounded-t-xl bg-primary/80"
                style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
                title={`${item.title || formatDate(item.date)} · ${kg(value)}`}
              />
            </div>
            <span className="text-[10px] text-on-surface-variant truncate">{item.label || formatDate(item.date)}</span>
          </div>
        )
      })}
      </div>
    </div>
  )
}

function EmptyPanel({ title, body, action }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/10 p-8 text-center shadow-sm">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3">query_stats</span>
      <h2 className="font-headline text-xl font-bold text-on-surface">{title}</h2>
      <p className="text-on-surface-variant max-w-md mx-auto mt-2">{body}</p>
      {action && (
        <Link
          to={action.to}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-base">{action.icon}</span>
          {action.label}
        </Link>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    apiFetch(`/api/waste/analytics?days=${days}`)
      .then((payload) => {
        if (!ignore) setData(payload)
      })
      .catch((err) => {
        if (!ignore) setError(err.message || 'Could not load analytics')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [days])

  const summary = data?.weekly_summary || {}
  const breakdown = data?.waste_breakdown || []
  const topItems = data?.top_wasted_items || []
  const trends = data?.trends || []
  const insights = data?.smart_insights || []
  const atRisk = data?.at_risk_items || []
  const cookedMeals = data?.cooked_meals || []

  const totalBreakdownGrams = useMemo(
    () => breakdown.reduce((sum, item) => sum + Number(item.weight_grams || 0), 0),
    [breakdown]
  )
  const totalWastedKg = Number(summary.total_wasted_kg || 0)
  const savedFromWasteKg = Number(summary.saved_from_waste_kg || 0)
  const moneyLost = Number(summary.money_lost || 0)
  const co2ImpactKg = Number(summary.co2_impact_kg || 0)
  const cookedMealCount = Number(summary.cooked_meal_count || cookedMeals.length || 0)
  const preventionRate = totalWastedKg + savedFromWasteKg > 0
    ? (savedFromWasteKg / (totalWastedKg + savedFromWasteKg)) * 100
    : 0
  const wastePerCookedMeal = cookedMealCount > 0 ? totalWastedKg / cookedMealCount : 0
  const costPerKg = totalWastedKg > 0 ? moneyLost / totalWastedKg : 0
  const co2PerKg = totalWastedKg > 0 ? co2ImpactKg / totalWastedKg : 0
  const atRiskValue = atRisk.reduce((sum, item) => sum + Number(item.price || item.estimated_price || 0), 0)
  const avgWastePerDay = days > 0 ? totalWastedKg / days : 0
  const worstTrend = trends.reduce((worst, item) => (
    !worst || trendValue(item) > trendValue(worst) ? item : worst
  ), null)
  const bestTrend = trends.reduce((best, item) => (
    !best || trendValue(item) < trendValue(best) ? item : best
  ), null)
  const trendSubtitle = days >= 60
    ? 'Food waste by day, scroll horizontally to see the full period'
    : days >= 30
      ? 'Food waste by day, scroll horizontally for more spacing'
      : 'Food waste by day'

  return (
    <div className="px-6 md:px-12 max-w-7xl mx-auto pb-12">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Food Waste Analytics</p>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">
            Analytics
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed mt-3">
            Track food wasted, food saved, cooked meals, and items that need attention soon.
          </p>
        </div>

        <div className="inline-flex rounded-full bg-surface-container-high p-1">
          {[7, 30, 90].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={
                days === option
                  ? 'px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-bold'
                  : 'px-4 py-2 rounded-full text-on-surface-variant text-sm font-bold hover:text-on-surface'
              }
            >
              {option}d
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl bg-error-container/30 text-error px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-on-surface-variant animate-pulse text-lg">Loading analytics...</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              icon="delete"
              label="Food wasted"
              value={kg(summary.total_wasted_kg)}
              detail={`${days} day period`}
              tone="rose"
            />
            <SummaryCard
              icon="payments"
              label="Money lost"
              value={money(summary.money_lost)}
              detail="Estimated value"
              tone="amber"
            />
            <SummaryCard
              icon="eco"
              label="CO2 impact"
              value={kg(summary.co2_impact_kg)}
              detail="Approximate footprint"
            />
            <SummaryCard
              icon="restaurant"
              label="Cooked meals"
              value={summary.cooked_meal_count || 0}
              detail={`${kg(summary.saved_from_waste_kg)} food used/saved`}
            />
          </section>

          {Number(summary.total_wasted_grams || 0) <= 0 && cookedMeals.length === 0 ? (
            <EmptyPanel
              title="No analytics yet"
              body="Mark meals as cooked or log food waste to start building your weekly insights."
              action={{ to: '/meals', label: 'Open Meal Plans', icon: 'restaurant_menu' }}
            />
          ) : (
            <>
            <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6 mb-6">
              <SavedVsWastedMeter savedKg={savedFromWasteKg} wastedKg={totalWastedKg} />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <MetricTile
                  icon="health_metrics"
                  label="Prevention score"
                  value={percent(preventionRate)}
                  detail="Share of tracked food rescued by cooking or saving leftovers."
                />
                <MetricTile
                  icon="restaurant"
                  label="Waste per meal"
                  value={kg(wastePerCookedMeal)}
                  detail="Average waste compared with cooked meals in this period."
                  tone="rose"
                />
                <MetricTile
                  icon="attach_money"
                  label="Cost per kg wasted"
                  value={money(costPerKg)}
                  detail="Estimated grocery value lost for each kg of logged waste."
                  tone="amber"
                />
                <MetricTile
                  icon="eco"
                  label="CO2e per kg"
                  value={kg(co2PerKg)}
                  detail="Estimated climate impact per kg of discarded food."
                />
                <MetricTile
                  icon="event_busy"
                  label="At-risk value"
                  value={money(atRiskValue)}
                  detail={`${atRisk.length} fridge item${atRisk.length === 1 ? '' : 's'} expiring soon.`}
                  tone="sky"
                />
                <MetricTile
                  icon="calendar_month"
                  label="Daily waste rate"
                  value={kg(avgWastePerDay)}
                  detail={`Average per day across the selected ${days} day view.`}
                  tone="rose"
                />
              </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <section className="xl:col-span-2 space-y-6">
                <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div>
                      <h2 className="font-headline text-xl font-bold text-on-surface">Trends over time</h2>
                      <p className="text-sm text-on-surface-variant">{trendSubtitle}</p>
                    </div>
                    {summary.comparison_to_last_period_pct != null && (
                      <span className="rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 text-xs font-bold">
                        {summary.comparison_to_last_period_pct > 0 ? '+' : ''}
                        {summary.comparison_to_last_period_pct}% vs previous
                      </span>
                    )}
                  </div>
                  <TrendBars trends={trends} days={days} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-sm">
                    <h2 className="font-headline text-xl font-bold text-on-surface mb-1">Waste breakdown</h2>
                    <p className="text-sm text-on-surface-variant mb-5">By category</p>
                    {breakdown.length ? (
                      <div className="space-y-4">
                        {breakdown.map((item) => (
                          <BreakdownBar
                            key={item.category}
                            item={item}
                            total={totalBreakdownGrams}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant">No waste categories logged yet.</p>
                    )}
                  </div>

                  <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-sm">
                    <h2 className="font-headline text-xl font-bold text-on-surface mb-1">Top wasted items</h2>
                    <p className="text-sm text-on-surface-variant mb-5">Highest cost or weight impact</p>
                    {topItems.length ? (
                      <div className="space-y-3">
                        {topItems.map((item) => {
                          const info = getCategoryInfo(item.category)
                          return (
                            <div key={`${item.name}-${item.category}`} className="flex items-center gap-3">
                              <span
                                className="material-symbols-outlined rounded-xl p-2"
                                style={{ color: info.colour, backgroundColor: info.bg }}
                              >
                                {info.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-on-surface truncate">{prettyName(item.name)}</p>
                                <p className="text-xs text-on-surface-variant">
                                  {item.times_wasted} time{item.times_wasted === 1 ? '' : 's'} · {kg(item.weight_kg)}
                                </p>
                              </div>
                              <span className="text-sm font-bold text-on-surface">{money(item.cost_impact)}</span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant">No wasted items logged yet.</p>
                    )}
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-sm">
                  <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Smart insights</h2>
                  <div className="space-y-3">
                    {insights.length ? (
                      insights.map((insight) => (
                        <div key={insight} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                          {insight}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface-variant">
                        Cook a meal or log waste to generate smarter suggestions.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-sm">
                  <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Operational signals</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
                      <span className="font-semibold text-on-surface-variant">Highest waste day</span>
                      <span className="font-black text-on-surface">
                        {worstTrend ? `${formatDate(worstTrend.date)} · ${kg(trendValue(worstTrend))}` : 'No data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
                      <span className="font-semibold text-on-surface-variant">Lowest waste day</span>
                      <span className="font-black text-on-surface">
                        {bestTrend ? `${formatDate(bestTrend.date)} · ${kg(trendValue(bestTrend))}` : 'No data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
                      <span className="font-semibold text-on-surface-variant">Categories affected</span>
                      <span className="font-black text-on-surface">{breakdown.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
                      <span className="font-semibold text-on-surface-variant">Receipt value at risk</span>
                      <span className="font-black text-on-surface">{money(atRiskValue)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="font-headline text-xl font-bold text-on-surface">Cooked section</h2>
                    <Link to="/cooked-meals" className="text-xs font-bold text-primary hover:underline">
                      View all
                    </Link>
                  </div>
                  {cookedMeals.length ? (
                    <div className="space-y-3">
                      {cookedMeals.slice(0, 5).map((meal) => {
                        const usageRows = meal.ingredient_usage || meal.metadata?.ingredient_usage || []
                        return (
                        <div key={meal.event_id || meal.id} className="rounded-2xl bg-surface-container-low px-4 py-3">
                          <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined rounded-xl bg-emerald-100 text-emerald-700 p-2">
                            restaurant
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-on-surface truncate">
                              {prettyName(meal.recipe_name || meal.name, 'Cooked meal')}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {formatDate(meal.cooked_date)} · {grams(meal.quantity_grams)} used
                            </p>
                          </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
                            <span className="rounded-full bg-white px-2.5 py-1 text-on-surface-variant">
                              {usageRows.length || 1} ingredient{usageRows.length === 1 ? '' : 's'}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                              Waste tracked
                            </span>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface-variant">No cooked meals in this period.</p>
                  )}
                </div>

                <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-sm">
                  <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Expiring soon</h2>
                  {atRisk.length ? (
                    <div className="space-y-3">
                      {atRisk.map((item) => (
                        <div key={`${item.name}-${item.expiry_date}`} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-on-surface truncate">{prettyName(item.name)}</p>
                            <p className="text-xs text-on-surface-variant">{formatDate(item.expiry_date)}</p>
                          </div>
                          <span className="rounded-full bg-amber-50 text-amber-800 px-2.5 py-1 text-xs font-bold">
                            {item.days_until_expiry === 0 ? 'Today' : `${item.days_until_expiry}d`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface-variant">No urgent expiry risks.</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Link
                    to="/meals"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-on-primary px-4 py-3 text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-base">restaurant_menu</span>
                    Recipes for expiring items
                  </Link>
                  <Link
                    to="/fridge"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-container-high text-on-surface px-4 py-3 text-sm font-bold hover:bg-surface-container-highest transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">kitchen</span>
                    View fridge
                  </Link>
                </div>
              </aside>
            </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
