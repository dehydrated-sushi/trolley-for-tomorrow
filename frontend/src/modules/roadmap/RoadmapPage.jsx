import { useEffect, useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import AnimatedNumber from '../../shared/AnimatedNumber'

const EASE = [0.22, 1, 0.36, 1]

// External feedback URL — swap in the real Google Form URL when the team
// finalises it. Falling back to a mailto: means the CTA still works while
// the form is being set up.
const FEEDBACK_URL = 'mailto:team@trolleyfortomorrow.tech?subject=Roadmap%20feedback'

// ---------------------------------------------------------------------------
// Reduced-motion hook

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return reduced
}

// ---------------------------------------------------------------------------
// Masked-reveal words — fade + y-slide per word, 30 ms stagger

function MaskedText({ text, className = '', delay = 0, as: Tag = 'p' }) {
  const words = text.split(' ')
  return (
    <Tag className={className}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: EASE, delay: delay + i * 0.028 }}
          className="inline-block whitespace-pre"
        >
          {w}{i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </Tag>
  )
}

// ---------------------------------------------------------------------------
// Micro-demos — each is a small self-contained animation that loops in place
// when its card enters the viewport (via the `active` prop).

// Calendar with one date pulsing red ("expires in 2d")
function ExpiryCalendarDemo({ active }) {
  const today = 11
  const expiring = 13
  const days = Array.from({ length: 28 }, (_, i) => i + 1)
  return (
    <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">April 2026</span>
        <motion.span
          animate={active ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.8 }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700"
        >
          <span className="material-symbols-outlined text-[11px]">schedule</span>
          Milk · 2d
        </motion.span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={`d-${i}`} className="text-[9px] text-emerald-800/50 font-bold text-center">{d}</span>
        ))}
        {days.map((d) => {
          const isToday = d === today
          const isExpiring = d === expiring
          return (
            <motion.div
              key={d}
              animate={isExpiring && active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className={
                isExpiring
                  ? 'aspect-square rounded-md flex items-center justify-center text-[10px] font-bold bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.45)]'
                  : isToday
                    ? 'aspect-square rounded-md flex items-center justify-center text-[10px] font-bold bg-emerald-600 text-white'
                    : 'aspect-square rounded-md flex items-center justify-center text-[10px] text-emerald-900/55'
              }
            >
              {d}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// Three recipe rows with ticking-up $ amounts
function MealCostDemo({ active }) {
  const rows = [
    { name: 'Chicken Stir-Fry',  price: 6.80 },
    { name: 'Mediterranean Bowl', price: 8.40 },
    { name: 'Veg Curry',         price: 4.90 },
  ]
  return (
    <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/50 p-4 space-y-2">
      {rows.map((r, i) => (
        <motion.div
          key={r.name}
          initial={{ opacity: 0, x: -6 }}
          animate={active ? { opacity: 1, x: 0 } : { opacity: 0.4, x: 0 }}
          transition={{ duration: 0.35, delay: i * 0.08, ease: EASE }}
          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/70"
        >
          <span className="text-xs font-semibold text-emerald-900 truncate">{r.name}</span>
          <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
            ${active ? <AnimatedNumber value={r.price} duration={1.2} format={(n) => n.toFixed(2)} /> : r.price.toFixed(2)}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

// Four nutrition bars filling up
function NutritionBarsDemo({ active }) {
  const rows = [
    { key: 'protein', label: 'Protein',    pct: 68, color: '#10b981' },
    { key: 'carbs',   label: 'Carbs',      pct: 42, color: '#f59e0b' },
    { key: 'fats',    label: 'Fats',       pct: 35, color: '#8b5cf6' },
    { key: 'fiber',   label: 'Fiber',      pct: 55, color: '#ec4899' },
  ]
  return (
    <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/50 p-4 space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.key} className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
            <span style={{ color: r.color }}>{r.label}</span>
            <span className="text-emerald-900/60 font-mono">
              {active ? <AnimatedNumber value={r.pct} duration={1} format={(n) => `${Math.round(n)}%`} /> : `${r.pct}%`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-emerald-900/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: active ? `${r.pct}%` : '0%' }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: EASE }}
              className="h-full rounded-full"
              style={{ backgroundColor: r.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Three ingredient rows on a shopping list with $ prices fading in, plus
// a running estimated-total tally on a divider beneath them.
function ShoppingPricesDemo({ active }) {
  const rows = [
    { name: 'Chicken breast', price: 8.40 },
    { name: 'Fresh eggs',     price: 4.20 },
    { name: 'Milk 2L',        price: 2.80 },
  ]
  const total = rows.reduce((s, r) => s + r.price, 0)
  return (
    <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/50 p-4 space-y-1.5">
      {rows.map((r, i) => (
        <motion.div
          key={r.name}
          initial={{ opacity: 0, x: -6 }}
          animate={active ? { opacity: 1, x: 0 } : { opacity: 0.35 }}
          transition={{ duration: 0.32, delay: i * 0.09, ease: EASE }}
          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/75"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-emerald-900 truncate">{r.name}</span>
          </div>
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={active ? { opacity: 1, scale: 1 } : { opacity: 0 }}
            transition={{ delay: 0.35 + i * 0.1, duration: 0.3, ease: EASE }}
            className="font-mono text-xs font-bold text-emerald-700 tabular-nums"
          >
            ${active ? <AnimatedNumber value={r.price} duration={0.9} format={(n) => n.toFixed(2)} /> : '0.00'}
          </motion.span>
        </motion.div>
      ))}
      <div className="border-t border-emerald-200/60 pt-2 mt-1 flex items-center justify-between px-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/75">
          Estimated total
        </span>
        <span className="font-mono text-sm font-extrabold text-emerald-900 tabular-nums">
          ${active ? <AnimatedNumber value={total} duration={1.3} format={(n) => n.toFixed(2)} /> : '0.00'}
        </span>
      </div>
    </div>
  )
}

// Avatar + name + four preference chips staggering in. Evokes a proper
// saved profile instead of the single-user demo state.
function UserProfilesDemo({ active }) {
  const prefs = [
    { label: 'Vegetarian',  icon: 'eco' },
    { label: 'Family of 4', icon: 'group' },
    { label: '$150 / week', icon: 'savings' },
    { label: 'No nuts',     icon: 'block' },
  ]
  return (
    <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.65 }}
          animate={active ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-900/15"
        >
          S
        </motion.div>
        <div className="min-w-0 flex-1">
          <motion.p
            initial={{ opacity: 0, x: -4 }}
            animate={active ? { opacity: 1, x: 0 } : { opacity: 0 }}
            transition={{ delay: 0.18, duration: 0.3, ease: EASE }}
            className="font-bold text-emerald-900 text-sm truncate"
          >
            Saubhagya Das
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: -4 }}
            animate={active ? { opacity: 1, x: 0 } : { opacity: 0 }}
            transition={{ delay: 0.28, duration: 0.3, ease: EASE }}
            className="text-[10px] uppercase tracking-widest font-bold text-emerald-700/65"
          >
            Your preferences
          </motion.p>
        </div>
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={active ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          transition={{ delay: 0.42, duration: 0.3, ease: EASE }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          Synced
        </motion.span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {prefs.map((p, i) => (
          <motion.span
            key={p.label}
            initial={{ opacity: 0, scale: 0.85, y: 4 }}
            animate={active ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0 }}
            transition={{ delay: 0.5 + i * 0.07, duration: 0.3, ease: EASE }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[10px] font-semibold text-emerald-800 border border-emerald-200"
          >
            <span className="material-symbols-outlined text-[12px] text-emerald-600">{p.icon}</span>
            {p.label}
          </motion.span>
        ))}
      </div>
    </div>
  )
}

// Mini AR scan — the money shot from the ARScanModal, scaled down
function YoloScanDemo({ active }) {
  const CYAN = 'rgb(34, 211, 238)'
  return (
    <div className="relative rounded-xl overflow-hidden aspect-[5/3] bg-gradient-to-br from-[#1a2d42] via-[#0f1c2a] to-[#050a12] border border-cyan-500/30">
      {/* Shelves */}
      {[25, 62].map((top, i) => (
        <div key={i} className="absolute left-0 right-0 h-px" style={{ top: `${top}%`, background: 'linear-gradient(90deg, transparent, rgba(255,231,194,0.4), transparent)' }} />
      ))}
      {/* Apple silhouette */}
      <div
        className="absolute"
        style={{
          left: '16%', top: '40%', width: '22%', height: '40%',
          borderRadius: '42% 42% 38% 38%',
          background: 'radial-gradient(circle at 30% 30%, rgba(134,239,172,0.75) 0%, rgba(34,197,94,0.55) 55%, rgba(20,83,45,0.65) 100%)',
          filter: 'blur(0.8px)',
        }}
      />
      {/* Milk silhouette */}
      <div
        className="absolute"
        style={{
          left: '60%', top: '28%', width: '14%', height: '42%',
          borderRadius: '6px',
          background: 'linear-gradient(180deg, rgba(241,245,249,0.5), rgba(100,116,139,0.35))',
          filter: 'blur(0.8px)',
        }}
      />
      {/* Bounding box around apple */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.35, duration: 0.35, ease: EASE }}
        className="absolute"
        style={{
          left: '14%', top: '38%', width: '26%', height: '44%',
          border: `1px solid ${CYAN}88`,
          borderRadius: '4px',
          boxShadow: `inset 0 0 12px ${CYAN}22, 0 0 12px -2px ${CYAN}55`,
        }}
      >
        {['top-0 left-0', 'top-0 right-0', 'bottom-0 right-0', 'bottom-0 left-0'].map((p, i) => (
          <span
            key={i}
            className={`absolute w-2 h-2 ${p}`}
            style={{
              borderTop:    p.includes('top-0')    ? `1.5px solid ${CYAN}` : 'none',
              borderBottom: p.includes('bottom-0') ? `1.5px solid ${CYAN}` : 'none',
              borderLeft:   p.includes('left-0')   ? `1.5px solid ${CYAN}` : 'none',
              borderRight:  p.includes('right-0')  ? `1.5px solid ${CYAN}` : 'none',
              filter: `drop-shadow(0 0 3px ${CYAN})`,
            }}
          />
        ))}
      </motion.div>
      {/* Tiny detection card */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="absolute z-10 rounded-md px-2 py-1.5 backdrop-blur-md flex items-center gap-1.5"
        style={{
          top: '8%', left: '6%',
          background: 'rgba(11,19,38,0.78)',
          border: `1px solid ${CYAN}60`,
          boxShadow: `0 0 14px -2px ${CYAN}55`,
        }}
      >
        <span className="text-sm">🍏</span>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: CYAN }}>Detected</span>
          <span className="text-[10px] font-bold text-white leading-tight">Granny Smith · 88%</span>
        </div>
      </motion.div>
      {/* Scan line */}
      {active && (
        <motion.div
          initial={{ top: '0%' }}
          animate={{ top: '100%' }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', repeatDelay: 1.4 }}
          className="absolute left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${CYAN}, transparent)`, boxShadow: `0 0 12px 2px ${CYAN}88` }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feature card — one per roadmap entry. `demo` is an optional React node
// (a micro-demo component). `planned` switches the visual treatment
// (dashed border, muted opacity) without changing the layout.

function FeatureCard({ icon, title, description, tagLabel, planned, demo, index = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [demoActive, setDemoActive] = useState(false)

  // Wait until the card is visible before lighting up the demo, so users
  // scrolling fast don't see partially-animated demos for cards they
  // haven't reached yet.
  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setDemoActive(true), 220)
      return () => clearTimeout(t)
    }
  }, [inView])

  const accent = planned ? 'rgba(100, 116, 139, 1)' : 'rgb(16, 185, 129)'
  const accentBg = planned ? 'rgba(100, 116, 139, 0.12)' : 'rgba(16, 185, 129, 0.12)'

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.06 }}
      className="relative group rounded-3xl p-6 bg-surface-container-lowest transition-all hover:shadow-lg"
      style={{
        border: planned ? '1.5px dashed rgba(100, 116, 139, 0.28)' : '1px solid rgba(16, 185, 129, 0.14)',
        boxShadow: planned ? 'none' : '0 1px 2px rgba(15,23,42,0.03), 0 1px 3px rgba(16,185,129,0.05)',
        opacity: planned ? 0.92 : 1,
      }}
    >
      {/* Status chip */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        {!planned && (
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            style={{ boxShadow: '0 0 6px rgb(16, 185, 129)' }}
          />
        )}
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ backgroundColor: accentBg, color: accent }}
        >
          {tagLabel}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-3 group-hover:scale-105"
          style={{ backgroundColor: accentBg }}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ color: accent, fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
        <div className="flex-1 min-w-0 pr-12 flex items-center">
          <h3 className="font-extrabold font-headline text-lg text-on-surface tracking-tight leading-tight">
            {title}
          </h3>
        </div>
      </div>

      <p className="text-sm text-on-surface-variant leading-relaxed">
        {description}
      </p>

      {demo && (
        <div className="mt-4">
          {demo(demoActive)}
        </div>
      )}
    </motion.article>
  )
}

// ---------------------------------------------------------------------------
// Section label — pulsing dot (in-dev) or solid marker (planned) + kicker + blurb

function SectionLabel({ kicker, title, description, planned }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        {!planned ? (
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-2 h-2 rounded-full bg-emerald-500"
            style={{ boxShadow: '0 0 8px rgb(16, 185, 129)' }}
          />
        ) : (
          <span className="w-2 h-2 rounded-full bg-slate-400" />
        )}
        <span
          className="text-[11px] uppercase tracking-[0.24em] font-bold"
          style={{ color: planned ? 'rgb(100, 116, 139)' : 'rgb(6, 95, 70)' }}
        >
          {kicker}
        </span>
      </div>
      <h2 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight text-emerald-900 leading-tight mb-2">
        {title}
      </h2>
      <p className="text-on-surface-variant max-w-2xl leading-relaxed">
        {description}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data

const ITERATION_2 = [
  {
    icon: 'event_upcoming',
    title: 'Expiry tracking',
    description:
      'Set expiry dates manually or have them parsed from receipts. The fridge warns about items expiring soon, and an optional toggle prioritises those ingredients in your meal recommendations so nothing goes to waste.',
    demo: (active) => <ExpiryCalendarDemo active={active} />,
  },
  {
    icon: 'price_change',
    title: 'Prices on the shopping list',
    description:
      'Every recommended ingredient picks up a probable price drawn from a running price index across your recent receipts. Your list stops being a guess and starts being a budget.',
    demo: (active) => <ShoppingPricesDemo active={active} />,
  },
  {
    icon: 'payments',
    title: 'Estimated meal cost',
    description:
      'Each recipe card shows an estimated cost based on the ingredients you still need to buy. Filter by what you can cook for under $10 this week.',
    demo: (active) => <MealCostDemo active={active} />,
  },
  {
    icon: 'manage_accounts',
    title: 'Real user profiles',
    description:
      'Dietary preferences, household size, saved favourites, and budget goals. All persisted per-user instead of the current single-user demo. Login starts working for real.',
    demo: (active) => <UserProfilesDemo active={active} />,
  },
  {
    icon: 'nutrition',
    title: 'Nutritional information',
    description:
      'Protein, carbs, fats, fiber. Visible per-recipe and per-day, rebuilt on a cleaner nutrition dataset with serving-size metadata, so "25% DV" actually corresponds to your body rather than a fiction.',
    demo: (active) => <NutritionBarsDemo active={active} />,
  },
  {
    icon: 'center_focus_strong',
    title: 'Fridge scanning (YOLO)',
    description:
      'Point your camera at the fridge. Computer-vision detection lights up every visible item with a bounding box; one tap adds it to your inventory. The preview modal already shipped, and the real detection goes live next.',
    demo: (active) => <YoloScanDemo active={active} />,
  },
  {
    icon: 'document_scanner',
    title: 'Better receipt OCR',
    description:
      'Higher-accuracy parse of quantity, unit, and price columns. Fuzzy store-specific header handling so Woolies, Coles, and Aldi receipts all land in the same normalised shape.',
  },
]

const ITERATION_3 = [
  {
    icon: 'map',
    title: 'Food map',
    description:
      'Discover nearby community fridges, affordable grocers, and farmers markets on an interactive map. The app starts answering "where do I buy this cheap?" alongside "what do I cook?".',
  },
  {
    icon: 'storefront',
    title: 'Best prices from your history',
    description:
      'The food map crosses your receipt history with store locations to show where each ingredient was cheapest last time. A shopping run gets routed to the best-price store for the basket you actually have.',
  },
  {
    icon: 'forum',
    title: 'Community support',
    description:
      'Users share discount tips, store finds, and local deals. Anything added to the community feed automatically populates the food map, so one person\'s good find helps the whole neighbourhood shop smarter.',
  },
  {
    icon: 'insights',
    title: 'Your food insights',
    description:
      'Interactive charts for weekly spend, waste reduction over time, and other facts pulled from your receipt and fridge history. See where your budget goes, and where the easiest wins are.',
  },
  {
    icon: 'volunteer_activism',
    title: 'Welfare food sources',
    description:
      'Direct links to food-bank programs, community meals, and emergency relief hampers for users who need them. A directory maintained with local welfare organisations.',
  },
  {
    icon: 'delete_sweep',
    title: 'Smart waste tracker',
    description:
      'Track waste across three paths: YOLO detection of rotted items, user-confirmed "cooked with X" events, and "still in the fridge but past expiry" diffs. Weekly waste score with honest trends.',
  },
]

// ---------------------------------------------------------------------------
// Page

export default function RoadmapPage() {
  const reduced = usePrefersReducedMotion()

  return (
    <div className="relative px-6 md:px-12 max-w-6xl mx-auto pb-24">
      {/* Atmospheric emerald gradient backdrop — very subtle, behind everything */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[640px] pointer-events-none -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
        }}
      />

      {/* Hero */}
      <section className="pt-10 pb-16 md:pt-16 md:pb-20 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-emerald-100/60 border border-emerald-200/60"
        >
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-emerald-600"
            style={{ boxShadow: '0 0 6px rgb(5, 150, 105)' }}
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-800">
            Product roadmap
          </span>
        </motion.div>

        <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tight text-emerald-900 leading-[1.05] mb-5">
          {reduced ? (
            <>What&apos;s coming <span className="text-emerald-600">next</span></>
          ) : (
            <>
              <MaskedText text="What's coming" as="span" className="block" delay={0.05} />
              <MaskedText text="next" as="span" className="block text-emerald-600" delay={0.25} />
            </>
          )}
        </h1>

        {reduced ? (
          <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
            We&apos;re mid-iteration on seven features: expiry tracking, prices on shopping lists, live fridge scanning, real user profiles, and more. After that, we&apos;re opening the app up to community-shared deals, data insights, a neighbourhood food map, and a smart waste tracker. Here&apos;s the plan.
          </p>
        ) : (
          <MaskedText
            as="p"
            delay={0.45}
            className="text-lg text-on-surface-variant max-w-2xl leading-relaxed"
            text="We're mid-iteration on seven features: expiry tracking, prices on shopping lists, live fridge scanning, real user profiles, and more. After that, we're opening the app up to community-shared deals, data insights, a neighbourhood food map, and a smart waste tracker. Here's the plan."
          />
        )}
      </section>

      {/* Iteration 2 */}
      <section className="mb-20">
        <SectionLabel
          kicker="Iteration 2 · In development"
          title="Shipping next sprint"
          description="Features we're actively building. The harder bets like YOLO detection and a cleaner nutrition dataset close out iteration 2."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ITERATION_2.map((f, i) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              tagLabel="In dev"
              description={f.description}
              demo={f.demo}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* Static dashed divider */}
      <div className="mb-14 flex items-center gap-4">
        <span className="h-px flex-1 border-t border-dashed border-slate-300" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-bold">
          Further out
        </span>
        <span className="h-px flex-1 border-t border-dashed border-slate-300" />
      </div>

      {/* Iteration 3 */}
      <section className="mb-20">
        <SectionLabel
          kicker="Iteration 3 · Planned"
          title="The bigger picture"
          description="Longer-term work that opens the app up beyond your own kitchen, into community contributions, data insights, waste tracking, and the map of affordable food nearby."
          planned
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ITERATION_3.map((f, i) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              tagLabel="Planned"
              description={f.description}
              planned
              index={i}
            />
          ))}
        </div>
      </section>

      {/* Feedback CTA */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative rounded-[2.5rem] p-8 md:p-12 overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,1) 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-100/80 mb-2">
              Help us build the right things
            </p>
            <h3 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight text-white leading-tight mb-2">
              Want to shape what lands in iteration 2?
            </h3>
            <p className="text-emerald-50/90 leading-relaxed">
              Tell us which of these matters most, what we missed, or what shouldn&apos;t ship at all. Five-minute form, direct to the team.
            </p>
          </div>
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-emerald-700 font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-transform self-start md:self-auto"
          >
            Share your thoughts
            <span className="material-symbols-outlined text-base">arrow_outward</span>
          </a>
        </div>
      </motion.section>
    </div>
  )
}
