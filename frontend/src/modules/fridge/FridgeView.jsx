import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import { toast } from '../../shared/toastBus'

const EASE = [0.22, 1, 0.36, 1]
const UNDO_MS = 4000

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = {
  protein:      { label: 'Protein',       icon: 'egg',           bg: '#e0f2fe', colour: '#0369a1' },
  vegetables:   { label: 'Vegetables',    icon: 'eco',           bg: '#dcfce7', colour: '#15803d' },
  fruits:       { label: 'Fruits',        icon: 'nutrition',     bg: '#fce7f3', colour: '#be185d' },
  grains:       { label: 'Grains & Carbs',icon: 'grain',         bg: '#fef9c3', colour: '#a16207' },
  healthy_fats: { label: 'Healthy Fats',  icon: 'water_drop',    bg: '#ede9fe', colour: '#6d28d9' },
  beverages:    { label: 'Beverages',     icon: 'local_cafe',    bg: '#dbeafe', colour: '#1d4ed8' },
  other:        { label: 'Other',         icon: 'category',      bg: '#f1f5f9', colour: '#475569' },
}

function getCat(key) {
  return CATEGORIES[key] || CATEGORIES.other
}

// ── Expiry helpers ────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null
  const parsed = parseDateOnly(dateStr)
  if (!parsed) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const exp = parsed; exp.setHours(0,0,0,0)
  return Math.round((exp - today) / 86400000)
}

function parseDateOnly(dateStr) {
  if (!dateStr) return null
  const [year, month, day] = String(dateStr).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatExpiryDate(dateStr) {
  const date = parseDateOnly(dateStr)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function ExpiryPill({ dateStr }) {
  const days = daysUntil(dateStr)
  if (days === null) return null
  if (days < 0)  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>
  if (days === 0) return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Today</span>
  if (days <= 3)  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{days}d left</span>
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{days}d left</span>
}

// ── Legend popup ──────────────────────────────────────────────────────────────

function LegendButton() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high text-on-surface-variant text-sm font-semibold hover:bg-surface-container-highest transition-colors"
      >
        <span className="material-symbols-outlined text-base">info</span>
        Legend
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="absolute right-0 top-12 z-40 w-72 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/10 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-on-surface">Nutritional Categories</h3>
                <button onClick={() => setOpen(false)}>
                  <span className="material-symbols-outlined text-on-surface-variant text-xl">close</span>
                </button>
              </div>
              <p className="text-xs text-on-surface-variant mb-4">Every ingredient is tagged with one nutritional category.</p>
              <div className="space-y-3">
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cat.bg }}
                    >
                      <span className="material-symbols-outlined text-sm" style={{ color: cat.colour }}>{cat.icon}</span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-on-surface leading-tight">{cat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Add item modal (receipt or manual choice) ─────────────────────────────────

function AddItemModal({ open, onClose, onCreated }) {
  const [step, setStep] = useState('choice') // 'choice' | 'manual'
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', quantity: '1', unit: 'pcs', category: 'other', expiry_date: '', price: '',
  })

  useEffect(() => {
    if (open) { setStep('choice'); setForm({ name: '', quantity: '1', unit: 'pcs', category: 'other', expiry_date: '', price: '' }) }
  }, [open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        qty: `${form.quantity} ${form.unit}`.trim(),
        category: form.category,
        expiry_date: form.expiry_date || null,
        price: form.price ? parseFloat(form.price) : null,
      }
      const data = await apiFetch('/api/fridge/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      onCreated(data.item)
      onClose()
    } catch (err) {
      toast.show({ message: err.message, tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="relative z-10 w-full max-w-md bg-surface-container-lowest rounded-[2rem] p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {step === 'manual' && (
              <button onClick={() => setStep('choice')} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
            )}
            <h2 className="font-bold text-on-surface text-lg">
              {step === 'choice' ? 'Add Item' : 'Add Manually'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 'choice' && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="space-y-3"
            >
              <p className="text-sm text-on-surface-variant mb-5">How would you like to add items to your fridge?</p>

              {/* Scan Receipt */}
              <Link
                to="/upload-receipt"
                onClick={onClose}
                className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-900 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                </div>
                <div className="flex-grow">
                  <p className="font-bold text-emerald-900">Scan Receipt</p>
                  <p className="text-xs text-emerald-700/70">Upload a grocery receipt to auto-add items</p>
                </div>
                <span className="material-symbols-outlined text-emerald-600 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>

              {/* Add Manually */}
              <button
                onClick={() => setStep('manual')}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest transition-colors group text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
                </div>
                <div className="flex-grow">
                  <p className="font-bold text-on-surface">Add Manually</p>
                  <p className="text-xs text-on-surface-variant">Type in item details yourself</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </motion.div>
          )}

          {step === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="space-y-4"
            >
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Item Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Chicken Breast"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-on-surface-variant/40"
                />
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={e => set('quantity', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Unit</label>
                  <select
                    value={form.unit}
                    onChange={e => set('unit', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {['pcs','g','kg','ml','L','cup','tbsp','tsp','pack'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set('category', key)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: form.category === key ? cat.colour : cat.bg,
                        color: form.category === key ? '#fff' : cat.colour,
                        outline: form.category === key ? `2px solid ${cat.colour}` : 'none',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Expiry Date</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={e => set('expiry_date', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Price (AUD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-on-surface-variant/40"
                  />
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="w-full py-3.5 rounded-xl bg-emerald-900 text-white font-bold text-sm disabled:opacity-40 hover:bg-emerald-800 transition-colors mt-2"
              >
                {saving ? 'Saving...' : 'Add to Fridge'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({ item, onClose, onUpdated }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: item.name || '',
    quantity: item.qty || '1',
    unit: 'pcs',
    category: item.category || 'other',
    expiry_date: item.expiry_date || '',
    price: item.price != null ? String(item.price) : '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        qty: `${form.quantity} ${form.unit}`.trim(),
        expiry_date: form.expiry_date || null,
        price: form.price ? parseFloat(form.price) : null,
      }
      const data = await apiFetch(`/api/fridge/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      onUpdated(data.item)
      onClose()
    } catch (err) {
      toast.show({ message: err.message, tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="relative z-10 w-full max-w-md bg-surface-container-lowest rounded-[2rem] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-on-surface text-lg">Edit Item</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Item Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Quantity</label>
              <input
                type="number" min="0"
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Unit</label>
              <select
                value={form.unit}
                onChange={e => set('unit', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                {['pcs','g','kg','ml','L','cup','tbsp','tsp','pack'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <button
                  key={key} type="button"
                  onClick={() => set('category', key)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: form.category === key ? cat.colour : cat.bg,
                    color: form.category === key ? '#fff' : cat.colour,
                    outline: form.category === key ? `2px solid ${cat.colour}` : 'none',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Expiry Date</label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={e => set('expiry_date', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5 block">Price (AUD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
              <input
                type="number" min="0" step="0.01"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-on-surface-variant/40"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="w-full py-3.5 rounded-xl bg-emerald-900 text-white font-bold text-sm disabled:opacity-40 hover:bg-emerald-800 transition-colors mt-2"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Fridge Item Card ──────────────────────────────────────────────────────────

function FridgeCard({ item, onEdit, onDelete, onUndo }) {
  const cat = getCat(item.category)
  const expiryDateLabel = formatExpiryDate(item.expiry_date)

  if (item._pendingDelete) {
    return (
      <motion.div
        layout
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative rounded-3xl bg-surface-container-highest/80 flex flex-col items-center justify-center gap-2 p-5 text-center min-h-[200px]"
      >
        <p className="text-sm font-semibold text-on-surface">Removed {item.name}</p>
        <button
          onClick={() => onUndo(item.id)}
          className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-on-surface text-surface text-xs font-bold uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-sm">undo</span>
          Undo
        </button>
        <motion.span
          initial={{ scaleX: 1 }} animate={{ scaleX: 0 }}
          transition={{ duration: UNDO_MS / 1000, ease: 'linear' }}
          style={{ transformOrigin: 'left' }}
          className="absolute bottom-0 left-0 right-0 h-1 bg-primary/60 rounded-b-3xl"
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.28, ease: EASE }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
      className="group bg-surface-container-lowest rounded-3xl p-5 flex flex-col relative hover:shadow-lg transition-shadow min-h-[280px]"
    >
      {/* Icon area */}
      <div
        className="w-full h-28 sm:h-32 rounded-2xl flex items-center justify-center mb-4 relative"
        style={{ background: cat.bg }}
      >
        <span className="material-symbols-outlined text-5xl" style={{ color: cat.colour, fontVariationSettings: "'FILL' 1" }}>
          {cat.icon}
        </span>
        {/* Category pill */}
        <span
          className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: cat.colour + '22', color: cat.colour }}
        >
          {cat.label}
        </span>
      </div>

      {/* Content */}
      <h3 className="font-bold text-on-surface text-base leading-snug mb-1 truncate">{item.name}</h3>

      <div className="flex items-center gap-2 mb-3 flex-wrap min-h-[24px]">
        {expiryDateLabel ? (
          <>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">event</span>
              Expires {expiryDateLabel}
            </span>
            <ExpiryPill dateStr={item.expiry_date} />
          </>
        ) : (
          <span className="text-xs text-on-surface-variant">No expiry date</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-outline-variant/10">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-lg">
            {item.qty ?? '1'}
          </span>
          {item.duplicate_count > 1 && (
            <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-800">
              {item.duplicate_count} batches
            </span>
          )}
        </div>
        {item.price != null && (
          <span className="text-sm font-bold text-primary">${Number(item.price).toFixed(2)}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3">
        <button
          type="button"
          aria-label={`Edit ${item.name}`}
          onClick={() => onEdit(item)}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <span className="material-symbols-outlined text-base">edit</span>
          Edit
        </button>
        <button
          type="button"
          aria-label={`Delete ${item.name}`}
          onClick={() => onDelete(item)}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          <span className="material-symbols-outlined text-base">delete</span>
          Delete
        </button>
      </div>
    </motion.div>
  )
}

// ── Main FridgeView ───────────────────────────────────────────────────────────

export default function FridgeView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const deleteTimers = useMemo(() => new Map(), [])

  const loadItems = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await apiFetch('/api/fridge/items')
      setItems(data.items || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  // Category counts for filter chips
  const categoryCounts = useMemo(() => {
    const c = {}
    for (const i of items) {
      if (i._pendingDelete) continue
      const k = i.category || 'other'
      c[k] = (c[k] || 0) + 1
    }
    return c
  }, [items])

  const visible = useMemo(() => {
    let list = items
    if (filter !== 'all') list = list.filter(i => (i.category || 'other') === filter)
    if (search.trim()) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'expiry') {
        const da = daysUntil(a.expiry_date) ?? 9999
        const db = daysUntil(b.expiry_date) ?? 9999
        return da - db
      }
      return 0
    })
    return list
  }, [items, filter, search, sortBy])

  const liveCount = items.filter(i => !i._pendingDelete).length

  // Add
  const handleCreated = (item) => {
    loadItems()
    toast.show({ message: `Added ${item.name} to your fridge` })
  }

  // Edit
  const handleUpdated = (item) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...item } : i))
    toast.show({ message: `Updated ${item.name}` })
    setEditingItem(null)
  }

  // Delete with undo
  const handleDelete = (item) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, _pendingDelete: true } : i))
    const timer = setTimeout(async () => {
      try {
        const duplicateQuery = item.duplicate_count > 1 ? '?duplicates=true' : ''
        await apiFetch(`/api/fridge/items/${item.id}${duplicateQuery}`, { method: 'DELETE' })
        setItems(prev => prev.filter(i => i.id !== item.id))
      } catch {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, _pendingDelete: false } : i))
        toast.show({ message: `Could not remove ${item.name}`, tone: 'error' })
      } finally {
        deleteTimers.delete(item.id)
      }
    }, UNDO_MS)
    deleteTimers.set(item.id, timer)
  }

  const handleUndo = (id) => {
    const timer = deleteTimers.get(id)
    if (timer) { clearTimeout(timer); deleteTimers.delete(id) }
    setItems(prev => prev.map(i => i.id === id ? { ...i, _pendingDelete: false } : i))
  }

  return (
    <div className="px-6 md:px-10 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-emerald-900 px-8 py-10 md:px-12 text-white shadow-2xl">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-700/30 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-emerald-800/40 pointer-events-none" />
          <div className="relative z-10 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <span className="text-emerald-300 font-semibold uppercase tracking-widest text-xs mb-3 block">Your Kitchen</span>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-2 leading-tight">Virtual Fridge</h1>
              <p className="text-emerald-100/70 text-base">
                {loading ? 'Loading...' : `${liveCount} ${liveCount === 1 ? 'item' : 'items'} tracked`}
              </p>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 bg-white text-emerald-900 font-bold px-6 py-3 rounded-2xl hover:bg-emerald-50 transition-colors shadow-lg"
            >
              <span className="material-symbols-outlined">add</span>
              Add Item
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── Controls ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
        className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between"
      >
        {/* Search */}
        <div className="relative flex-grow max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-on-surface-variant/50"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="name">Sort: Name</option>
            <option value="expiry">Sort: Expiry Date</option>
          </select>

          {/* Legend */}
          <LegendButton />
        </div>
      </motion.div>

      {/* ── Category filter chips ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.22, ease: EASE }}
        className="flex flex-wrap gap-2 mb-8"
      >
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-emerald-900 text-white'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          All · {liveCount}
        </button>
        {Object.entries(CATEGORIES)
          .filter(([k]) => (categoryCounts[k] || 0) > 0)
          .map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
              style={{
                background: filter === key ? cat.colour : cat.bg,
                color: filter === key ? '#fff' : cat.colour,
              }}
            >
              <span className="material-symbols-outlined text-sm">{cat.icon}</span>
              {cat.label} · {categoryCounts[key]}
            </button>
          ))}
      </motion.div>

      {/* ── States ── */}
      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-700 text-sm font-medium border border-red-100">
          Could not load fridge items: {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-48">
          <p className="text-on-surface-variant animate-pulse">Loading your fridge...</p>
        </div>
      )}

      {!loading && !error && liveCount === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-4">kitchen</span>
          <h3 className="text-xl font-bold text-on-surface mb-2">Your fridge is empty</h3>
          <p className="text-on-surface-variant mb-6 text-sm">Add items manually or upload a receipt to get started.</p>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-900 text-white font-bold px-6 py-3 rounded-xl"
          >
            <span className="material-symbols-outlined">add</span>
            Add Item
          </button>
        </div>
      )}

      {/* ── Grid ── */}
      {!loading && liveCount > 0 && (
        <motion.div layout className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-5">
          <AnimatePresence initial={false}>
            {visible.map(item => (
              <FridgeCard
                key={item.id}
                item={item}
                onEdit={setEditingItem}
                onDelete={handleDelete}
                onUndo={handleUndo}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {addOpen && (
          <AddItemModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingItem && (
          <EditModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onUpdated={handleUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
