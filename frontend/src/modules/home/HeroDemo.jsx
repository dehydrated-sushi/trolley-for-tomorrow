import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import CategoryTag from '../../shared/CategoryTag'
import { DEMO_SEQUENCES, TAG_STYLES } from './heroDemoData'

// Phase timings (ms). Tweak these to adjust the rhythm.
// Total loop ≈ sum of all durations + pauseBetweenSequencesMs.
const PHASES = ['receipt', 'scanning', 'budget', 'fridge', 'nutrition', 'recipe', 'shopping', 'reset']
const DURATIONS = {
  receipt:   1200,
  scanning:  1400,
  budget:    1800,
  fridge:    2000,
  nutrition: 1800,
  recipe:    2000,
  shopping:  2000,
  reset:     700,
}
const PAUSE_BETWEEN_SEQUENCES_MS = 250

export default function HeroDemo() {
  const reduceMotion = useReducedMotion()
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [seqIdx, setSeqIdx]     = useState(0)
  const [paused, setPaused]     = useState(false)
  const timerRef = useRef(null)

  const phase = PHASES[phaseIdx]
  const sequence = DEMO_SEQUENCES[seqIdx]

  // Advance the phase on a timer, pause on hover or when tab hidden.
  useEffect(() => {
    if (reduceMotion || paused) return
    const extra = phase === 'reset' ? PAUSE_BETWEEN_SEQUENCES_MS : 0
    timerRef.current = setTimeout(() => {
      const next = (phaseIdx + 1) % PHASES.length
      setPhaseIdx(next)
      if (next === 0) setSeqIdx((s) => (s + 1) % DEMO_SEQUENCES.length)
    }, DURATIONS[phase] + extra)
    return () => clearTimeout(timerRef.current)
  }, [phaseIdx, seqIdx, paused, reduceMotion, phase])

  // Pause while the tab is in the background — saves battery and stops
  // the animation from being several sequences "behind" when the user
  // returns to the tab.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (reduceMotion) return <StaticFallback sequence={DEMO_SEQUENCES[0]} />

  const showReceipt   = phase === 'receipt' || phase === 'scanning'
  const showBudget    = phase === 'budget'
  const showFridge    = phase === 'fridge' || phase === 'nutrition' || phase === 'recipe'
  const showNutrition = phase === 'nutrition'
  const showRecipe    = phase === 'recipe'
  const showShopping  = phase === 'shopping'

  return (
    <div
      className="relative bg-white rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden"
      style={{ minHeight: 500 }}
      aria-label="Animated preview of the Trolley for Tomorrow flow"
    >
      {/* Editorial label — honest without being tacky. */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-semibold text-emerald-900/50 uppercase tracking-[0.25em]">
          How waste is reduced
        </span>
        <PhaseDots activeIdx={phaseIdx} />
      </div>

      {/* Phase stage — fixed height so elements don't push each other around. */}
      <div className="relative" style={{ minHeight: 380 }}>
        <AnimatePresence mode="sync">
          {showReceipt && (
            <ReceiptStage
              key={`receipt-${sequence.id}`}
              sequence={sequence}
              scanning={phase === 'scanning'}
            />
          )}
          {showBudget && (
            <BudgetStage
              key={`budget-${sequence.id}`}
              sequence={sequence}
            />
          )}
          {showFridge && (
            <FridgeStage
              key={`fridge-${sequence.id}`}
              sequence={sequence}
              compact={phase === 'recipe' || phase === 'nutrition'}
            />
          )}
          {showNutrition && (
            <NutritionStage
              key={`nutrition-${sequence.id}`}
              sequence={sequence}
            />
          )}
          {showRecipe && (
            <RecipeStage
              key={`recipe-${sequence.id}`}
              sequence={sequence}
            />
          )}
          {showShopping && (
            <ShoppingStage
              key={`shopping-${sequence.id}`}
              sequence={sequence}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom caption — shows phase context in prose. */}
      <div className="mt-4 text-center">
        <PhaseCaption phase={phase} />
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Phase: Receipt                                                           */
/* ----------------------------------------------------------------------- */

function ReceiptStage({ sequence, scanning }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20, transition: { duration: 0.35 } }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex items-start justify-center"
    >
      <div className="relative w-[280px] select-none">
        {/* Zig-zag top edge */}
        <div
          className="h-3 bg-[#fdfcf7]"
          style={{
            clipPath:
              'polygon(0 0, 8% 100%, 16% 0, 24% 100%, 32% 0, 40% 100%, 48% 0, 56% 100%, 64% 0, 72% 100%, 80% 0, 88% 100%, 96% 0, 100% 100%, 0 100%)',
          }}
        />
        <div className="bg-[#fdfcf7] px-5 pt-3 pb-5 text-[#1a1a1a] font-mono text-[11px] leading-relaxed shadow-xl relative">
          <div className="text-center pb-2 border-b border-dashed border-black/20">
            <div className="font-bold tracking-widest text-[12px]">{sequence.store.toUpperCase()}</div>
            <div className="text-[10px] text-black/50 mt-0.5">{sequence.date} · Food Log</div>
          </div>
          <div className="py-2 space-y-1.5">
            {sequence.receiptItems.map((it, i) => (
              <motion.div
                key={it.line}
                className="flex justify-between"
                initial={{ backgroundColor: 'rgba(16,185,129,0)' }}
                animate={
                  scanning
                    ? {
                        backgroundColor: [
                          'rgba(16,185,129,0)',
                          'rgba(16,185,129,0.18)',
                          'rgba(16,185,129,0)',
                        ],
                      }
                    : { backgroundColor: 'rgba(16,185,129,0)' }
                }
                transition={{ duration: 0.55, delay: scanning ? 0.25 + i * 0.35 : 0 }}
              >
                <span className="truncate pr-3">{it.line}</span>
                <span className="flex-shrink-0 uppercase text-black/55">logged</span>
              </motion.div>
            ))}
          </div>
          <div className="border-t border-dashed border-black/20 pt-2 flex justify-between font-bold">
            <span>ITEMS CAPTURED</span>
            <span>{sequence.receiptItems.length}</span>
          </div>
        </div>
        {/* Zig-zag bottom edge */}
        <div
          className="h-3 bg-[#fdfcf7]"
          style={{
            clipPath:
              'polygon(0 0, 100% 0, 100% 0, 96% 100%, 88% 0, 80% 100%, 72% 0, 64% 100%, 56% 0, 48% 100%, 40% 0, 32% 100%, 24% 0, 16% 100%, 8% 0, 0 100%)',
          }}
        />

        {/* Scan line — only when in scanning phase */}
        {scanning && <ScanLine />}
      </div>
    </motion.div>
  )
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-[2px] pointer-events-none"
      style={{
        background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
        boxShadow: '0 0 12px 2px rgba(16,185,129,0.6)',
      }}
      initial={{ top: 0, opacity: 0 }}
      animate={{ top: '100%', opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.5, ease: 'linear', times: [0, 0.1, 0.9, 1] }}
    />
  )
}

/* ----------------------------------------------------------------------- */
/* Phase: Tracking progress — receipt items update the weekly flow bar      */
/* ----------------------------------------------------------------------- */

function BudgetStage({ sequence }) {
  const pctBefore = sequence.tracking.before
  const pctAfter  = sequence.tracking.after
  const overBudget = false
  const warning    = pctAfter >= 85

  const barColour = overBudget ? '#dc2626' : warning ? '#f59e0b' : '#10b981'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.35 } }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-x-0 top-10"
    >
      <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700">savings</span>
            <span className="font-bold text-emerald-900 text-sm">Waste reduction tracker</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/60">
            weekly target
          </span>
        </div>

        {/* Progress display — keeps the current demo data but reframes it
            around lower-waste weekly progress. */}
        <div className="flex items-baseline gap-2 mb-3">
          <AnimatedPercent from={pctBefore} to={pctAfter} />
          <span className="text-sm text-emerald-700/60">of this week&apos;s food activity now tracked</span>
        </div>

        {/* Animated bar */}
        <div className="h-2 w-full rounded-full bg-emerald-900/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: barColour }}
            initial={{ width: `${pctBefore}%` }}
            animate={{ width: `${pctAfter}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.55 }}
          />
        </div>

        {/* Flying receipt-total chip that "lands" on the bar */}
        <motion.div
          initial={{ opacity: 0, y: -26, x: 20, scale: 0.9 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y:       [-26, 0, 0, 10],
            scale:   [0.9, 1, 1, 0.9],
          }}
          transition={{ duration: 1.3, times: [0, 0.25, 0.75, 1], delay: 0.15 }}
          className="absolute right-5 top-14 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold shadow-md"
        >
          <span className="material-symbols-outlined text-[13px]">receipt_long</span>
          +{sequence.receiptItems.length} items
        </motion.div>

        {/* Status line — switches colour if over/warning */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.15, duration: 0.3 }}
          className="mt-3 text-[11px] font-semibold"
          style={{ color: overBudget ? '#dc2626' : warning ? '#b45309' : '#047857' }}
        >
          {overBudget
            ? 'Higher-risk week — review what should be used first'
            : warning
              ? 'Use-soon foods detected — act before they become waste'
              : 'On track to use more of what you already bought'}
        </motion.p>
      </div>
    </motion.div>
  )
}

/** Animated percentage figure — tweens from `from` to `to` over ~0.9s. */
function AnimatedPercent({ from, to }) {
  const [display, setDisplay] = useState(from)
  useEffect(() => {
    const start = performance.now()
    const duration = 900
    const delay = 550
    let raf
    const tick = (now) => {
      const t = Math.max(0, Math.min(1, (now - start - delay) / duration))
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [from, to])
  return (
    <span className="text-2xl font-black text-emerald-950 tabular-nums">
      {Math.round(display)}%
    </span>
  )
}

/* ----------------------------------------------------------------------- */
/* Phase: Fridge                                                            */
/* ----------------------------------------------------------------------- */

function FridgeStage({ sequence, compact }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: compact ? -8 : 0,
        scale: compact ? 0.94 : 1,
      }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.35 } }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-x-0 top-0"
    >
      <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700">kitchen</span>
            <span className="font-bold text-emerald-900 text-sm">Food at home</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-600 text-white">
            {sequence.fridgeItems.length} items to track
          </span>
        </div>
        <ul className="space-y-2">
          {sequence.fridgeItems.map((item, i) => (
            <motion.li
              key={item.name}
              className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm"
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: compact ? 0 : 0.2 + i * 0.22,
                type: 'spring',
                stiffness: 280,
                damping: 22,
              }}
            >
              <CategoryTag category={item.category} size="xs" showLabel={false} />
              <span className="flex-grow font-semibold text-emerald-950 text-sm">{item.name}</span>
              <span className="text-xs text-emerald-700/70">{item.qty}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

/* ----------------------------------------------------------------------- */
/* Phase: Nutrition — category distribution + balance verdict               */
/* ----------------------------------------------------------------------- */

// Colours mirror CATEGORY_FALLBACK in shared/nutrition.js. Duplicated here so
// the stage has no cross-module coupling.
const CATEGORY_COLOURS = {
  protein:    { fg: '#14b8a6', bg: '#ccfbf1', icon: 'egg',        label: 'Protein' },
  grains:     { fg: '#b45309', bg: '#fef3c7', icon: 'grain',      label: 'Grains' },
  vegetables: { fg: '#a855f7', bg: '#f3e8ff', icon: 'eco',        label: 'Veg' },
  fats:       { fg: '#2563eb', bg: '#dbeafe', icon: 'opacity',    label: 'Fats' },
  fruits:     { fg: '#ec4899', bg: '#fce7f3', icon: 'nutrition',  label: 'Fruits' },
  beverages:  { fg: '#6366f1', bg: '#e0e7ff', icon: 'local_bar',  label: 'Drinks' },
  other:      { fg: '#6b7280', bg: '#f3f4f6', icon: 'category',   label: 'Other' },
}

function NutritionStage({ sequence }) {
  // Tally categories from the fridge items.
  const counts = sequence.fridgeItems.reduce((acc, it) => {
    acc[it.category] = (acc[it.category] || 0) + 1
    return acc
  }, {})
  const total = sequence.fridgeItems.length
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])

  // Balance verdict — simple heuristic for demo purposes.
  const hasProtein = counts.protein > 0
  const hasVeg     = counts.vegetables > 0
  const hasGrain   = counts.grains > 0
  const dominantCount = entries[0][1]
  const isDominated   = dominantCount / total >= 0.65

  let verdict, verdictColour
  if (hasProtein && hasVeg && hasGrain) {
    verdict = 'Good variety on hand'
    verdictColour = '#047857'
  } else if (isDominated) {
    const dom = entries[0][0]
    const label = CATEGORY_COLOURS[dom]?.label?.toLowerCase() || dom
    verdict = `${label.charAt(0).toUpperCase() + label.slice(1)}-heavy · plan to use these soon`
    verdictColour = '#b45309'
  } else {
    verdict = 'Enough variety to plan a low-waste meal'
    verdictColour = '#047857'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.35 } }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="absolute inset-x-0 bottom-0"
    >
      <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700">monitoring</span>
            <span className="font-bold text-emerald-900 text-sm">Use-first balance</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/60">
            what should be used first
          </span>
        </div>

        {/* Stacked proportion bar */}
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-emerald-900/5 mb-3">
          {entries.map(([cat, count], i) => {
            const info = CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.other
            const pct = (count / total) * 100
            return (
              <motion.div
                key={cat}
                style={{ backgroundColor: info.fg }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{
                  duration: 0.6,
                  delay: 0.4 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            )
          })}
        </div>

        {/* Category legend with counts */}
        <div className="flex flex-wrap gap-2 mb-3">
          {entries.map(([cat, count], i) => {
            const info = CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.other
            return (
              <motion.span
                key={cat}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.3 }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: info.bg, color: info.fg }}
              >
                <span className="material-symbols-outlined text-[12px]">{info.icon}</span>
                {count} {info.label.toLowerCase()}
              </motion.span>
            )
          })}
        </div>

        {/* Verdict */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.3 }}
          className="text-[11px] font-bold"
          style={{ color: verdictColour }}
        >
          {verdict}
        </motion.p>
      </div>
    </motion.div>
  )
}

/* ----------------------------------------------------------------------- */
/* Phase: Recipe                                                            */
/* ----------------------------------------------------------------------- */

function RecipeStage({ sequence }) {
  const { recipe } = sequence
  const matchPct = Math.round((recipe.matchCount / recipe.totalIngredients) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20, transition: { duration: 0.35 } }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="absolute inset-x-0 bottom-0"
    >
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-500/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              Use-it-up recipe
            </span>
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 18 }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400 text-emerald-950 text-[10px] font-extrabold"
            >
              <span className="material-symbols-outlined text-[12px]">check_circle</span>
              {matchPct}% MATCH
            </motion.span>
          </div>
          <h4 className="text-lg font-extrabold leading-tight mb-2.5">{recipe.name}</h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-semibold">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {recipe.minutes} min
            </span>
            {recipe.tags.map((tag) => {
              const s = TAG_STYLES[tag] || { bg: '#f3f4f6', fg: '#374151', icon: 'label', label: tag }
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: s.bg, color: s.fg }}
                >
                  <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
                  {s.label}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ----------------------------------------------------------------------- */
/* Phase: Shopping list — closes the loop with next-shop recommendations    */
/* ----------------------------------------------------------------------- */

function ShoppingStage({ sequence }) {
  const { shoppingList } = sequence
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.35 } }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col"
    >
      <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700">shopping_basket</span>
            <span className="font-bold text-emerald-900 text-sm">Only buy what you need</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/60">
            based on what is missing
          </span>
        </div>

        <ul className="space-y-2 mb-4">
          {shoppingList.items.map((item, i) => {
            const info = CATEGORY_COLOURS[item.category] || CATEGORY_COLOURS.other
            return (
              <motion.li
                key={item.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.25 + i * 0.15,
                  type: 'spring',
                  stiffness: 280,
                  damping: 22,
                }}
                className="flex items-center gap-3 bg-emerald-50/60 rounded-xl px-3 py-2.5"
              >
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: info.bg, color: info.fg }}
                >
                  <span className="material-symbols-outlined text-[16px]">{info.icon}</span>
                </span>
                <span className="flex-grow font-semibold text-emerald-950 text-sm">{item.name}</span>
                <span className="text-[10px] font-semibold text-emerald-700/60 uppercase tracking-wide">
                  for {item.neededFor} recipe{item.neededFor !== 1 ? 's' : ''}
                </span>
              </motion.li>
            )
          })}
        </ul>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.35 }}
          className="flex items-center justify-between pt-3 border-t border-emerald-100"
        >
          <span className="text-xs text-emerald-700/70">
            Top-up kept to <span className="font-bold text-emerald-950">{shoppingList.items.length} essentials</span>
          </span>
          {shoppingList.keepsListLean && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[12px]">check_circle</span>
              avoids overbuying
            </span>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ----------------------------------------------------------------------- */
/* Meta UI — phase dots + caption                                           */
/* ----------------------------------------------------------------------- */

const CAPTIONS = {
  receipt:   'Capture what came home',
  scanning:  'Reading food items…',
  budget:    'Tracks progress toward lower waste',
  fridge:    'Shows what should be used first',
  nutrition: 'Highlights use-first balance',
  recipe:    'Suggests meals to prevent waste',
  shopping:  'Buys only what is still needed',
  reset:     '',
}

function PhaseCaption({ phase }) {
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={phase}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3 }}
        className="text-xs font-semibold text-emerald-700/70 uppercase tracking-widest min-h-[1em]"
      >
        {CAPTIONS[phase]}
      </motion.p>
    </AnimatePresence>
  )
}

function PhaseDots({ activeIdx }) {
  // Skip the "reset" phase in the dot display — 7 meaningful phases.
  const visiblePhases = PHASES.slice(0, 7)
  const effectiveIdx = Math.min(activeIdx, 6)
  return (
    <div className="flex items-center gap-1.5">
      {visiblePhases.map((p, i) => (
        <span
          key={p}
          className="block rounded-full transition-all duration-300"
          style={{
            width:   i === effectiveIdx ? 18 : 6,
            height:  6,
            backgroundColor: i === effectiveIdx ? '#059669' : '#d1d5db',
          }}
        />
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Reduced-motion fallback — shows fridge + recipe side-by-side, no motion  */
/* ----------------------------------------------------------------------- */

function StaticFallback({ sequence }) {
  const { recipe } = sequence
  const matchPct = Math.round((recipe.matchCount / recipe.totalIngredients) * 100)
  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8" style={{ minHeight: 500 }}>
      <div className="mb-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest">
          Low-waste flow
        </span>
      </div>
      <div className="space-y-4">
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-emerald-700">kitchen</span>
            <span className="font-bold text-emerald-900 text-sm">Food at home</span>
          </div>
          <ul className="space-y-2">
            {sequence.fridgeItems.map((item) => (
              <li key={item.name} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5">
                <CategoryTag category={item.category} size="xs" showLabel={false} />
                <span className="flex-grow font-semibold text-emerald-950 text-sm">{item.name}</span>
                <span className="text-xs text-emerald-700/70">{item.qty}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              Use-it-up recipe
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400 text-emerald-950 text-[10px] font-extrabold">
              {matchPct}% MATCH
            </span>
          </div>
          <h4 className="text-lg font-extrabold leading-tight">{recipe.name}</h4>
        </div>
      </div>
    </div>
  )
}
