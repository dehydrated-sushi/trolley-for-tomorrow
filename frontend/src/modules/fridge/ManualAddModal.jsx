import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import { CATEGORY_FALLBACK, getCategoryInfo } from '../../shared/nutrition'

const EASE = [0.22, 1, 0.36, 1]

/**
 * Modal for manually adding (or editing) a fridge item.
 *
 * Behaviour:
 * - Single input row: name (required), qty, price. No progressive
 *   disclosure — the user is already in the modal because they want to
 *   enter details; hiding fields would add a click, not remove one.
 * - Category is classified by the backend on a 300 ms debounce as the
 *   user types. The chip materialises next to the name input once a
 *   category is known; clicking it opens an override popover with the
 *   seven categories.
 * - Duplicate-name detection: if the typed name matches an existing
 *   fridge item case-insensitively, a banner surfaces after 400 ms of
 *   idle with "+1 to existing" (PATCH qty) or "Add anyway" shortcuts.
 * - Edit mode: pass an `initialItem` prop — modal pre-fills and the
 *   Save button PATCHes instead of POSTing.
 */
export default function ManualAddModal({
  open,
  onClose,
  onCreated,           // (item, originRect) => void  — parent triggers fly-to-grid
  onUpdated,           // (item) => void               — edit mode
  existingItems = [],
  initialItem = null,  // non-null → edit mode
  buttonOriginRef = null,  // optional ref for the card-fly origin (defaults to modal body)
}) {
  const isEdit = !!initialItem

  const [name,  setName]  = useState('')
  const [qty,   setQty]   = useState('1')
  const [price, setPrice] = useState('')
  const [category,          setCategory]         = useState(null)
  const [categoryOverride,  setCategoryOverride] = useState(false)
  const [classifyInFlight,  setClassifyInFlight] = useState(false)
  const [catOpen,   setCatOpen]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,     setError]     = useState('')

  const nameInputRef    = useRef(null)
  const classifyTimerRef = useRef(null)
  const savedRectRef    = useRef(null)

  // -- Lifecycle: open / close / edit-mode pre-fill ---------------------

  useEffect(() => {
    if (!open) return
    if (isEdit && initialItem) {
      setName(initialItem.name || '')
      setQty(initialItem.qty != null ? String(initialItem.qty) : '1')
      setPrice(initialItem.price != null ? String(initialItem.price) : '')
      setCategory(initialItem.category || null)
      setCategoryOverride(false)
    } else {
      setName('')
      setQty('1')
      setPrice('')
      setCategory(null)
      setCategoryOverride(false)
    }
    setError('')
    setCatOpen(false)
    // Autofocus the name input next tick so the scale-in animation
    // finishes before focus lands (avoids the initial transform fighting
    // the focus scroll-into-view on narrow viewports).
    const t = setTimeout(() => nameInputRef.current?.focus(), 120)
    return () => clearTimeout(t)
  }, [open, isEdit, initialItem])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (catOpen) setCatOpen(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, catOpen, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // -- Live category classification (debounced) -------------------------

  useEffect(() => {
    if (!open) return
    // Don't auto-classify when the user has manually overridden — that
    // setting is sticky until they clear the name.
    if (categoryOverride) return
    if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current)

    const trimmed = name.trim()
    if (!trimmed) {
      setCategory(null)
      return
    }
    classifyTimerRef.current = setTimeout(async () => {
      setClassifyInFlight(true)
      try {
        const data = await apiFetch(`/api/ingredients/classify?name=${encodeURIComponent(trimmed)}`)
        if (data?.category) setCategory(data.category)
      } catch {
        /* keep whatever was there; silent */
      } finally {
        setClassifyInFlight(false)
      }
    }, 300)

    return () => {
      if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current)
    }
  }, [name, open, categoryOverride])

  // -- Duplicate detection (case-insensitive, ignores self in edit mode) --

  const duplicate = useMemo(() => {
    const n = name.trim().toLowerCase()
    if (!n) return null
    return (
      existingItems.find(
        (i) =>
          i.name.trim().toLowerCase() === n &&
          (!initialItem || i.id !== initialItem.id),
      ) || null
    )
  }, [name, existingItems, initialItem])

  // -- Handlers ---------------------------------------------------------

  const pickCategory = (key) => {
    setCategory(key)
    setCategoryOverride(true)
    setCatOpen(false)
  }

  const handleIncrementExisting = async () => {
    if (!duplicate) return
    setSubmitting(true)
    setError('')
    try {
      const nextQty = (() => {
        const n = parseInt(String(duplicate.qty || '1'), 10)
        return Number.isFinite(n) ? String(n + 1) : String(duplicate.qty || '1') + ' +1'
      })()
      const data = await apiFetch(`/api/fridge/items/${duplicate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty: nextQty }),
      })
      const updated = data?.item || { ...duplicate, qty: nextQty }
      onUpdated?.(updated)
      onClose()
    } catch (err) {
      setError(err?.message || 'Could not update quantity')
    } finally {
      setSubmitting(false)
    }
  }

  const captureOrigin = () => {
    // Try the external ref first (the save button), fall back to the modal's
    // own save-button element via `savedRectRef`. Either is fine — the ghost
    // just needs a defined starting point.
    const refEl = buttonOriginRef?.current
    return (refEl || savedRectRef.current)?.getBoundingClientRect?.() || null
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const cleanName = name.trim()
    if (!cleanName) return
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        name:  cleanName,
        qty:   qty.trim() || '1',
        price: price.trim() === '' ? null : price,
      }

      if (isEdit) {
        const data = await apiFetch(`/api/fridge/items/${initialItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const item = { ...data?.item, category: category || data?.item?.category }
        onUpdated?.(item)
        onClose()
      } else {
        const data = await apiFetch('/api/fridge/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const item = { ...data?.item, category: category || data?.item?.category }
        const origin = captureOrigin()
        onCreated?.(item, origin)
        onClose()
      }
    } catch (err) {
      setError(err?.message || 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  const canSave = name.trim().length > 0 && !submitting

  // -- Render ----------------------------------------------------------

  const info = category ? getCategoryInfo(category) : null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manualadd-title"
        >
          <motion.form
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="relative w-full max-w-lg bg-surface-container-lowest rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
              <div className="min-w-0">
                <h2 id="manualadd-title" className="text-2xl font-extrabold font-headline text-on-surface tracking-tight">
                  {isEdit ? 'Edit item' : 'Add to fridge'}
                </h2>
                <p className="text-sm text-on-surface-variant mt-0.5">
                  {isEdit ? 'Update the details — changes save on confirm.' : 'Quick manual entry. We’ll classify the category for you.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="px-6 pb-5 space-y-3">
              {/* Name + category chip */}
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Item name</span>
                <div className="mt-1 flex items-center gap-2 bg-white rounded-2xl border border-outline-variant/30 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      // Typing resets a prior override so classification
                      // runs again for the new name.
                      if (categoryOverride) setCategoryOverride(false)
                    }}
                    placeholder="e.g. chicken breast"
                    className="flex-1 bg-transparent px-4 py-3 outline-none text-on-surface placeholder:text-on-surface-variant/50"
                    autoComplete="off"
                    spellCheck="false"
                  />

                  {/* Category chip — appears once classified */}
                  <AnimatePresence>
                    {category && (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, scale: 0.6, x: 6 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.6, x: 6 }}
                        transition={{ type: 'spring', stiffness: 440, damping: 22 }}
                        className="relative mr-2"
                      >
                        <button
                          type="button"
                          onClick={() => setCatOpen((v) => !v)}
                          title={categoryOverride ? 'Manually set — click to change' : 'Auto-detected. Click to change.'}
                          className="inline-flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: info?.bg, color: info?.colour }}
                        >
                          <span
                            className="inline-flex items-center justify-center w-4 h-4 rounded-full"
                            style={{ backgroundColor: info?.colour + '25' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 11, color: info?.colour }}>
                              {info?.icon}
                            </span>
                          </span>
                          <span className="whitespace-nowrap">{info?.label}</span>
                          {categoryOverride && (
                            <span className="material-symbols-outlined text-[11px]" style={{ color: info?.colour }}>edit</span>
                          )}
                        </button>

                        {/* Override popover */}
                        <AnimatePresence>
                          {catOpen && (
                            <motion.ul
                              role="listbox"
                              initial={{ opacity: 0, y: -6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.96 }}
                              transition={{ duration: 0.16, ease: EASE }}
                              style={{ transformOrigin: 'top right' }}
                              className="absolute right-0 top-full mt-2 z-10 w-56 bg-white border border-outline-variant/30 rounded-2xl shadow-xl py-1 overflow-hidden"
                            >
                              {Object.entries(CATEGORY_FALLBACK).map(([key, c]) => {
                                const active = key === category
                                return (
                                  <li key={key} role="option" aria-selected={active}>
                                    <button
                                      type="button"
                                      onClick={() => pickCategory(key)}
                                      className={
                                        active
                                          ? 'flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-primary bg-primary/5'
                                          : 'flex w-full items-center gap-2 px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors'
                                      }
                                    >
                                      <span
                                        className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                                        style={{ backgroundColor: c.bg, color: c.colour }}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{c.icon}</span>
                                      </span>
                                      {c.label}
                                      {active && (
                                        <span className="ml-auto material-symbols-outlined text-sm">check</span>
                                      )}
                                    </button>
                                  </li>
                                )
                              })}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Classifier in-flight spinner */}
                  {classifyInFlight && !category && (
                    <span
                      className="material-symbols-outlined text-[16px] text-on-surface-variant animate-spin mr-3"
                      aria-hidden="true"
                    >
                      progress_activity
                    </span>
                  )}
                </div>
              </label>

              {/* Qty + price row */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Quantity</span>
                  <input
                    type="text"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="1, 500 g, 2 pack"
                    className="mt-1 w-full px-4 py-3 rounded-2xl bg-white border border-outline-variant/30 outline-none text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Price <span className="font-normal normal-case tracking-normal">(optional)</span></span>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="—"
                      className="w-full pl-7 pr-4 py-3 rounded-2xl bg-white border border-outline-variant/30 outline-none text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
                    />
                  </div>
                </label>
              </div>

              {/* Duplicate banner */}
              <AnimatePresence>
                {duplicate && !isEdit && (
                  <motion.div
                    key="dup"
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 flex items-start gap-3 p-3 rounded-2xl bg-tertiary-container/30 border border-tertiary/30">
                      <span className="material-symbols-outlined text-base text-tertiary mt-px">info</span>
                      <div className="flex-1 min-w-0 text-sm">
                        <p className="font-semibold text-on-tertiary-container">
                          You already have {duplicate.name} in your fridge.
                        </p>
                        <p className="text-xs text-on-tertiary-container/80 mt-0.5">
                          Bump its quantity, or add this as a separate entry.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={handleIncrementExisting}
                          disabled={submitting}
                          className="px-3 py-1.5 rounded-full bg-tertiary text-on-tertiary text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
                        >
                          +1 existing
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {error && (
                <div className="text-sm text-error bg-error-container/30 rounded-xl px-3 py-2 font-medium">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant/15 bg-surface-container-low">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <motion.button
                ref={savedRectRef}
                type="submit"
                disabled={!canSave}
                whileHover={canSave ? { scale: 1.02 } : {}}
                whileTap={canSave ? { scale: 0.97 } : {}}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className="relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    Saving…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">{isEdit ? 'save' : 'add'}</span>
                    {isEdit ? 'Save changes' : 'Add to fridge'}
                  </>
                )}
                {/* Subtle shimmer while save is enabled, purely decorative */}
                {canSave && !submitting && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
                    style={{
                      background:
                        'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.24) 50%, transparent 100%)',
                    }}
                    animate={{ x: ['0%', '360%'] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
