import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

// ── Mock data ────────────────────────────────────────────────────────────────
// Replace these with apiFetch() calls once the backend endpoints are ready.

const mockUser = {
  name: 'Jasmine',
}

const mockExpiringItems = [
  { id: 1, name: 'Chicken Breast', daysLeft: 1 },
  { id: 2, name: 'Spinach',        daysLeft: 2 },
  { id: 3, name: 'Whole Milk',     daysLeft: 3 },
  { id: 4, name: 'Greek Yogurt',   daysLeft: 4 },
  { id: 5, name: 'Broccoli',       daysLeft: 5 },
]
const mockFridgeTotalCount = 12

const mockShoppingItems = [
  { id: 1, name: 'Oats'         },
  { id: 2, name: 'Almond Milk'  },
  { id: 3, name: 'Brown Rice'   },
  { id: 4, name: 'Cherry Tomatoes' },
]
const mockShoppingTotalCount = 8

const mockCarbonKg = 2.4

const mockTips = [
  { id: 1, title: 'Store spinach right',      body: 'Wrap spinach in a paper towel before refrigerating — it absorbs excess moisture and can extend freshness by up to 5 days.' },
  { id: 2, title: 'Freeze before it\'s too late', body: 'Bread going stale? Slice and freeze it. Toast straight from frozen — no thawing needed and zero waste.' },
  { id: 3, title: 'Eggs last longer than you think', body: 'A store-bought egg is typically 3–5 weeks old by purchase date. The float test tells you freshness: floaters are old, sinkers are fresh.' },
  { id: 4, title: 'Bananas ripen everything', body: 'Bananas emit ethylene gas that speeds up ripening. Keep them away from apples, avocados, and leafy greens.' },
  { id: 5, title: 'Plan before you shop',      body: 'Australians waste around $2,000 of food per household each year. A simple shopping list based on your fridge can cut that significantly.' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function ExpiryPill({ days }) {
  if (days <= 1) return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
      {days === 0 ? 'Today' : '1 day left'}
    </span>
  )
  if (days <= 3) return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      {days} days left
    </span>
  )
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

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const wasteSectionRef = useRef(null)

  const scrollToWaste = () => {
    wasteSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const cardVariants = (delay) => ({
    initial: { opacity: 0, y: 20, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, delay, ease: EASE } },
    whileHover: { y: -4, transition: { type: 'spring', stiffness: 380, damping: 26 } },
  })

  return (
    <div className="px-6 md:px-10 max-w-7xl mx-auto pb-12">

      {/* ── Hero ── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-emerald-900 px-8 py-10 md:px-12 text-white shadow-2xl">
          {/* Ambient background circle */}
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
              Welcome back, {mockUser.name}!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.28, ease: EASE }}
              className="text-emerald-100/70 text-base"
            >
              Here's what needs your attention today.
            </motion.p>
          </div>
        </div>
      </motion.header>

      {/* ── Row 1: Expiring + Shopping List ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Expiring Soon */}
        <motion.div {...cardVariants(0.3)} whileHover={cardVariants(0.3).whileHover}>
          <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm h-full flex flex-col">
            {/* Card header */}
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

            {/* Items list */}
            <div className="flex-grow px-6 py-3 divide-y divide-outline-variant/10">
              {mockExpiringItems.map((item, i) => (
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
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-3 flex items-center justify-between border-t border-outline-variant/10">
              <span className="text-xs text-on-surface-variant">
                {mockFridgeTotalCount} items total in fridge
              </span>
              <Link
                to="/fridge"
                className="flex items-center gap-1 text-xs font-bold text-primary hover:gap-2 transition-all"
              >
                View Fridge
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Shopping List */}
        <motion.div {...cardVariants(0.38)} whileHover={cardVariants(0.38).whileHover}>
          <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm h-full flex flex-col">
            {/* Card header */}
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

            {/* Items list */}
            <div className="flex-grow px-6 py-3 divide-y divide-outline-variant/10">
              {mockShoppingItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.45 + i * 0.06, ease: EASE }}
                  className="flex items-center gap-2.5 py-3"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-base">
                    radio_button_unchecked
                  </span>
                  <span className="text-sm font-medium text-on-surface">{item.name}</span>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-3 flex items-center justify-between border-t border-outline-variant/10">
              <span className="text-xs text-on-surface-variant">
                {mockShoppingTotalCount} items total in list
              </span>
              <Link
                to="/shopping"
                className="flex items-center gap-1 text-xs font-bold text-primary hover:gap-2 transition-all"
              >
                View List
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Row 2: Carbon Emission + Knowledge Tips ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">

        {/* Carbon Emission — narrow */}
        <motion.div
          className="md:col-span-2"
          {...cardVariants(0.46)}
          whileHover={cardVariants(0.46).whileHover}
        >
          <div className="bg-emerald-900 rounded-[2rem] shadow-sm h-full flex flex-col p-6 text-white relative overflow-hidden">
            {/* Ambient */}
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
                <span className="text-5xl font-extrabold leading-none">{mockCarbonKg}</span>
                <span className="text-emerald-300 font-semibold ml-1.5">kg</span>
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

        {/* Knowledge Tips — wide */}
        <motion.div
          className="md:col-span-3"
          {...cardVariants(0.52)}
          whileHover={cardVariants(0.52).whileHover}
        >
          <TipCarousel tips={mockTips} />
        </motion.div>
      </div>

      {/* ── Row 3: Waste Summary (placeholder) ── */}
      <motion.div
        ref={wasteSectionRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.6, ease: EASE }}
        className="rounded-[2rem] border-2 border-dashed border-outline-variant/30 bg-surface-container-lowest/50 p-10 text-center"
      >
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3 block">
          bar_chart
        </span>
        <h3 className="font-bold text-on-surface-variant/50 text-lg mb-1">Waste Summary</h3>
        <p className="text-on-surface-variant/40 text-sm">Coming soon — weekly waste trends and insights</p>
      </motion.div>

    </div>
  )
}

// ── Tip Carousel ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'

function TipCarousel({ tips }) {
  const [index, setIndex] = useState(0)
  const tip = tips[index]

  const next = () => setIndex((i) => (i + 1) % tips.length)
  const prev = () => setIndex((i) => (i - 1 + tips.length) % tips.length)

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm h-full flex flex-col p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-primary/10 rounded-2xl">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lightbulb
          </span>
        </div>
        <div>
          <h2 className="font-bold text-on-surface text-base leading-tight">Trolley Tips</h2>
          <p className="text-xs text-on-surface-variant">Reduce waste, save money</p>
        </div>
      </div>

      {/* Tip content */}
      <div className="flex-grow relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="font-bold text-on-surface text-base mb-2">{tip.title}</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{tip.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-outline-variant/10">
        {/* Dots */}
        <div className="flex gap-1.5">
          {tips.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-5 bg-primary' : 'w-1.5 bg-on-surface/20'
              }`}
            />
          ))}
        </div>

        {/* Prev / Next */}
        <div className="flex gap-2">
          <button
            onClick={prev}
            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_back</span>
          </button>
          <button
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