import { useState } from 'react'
import { NUTRITION_CATEGORIES } from '../fridge/useFridge'

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'cups', 'tbsp', 'tsp']
const EMPTY = { name: '', quantity: '', unit: 'g', category: 'veg' }

export default function ManualFallback({ onAdd, onRescan }) {
  const [form, setForm]   = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [added, setAdded] = useState([])

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.quantity || form.quantity <= 0) e.quantity = 'Enter a positive number'
    return e
  }

  const handleAdd = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setAdded(p => [...p, { ...form, quantity: Number(form.quantity), id: Date.now(), recognised: true }])
    setForm(EMPTY)
  }

  const removeAdded = (id) => setAdded(p => p.filter(i => i.id !== id))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
        <span className="text-lg flex-shrink-0">x</span>
        <div>
          <div className="text-sm font-medium text-red-700">Scan unsuccessful</div>
          <div className="text-xs text-red-600 font-light mt-0.5 leading-relaxed">
            We could not recognise your receipt. Add items manually below, or try scanning again.
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#cce4d6] rounded-2xl px-5 py-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-[#0c1f14]">Add item manually</div>
        <div>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Ingredient name"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors
              ${errors.name ? 'border-red-400 bg-red-50' : 'border-[#cce4d6] focus:border-[#5cad76]'}`} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <input type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)}
              placeholder="Qty" min="0"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors
                ${errors.quantity ? 'border-red-400 bg-red-50' : 'border-[#cce4d6] focus:border-[#5cad76]'}`} />
            {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
          </div>
          <select value={form.unit} onChange={e => set('unit', e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[#cce4d6] text-sm outline-none focus:border-[#5cad76] bg-white">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[#cce4d6] text-sm outline-none focus:border-[#5cad76] bg-white">
            {Object.entries(NUTRITION_CATEGORIES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <button onClick={handleAdd}
          className="w-full py-2.5 rounded-xl bg-[#e8f5ed] text-[#1e3d2a] text-sm font-medium hover:bg-[#c4e8ce] transition-colors">
          + Add to list
        </button>
      </div>

      {added.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-[#5a7a68] uppercase tracking-wide">Items to import ({added.length})</div>
          {added.map(item => {
            const cat = NUTRITION_CATEGORIES[item.category]
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-[#cce4d6] rounded-xl">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-[#0c1f14]">{item.name}</span>
                  <span className="text-xs text-[#5a7a68] ml-2">{item.quantity} {item.unit}</span>
                  <span className={`ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>{cat.label}</span>
                </div>
                <button onClick={() => removeAdded(item.id)} className="text-xs text-[#5a7a68] hover:text-red-500 transition-colors">x</button>
              </div>
            )
          })}
          <button onClick={() => onAdd(added)}
            className="w-full py-3.5 rounded-xl bg-[#1e3d2a] text-white text-sm font-medium hover:bg-[#2d5a3d] hover:-translate-y-px transition-all mt-1">
            Add {added.length} item{added.length > 1 ? 's' : ''} to fridge
          </button>
        </div>
      )}

      <button onClick={onRescan}
        className="w-full py-2.5 rounded-xl border border-[#cce4d6] text-sm text-[#5a7a68] hover:bg-[#f4fbf6] hover:border-[#5cad76] transition-all">
        Try scanning again
      </button>
    </div>
  )
}