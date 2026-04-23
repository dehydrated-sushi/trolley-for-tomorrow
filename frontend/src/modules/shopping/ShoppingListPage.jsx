import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import NutritionLegend from '../../shared/NutritionLegend'
import { getCategoryInfo } from '../../shared/nutrition'
import { toast } from '../../shared/toastBus'
import {
  getItems     as getShoppingItems,
  addItem      as addShoppingItem,
  toggleChecked,
  removeItem   as removeShoppingItem,
  clearChecked as clearCheckedItems,
  clearAll     as clearAllItems,
  subscribe    as subscribeShopping,
  hasItem      as inShopping,
} from '../../shared/shoppingList'

/**
 * Shopping List page.
 *
 * Top half — three recommendation rails driven by
 * `GET /api/shopping/recommendations`:
 *   1. "You buy this often" — staples from receipt history
 *   2. "Complete a recipe" — missing ingredients from top matches
 *   3. "From your favourites" — missing ingredients from starred recipes
 * Hovering or focusing a rail-2 / rail-3 item reveals a popover with the
 * recipes it would help complete; recipe names link back to /meals with a
 * `?highlight=<id>` query that scrolls + pulses that card on arrival.
 *
 * Bottom half — the actual shopping list, localStorage-backed via
 * `frontend/src/shared/shoppingList.js`. Manual add, classified via the
 * local keyword map with backend refinement. Items grouped by nutritional
 * category using the same palette as the Meals page.
 *
 * Checked items drop to the bottom of their category with a strikethrough
 * — no auto-add-to-fridge, no clever flows; just a normal list you tick
 * off as you walk around the supermarket.
 */

const CATEGORY_ORDER = [
  'protein', 'vegetables', 'fruits', 'grains', 'fats', 'beverages', 'other',
]

export default function ShoppingListPage() {
  // ---- Recommendations (backend) ---------------------------------------
  const [rails, setRails] = useState({
    staples: [], complete_recipes: [], from_favourites: [],
  })
  const [railsLoading, setRailsLoading] = useState(true)

  const reloadRails = () => {
    setRailsLoading(true)
    apiFetch('/api/shopping/recommendations')
      .then((d) => setRails({
        staples:          d?.staples || [],
        complete_recipes: d?.complete_recipes || [],
        from_favourites:  d?.from_favourites || [],
      }))
      .catch(() => { /* keep empty — empty-state copy covers it */ })
      .finally(() => setRailsLoading(false))
  }

  useEffect(reloadRails, [])

  // ---- Manual shopping list (localStorage) -----------------------------
  const [items, setItems] = useState(() => getShoppingItems())
  const [inputName, setInputName] = useState('')
  const [flashId, setFlashId] = useState(null)

  // Chip-to-list morph — when a rail chip is added, a ghost copy flies from
  // the chip's location to the list section so the user's eye follows the
  // action into its destination. One ghost at a time; a rapid second add
  // replaces the first (unlikely in real usage).
  const listTargetRef = useRef(null)
  const [morph, setMorph] = useState(null) // { id, label, category, fromRect, toRect }

  // Keep `items` synced with the shared shoppingList store (updates from
  // this page, other components like Meals, or another tab).
  useEffect(() => {
    const unsub = subscribeShopping((next) => setItems(next))
    return unsub
  }, [])

  // React to "duplicate add attempted" flash events dispatched by Meals page
  // + our own rail handlers below.
  useEffect(() => {
    const onFlash = (e) => {
      const id = e?.detail?.id
      if (!id) return
      setFlashId(id)
      const t = setTimeout(() => setFlashId(null), 850)
      return () => clearTimeout(t)
    }
    window.addEventListener('shopping:flash', onFlash)
    return () => window.removeEventListener('shopping:flash', onFlash)
  }, [])

  const handleManualAdd = (e) => {
    e.preventDefault()
    const name = inputName.trim()
    if (!name) return
    setInputName('')
    const result = addShoppingItem(name, { source: 'manual' })
    if (result.added) {
      toast.show({
        message: `Added ${name}`,
        action: {
          label: 'Undo',
          onClick: () => removeShoppingItem(result.item.id),
        },
      })
    } else {
      const existing = result.existing
      if (existing) {
        window.dispatchEvent(new CustomEvent('shopping:flash', { detail: { id: existing.id } }))
      }
      toast.show({ message: `${name} is already in your list`, tone: 'muted' })
    }
  }

  const handleRailAdd = (name, source, fromRect) => {
    const result = addShoppingItem(name, { source })
    if (result.added) {
      toast.show({
        message: `Added ${name} to your shopping list`,
        action: {
          label: 'Undo',
          onClick: () => removeShoppingItem(result.item.id),
        },
      })
      // Fire the chip-to-list morph. The ghost anchors to the destination
      // header's current position; if the user has scrolled past "Your
      // list", we fall back to a small in-place flourish (no target rect).
      const toEl = listTargetRef.current
      const toRect = toEl ? toEl.getBoundingClientRect() : null
      if (fromRect && toRect) {
        setMorph({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          label: name,
          category: result.item.category,
          fromRect,
          toRect,
        })
      }
    } else {
      if (result.existing) {
        window.dispatchEvent(new CustomEvent('shopping:flash', { detail: { id: result.existing.id } }))
      }
      toast.show({ message: `${name} is already in your list`, tone: 'muted' })
    }
  }

  const handleClearChecked = () => {
    const n = items.filter((i) => i.checked).length
    if (!n) return
    clearCheckedItems()
    toast.show({ message: `Cleared ${n} checked ${n === 1 ? 'item' : 'items'}` })
  }

  const handleClearAll = () => {
    if (items.length === 0) return
    if (!window.confirm(`Clear all ${items.length} items from your shopping list?`)) return
    clearAllItems()
    toast.show({ message: 'Shopping list cleared' })
  }

  // Checked items sort to the bottom within each category group.
  const grouped = useMemo(() => {
    const byCat = {}
    for (const item of items) {
      const cat = item.category || 'other'
      if (!byCat[cat]) byCat[cat] = []
      byCat[cat].push(item)
    }
    for (const cat in byCat) {
      byCat[cat].sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1
        return a.name.localeCompare(b.name)
      })
    }
    return byCat
  }, [items])

  const checkedCount = items.filter((i) => i.checked).length

  return (
    <div className="px-6 lg:px-12 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-4xl lg:text-5xl font-extrabold font-headline text-on-surface tracking-tight mb-3">
            Shopping List
          </h1>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            Your personal list with smart suggestions from your receipts,
            top-matching recipes, and favourites.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NutritionLegend />
          <Link
            to="/meals"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high text-on-surface text-sm font-semibold hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-base">restaurant_menu</span>
            View Meals
          </Link>
        </div>
      </header>

      {/* ======================= RECOMMENDATION RAILS ======================= */}
      <section className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant font-bold mb-4">
          Suggestions for you
        </p>
        <motion.div
          className="grid grid-cols-1 gap-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
          }}
        >
          <Rail
            title="You buy this often"
            accent="#059669"
            icon="local_mall"
            description="Staples you've restocked more than once but haven't bought in over a week."
            items={rails.staples}
            loading={railsLoading}
            emptyCopy="Upload a few more receipts and we'll spot the items you restock regularly."
            onAdd={(it, rect) => handleRailAdd(it.name, 'staple', rect)}
          />
          <Rail
            title="Complete a recipe"
            accent="#6366f1"
            icon="restaurant_menu"
            description="Add these and your top-matching recipes become one-click ready."
            items={rails.complete_recipes}
            loading={railsLoading}
            emptyCopy="Your top recipes all match what's in your fridge — nothing to add!"
            onAdd={(it, rect) => handleRailAdd(it.name, 'recipe', rect)}
            withCompletes
          />
          <Rail
            title="From your favourites"
            accent="#f59e0b"
            icon="star"
            description="Missing ingredients from recipes you've starred."
            items={rails.from_favourites}
            loading={railsLoading}
            emptyCopy="Star recipes on the Meals page and we'll suggest what you're missing."
            onAdd={(it, rect) => handleRailAdd(it.name, 'favourite', rect)}
            withCompletes
          />
        </motion.div>
      </section>

      {/* Zone divider — signals "leaving suggestions, entering your list" */}
      <div className="mb-10 flex items-center gap-4">
        <span className="h-px flex-1 bg-outline-variant/40" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70 font-bold">
          Your list
        </span>
        <span className="h-px flex-1 bg-outline-variant/40" />
      </div>

      {/* ============================ MANUAL LIST =========================== */}
      <section className="mb-20">
        <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
          <div ref={listTargetRef}>
            <h2 className="text-2xl font-bold font-headline text-on-surface">Your list</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              {items.length === 0
                ? "Nothing yet — add items below or tap a suggestion above."
                : `${items.length - checkedCount} unchecked · ${checkedCount} done`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearChecked}
              disabled={checkedCount === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Clear checked
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={items.length === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-error-container/30 hover:text-error disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>

        <form onSubmit={handleManualAdd} className="mb-6">
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <span className="material-symbols-outlined text-on-surface-variant ml-2">add_shopping_cart</span>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Add an item — milk, bread, tomatoes…"
              className="flex-grow bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/60 py-2"
              aria-label="Add an item to the shopping list"
            />
            <button
              type="submit"
              disabled={!inputName.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            >
              Add
            </button>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-3xl bg-surface-container-low border border-outline-variant/15">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">shopping_basket</span>
            <p className="text-on-surface-variant">Your list is empty. Start by adding an item above or tapping a suggestion from the rails.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => {
              const info = getCategoryInfo(cat)
              const list = grouped[cat]
              return (
                <div key={cat} className="rounded-3xl overflow-hidden bg-surface-container-lowest shadow-sm border border-outline-variant/15">
                  <div
                    className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/15"
                    style={{ backgroundColor: `${info.colour}12` }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                        style={{ backgroundColor: info.bg, color: info.colour }}
                      >
                        <span className="material-symbols-outlined text-base">{info.icon}</span>
                      </span>
                      <h3 className="font-bold font-headline" style={{ color: info.colour }}>{info.label}</h3>
                    </div>
                    <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">
                      {list.length} {list.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <ul className="divide-y divide-outline-variant/10">
                    <AnimatePresence initial={false}>
                      {list.map((item) => (
                        <motion.li
                          key={item.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={
                            flashId === item.id
                              ? {
                                  opacity: 1,
                                  x: [0, -4, 4, -3, 3, 0],
                                  backgroundColor: [
                                    'rgba(251,191,36,0)',
                                    'rgba(251,191,36,0.28)',
                                    'rgba(251,191,36,0)',
                                  ],
                                }
                              : { opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }
                          }
                          exit={{ opacity: 0, x: 8, height: 0, padding: 0 }}
                          transition={
                            flashId === item.id
                              ? { duration: 0.6, times: [0, 0.15, 0.3, 0.45, 0.6, 1], ease: 'easeOut' }
                              : { duration: 0.2 }
                          }
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          <button
                            type="button"
                            onClick={() => toggleChecked(item.id)}
                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              item.checked
                                ? 'bg-primary border-primary text-on-primary'
                                : 'border-outline-variant hover:border-primary/60'
                            }`}
                            aria-label={item.checked ? `Uncheck ${item.name}` : `Check off ${item.name}`}
                            aria-pressed={item.checked}
                          >
                            {item.checked && (
                              <span className="material-symbols-outlined text-sm">check</span>
                            )}
                          </button>
                          <span className="flex-grow text-sm relative inline-block">
                            <motion.span
                              animate={{
                                color: item.checked
                                  ? 'rgba(30, 41, 59, 0.5)'
                                  : 'rgb(15, 23, 42)',
                              }}
                              transition={{ duration: 0.2 }}
                              className={item.checked ? '' : 'font-medium'}
                            >
                              {item.name}
                            </motion.span>
                            <motion.span
                              aria-hidden="true"
                              initial={false}
                              animate={{ scaleX: item.checked ? 1 : 0 }}
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                              style={{ transformOrigin: 'left' }}
                              className="pointer-events-none absolute left-0 right-1 top-1/2 -translate-y-1/2 h-[1.5px] bg-on-surface-variant/60 rounded"
                            />
                          </span>
                          {item.source !== 'manual' && (
                            <span
                              className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: info.bg, color: info.colour }}
                              title={`Added from ${item.source}`}
                            >
                              {item.source}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeShoppingItem(item.id)}
                            className="flex-shrink-0 text-on-surface-variant/50 hover:text-error transition-colors p-1"
                            aria-label={`Remove ${item.name}`}
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <MorphGhost morph={morph} onDone={() => setMorph(null)} />
    </div>
  )
}

// ============================================================================
// MorphGhost
// ============================================================================
//
// A floating ghost of a rail chip that flies from the chip's source rect to
// the "Your list" heading rect when an item is added from a rail. Teaches
// the user's eye that "add" means "the thing went over there" instead of
// relying on them to notice the list has grown by one.

function MorphGhost({ morph, onDone }) {
  if (!morph) return null
  const { fromRect, toRect, label, category } = morph
  const info = getCategoryInfo(category || 'other')
  // Target: shrink to a small pill centered on the heading area.
  const targetX = toRect.left + toRect.width / 2 - 60
  const targetY = toRect.top + toRect.height / 2 - 14

  return (
    <AnimatePresence>
      <motion.div
        key={morph.id}
        initial={{
          left: fromRect.left,
          top: fromRect.top,
          width: fromRect.width,
          height: fromRect.height,
          opacity: 1,
          scale: 1,
        }}
        animate={{
          left: targetX,
          top: targetY,
          width: 120,
          height: 28,
          opacity: [1, 1, 0],
          scale: [1, 1.05, 0.7],
        }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
          opacity: { times: [0, 0.75, 1], duration: 0.6 },
          scale: { times: [0, 0.55, 1], duration: 0.6 },
        }}
        onAnimationComplete={onDone}
        style={{ position: 'fixed', zIndex: 70, pointerEvents: 'none' }}
        className="rounded-full bg-white shadow-lg border border-primary/30 flex items-center gap-1.5 px-2 text-sm font-semibold text-on-surface overflow-hidden"
      >
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
          style={{ backgroundColor: info.bg, color: info.colour }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{info.icon}</span>
        </span>
        <span className="truncate">{label}</span>
      </motion.div>
    </AnimatePresence>
  )
}


// ============================================================================
// Rail
// ============================================================================
//
// A single recommendation rail — rendered as a self-contained card with a
// coloured icon badge, a proper display header, a light description, and a
// row of chips. Empty state renders `emptyCopy` instead. When
// `withCompletes` is true, hovering/focusing a chip reveals a popover with
// linkable recipe names that navigate to /meals?highlight=<id>.

function Rail({ title, accent, icon, description, items, loading, emptyCopy, onAdd, withCompletes }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
      }}
      className="bg-surface-container-lowest rounded-3xl p-5 md:p-6 border border-outline-variant/15 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_1px_3px_rgba(15,23,42,0.05)]"
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          className="inline-flex items-center justify-center w-10 h-10 rounded-2xl flex-shrink-0"
          style={{ backgroundColor: `${accent}15`, color: accent }}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base md:text-lg font-extrabold font-headline text-on-surface tracking-tight leading-tight">
            {title}
          </h3>
          <p className="text-xs md:text-sm text-on-surface-variant mt-0.5 leading-snug">
            {description}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-8 w-24 rounded-full bg-surface-container animate-pulse"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-on-surface-variant/80 italic">{emptyCopy}</p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {items.map((it) => (
            <RailItem
              key={`${title}:${it.name}`}
              item={it}
              onAdd={onAdd}
              withCompletes={withCompletes}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}


// ============================================================================
// RailItem
// ============================================================================
//
// One chip. Click/enter = add. Hover/focus = popover with completing recipes
// (when `withCompletes` is true). Items already in the shopping list render
// as muted "added" pills and are non-interactive.

function RailItem({ item, onAdd, withCompletes }) {
  const info = getCategoryInfo(item.category || 'other')
  const [popOpen, setPopOpen] = useState(false)
  const already = inShopping(item.name)

  const handleAdd = (e) => {
    if (already) return
    // Capture the chip's live rect at click time so the page can fly a
    // ghost from here to the list section. Falling back to null if the
    // event lacks currentTarget (e.g., keyboard event edge case).
    const rect = e?.currentTarget?.getBoundingClientRect?.() || null
    onAdd?.(item, rect)
  }

  const chip = (
    <motion.button
      type="button"
      onClick={handleAdd}
      disabled={already}
      whileHover={already ? {} : { scale: 1.04, y: -1 }}
      whileTap={already ? {} : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      onMouseEnter={() => withCompletes && setPopOpen(true)}
      onMouseLeave={() => setPopOpen(false)}
      onFocus={() => withCompletes && setPopOpen(true)}
      onBlur={() => setPopOpen(false)}
      className={
        already
          ? 'inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-800 cursor-default'
          : 'inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-sm font-semibold bg-surface-container-lowest border border-outline-variant/25 hover:border-primary/40 hover:shadow-sm text-on-surface transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
      }
      style={
        already
          ? undefined
          : { boxShadow: `inset 0 0 0 1px ${info.colour}00` }
      }
      aria-label={already ? `${item.name} is already in your list` : `Add ${item.name} to shopping list`}
    >
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
        style={{ backgroundColor: info.bg, color: info.colour }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
          {already ? 'check' : info.icon}
        </span>
      </span>
      <span>{item.name}</span>
      {!already && <span className="material-symbols-outlined text-base text-primary">add</span>}
    </motion.button>
  )

  if (!withCompletes || !item.completes?.length) {
    return chip
  }

  return (
    <span className="relative inline-block">
      {chip}
      <AnimatePresence>
        {popOpen && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-full mt-2 z-30 w-64 bg-white rounded-2xl shadow-xl border border-outline-variant/20 p-4 text-left"
          >
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">
              Completes {item.completes.length} {item.completes.length === 1 ? 'recipe' : 'recipes'}
            </p>
            <ul className="space-y-1.5">
              {item.completes.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/meals?highlight=${r.id}`}
                    className="inline-flex items-center gap-1 text-sm text-on-surface hover:text-primary font-medium"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
                    {r.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
