import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import { getCategoryInfo } from '../../shared/nutrition'

const EASE = [0.22, 1, 0.36, 1]
const DAY_OPTIONS = [7, 30, 90]

/* ─── formatters ─── */
function kg(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0 kg'
  return `${n.toFixed(n >= 10 ? 1 : 2)} kg`
}
function grams(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0 g'
  return n >= 1000 ? `${(n / 1000).toFixed(1)} kg` : `${Math.round(n)} g`
}
function money(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '$0.00'
  return `$${n.toFixed(2)}`
}
function pct(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0%'
  return `${n.toFixed(1)}%`
}
function formatDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/* ─── SummaryCard ─── */
function SummaryCard({ icon, label, value, detail, tone = 'primary', delay = 0 }) {
  const tones = {
    rose:    { pill: 'bg-rose-100 text-rose-600',       border: 'border-rose-100' },
    amber:   { pill: 'bg-amber-100 text-amber-600',     border: 'border-amber-100' },
    violet:  { pill: 'bg-violet-100 text-violet-600',   border: 'border-violet-100' },
    primary: { pill: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-100' },
    blue:    { pill: 'bg-sky-100 text-sky-600',         border: 'border-sky-100' },
    teal:    { pill: 'bg-teal-100 text-teal-700',       border: 'border-teal-100' },
  }
  const t = tones[tone] || tones.primary
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      className={`bg-surface-container-lowest rounded-[1.5rem] border ${t.border} p-4 shadow-sm flex items-center gap-3`}
    >
      <span
        className={`material-symbols-outlined rounded-2xl p-2.5 text-xl flex-shrink-0 ${t.pill}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant leading-none">{label}</p>
        <p className="text-xl font-black text-on-surface leading-tight mt-1">{value}</p>
        {detail && <p className="text-[11px] text-on-surface-variant mt-0.5 leading-tight">{detail}</p>}
      </div>
    </motion.div>
  )
}

/* ─── InsightCarousel (same style as Dashboard TipCarousel) ─── */
function InsightCarousel({ insights, loading }) {
  const [index, setIndex] = useState(0)

  const next = () => setIndex((i) => (i + 1) % insights.length)
  const prev = () => setIndex((i) => (i - 1 + insights.length) % insights.length)

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm h-full flex flex-col p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-emerald-100 rounded-2xl">
          <span className="material-symbols-outlined text-emerald-700"
                style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
        </div>
        <div>
          <h2 className="font-bold text-on-surface text-base leading-tight">Smart Insights</h2>
          <p className="text-xs text-on-surface-variant">Personalised waste reduction tips</p>
        </div>
      </div>

      <div className="flex-grow relative overflow-hidden min-h-[64px]">
        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading insights...</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No insights yet — log some waste to get started.</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex items-start gap-3"
            >
              <span className="material-symbols-outlined text-emerald-500 text-base mt-0.5 flex-shrink-0">
                tips_and_updates
              </span>
              <p className="text-sm font-semibold text-on-surface leading-relaxed">{insights[index]}</p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {insights.length > 1 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-outline-variant/10">
          <div className="flex gap-1.5">
            {insights.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-5 bg-emerald-600' : 'w-1.5 bg-on-surface/20'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prev}
              className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_back</span>
            </button>
            <button
              type="button"
              onClick={next}
              className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm text-white">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── TrendBars ─── */
function TrendBars({ trends }) {
  const max = Math.max(...trends.map((d) => Number(d.weight_kg || 0)), 0.01)
  return (
    <div className="h-44 flex items-end gap-1.5 sm:gap-2">
      {trends.map((item, i) => {
        const value = Number(item.weight_kg || 0)
        return (
          <motion.div
            key={item.date}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: i * 0.04, duration: 0.4, ease: EASE }}
            style={{ transformOrigin: 'bottom' }}
            className="flex-1 min-w-0 flex flex-col items-center gap-1.5"
          >
            <div className="w-full h-36 flex items-end rounded-xl bg-emerald-50 overflow-hidden">
              <div
                className="w-full rounded-t-xl bg-emerald-500/80"
                style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
                title={`${formatDate(item.date)} · ${kg(value)}`}
              />
            </div>
            <span className="text-[10px] text-on-surface-variant truncate w-full text-center">
              {formatDate(item.date)}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ─── BreakdownBar ─── */
function BreakdownBar({ item, total }) {
  const info = getCategoryInfo(item.category)
  const pctVal = total > 0 ? Math.max(3, (Number(item.weight_grams || 0) / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
        <span className="inline-flex items-center gap-2 font-semibold text-on-surface">
          <span className="material-symbols-outlined text-base" style={{ color: info.colour }}>{info.icon}</span>
          {info.label}
        </span>
        <span className="text-on-surface-variant tabular-nums text-xs">{kg(item.weight_kg)}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-container overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctVal}%` }}
          transition={{ duration: 0.6, ease: EASE }}
          className="h-full rounded-full"
          style={{ backgroundColor: info.colour }}
        />
      </div>
    </div>
  )
}

/* ─── Tab content panels ─── */
function TopWastedPanel({ items }) {
  if (!items.length) return <p className="text-sm text-on-surface-variant py-10 text-center">No wasted items logged yet.</p>
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const info = getCategoryInfo(item.category)
        return (
          <div key={`${item.name}-${item.category}`} className="flex items-center gap-3">
            <span className="material-symbols-outlined rounded-xl p-2 flex-shrink-0"
                  style={{ color: info.colour, backgroundColor: info.bg }}>{info.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-on-surface truncate">{item.name}</p>
              <p className="text-xs text-on-surface-variant">
                {item.times_wasted} time{item.times_wasted === 1 ? '' : 's'} · {kg(item.weight_kg)}
              </p>
            </div>
            <span className="text-sm font-bold text-on-surface flex-shrink-0">{money(item.cost_impact)}</span>
          </div>
        )
      })}
    </div>
  )
}

function CookedMealsPanel({ items }) {
  if (!items.length) return <p className="text-sm text-on-surface-variant py-10 text-center">No cooked meals in this period.</p>
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.slice(0, 6).map((meal) => (
        <div key={meal.event_id || meal.id} className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3">
          <span className="material-symbols-outlined rounded-xl bg-emerald-100 text-emerald-700 p-2 flex-shrink-0">restaurant</span>
          <div className="min-w-0">
            <p className="font-semibold text-on-surface truncate">{meal.recipe_name}</p>
            <p className="text-xs text-on-surface-variant">{formatDate(meal.cooked_date)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function BreakdownPanel({ breakdown, totalBreakdownGrams }) {
  if (!breakdown.length) return <p className="text-sm text-on-surface-variant py-10 text-center">No waste categories logged yet.</p>
  return (
    <div className="space-y-4">
      {breakdown.map((item) => (
        <BreakdownBar key={item.category} item={item} total={totalBreakdownGrams} />
      ))}
    </div>
  )
}

function TypeMixPanel({ items }) {
  if (!items.length) return <p className="text-sm text-on-surface-variant py-10 text-center">No type data yet.</p>
  const total = items.reduce((s, i) => s + Number(i.weight_grams || 0), 0)
  const colours = { expired: '#f43f5e', manual: '#f59e0b', other: '#6b7280' }
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const pctVal = total > 0 ? Math.max(3, (Number(item.weight_grams || 0) / total) * 100) : 0
        const colour = colours[item.type] || colours.other
        return (
          <div key={item.type}>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-sm font-semibold text-on-surface capitalize">{item.type === 'manual' ? 'Manually wasted' : 'Expired'}</span>
              <span className="text-xs text-on-surface-variant tabular-nums">{grams(item.weight_grams)} · {pct(pctVal)}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctVal}%` }}
                transition={{ duration: 0.6, ease: EASE }}
                className="h-full rounded-full"
                style={{ backgroundColor: colour }}
              />
            </div>
          </div>
        )
      })}
      <p className="text-xs text-on-surface-variant mt-2">
        Total tracked: <span className="font-bold text-on-surface">{grams(total)}</span>
      </p>
    </div>
  )
}

function MealOutcomesPanel({ items }) {
  if (!items.length) return <p className="text-sm text-on-surface-variant py-10 text-center">No meal outcome data yet.</p>
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.recipe_name || i} className="flex items-center gap-3">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
            i === 0 ? 'bg-rose-100 text-rose-700' : i === 1 ? 'bg-amber-100 text-amber-700' : 'bg-surface-container text-on-surface-variant'
          }`}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-on-surface truncate">{item.recipe_name}</p>
            <p className="text-xs text-on-surface-variant">{grams(item.wasted_grams)} wasted after cooking</p>
          </div>
          <span className="text-sm font-bold text-rose-600 flex-shrink-0">{money(item.waste_cost)}</span>
        </div>
      ))}
    </div>
  )
}

function InflationPanel({ items, cpiSummary }) {
  if (!items.length) return <p className="text-sm text-on-surface-variant py-10 text-center">No inflation data yet.</p>
  return (
    <div className="space-y-4">
      {cpiSummary?.avg_cpi_change_pct != null && (
        <div className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-violet-600 text-base">show_chart</span>
          <p className="text-sm font-semibold text-violet-900">
            Avg CPI change: <span className="font-black">+{pct(cpiSummary.avg_cpi_change_pct)}</span>
            {cpiSummary.total_inflation_risk_premium != null && (
              <span className="text-violet-700 font-normal"> · Risk premium: {money(cpiSummary.total_inflation_risk_premium)}</span>
            )}
          </p>
        </div>
      )}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.name || i} className="flex items-center gap-3">
            <span className="material-symbols-outlined rounded-xl p-2 flex-shrink-0 bg-violet-50 text-violet-600">trending_up</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-on-surface truncate">{item.name}</p>
              <p className="text-xs text-on-surface-variant">
                CPI +{pct(item.cpi_change_pct)} · wasted {grams(item.weight_grams)}
              </p>
            </div>
            <span className="text-sm font-bold text-violet-700 flex-shrink-0">{money(item.inflation_risk)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── 6-tab panel (2 rows × 3 cols grid) ─── */
const TABS = [
  { key: 'wasted',    label: 'Top Wasted',   icon: 'delete' },
  { key: 'meals',     label: 'Cooked Meals', icon: 'restaurant' },
  { key: 'breakdown', label: 'Breakdown',    icon: 'pie_chart' },
  { key: 'typemix',   label: 'Type Mix',     icon: 'category' },
  { key: 'outcomes',  label: 'Meal Outcomes',icon: 'dining' },
  { key: 'inflation', label: 'Inflation',    icon: 'show_chart' },
]

function BottomTabs({ topItems, cookedMeals, breakdown, totalBreakdownGrams, typeBreakdown, mealOutcomes, inflationHotspots, cpiSummary }) {
  const [active, setActive] = useState('wasted')
  const [dir, setDir] = useState(1)
  const prevIdx = useRef(0)

  function switchTab(key) {
    const newIdx = TABS.findIndex((t) => t.key === key)
    setDir(newIdx > prevIdx.current ? 1 : -1)
    prevIdx.current = newIdx
    setActive(key)
  }

  const variants = {
    enter:  (d) => ({ opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit:   (d) => ({ opacity: 0, x: d * -40 }),
  }

  const renderTabButton = (tab) => (
    <button
      key={tab.key}
      type="button"
      onClick={() => switchTab(tab.key)}
      className={`flex flex-col items-center justify-center gap-1 py-3 px-2 text-[11px] font-bold transition-colors relative ${
        active === tab.key
          ? 'text-emerald-700 bg-emerald-50/70'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
      }`}
    >
      <span className="material-symbols-outlined text-lg">{tab.icon}</span>
      <span className="leading-tight text-center">{tab.label}</span>
      {active === tab.key && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"
        />
      )}
    </button>
  )

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 shadow-sm overflow-hidden">
      {/* Row 1 */}
      <div className="grid grid-cols-3 border-b border-outline-variant/10">
        {TABS.slice(0, 3).map(renderTabButton)}
      </div>
      {/* Row 2 */}
      <div className="grid grid-cols-3 border-b border-outline-variant/10">
        {TABS.slice(3, 6).map(renderTabButton)}
      </div>

      {/* content */}
      <div className="relative overflow-hidden min-h-[200px]">
        <AnimatePresence initial={false} custom={dir} mode="wait">
          <motion.div
            key={active}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: EASE }}
            className="p-6"
          >
            {active === 'wasted'    && <TopWastedPanel items={topItems} />}
            {active === 'meals'     && <CookedMealsPanel items={cookedMeals} />}
            {active === 'breakdown' && <BreakdownPanel breakdown={breakdown} totalBreakdownGrams={totalBreakdownGrams} />}
            {active === 'typemix'   && <TypeMixPanel items={typeBreakdown} />}
            {active === 'outcomes'  && <MealOutcomesPanel items={mealOutcomes} />}
            {active === 'inflation' && <InflationPanel items={inflationHotspots} cpiSummary={cpiSummary} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── EmptyPanel ─── */
function EmptyPanel({ title, body, action }) {
  return (
    <div className="rounded-[2rem] bg-surface-container-lowest border border-outline-variant/10 p-10 text-center shadow-sm">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3">query_stats</span>
      <h2 className="font-headline text-xl font-bold text-on-surface">{title}</h2>
      <p className="text-on-surface-variant max-w-md mx-auto mt-2">{body}</p>
      {action && (
        <Link to={action.to}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-6 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity">
          <span className="material-symbols-outlined text-base">{action.icon}</span>
          {action.label}
        </Link>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   Main Page
══════════════════════════════════════════ */
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
      .then((payload) => { if (!ignore) setData(payload) })
      .catch((err)   => { if (!ignore) setError(err.message || 'Could not load analytics') })
      .finally(()    => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [days])

  const summary          = data?.weekly_summary    || {}
  const cpiSummary       = data?.cpi_summary       || {}
  const breakdown        = data?.waste_breakdown   || []
  const topItems         = data?.top_wasted_items  || []
  const trends           = data?.trends            || []
  const insights         = data?.smart_insights    || []
  const cookedMeals      = data?.cooked_meals      || []
  const typeBreakdown    = data?.waste_by_type     || []
  const mealOutcomes     = data?.meal_outcomes     || []
  const inflationHotspots = data?.inflation_hotspots || []

  const totalBreakdownGrams = useMemo(
    () => breakdown.reduce((s, i) => s + Number(i.weight_grams || 0), 0),
    [breakdown]
  )

  const peakDayLabel = useMemo(() => {
    if (!trends.length) return null
    const peak = trends.reduce((max, d) =>
      Number(d.weight_kg || 0) > Number(max.weight_kg || 0) ? d : max, trends[0])
    if (!peak || Number(peak.weight_kg || 0) <= 0) return null
    return `Peak: ${formatDate(peak.date)} · ${kg(peak.weight_kg)}`
  }, [trends])

  const isEmpty = Number(summary.total_wasted_grams || 0) <= 0 && cookedMeals.length === 0

  return (
    <div className="px-6 md:px-10 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="mb-8 pt-8 flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-600 font-bold mb-1">Trolley for Tomorrow</p>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">
            Analytics
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed mt-2">
            Track food waste, savings, inflation impact, and meals at a glance.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-surface-container-high p-1 self-start mt-2">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                days === option
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {option}d
            </button>
          ))}
        </div>
      </motion.header>

      {error && (
        <div className="mb-6 rounded-2xl bg-error-container/30 text-error px-4 py-3 text-sm font-semibold">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-60 gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
          <p className="text-on-surface-variant text-sm animate-pulse">Loading analytics…</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── 1. Six Summary Cards — 2col mobile / 3col tablet / 6col desktop ── */}
          <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <SummaryCard icon="delete"      label="Food Wasted"         value={kg(summary.total_wasted_kg)}            detail={`${days} day period`}                                           tone="rose"   delay={0}    />
            <SummaryCard icon="payments"    label="Money Lost"          value={money(summary.money_lost)}              detail={`${summary.waste_event_count || 0} waste logs`}                 tone="amber"  delay={0.05} />
            <SummaryCard icon="show_chart"  label="Inflation Loss"      value={money(summary.inflation_adjusted_loss)} detail={`+${money(summary.inflation_risk_premium)} rebuy premium`}      tone="violet" delay={0.10} />
            <SummaryCard icon="pie_chart"   label="Waste Rate"          value={summary.waste_rate_pct != null ? pct(summary.waste_rate_pct) : 'N/A'} detail={`${grams(summary.average_waste_event_grams)} avg per event`} tone="teal" delay={0.15} />
            <SummaryCard icon="event_busy"  label="Expiry-driven"       value={summary.expiry_driven_pct != null ? pct(summary.expiry_driven_pct) : 'N/A'} detail={`At-risk value ${money(summary.at_risk_value)}`} tone="rose" delay={0.20} />
            <SummaryCard icon="restaurant"  label="Cooked Meals"        value={summary.cooked_meal_count || 0}         detail={`${kg(summary.saved_from_waste_kg)} saved`}                     tone="primary" delay={0.25} />
          </section>

          {isEmpty ? (
            <EmptyPanel
              title="No analytics yet"
              body="Mark meals as cooked or log food waste to start building your weekly insights."
              action={{ to: '/meals', label: 'Open Meal Plans', icon: 'restaurant_menu' }}
            />
          ) : (
            <>
              {/* ── 2. Insight Carousel (2/5) + Trends with Peak Day badge (3/5) ── */}
              <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-2">
                  <InsightCarousel insights={insights} loading={loading} />
                </div>

                <div className="md:col-span-3 bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                    <div>
                      <h2 className="font-headline text-lg font-bold text-on-surface">Trends over time</h2>
                      <p className="text-xs text-on-surface-variant">Food waste by day</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {peakDayLabel && (
                        <span className="rounded-full bg-rose-50 text-rose-700 px-3 py-1 text-xs font-bold">
                          {peakDayLabel}
                        </span>
                      )}
                      {summary.comparison_to_last_period_pct != null && (
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          summary.comparison_to_last_period_pct <= 0
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}>
                          {summary.comparison_to_last_period_pct > 0 ? '+' : ''}
                          {summary.comparison_to_last_period_pct}% vs prev
                        </span>
                      )}
                    </div>
                  </div>
                  {trends.length > 0
                    ? <TrendBars trends={trends} />
                    : <p className="text-sm text-on-surface-variant py-10 text-center">No trend data yet.</p>
                  }
                </div>
              </section>

              {/* ── 3. Six-tab bottom panel (2×3 grid) ── */}
              <section>
                <BottomTabs
                  topItems={topItems}
                  cookedMeals={cookedMeals}
                  breakdown={breakdown}
                  totalBreakdownGrams={totalBreakdownGrams}
                  typeBreakdown={typeBreakdown}
                  mealOutcomes={mealOutcomes}
                  inflationHotspots={inflationHotspots}
                  cpiSummary={cpiSummary}
                />
              </section>

              {/* ── 4. Action buttons ── */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Link
                  to="/meals"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 text-white px-4 py-3 text-sm font-bold hover:bg-emerald-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">restaurant_menu</span>
                  <span className="hidden sm:inline">Recipes for expiring items</span>
                  <span className="sm:hidden">Recipes</span>
                </Link>
                <Link
                  to="/fridge"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-container-high text-on-surface px-4 py-3 text-sm font-bold hover:bg-surface-container-highest transition-colors"
                >
                  <span className="material-symbols-outlined text-base">kitchen</span>
                  View fridge
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}