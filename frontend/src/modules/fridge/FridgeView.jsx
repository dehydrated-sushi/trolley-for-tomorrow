<<<<<<< HEAD
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import CategoryTag from '../../shared/CategoryTag'
import NutritionLegend from '../../shared/NutritionLegend'
import { toast } from '../../shared/toastBus'
import { CATEGORY_FALLBACK, getCategoryInfo } from '../../shared/nutrition'
import ManualAddModal from './ManualAddModal'
import ARScanModal from './ARScanModal'
=======
import { useFridge, NUTRITION_CATEGORIES } from './useFridge'
import IngredientList from './IngredientList'
import IngredientForm from './IngredientForm'
import CookingMethodPanel from './CookingMethodPanel'
import ConfirmDialog from '../../shared/ConfirmDialog'
import { Link } from 'react-router-dom'
>>>>>>> fe668f77bd0b70f3c3f439c3929739e64c8c039c

const EASE = [0.22, 1, 0.36, 1]
const UNDO_MS = 4000

export default function FridgeView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  const [addOpen, setAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [arOpen, setArOpen] = useState(false)

  // Soft-deleted items: still in `items` for render continuity during the
  // undo window, but marked with `_pendingDelete` so the card renders as a
  // collapsing "Undo" bar. Expiry timers are tracked per-id so Undo can
  // cancel cleanly. On timer fire → DELETE request + hard-remove locally.
  const deleteTimersRef = useRef(new Map())

  // Flying-card-to-grid ghost — one at a time; adds happen rarely enough
  // that a fresh add during the previous morph just replaces the ghost.
  const [morphGhost, setMorphGhost] = useState(null)
  const gridStartRef = useRef(null) // first grid cell target

  // Add-item button rect (used as origin for the fly-in).
  const addButtonRef = useRef(null)

  // -- Data load --------------------------------------------------------

  const loadFridge = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch('/api/fridge/items')
      setItems(data.items || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFridge() }, [loadFridge])

  // Cleanup on unmount: fire any pending deletes so mid-window navigation
  // doesn't leave ghost rows on the backend after a refresh.
  useEffect(() => () => {
    const timers = deleteTimersRef.current
    for (const [, { timer }] of timers) clearTimeout(timer)
  }, [])

  const categoryCounts = useMemo(() => {
    const c = {}
    for (const i of items) {
      if (i._pendingDelete) continue
      const k = i.category || 'other'
      c[k] = (c[k] || 0) + 1
    }
    return c
  }, [items])

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => (i.category || 'other') === filter)),
    [items, filter],
  )

  const liveCount = useMemo(() => items.filter((i) => !i._pendingDelete).length, [items])

  // -- Add / edit handlers ---------------------------------------------

  const openAdd = () => {
    setEditingItem(null)
    setAddOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setAddOpen(true)
  }

  const closeModal = () => {
    setAddOpen(false)
    setEditingItem(null)
  }

  const handleCreated = (item, originRect) => {
    // Prepend the new item so it's on top; the grid's first cell acts as
    // the morph target.
    setItems((prev) => [item, ...prev])
    // Kick the fly-in animation. Target is measured on the next frame
    // so the newly-inserted card has a rect; requestAnimationFrame gives
    // React time to render before we query.
    requestAnimationFrame(() => {
      const toEl = gridStartRef.current
      const toRect = toEl?.getBoundingClientRect?.() || null
      if (originRect && toRect) {
        setMorphGhost({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          item,
          fromRect: originRect,
          toRect,
        })
      }
    })
    toast.show({ message: `Added ${item.name} to your fridge` })
  }

<<<<<<< HEAD
  const handleUpdated = (item) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...item } : i)))
    toast.show({ message: `Updated ${item.name}` })
  }

  // -- Delete with inline undo -----------------------------------------

  const handleRequestDelete = (item) => {
    // Mark locally; schedule the real DELETE after the undo window.
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, _pendingDelete: true } : i)),
    )
    const timer = setTimeout(async () => {
      try {
        await apiFetch(`/api/fridge/items/${item.id}`, { method: 'DELETE' })
        setItems((prev) => prev.filter((i) => i.id !== item.id))
      } catch (err) {
        // Backend rejected — revert local state and tell the user.
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, _pendingDelete: false } : i)),
        )
        toast.show({ message: `Could not delete ${item.name}`, tone: 'error' })
      } finally {
        deleteTimersRef.current.delete(item.id)
      }
    }, UNDO_MS)
    deleteTimersRef.current.set(item.id, { timer, name: item.name })
  }

  const handleUndoDelete = (itemId) => {
    const entry = deleteTimersRef.current.get(itemId)
    if (entry) {
      clearTimeout(entry.timer)
      deleteTimersRef.current.delete(itemId)
    }
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, _pendingDelete: false } : i)),
    )
  }

  // -- Render -----------------------------------------------------------

  return (
    <div className="px-6 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-2">Your Virtual Fridge</h1>
          <p className="text-on-surface-variant max-w-lg leading-relaxed">
            {loading ? 'Loading your inventory...' : `Tracking ${liveCount} ${liveCount === 1 ? 'item' : 'items'}, tagged by nutritional category.`}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <NutritionLegend />
          <motion.button
            type="button"
            onClick={() => setArOpen(true)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className="group relative inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-xl bg-white border border-cyan-200 shadow-[0_2px_12px_-4px_rgba(34,211,238,0.28)] text-on-surface font-bold text-sm hover:border-cyan-300 transition-colors"
            title="Preview — AR fridge scanning, shipping in iteration 2"
=======
        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="text-xs font-medium tracking-[1.2px] uppercase text-[#5a7a68] mb-1">
              Virtual Fridge
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#0c1f14] tracking-tight">
              My Fridge
            </h1>
            <p className="text-sm text-[#5a7a68] mt-1">
              {allIngredients.length} items
              {expiringCount > 0 && (
                <span className="ml-2 text-amber-600 font-medium">
                  · {expiringCount} expiring soon
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
  <Link
    to="/scan"
    className="inline-flex items-center gap-2 bg-white border border-[#cce4d6] text-[#2d4a38] text-sm font-medium px-4 py-2.5 rounded-full hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all duration-150"
  >
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
    Scan receipt
  </Link>
          <button
            onClick={() => setEditingItem({})}
            className="inline-flex items-center gap-2 bg-[#1e3d2a] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#2d5a3d] hover:-translate-y-px transition-all duration-150"
>>>>>>> fe668f77bd0b70f3c3f439c3929739e64c8c039c
          >
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(6,182,212,0.25) 100%)' }}
            >
              <span className="material-symbols-outlined text-base" style={{ color: 'rgb(6, 182, 212)' }}>
                center_focus_strong
              </span>
            </span>
            Scan fridge
            <span
              className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(34,211,238,0.14)', color: 'rgb(14, 116, 144)' }}
            >
              preview
            </span>
          </motion.button>
          <button
            ref={addButtonRef}
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/10 transition-transform active:scale-95 text-sm"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add item
          </button>
          <Link
            to="/upload-receipt"
            className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface font-bold px-5 py-2.5 rounded-xl hover:bg-surface-container-highest transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-base">receipt_long</span>
            Upload receipt
          </Link>
        </div>
<<<<<<< HEAD
      </header>
=======
        </div>
>>>>>>> fe668f77bd0b70f3c3f439c3929739e64c8c039c

      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-error-container/30 text-error text-sm font-medium">
          Could not load fridge items: {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <p className="text-on-surface-variant animate-pulse text-lg">Loading your fridge...</p>
        </div>
      )}

      {!loading && !error && liveCount === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-6">kitchen</span>
          <h3 className="text-xl font-bold text-on-surface mb-2">Your fridge is empty</h3>
          <p className="text-on-surface-variant mb-6">Add an item manually or upload a receipt to start tracking your ingredients.</p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={openAdd}
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Add item
            </button>
            <Link to="/upload-receipt" className="px-7 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold">
              Upload receipt
            </Link>
          </div>
        </div>
      )}

      {!loading && liveCount > 0 && (
        <>
          {/* Category filter chips */}
          <section className="mb-8">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mr-2">Filter:</span>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={
                  filter === 'all'
                    ? 'px-4 py-1.5 rounded-full bg-primary text-on-primary text-sm font-semibold'
                    : 'px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-sm font-semibold hover:bg-surface-container-highest'
                }
              >
                All · {liveCount}
              </button>
              {Object.keys(CATEGORY_FALLBACK)
                .filter((k) => (categoryCounts[k] || 0) > 0)
                .map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilter(k)}
                    className={
                      filter === k
                        ? 'px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-2'
                        : 'px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-2 opacity-60 hover:opacity-100'
                    }
                    style={{
                      backgroundColor: CATEGORY_FALLBACK[k].bg,
                      color: CATEGORY_FALLBACK[k].colour,
                    }}
                  >
                    <span className="material-symbols-outlined text-sm">{CATEGORY_FALLBACK[k].icon}</span>
                    {CATEGORY_FALLBACK[k].label} · {categoryCounts[k]}
                  </button>
                ))}
            </div>
          </section>

          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence initial={false}>
              {visible.map((item, idx) => {
                const info = getCategoryInfo(item.category)
                const cardRef = idx === 0 ? gridStartRef : undefined
                return (
                  <motion.div
                    key={item.id}
                    ref={cardRef}
                    layout
                    initial={{ opacity: 0, scale: 0.94, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 4 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className="group bg-surface-container-lowest rounded-3xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-on-surface/5 flex flex-col relative"
                  >
                    {/* Undo overlay for items pending deletion */}
                    <AnimatePresence>
                      {item._pendingDelete && (
                        <motion.div
                          key="undo"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="absolute inset-0 z-10 rounded-3xl bg-surface-container-highest/95 flex flex-col items-center justify-center gap-2 px-4 text-center"
                        >
                          <p className="text-sm font-semibold text-on-surface">Removed {item.name}</p>
                          <button
                            type="button"
                            onClick={() => handleUndoDelete(item.id)}
                            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-on-surface text-surface-container-lowest text-xs font-bold uppercase tracking-widest"
                          >
                            <span className="material-symbols-outlined text-sm">undo</span>
                            Undo
                          </button>
                          <motion.span
                            aria-hidden="true"
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{ duration: UNDO_MS / 1000, ease: 'linear' }}
                            style={{ transformOrigin: 'left' }}
                            className="absolute bottom-0 left-0 right-0 h-1 bg-primary/60 rounded-b-3xl"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Hover action buttons — top-right */}
                    <div className="absolute top-3 right-3 z-[5] flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-on-surface flex items-center justify-center shadow-sm"
                        title={`Edit ${item.name}`}
                        aria-label={`Edit ${item.name}`}
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestDelete(item)}
                        className="w-7 h-7 rounded-full bg-white/90 hover:bg-error/10 hover:text-error text-on-surface flex items-center justify-center shadow-sm"
                        title={`Remove ${item.name}`}
                        aria-label={`Remove ${item.name}`}
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>

                    <div
                      className="relative w-full h-28 mb-4 rounded-2xl overflow-hidden flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${info.bg} 0%, ${info.bg} 60%, ${info.colour}22 100%)`,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 72, color: info.colour, opacity: 0.85 }}
                      >
                        {info.icon}
                      </span>
                      <div className="absolute top-3 left-3">
                        <CategoryTag category={item.category} size="xs" />
                      </div>
                    </div>
                    <div className="px-1">
                      <h3 className="font-bold text-lg text-on-surface mb-1">{item.name}</h3>
                      <p className="text-xs text-on-surface-variant mb-3">
                        Added {new Date(item.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold bg-surface-container px-3 py-1.5 rounded-lg text-on-secondary-container">
                          Qty: {item.qty ?? 1}
                        </span>
                        {item.price != null && (
                          <span className="text-sm font-bold text-primary">${Number(item.price).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>

          <section className="mt-20 flex flex-col md:flex-row items-center gap-12 p-12 bg-surface-container rounded-[3rem] relative overflow-hidden">
            <div className="relative z-10 flex-1">
              <h2 className="text-3xl font-extrabold font-headline mb-4">Larder Overview</h2>
              <p className="text-on-surface-variant mb-8 max-w-md leading-relaxed">
                You have <span className="text-primary font-bold">{liveCount} items</span> in your virtual fridge, spread across {Object.keys(categoryCounts).length} nutritional categories.
              </p>
              <Link to="/meals" className="inline-flex items-center gap-2 primary-gradient text-on-primary px-8 py-3 rounded-xl font-bold shadow-lg">
                Get Meal Suggestions <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
            <div className="relative w-full md:w-1/3 aspect-square bg-white/40 rounded-[2rem] flex items-center justify-center border border-white/20 backdrop-blur-sm">
              <div className="text-center">
                <span className="text-6xl font-black text-primary font-headline block">{liveCount}</span>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Active Items</span>
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-tertiary-container rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-tertiary-container">eco</span>
              </div>
            </div>
          </section>
        </>
      )}

      <ManualAddModal
        open={addOpen}
        onClose={closeModal}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        existingItems={items.filter((i) => !i._pendingDelete)}
        initialItem={editingItem}
        buttonOriginRef={addButtonRef}
      />

      <ARScanModal open={arOpen} onClose={() => setArOpen(false)} />

      {/* Card-fly-to-grid ghost */}
      <FridgeCardMorph morph={morphGhost} onDone={() => setMorphGhost(null)} />
    </div>
  )
}

// ============================================================================
// FridgeCardMorph
// ============================================================================
//
// Fixed-position motion.div that flies a ghost card from the "Add" button's
// rect to the first grid cell's rect after a manual add. The real card is
// already in the grid; the ghost is pure theatre — it teaches the eye that
// "your save landed there." Fades out at the end so the real card is what
// the user ends up looking at.

function FridgeCardMorph({ morph, onDone }) {
  if (!morph) return null
  const { item, fromRect, toRect } = morph
  const info = getCategoryInfo(item?.category || 'other')
  return (
    <AnimatePresence>
      <motion.div
        key={morph.id}
        initial={{
          left:    fromRect.left,
          top:     fromRect.top,
          width:   fromRect.width,
          height:  fromRect.height,
          opacity: 1,
          scale:   1,
        }}
        animate={{
          left:    toRect.left,
          top:     toRect.top,
          width:   toRect.width,
          height:  toRect.height,
          opacity: [1, 1, 0],
          scale:   [1, 1.03, 1],
        }}
        transition={{
          duration: 0.65,
          ease: EASE,
          opacity: { times: [0, 0.7, 1], duration: 0.65 },
          scale:   { times: [0, 0.55, 1], duration: 0.65 },
        }}
        onAnimationComplete={onDone}
        style={{ position: 'fixed', zIndex: 70, pointerEvents: 'none' }}
        className="rounded-3xl shadow-2xl border border-primary/40 bg-white overflow-hidden flex items-center gap-3 px-4"
      >
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-2xl flex-shrink-0"
          style={{ backgroundColor: info.bg, color: info.colour }}
        >
          <span className="material-symbols-outlined text-lg">{info.icon}</span>
        </span>
        <span className="font-bold text-sm text-on-surface truncate">{item?.name}</span>
      </motion.div>
    </AnimatePresence>
  )
}
