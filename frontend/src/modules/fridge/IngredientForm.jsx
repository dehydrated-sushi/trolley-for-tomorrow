import { useState, useEffect } from 'react'
import { NUTRITION_CATEGORIES } from './useFridge'

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'cups', 'tbsp', 'tsp']

const EMPTY_FORM = {
  name: '',
  quantity: '',
  unit: 'g',
  category: 'veg',
  expiryDate: '',
}

export default function IngredientForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const isEditing = !!initial

  useEffect(() => {
    if (initial) {
      setForm({
        name:       initial.name       ?? '',
        quantity:   initial.quantity   ?? '',
        unit:       initial.unit       ?? 'g',
        category:   initial.category   ?? 'veg',
        expiryDate: initial.expiryDate ?? '',
      })
    }
  }, [initial])

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())            e.name     = 'Name is required'
    if (!form.quantity || form.quantity <= 0) e.quantity = 'Enter a positive number'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({
      ...form,
      quantity: Number(form.quantity),
      expiryDate: form.expiryDate || null,
    })
    onClose()
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0ede4]">
          <h2 className="text-base font-medium text-[#0c1f14]">
            {isEditing ? 'Edit ingredient' : 'Add ingredient'}
          </h2>
          <button onClick={onClose} className="text-[#5a7a68] hover:text-[#0c1f14] transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 flex flex-col gap-4">

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-[#2d4a38] mb-1.5">Ingredient name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Chicken breast"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors
                ${errors.name
                  ? 'border-red-400 bg-red-50'
                  : 'border-[#cce4d6] focus:border-[#5cad76] bg-white'
                }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#2d4a38] mb-1.5">Quantity</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                placeholder="e.g. 500"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors
                  ${errors.quantity
                    ? 'border-red-400 bg-red-50'
                    : 'border-[#cce4d6] focus:border-[#5cad76] bg-white'
                  }`}
              />
              {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2d4a38] mb-1.5">Unit</label>
              <select
                value={form.unit}
                onChange={e => set('unit', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#cce4d6] text-sm outline-none focus:border-[#5cad76] bg-white"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-[#2d4a38] mb-2">Nutrition category</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(NUTRITION_CATEGORIES).map(([key, { label, bg, text }]) => (
                <button
                  key={key}
                  onClick={() => set('category', key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all
                    ${form.category === key
                      ? `${bg} ${text} border-transparent ring-2 ring-offset-1 ring-[#5cad76]`
                      : 'bg-white border-[#cce4d6] text-[#5a7a68] hover:border-[#5cad76]'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry date */}
          <div>
            <label className="block text-xs font-medium text-[#2d4a38] mb-1.5">
              Expiry date <span className="text-[#5a7a68] font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={e => set('expiryDate', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#cce4d6] text-sm outline-none focus:border-[#5cad76] bg-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#e0ede4]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#cce4d6] text-sm text-[#5a7a68] hover:bg-[#f4fbf6] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-[#1e3d2a] text-white text-sm font-medium hover:bg-[#2d5a3d] transition-colors"
          >
            {isEditing ? 'Save changes' : 'Add to fridge'}
          </button>
        </div>
      </div>
    </div>
  )
}