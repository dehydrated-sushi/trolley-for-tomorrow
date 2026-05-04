import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import { getCategoryInfo } from '../../shared/nutrition'

const EASE = [0.22, 1, 0.36, 1]
const DAY_OPTIONS = [7, 10, 30, 90]

function kg(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0 kg'
  return `${number.toFixed(number >= 10 ? 1 : 2)} kg`
}

function grams(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0 g'
  return `${Math.round(number)} g`
}

function money(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '$0.00'
  return `$${number.toFixed(2)}`
}

function pct(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0%'
  return `${number.toFixed(number >= 10 ? 0 : 1)}%`
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function typeLabel(value) {
  if (value === 'expired') return 'Expired'
  if (value === 'wasted') return 'Wasted'
  if (value === 'saved_leftover') return 'Saved leftover'
  if (value === 'cooked') return 'Cooked'
  return value
}

function SummaryCard({ icon, label, value, detail, tone = 'primary' }) {
  const toneClass = tone === 'amber'
    ? 'bg-amber-100 text-amber-700'
    : tone === 'rose'
      ? 'bg-rose-100 text-rose-700'
      : tone === 'violet'
        ? 'bg-violet-100 text-violet-700'
        : 'bg-emerald-100 text-emerald-700'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="rounded-[1.6rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined rounded-2xl p-2.5 ${toneClass}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface-variant">{label}</p>
          <p className="mt-1 text-3xl font-black tracking-tight text-on-surface">{value}</p>
          {detail && <p className="mt-1 text-xs text-on-surface-variant">{detail}</p>}
        </div>
      </div>
    </motion.div>
  )
}

function Panel({ title, subtitle, action, children }) {
  return (
    <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-black text-on-surface">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>}
        </div>
        {action || null}
      </div>
      {children}
    </section>
  )
}

function EmptyPanel({ title, body, action }) {
  return (
    <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 text-center shadow-sm">
      <span className="material-symbols-outlined mb-3 text-5xl text-on-surface-variant/30">query_stats</span>
      <h2 className="font-headline text-xl font-bold text-on-surface">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-on-surface-variant">{body}</p>
      {action && (
        <Link
          to={action.to}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined text-base">{action.icon}</span>
          {action.label}
        </Link>
      )}
    </div>
  )
}

function TrendPanel({ trends }) {
  const maxWaste = Math.max(...trends.map((item) => Number(item.weight_kg || 0)), 0.01)
  const maxCost = Math.max(...trends.map((item) => Number(item.inflation_adjusted_cost || item.cost_impact || 0)), 0.01)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Waste events', value: trends.reduce((sum, item) => sum + Number(item.waste_events || 0), 0) },
          { label: 'Cooked meals', value: trends.reduce((sum, item) => sum + Number(item.cooked_meals || 0), 0) },
          { label: 'Cooked food', value: kg(trends.reduce((sum, item) => sum + Number(item.cooked_kg || 0), 0)) },
          { label: 'Saved leftovers', value: kg(trends.reduce((sum, item) => sum + Number(item.saved_kg || 0), 0)) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-surface-container px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">{item.label}</p>
            <p className="mt-1 text-lg font-black text-on-surface">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-bold text-on-surface">Waste weight by day</p>
          <div className="flex h-52 items-end gap-2">
            {trends.map((item) => {
              const value = Number(item.weight_kg || 0)
              return (
                <div key={`w-${item.date}`} className="flex flex-1 min-w-0 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end overflow-hidden rounded-xl bg-surface-container-low">
                    <div
                      className="w-full rounded-t-xl bg-rose-500/85"
                      style={{ height: `${value > 0 ? Math.max(5, (value / maxWaste) * 100) : 0}%` }}
                      title={`${formatDate(item.date)} · ${kg(value)}`}
                    />
                  </div>
                  <span className="truncate text-[10px] text-on-surface-variant">{formatDate(item.date)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-on-surface">Replacement cost pressure</p>
          <div className="flex h-52 items-end gap-2">
            {trends.map((item) => {
              const value = Number(item.inflation_adjusted_cost || item.cost_impact || 0)
              return (
                <div key={`c-${item.date}`} className="flex flex-1 min-w-0 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end overflow-hidden rounded-xl bg-surface-container-low">
                    <div
                      className="w-full rounded-t-xl bg-violet-500/80"
                      style={{ height: `${value > 0 ? Math.max(5, (value / maxCost) * 100) : 0}%` }}
                      title={`${formatDate(item.date)} · ${money(value)}`}
                    />
                  </div>
                  <span className="truncate text-[10px] text-on-surface-variant">{formatDate(item.date)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function BreakdownBars({ items, metricKey = 'weight_grams', formatter = grams }) {
  const total = items.reduce((sum, item) => sum + Number(item[metricKey] || 0), 0)

  if (!items.length) {
    return <p className="text-sm text-on-surface-variant">No entries in this period.</p>
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const info = getCategoryInfo(item.category || 'other')
        const value = Number(item[metricKey] || 0)
        const width = total > 0 ? Math.max(4, (value / total) * 100) : 0
        return (
          <div key={item.category || item.reason || item.event_type}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-on-surface">
                <span className="material-symbols-outlined text-base" style={{ color: info.colour }}>
                  {info.icon}
                </span>
                {info.label}
              </span>
              <span className="tabular-nums text-on-surface-variant">{formatter(value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-container">
              <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: info.colour }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TypeSummary({ items }) {
  if (!items.length) {
    return <p className="text-sm text-on-surface-variant">No waste type data yet.</p>
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.event_type} className="rounded-2xl bg-surface-container px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-on-surface">{typeLabel(item.event_type)}</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-on-surface-variant">
              {item.count}
            </span>
          </div>
          <p className="mt-2 text-lg font-black text-on-surface">{grams(item.weight_grams)}</p>
          <p className="text-xs text-on-surface-variant">{money(item.cost_impact)}</p>
        </div>
      ))}
    </div>
  )
}

function TopItems({ items }) {
  if (!items.length) {
    return <p className="text-sm text-on-surface-variant">No wasted items logged yet.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const info = getCategoryInfo(item.category || 'other')
        return (
          <div key={`${item.name}-${item.category}`} className="flex items-center gap-3">
            <span
              className="material-symbols-outlined rounded-xl p-2"
              style={{ color: info.colour, backgroundColor: info.bg }}
            >
              {info.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-on-surface">{item.name}</p>
              <p className="text-xs text-on-surface-variant">
                {item.times_wasted} time{item.times_wasted === 1 ? '' : 's'} · {kg(item.weight_kg)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-on-surface">{money(item.cost_impact)}</p>
              {item.annual_cpi_pct != null && (
                <p className="text-[11px] font-bold text-violet-700">{pct(item.annual_cpi_pct)} CPI</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InflationHotspots({ items, summary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-violet-50 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-violet-700">Matched items</p>
          <p className="mt-1 text-xl font-black text-violet-900">{summary.matched_waste_events || 0}</p>
        </div>
        <div className="rounded-2xl bg-violet-50 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-violet-700">Avg annual CPI</p>
          <p className="mt-1 text-xl font-black text-violet-900">
            {summary.average_annual_cpi_pct != null ? pct(summary.average_annual_cpi_pct) : 'N/A'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-container px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-on-surface">Inflation-adjusted replacement loss</p>
            <p className="text-xs text-on-surface-variant">Current waste cost with CPI pressure included</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-on-surface">{money(summary.inflation_adjusted_loss)}</p>
            <p className="text-xs font-bold text-violet-700">+{money(summary.inflation_risk_premium)} premium</p>
          </div>
        </div>
      </div>

      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.name} className="rounded-2xl bg-surface-container px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-on-surface">{item.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {item.cpi_category || 'Unmapped'} · {item.annual_cpi_pct != null ? pct(item.annual_cpi_pct) : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-on-surface">{money(item.inflation_adjusted_cost)}</p>
                  <p className="text-xs font-bold text-violet-700">+{money(item.inflation_risk_premium)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">No CPI-linked waste items in this period.</p>
      )}
    </div>
  )
}

function MealOutcomes({ items }) {
  if (!items.length) {
    return <p className="text-sm text-on-surface-variant">No cooked meal outcomes yet.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.event_id}-${item.recipe_name}`} className="rounded-2xl bg-surface-container px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-on-surface">{item.recipe_name}</p>
              <p className="text-xs text-on-surface-variant">{formatDate(item.event_date)} · {grams(item.cooked_grams)} cooked</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-rose-700">{pct(item.waste_pct)}</p>
              <p className="text-xs text-on-surface-variant">{grams(item.wasted_grams)} wasted</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(4, Number(item.waste_pct || 0))}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function AtRiskItems({ items, atRiskValue }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 px-4 py-4">
        <p className="text-sm font-bold text-amber-900">Expiry exposure in fridge</p>
        <p className="mt-1 text-2xl font-black text-amber-900">{money(atRiskValue)}</p>
      </div>

      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={`${item.name}-${item.expiry_date}`} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-on-surface">{item.name}</p>
                <p className="text-xs text-on-surface-variant">{formatDate(item.expiry_date)} · {money(item.price)}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                {item.days_until_expiry === 0 ? 'Today' : `${item.days_until_expiry}d`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">No urgent expiry risks.</p>
      )}
    </div>
  )
}

function CookedMealsPanel({ items }) {
  return (
    <div className="space-y-3">
      {items.length ? (
        items.slice(0, 5).map((meal) => (
          <div key={meal.event_id || meal.id} className="flex items-center gap-3 rounded-2xl bg-surface-container px-4 py-3">
            <span className="material-symbols-outlined rounded-xl bg-emerald-100 p-2 text-emerald-700">
              restaurant
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-on-surface">{meal.recipe_name}</p>
              <p className="text-xs text-on-surface-variant">{formatDate(meal.cooked_date)}</p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-on-surface-variant">No cooked meals in this period.</p>
      )}
    </div>
  )
}

function SmartInsights({ items }) {
  return (
    <div className="space-y-3">
      {items.length ? (
        items.map((insight) => (
          <div key={insight} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            {insight}
          </div>
        ))
      ) : (
        <p className="text-sm text-on-surface-variant">No smart insights yet.</p>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(10)
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
  const cpiSummary = data?.cpi_summary || {}
  const breakdown = data?.waste_breakdown || []
  const topItems = data?.top_wasted_items || []
  const trends = data?.trends || []
  const insights = data?.smart_insights || []
  const atRisk = data?.at_risk_items || []
  const cookedMeals = data?.cooked_meals || []
  const typeBreakdown = data?.waste_by_type || []
  const mealOutcomes = data?.meal_outcomes || []
  const inflationHotspots = data?.inflation_hotspots || []

  const mostWastedDayLabel = useMemo(() => {
    if (!summary?.most_wasted_day?.date) return 'No peak day yet'
    return `${formatDate(summary.most_wasted_day.date)} · ${kg(summary.most_wasted_day.weight_kg)}`
  }, [summary])

  return (
    <div className="mx-auto max-w-7xl px-6 pb-12 md:px-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Food Waste Analytics</p>
          <h1 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface md:text-5xl">
            Analytics
          </h1>
          <p className="mt-3 max-w-3xl leading-relaxed text-on-surface-variant">
            Follow your waste trend, see which foods keep slipping, and estimate how inflation is magnifying replacement cost.
          </p>
        </div>

        <div className="inline-flex rounded-full bg-surface-container-high p-1">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={
                days === option
                  ? 'rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary'
                  : 'rounded-full px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface'
              }
            >
              {option}d
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl bg-error-container/30 px-4 py-3 text-sm font-semibold text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="animate-pulse text-lg text-on-surface-variant">Loading analytics...</p>
        </div>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard icon="delete" label="Food wasted" value={kg(summary.total_wasted_kg)} detail={`${days} day period`} tone="rose" />
            <SummaryCard icon="payments" label="Money lost" value={money(summary.money_lost)} detail={`${summary.waste_event_count || 0} waste logs`} tone="amber" />
            <SummaryCard icon="show_chart" label="Inflation-adjusted loss" value={money(summary.inflation_adjusted_loss)} detail={`+${money(summary.inflation_risk_premium)} rebuy premium`} tone="violet" />
            <SummaryCard icon="pie_chart" label="Waste rate" value={summary.waste_rate_pct != null ? pct(summary.waste_rate_pct) : 'N/A'} detail={`${grams(summary.average_waste_event_grams)} average per event`} tone="rose" />
            <SummaryCard icon="event_busy" label="Expiry-driven waste" value={summary.expiry_driven_pct != null ? pct(summary.expiry_driven_pct) : 'N/A'} detail={`At-risk fridge value ${money(summary.at_risk_value)}`} tone="amber" />
            <SummaryCard icon="restaurant" label="Cooked meals" value={summary.cooked_meal_count || 0} detail={`${kg(summary.saved_from_waste_kg)} tracked as cooked or saved`} tone="primary" />
          </section>

          {Number(summary.total_wasted_grams || 0) <= 0 && cookedMeals.length === 0 ? (
            <EmptyPanel
              title="No analytics yet"
              body="Mark meals as cooked or log food waste to start building your dashboard."
              action={{ to: '/meals', label: 'Open Meal Plans', icon: 'restaurant_menu' }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-8">
                <Panel
                  title="Trends over time"
                  subtitle={`Daily waste, cooked volume, and replacement cost across the last ${days} days`}
                  action={
                    <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-black text-on-surface-variant">
                      Peak day: {mostWastedDayLabel}
                    </span>
                  }
                >
                  <TrendPanel trends={trends} />
                </Panel>

                <Panel title="Waste breakdown" subtitle="Category share by weight">
                  <BreakdownBars items={breakdown} metricKey="weight_grams" formatter={grams} />
                </Panel>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Panel title="Top wasted items" subtitle="Highest waste by cost and weight">
                    <TopItems items={topItems} />
                  </Panel>

                  <Panel title="Waste type mix" subtitle="Expired versus manually wasted">
                    <TypeSummary items={typeBreakdown} />
                  </Panel>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Panel title="Meal outcomes" subtitle="Which cooked meals ended up wasting the most">
                    <MealOutcomes items={mealOutcomes} />
                  </Panel>

                  <Panel title="Inflation hotspots" subtitle="Waste items under stronger CPI pressure">
                    <InflationHotspots items={inflationHotspots} summary={cpiSummary} />
                  </Panel>
                </div>
              </div>

              <aside className="space-y-6 xl:col-span-4">
                <Panel title="Smart insights" subtitle="Auto-generated from current period">
                  <SmartInsights items={insights} />
                </Panel>

                <Panel title="Expiring soon" subtitle="Fridge items that need action soon">
                  <AtRiskItems items={atRisk} atRiskValue={summary.at_risk_value} />
                </Panel>

                <Panel
                  title="Cooked section"
                  subtitle="Recent meals logged into cooked meals"
                  action={<Link to="/cooked-meals" className="text-xs font-bold text-primary hover:underline">View all</Link>}
                >
                  <CookedMealsPanel items={cookedMeals} />
                </Panel>

                <Panel title="Quick actions" subtitle="Jump straight into the next fix">
                  <div className="grid gap-2">
                    <Link
                      to="/meals"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition-opacity hover:opacity-90"
                    >
                      <span className="material-symbols-outlined text-base">restaurant_menu</span>
                      Recipes for expiring items
                    </Link>
                    <Link
                      to="/fridge"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-container-high px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-highest"
                    >
                      <span className="material-symbols-outlined text-base">kitchen</span>
                      Review fridge
                    </Link>
                  </div>
                </Panel>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  )
}
