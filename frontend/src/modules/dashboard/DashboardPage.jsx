import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getUserProfile } from '../../lib/auth'
import { apiFetch } from '../../lib/api'
import { getItems } from '../../shared/shoppingList'

const EASE = [0.22, 1, 0.36, 1]
const SETTINGS_KEY = 'profile_settings'

const DEFAULT_SETTINGS = {
  householdSize: '2 people',
  lowWasteFocus: 'Use food before it expires',
  impactGoal: 'Reduce food waste each week',
  expiryReminders: true,
  useFirstMeals: true,
  shoppingGuardrails: true,
}

// Fallback tips in case API returns empty
const FALLBACK_TIPS = [
  {
    id: 1,
    title: 'Store spinach right',
    body: 'Wrap spinach in a paper towel before refrigerating. It absorbs extra moisture and can help leaves stay fresh longer.',
  },
  {
    id: 2,
    title: "Freeze before it's too late",
    body: 'Bread going stale? Slice and freeze it so you can toast only what you need later.',
  },
  {
    id: 3,
    title: 'Eggs last longer than you think',
    body: 'A simple float test can help you judge freshness. Eggs that sink are usually fresher than floaters.',
  },
  {
    id: 4,
    title: 'Bananas ripen everything',
    body: 'Bananas release ethylene gas, so keep them away from foods you want to keep fresh for longer.',
  },
  {
    id: 5,
    title: 'Plan before you shop',
    body: 'Checking what is already at home before shopping can help prevent duplicate buying and unnecessary food waste.',
  },
]

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return DEFAULT_SETTINGS
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function calcDaysLeft(expiryDateStr) {
  return Math.ceil((new Date(expiryDateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function ExpiryPill({ days }) {
  if (days <= 1) {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        {days <= 0 ? 'Today' : '1 day left'}
      </span>
    )
  }
  if (days <= 3) {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        {days} days left
      </span>
    )
  }
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      {days} days left
    </span>
  )
}

function ExpiryIcon({ days }) {
  if (days <= 1) return <span className="material-symbols-outlined text-red-500 text-base">warning</span>
  if (days <= 3) return <span className="material-symbols-outlined text-amber-500 text-base">schedule</span>
  return <span className="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
}

function SnapshotCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-4 flex items-start gap-3">
      <span className="material-symbols-outlined text-emerald-700 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-emerald-950">{title}</p>
        <p className="text-sm text-emerald-800/75 mt-1">{value}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const wasteSectionRef = useRef(null)
  const [userName, setUserName] = useState(() => getUserProfile()?.name || 'Trolley Member')
  const [settings, setSettings] = useState(loadSettings)

  // Fridge
  const [expiringItems, setExpiringItems] = useState([])
  const [fridgeTotalCount, setFridgeTotalCount] = useState(0)
  const [fridgeLoading, setFridgeLoading] = useState(true)

  // Shopping
  const [shoppingItems, setShoppingItems] = useState([])
  const [shoppingTotalCount, setShoppingTotalCount] = useState(0)

  // Carbon
  const [carbonKg, setCarbonKg] = useState(null)
  const [carbonLoading, setCarbonLoading] = useState(true)

  // Tips
  const [tips, setTips] = useState(FALLBACK_TIPS)
  const [tipsLoading, setTipsLoading] = useState(true)

  // Fetch fridge items
  useEffect(() => {
    apiFetch('/api/fridge/items')
      .then((data) => {
        const items = data.items || []
        setFridgeTotalCount(items.length)

        // Calculate days left, sort by soonest, show top 5
        const withDays = items
          .map((item) => ({ ...item, daysLeft: calcDaysLeft(item.expiry_date) }))
          .filter((item) => item.daysLeft >= 0)
          .sort((a, b) => a.daysLeft - b.daysLeft)
          .slice(0, 5)

        setExpiringItems(withDays)
      })
      .catch((err) => {
        console.error('Failed to load fridge items:', err)
      })
      .finally(() => setFridgeLoading(false))
  }, [])

  // Load shopping list from localStorage via shared helper
  useEffect(() => {
    const items = getItems()
    setShoppingTotalCount(items.length)
    // Show first 4 unchecked items
    const unchecked = items.filter((i) => !i.checked).slice(0, 4)
    setShoppingItems(unchecked)
  }, [])

  // Fetch carbon + at-risk items from waste analytics
  useEffect(() => {
    apiFetch('/api/waste/analytics?days=7')
      .then((data) => {
        setCarbonKg(data.weekly_summary?.co2_impact_kg ?? null)
      })
      .catch((err) => {
        console.error('Failed to load waste analytics:', err)
      })
      .finally(() => setCarbonLoading(false))
  }, [])

  // Fetch tips
  useEffect(() => {
    apiFetch('/api/foodkeeper/tips?limit=5')
      .then((data) => {
        const fetched = (data.tips || []).map((tip) => ({
          id: tip.product_id,
          title: tip.product_name,
          body: tip.body,
        }))
        if (fetched.length > 0) setTips(fetched)
        // else keep FALLBACK_TIPS
      })
      .catch((err) => {
        console.error('Failed to load tips:', err)
        // Keep FALLBACK_TIPS on error
      })
      .finally(() => setTipsLoading(false))
  }, [])

  // Sync profile settings
  useEffect(() => {
    const syncSnapshot = () => {
      setUserName(getUserProfile()?.name || 'Trolley Member')
      setSettings(loadSettings())
    }
    syncSnapshot()
    window.addEventListener('profile-updated', syncSnapshot)
    window.addEventListener('focus', syncSnapshot)
    return () => {
      window.removeEventListener('profile-updated', syncSnapshot)
      window.removeEventListener('focus', syncSnapshot)
    }
  }, [])

  const impactCards = [
    { title: 'Low-waste focus', value: settings.lowWasteFocus, icon: 'eco' },
    { title: 'Household routine', value: settings.householdSize, icon: 'groups' },
    { title: 'Current goal', value: settings.impactGoal, icon: 'track_changes' },
  ]

  const cardVariants = (delay) => ({
    initial: { opacity: 0, y: 20, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, delay, ease: EASE } },
    whileHover: { y: -4, transition: { type: 'spring', stiffness: 380, damping: 26 } },
  })

  const scrollToWaste = () => {
    wasteSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="px-6 md:px-10 max-w-7xl mx-auto pb-12">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-emerald-900 px-8 py-10 md:px-12 text-white shadow-2xl">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-700/30 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-emerald-800/40 pointer-events-none" />
          <div className="relative z-10">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1, ease: EASE }}
              className="text-emerald-300 font-semibold uppercase tracking-widest text-xs mb-3 block"
            >
              Your Kitchen Dashboard
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18, ease: EASE }}
              className="text-4xl md:text-5xl font-extrabold mb-2 leading-tight"
            >
              Welcome back, {userName}!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.28, ease: EASE }}
              className="text-emerald-100/70 text-base"
            >
              Here&apos;s what needs your attention today.
            </motion.p>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Expiring Soon */}
        <motion.div {...cardVariants(0.3)} whileHover={cardVariants(0.3).whileHover}>
          <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/10">
              <div className="p-2.5 bg-amber-100 rounded-2xl">
                <span className="material-symbols-outlined text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                  nutrition
                </span>
              </div>
              <div>
                <h2 className="font-bold text-on-surface text-base leading-tight">Expiring Soon</h2>
                <p className="text-xs text-on-surface-variant">Use these first to reduce waste</p>
              </div>
            </div>

            <div className="flex-grow px-6 py-3 divide-y divide-outline-variant/10">
              {fridgeLoading ? (
                <p className="text-sm text-on-surface-variant py-4 text-center">Loading...</p>
              ) : expiringItems.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-4 text-center">No expiring items 🎉</p>
              ) : (
                expiringItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.06, ease: EASE }}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <ExpiryIcon days={item.daysLeft} />
                      <span className="text-sm font-medium text-on-surface">{item.name}</span>
                    </div>
                    <ExpiryPill days={item.daysLeft} />
                  </motion.div>
                ))
              )}
            </div>

            <div className="px-6 pb-6 pt-3 flex items-center justify-between border-t border-outline-variant/10">
              <span className="text-xs text-on-surface-variant">{fridgeTotalCount} items total in fridge</span>
              <Link to="/fridge" className="flex items-center gap-1 text-xs font-bold text-primary hover:gap-2 transition-all">
                View Fridge
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Shopping List */}
        <motion.div {...cardVariants(0.38)} whileHover={cardVariants(0.38).whileHover}>
          <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/10">
              <div className="p-2.5 bg-emerald-100 rounded-2xl">
                <span className="material-symbols-outlined text-emerald-700" style={{ fontVariationSettings: "'FILL' 1" }}>
                  shopping_cart
                </span>
              </div>
              <div>
                <h2 className="font-bold text-on-surface text-base leading-tight">Shopping List</h2>
                <p className="text-xs text-on-surface-variant">Items you plan to buy</p>
              </div>
            </div>

            <div className="flex-grow px-6 py-3 divide-y divide-outline-variant/10">
              {shoppingItems.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-4 text-center">Your shopping list is empty</p>
              ) : (
                shoppingItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.45 + i * 0.06, ease: EASE }}
                    className="flex items-center gap-2.5 py-3"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant text-base">radio_button_unchecked</span>
                    <span className="text-sm font-medium text-on-surface">{item.name}</span>
                  </motion.div>
                ))
              )}
            </div>

            <div className="px-6 pb-6 pt-3 flex items-center justify-between border-t border-outline-variant/10">
              <span className="text-xs text-on-surface-variant">{shoppingTotalCount} items total in list</span>
              <Link to="/shopping" className="flex items-center gap-1 text-xs font-bold text-primary hover:gap-2 transition-all">
                View List
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        {/* Carbon Footprint */}
        <motion.div className="md:col-span-2" {...cardVariants(0.46)} whileHover={cardVariants(0.46).whileHover}>
          <div className="bg-emerald-900 rounded-[2rem] shadow-sm h-full flex flex-col p-6 text-white relative overflow-hidden">
            <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-emerald-700/30 pointer-events-none" />
            <div className="relative z-10 flex-grow">
              <div className="p-2.5 bg-emerald-700/50 rounded-2xl inline-flex mb-4">
                <span className="material-symbols-outlined text-emerald-300" style={{ fontVariationSettings: "'FILL' 1" }}>
                  co2
                </span>
              </div>
              <h2 className="font-bold text-base mb-1">Carbon Footprint</h2>
              <p className="text-emerald-100/60 text-xs mb-5">From food wasted this week</p>

              <div className="mb-1">
                {carbonLoading ? (
                  <span className="text-emerald-300 text-sm">Loading...</span>
                ) : carbonKg !== null ? (
                  <>
                    <span className="text-5xl font-extrabold leading-none">{carbonKg.toFixed(1)}</span>
                    <span className="text-emerald-300 font-semibold ml-1.5">kg</span>
                  </>
                ) : (
                  <span className="text-emerald-300 text-sm">No data</span>
                )}
              </div>
              <p className="text-emerald-100/50 text-xs">CO₂ equivalent</p>
            </div>

            <button
              onClick={scrollToWaste}
              className="relative z-10 mt-6 flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white transition-colors group"
            >
              <span className="material-symbols-outlined text-sm group-hover:translate-y-0.5 transition-transform">
                trending_down
              </span>
              View Trend
            </button>
          </div>
        </motion.div>

        {/* Tips */}
        <motion.div className="md:col-span-3" {...cardVariants(0.52)} whileHover={cardVariants(0.52).whileHover}>
          <TipCarousel tips={tips} loading={tipsLoading} />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.95fr] gap-6">
        <motion.div
          ref={wasteSectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.6, ease: EASE }}
          className="rounded-[2rem] border-2 border-dashed border-outline-variant/30 bg-surface-container-lowest/50 p-10 text-center"
        >
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3 block">bar_chart</span>
          <h3 className="font-bold text-on-surface-variant/50 text-lg mb-1">Waste Summary</h3>
          <p className="text-on-surface-variant/40 text-sm">Coming soon — weekly waste trends and insights</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.66, ease: EASE }}
          className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm p-6"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700/60 font-bold mb-2">Snapshot</p>
          <h3 className="text-2xl font-extrabold text-emerald-950 mb-2">What your profile is set up for</h3>
          <p className="text-sm text-emerald-800/70 mb-5">This reflects the low-waste habits you chose in your profile settings.</p>
          <div className="space-y-3">
            {impactCards.map((card) => (
              <SnapshotCard key={card.title} title={card.title} value={card.value} icon={card.icon} />
            ))}
          </div>
          <Link
            to="/profile"
            className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-primary hover:gap-2 transition-all"
          >
            Edit profile
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

function TipCarousel({ tips, loading }) {
  const [index, setIndex] = useState(0)
  const tip = tips[index]

  const next = () => setIndex((current) => (current + 1) % tips.length)
  const prev = () => setIndex((current) => (current - 1 + tips.length) % tips.length)

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm h-full flex flex-col p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-primary/10 rounded-2xl">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            lightbulb
          </span>
        </div>
        <div>
          <h2 className="font-bold text-on-surface text-base leading-tight">Trolley Tips</h2>
          <p className="text-xs text-on-surface-variant">Reduce waste, store smarter</p>
        </div>
      </div>

      <div className="flex-grow relative overflow-hidden">
        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading tips...</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <h3 className="font-bold text-on-surface text-base mb-2">{tip.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{tip.body}</p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-outline-variant/10">
        <div className="flex gap-1.5">
          {tips.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-primary' : 'w-1.5 bg-on-surface/20'}`}
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
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm text-on-primary">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  )
}