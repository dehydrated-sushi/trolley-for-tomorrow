import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import AnimatedNumber from '../../shared/AnimatedNumber'

// Shared easing curve — matches the rest of the app (Meals, NutritionPopover, SortDropdown).
const EASE = [0.22, 1, 0.36, 1]

// Fixed-size shimmer placeholder so loading doesn't cause layout shift.
function NumberSkeleton({ width = '3rem', height = '2.25rem' }) {
  return (
    <span
      className="inline-block rounded-md bg-on-surface/10 animate-pulse align-middle"
      style={{ width, height }}
    />
  )
}

// Fallback tip shown when the FoodKeeper endpoint is unreachable or empty
// (e.g. the seed hasn't been run yet). Keeps the widget populated so the
// Dashboard never renders a blank card.
const FALLBACK_TIP = {
  title: 'Revive Your Greens',
  body:  'Limp celery or carrots? Soak them in ice water for 30 minutes to bring back the crunch.',
  attribution: null,
}

// How long each tip is visible before rotating. 9 s — a touch quicker than
// the industry-standard 10 s for reading-heavy rotators, still long enough
// to read 1-2 sentences without rushing, short enough that a 30-second page
// visit sees three different tips. Hover pauses the timer; it resumes from
// where it paused.
const TIP_DURATION_S = 9

export default function DashboardPage() {
  const [fridgeCount, setFridgeCount] = useState(0)
  const [loadingFridge, setLoadingFridge] = useState(true)
  const [budgetStatus, setBudgetStatus] = useState(null)
  const [loadingBudget, setLoadingBudget] = useState(true)

  // Tip carousel state. We intentionally keep only the CURRENT tip, ONE
  // previous (for the back button), and ONE pre-fetched next tip (so
  // rotations swap instantly without a network round-trip). No full history.
  const [tip, setTip] = useState(FALLBACK_TIP)
  const [previousTip, setPreviousTip] = useState(null)
  const [nextTip, setNextTip] = useState(null)
  const [paused, setPaused] = useState(false)

  // Progress ring animation. Driven by a framer-motion MotionValue so per-frame
  // updates bypass React re-renders. `controlsRef` holds the current playback
  // handle so the hover-pause effect can pause/play it imperatively.
  //
  // The ring is an SVG rect traced via strokeDashoffset, so it follows the
  // card's rounded perimeter. Because the stroke's path length depends on the
  // actual rendered dimensions, we measure the card with a ResizeObserver and
  // keep the SVG rect in sync. `pathLength="1"` normalises the dasharray so
  // offset can be a 0-to-1 value independent of the real perimeter length.
  const progress = useMotionValue(0)
  const ringOffset = useTransform(progress, (p) => 1 - p)
  const controlsRef = useRef(null)
  const cardRef = useRef(null)
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!cardRef.current) return
    const el = cardRef.current
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      // Use borderBoxSize — contentRect would give us the padding-excluded
      // inner box, which would make the SVG smaller than the card and we'd
      // see two concentric rectangles instead of one ring at the edge.
      const box = entry.borderBoxSize?.[0]
      if (box) {
        setCardSize({ width: box.inlineSize, height: box.blockSize })
      } else if (entry.contentRect) {
        // Fallback for older browsers that don't support borderBoxSize.
        setCardSize({ width: el.offsetWidth, height: el.offsetHeight })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    async function loadAll() {
      try {
        const [fridge, budget] = await Promise.all([
          apiFetch('/api/fridge/items').catch(() => ({ items: [] })),
          apiFetch('/api/profile/budget-status').catch(() => null),
        ])
        setFridgeCount((fridge.items || []).length)
        setBudgetStatus(budget)
      } finally {
        setLoadingFridge(false)
        setLoadingBudget(false)
      }
    }
    loadAll()
  }, [])

  // ---- Tip carousel ------------------------------------------------------

  const fetchTip = useCallback(async () => {
    try {
      const data = await apiFetch('/api/foodkeeper/tips?limit=1')
      const t = data?.tips?.[0]
      if (t?.body) {
        return {
          title:       t.product_name || 'Kitchen wisdom',
          body:        t.body,
          attribution: data?.attribution || null,
        }
      }
    } catch { /* swallow — caller handles null */ }
    return null
  }, [])

  const rotate = useCallback(() => {
    setPreviousTip(tip)
    if (nextTip) {
      // Hot path: next tip was pre-fetched. Swap instantly, then pre-fetch
      // the one after while this one is on screen.
      setTip(nextTip)
      setNextTip(null)
      fetchTip().then((nt) => { if (nt) setNextTip(nt) })
    } else {
      // Cold path: pre-fetch missed (e.g. request in flight, or first
      // rotation failed). Fetch now, then prime the next one.
      fetchTip().then((t) => {
        if (t) setTip(t)
        fetchTip().then((nt) => { if (nt) setNextTip(nt) })
      })
    }
  }, [tip, nextTip, fetchTip])

  // Hold `rotate` in a ref so the progress-animation effect doesn't re-run
  // (and therefore reset progress to 0) whenever rotate's identity changes —
  // which it does every time `nextTip` updates from the prefetch.
  const rotateRef = useRef(rotate)
  useEffect(() => { rotateRef.current = rotate }, [rotate])

  const goBack = useCallback(() => {
    if (!previousTip) return
    // Park the current tip as the "next" so after the back-nav the carousel
    // continues forward from where it was, not from a fresh fetch.
    setNextTip(tip)
    setTip(previousTip)
    setPreviousTip(null)
  }, [tip, previousTip])

  // One-shot: fetch the first real tip + prime the pre-fetch slot.
  useEffect(() => {
    let cancelled = false
    fetchTip().then((t) => {
      if (cancelled) return
      if (t) setTip(t)
      fetchTip().then((nt) => { if (!cancelled && nt) setNextTip(nt) })
    })
    return () => { cancelled = true }
  }, [fetchTip])

  // Restart the progress animation whenever the displayed tip changes.
  useEffect(() => {
    progress.set(0)
    const controls = animate(progress, 1, {
      duration: TIP_DURATION_S,
      ease:     'linear',
      onComplete: () => rotateRef.current?.(),
    })
    controlsRef.current = controls
    return () => controls.stop()
  }, [tip, progress])

  // Pause/resume the animation imperatively when hover/focus state flips,
  // so the timer resumes from where it was, not from 0.
  useEffect(() => {
    if (!controlsRef.current) return
    if (paused) controlsRef.current.pause()
    else controlsRef.current.play()
  }, [paused])

  const budget = budgetStatus?.budget
  const spent = budgetStatus?.spent_this_week ?? 0
  const remaining = budgetStatus?.remaining
  const hasBudget = budget != null
  const overBudget = hasBudget && remaining != null && remaining < 0
  const pctUsed =
    hasBudget && budget > 0 ? Math.min(100, Math.max(0, (spent / budget) * 100)) : 0

  return (
    <div className="px-6 md:px-10 max-w-7xl mx-auto">
      {/* Hero — fades up as a block, then its contents stagger in individually
          (no parent variants — each element owns its own delay, which sidesteps
          the motion.create(Link) + parent-variants regression from 1.3.0). */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mb-6"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-emerald-900 p-8 md:p-12 text-white shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1, ease: EASE }}
              className="text-emerald-300 font-headline font-bold uppercase tracking-widest text-xs mb-4 block"
            >
              Your Kitchen Dashboard
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18, ease: EASE }}
              className="text-4xl md:text-5xl font-extrabold font-headline mb-6 leading-tight"
            >
              Welcome Back
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.28, ease: EASE }}
              className="text-emerald-100/80 text-lg"
            >
              {loadingFridge
                ? 'Loading your kitchen data...'
                : fridgeCount > 0
                  ? `You have ${fridgeCount} items in your fridge. Let's make something delicious!`
                  : 'Your fridge is empty. Upload a receipt to get started!'}
            </motion.p>
          </div>
        </div>
      </motion.header>

      {/* Over-budget warning — slides down with AnimatePresence only when the
          condition flips true. Warning icon punches in with a quick scale-pulse. */}
      <AnimatePresence initial={false}>
        {overBudget && (
          <motion.div
            key="over-budget"
            initial={{ opacity: 0, y: -12, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, y: -12, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl bg-error-container/30 border-l-4 border-error flex items-start gap-4">
              <motion.span
                initial={{ scale: 0.6 }}
                animate={{ scale: [0.6, 1.18, 1] }}
                transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
                className="material-symbols-outlined text-error text-2xl flex-shrink-0"
              >
                warning
              </motion.span>
              <div className="flex-grow">
                <h4 className="font-bold text-error mb-1">You&apos;re over budget this week</h4>
                <p className="text-sm text-on-surface-variant">
                  You&apos;ve spent <span className="font-semibold text-error">${spent.toFixed(2)}</span>,
                  which is <span className="font-semibold text-error">${Math.abs(remaining).toFixed(2)}</span> over
                  your <span className="font-semibold">${budget.toFixed(2)}</span> weekly budget.
                </p>
              </div>
              <Link
                to="/dashboard"
                className="flex-shrink-0 px-5 py-2 rounded-full bg-surface-container-high text-primary text-sm font-semibold hover:bg-surface-container-highest transition-colors"
              >
                Adjust budget
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bento Grid — 4 cards with staggered entrance via per-card delay
          (index * 70 ms starting at 0.35 s). Hover is a Framer spring lift
          layered on top of the existing CSS shadow-md transition. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Fridge */}
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.35, ease: EASE }}
          whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            to="/fridge"
            className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group block h-full"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-secondary-container rounded-2xl transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                <span className="material-symbols-outlined text-on-secondary-container">kitchen</span>
              </div>
            </div>
            <h3 className="text-on-surface-variant font-headline font-semibold mb-1 text-sm">Fridge Items</h3>
            <p className="text-3xl font-extrabold text-on-surface font-headline">
              {loadingFridge ? <NumberSkeleton width="3rem" /> : <AnimatedNumber value={fridgeCount} />}
            </p>
            <span className="mt-3 text-primary font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
              View fridge <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </Link>
        </motion.div>

        {/* Meals */}
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.42, ease: EASE }}
          whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            to="/meals"
            className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group block h-full"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-tertiary-container/20 rounded-2xl transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                <span className="material-symbols-outlined text-tertiary">restaurant_menu</span>
              </div>
            </div>
            <h3 className="text-on-surface-variant font-headline font-semibold mb-1 text-sm">Meal Suggestions</h3>
            <p className="text-3xl font-extrabold text-on-surface font-headline">
              {fridgeCount > 0 ? 'Ready' : '--'}
            </p>
            <span className="mt-3 text-primary font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
              View meals <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </Link>
        </motion.div>

        {/* Upload Receipt */}
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.49, ease: EASE }}
          whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            to="/upload-receipt"
            className="bg-surface-container-low p-6 rounded-[2rem] border border-outline-variant/15 flex flex-col justify-between group hover:shadow-md transition-shadow h-full"
          >
            <div>
              <div className="p-3 bg-primary/10 rounded-2xl inline-block mb-4 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
              </div>
              <h3 className="text-on-surface-variant font-headline font-semibold mb-1 text-sm">Upload Receipt</h3>
              <p className="text-on-surface-variant/70 text-xs">Scan a receipt to add items.</p>
            </div>
            <span className="mt-4 text-primary font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
              Upload now <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </Link>
        </motion.div>

        {/* Budget widget */}
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.56, ease: EASE }}
          whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            to="/dashboard"
            className={`p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group block h-full ${
              overBudget
                ? 'bg-error-container/20 border border-error/20'
                : 'bg-surface-container-lowest'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${overBudget ? 'bg-error/10' : 'bg-primary/10'}`}>
                <span className={`material-symbols-outlined ${overBudget ? 'text-error' : 'text-primary'}`}>
                  savings
                </span>
              </div>
              {hasBudget && !loadingBudget && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.8, ease: EASE }}
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    overBudget
                      ? 'bg-error/20 text-error'
                      : pctUsed >= 80
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-primary/10 text-primary'
                  }`}
                >
                  <AnimatedNumber value={Math.round(pctUsed)} duration={1.0} />%
                </motion.span>
              )}
            </div>
            <h3 className="text-on-surface-variant font-headline font-semibold mb-1 text-sm">
              {hasBudget ? 'This Week' : 'Weekly Budget'}
            </h3>

            {loadingBudget ? (
              <>
                <NumberSkeleton width="5rem" />
                <div className="mt-1"><NumberSkeleton width="9rem" height="0.75rem" /></div>
              </>
            ) : hasBudget ? (
              <>
                <p className={`text-3xl font-extrabold font-headline ${
                  overBudget ? 'text-error' : 'text-on-surface'
                }`}>
                  $<AnimatedNumber value={Math.abs(remaining)} format={(n) => n.toFixed(2)} />
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {overBudget
                    ? `over · spent $${spent.toFixed(2)} of $${budget.toFixed(2)}`
                    : `remaining · $${spent.toFixed(2)} of $${budget.toFixed(2)} spent`}
                </p>
                {/* Progress bar — animates width from 0 to current pctUsed with a spring-ish ease */}
                <div className="mt-3 h-1.5 w-full rounded-full bg-on-surface/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, pctUsed)}%` }}
                    transition={{ duration: 1.1, delay: 0.7, ease: EASE }}
                    style={{
                      backgroundColor: overBudget
                        ? '#dc2626'
                        : pctUsed >= 80
                          ? '#f59e0b'
                          : '#14b8a6',
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-on-surface font-headline">Not set</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Set a weekly budget to track receipt spending.
                </p>
              </>
            )}

            <span className="mt-3 text-primary font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
              {hasBudget ? 'Edit budget' : 'Set budget'}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </Link>
        </motion.div>
      </div>

      {/* Quick Actions + Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7, ease: EASE }}
            className="text-2xl font-bold font-headline text-emerald-900 px-2"
          >
            Quick Actions
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.78, ease: EASE }}
            className="bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-sm"
          >
            <div className="divide-y divide-transparent">
              {[
                {
                  to: '/upload-receipt',
                  icon: 'add_shopping_cart',
                  iconBg: 'bg-emerald-100',
                  iconColor: 'text-emerald-700',
                  title: 'Upload a Receipt',
                  desc: 'Scan and add grocery items to your virtual fridge',
                },
                {
                  to: '/fridge',
                  icon: 'kitchen',
                  iconBg: 'bg-secondary-container',
                  iconColor: 'text-secondary',
                  title: 'View Your Fridge',
                  desc: 'See all items currently in your inventory',
                },
                {
                  to: '/meals',
                  icon: 'restaurant_menu',
                  iconBg: 'bg-tertiary-container/10',
                  iconColor: 'text-tertiary',
                  title: 'Get Meal Recommendations',
                  desc: 'AI-powered recipes based on your fridge contents',
                },
                {
                  to: '/roadmap',
                  icon: 'upcoming',
                  iconBg: 'bg-emerald-100/60',
                  iconColor: 'text-emerald-700',
                  title: "See what's coming next",
                  desc: '7 features in development for iteration 2',
                  teaser: true,
                },
              ].map((row, i) => (
                <motion.div
                  key={row.to}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.88 + i * 0.07, ease: EASE }}
                >
                  <Link
                    to={row.to}
                    className="p-6 flex items-center gap-6 hover:bg-surface-container-low transition-colors group"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${row.iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110`}>
                      <span className={`material-symbols-outlined ${row.iconColor}`}>{row.icon}</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-on-surface">{row.title}</h4>
                        {row.teaser && (
                          <motion.span
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
                          >
                            New
                          </motion.span>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant">{row.desc}</p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                      chevron_right
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7, ease: EASE }}
            className="text-2xl font-bold font-headline text-emerald-900 px-2"
          >
            Trolley Tips
          </motion.h2>

          {/* Tip carousel — rotates every 9 s with a crossfade + 10 px
              vertical shift, pauses on hover/focus, shows a back button on
              hover when a previous tip is available. */}
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.85, ease: EASE }}
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
            tabIndex={0}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={(e) => {
              // Only un-pause if focus actually left the card (not moved to a child).
              if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false)
            }}
            className="bg-emerald-900 rounded-[2rem] p-6 text-white relative overflow-hidden group min-h-[260px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
          >
            {/* Progress ring — traces the full perimeter. Dim emerald ring
                sits underneath for always-visible structure; bright emerald
                trace paints clockwise with `strokeDashoffset` driven by the
                progress MotionValue. `pathLength="1"` normalises the stroke
                dasharray so offset goes 1 → 0 regardless of actual perimeter. */}
            {cardSize.width > 0 && (
              <svg
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${cardSize.width} ${cardSize.height}`}
                preserveAspectRatio="none"
                fill="none"
              >
                {/* Dim background ring — always visible, defines the track */}
                <rect
                  x="1.25"
                  y="1.25"
                  width={Math.max(0, cardSize.width - 2.5)}
                  height={Math.max(0, cardSize.height - 2.5)}
                  rx="30.75"
                  ry="30.75"
                  stroke="rgb(110, 231, 183)"
                  strokeOpacity="0.18"
                  strokeWidth="2.5"
                />
                {/* Animated trace — bright, grows clockwise with progress */}
                <motion.rect
                  x="1.25"
                  y="1.25"
                  width={Math.max(0, cardSize.width - 2.5)}
                  height={Math.max(0, cardSize.height - 2.5)}
                  rx="30.75"
                  ry="30.75"
                  stroke="rgb(110, 231, 183)"
                  strokeOpacity="0.85"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  pathLength="1"
                  strokeDasharray="1"
                  style={{ strokeDashoffset: ringOffset }}
                />
              </svg>
            )}

            {/* Lightbulb sits outside the AnimatePresence so it doesn't flash
                on each rotation — it's chrome, not content. */}
            <motion.span
              className="material-symbols-outlined text-emerald-300 mb-4 block relative z-10"
              style={{ fontVariationSettings: "'FILL' 1" }}
              animate={{ rotate: [0, -6, 0, 6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              lightbulb
            </motion.span>

            {/* Rotating content — key on body so AnimatePresence sees each
                tip as a distinct element and can animate enter/exit. */}
            <div className="relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tip.body}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h4 className="text-xl font-bold font-headline mb-2 leading-tight">{tip.title}</h4>
                  <p className="text-emerald-100/70 text-sm mb-4">{tip.body}</p>
                  {tip.attribution && (
                    <a
                      href={tip.attribution.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] uppercase tracking-widest text-emerald-300/60 hover:text-emerald-300 font-bold"
                    >
                      Source · {tip.attribution.source}
                    </a>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Back button — appears only on hover/focus AND when we actually
                have a previous tip to go back to. Bottom-right so it doesn't
                compete with the tip body for the eye. */}
            <AnimatePresence>
              {paused && previousTip && (
                <motion.button
                  key="back-button"
                  type="button"
                  onClick={goBack}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="absolute bottom-5 right-5 z-20 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] uppercase tracking-widest text-emerald-100 font-bold backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
                  aria-label="Show previous tip"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Previous
                </motion.button>
              )}
            </AnimatePresence>

            {/* Ambient drifting eco icon — slow, low-amplitude background detail */}
            <motion.div
              aria-hidden="true"
              className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none"
              animate={{
                rotate: [0, 4, 0, -4, 0],
                scale: [1, 1.05, 1, 1.03, 1],
              }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            >
              <span className="material-symbols-outlined text-9xl">eco</span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.95, ease: EASE }}
            className="bg-surface-container-lowest rounded-[2rem] p-6 shadow-sm border border-primary/10"
          >
            <h4 className="font-bold text-on-surface mb-3">How it works</h4>
            <div className="space-y-3 text-sm text-on-surface-variant">
              {[
                'Upload your grocery receipt',
                'We read the items and add them to your fridge',
                'Receipt prices deduct from your weekly budget automatically',
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 1.05 + i * 0.09, ease: EASE }}
                  className="flex items-start gap-3"
                >
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <p>{step}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
