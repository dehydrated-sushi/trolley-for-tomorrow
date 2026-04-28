import { useState } from 'react'
import { NUTRITION_CATEGORIES } from '../fridge/useFridge'

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'cups', 'tbsp', 'tsp']

function ScanResultItem({ item, checked, editing, onToggle, onEdit, onSave, onRemove }) {
  const [form, setForm] = useState({ ...item })
  const cat = NUTRITION_CATEGORIES[item.category] ?? NUTRITION_CATEGORIES.veg

  if (editing) {
    return (
      <div className={`rounded-xl border px-4 py-3 ${item.recognised ? 'border-[#cce4d6] bg-white' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex flex-col gap-2">
          <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-[#cce4d6] rounded-lg outline-none focus:border-[#5cad76]" placeholder="Ingredient name" />
          <div className="flex gap-2">
            <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
              className="w-24 px-3 py-2 text-sm border border-[#cce4d6] rounded-lg outline-none focus:border-[#5cad76]" min="0" />
            <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
              className="px-3 py-2 text-sm border border-[#cce4d6] rounded-lg outline-none focus:border-[#5cad76] bg-white">
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="flex-1 px-3 py-2 text-sm border border-[#cce4d6] rounded-lg outline-none focus:border-[#5cad76] bg-white">
              {Object.entries(NUTRITION_CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => onEdit(null)} className="text-xs px-3 py-1.5 rounded-lg border border-[#cce4d6] text-[#5a7a68]">Cancel</button>
            <button onClick={() => onSave(item.id, { name: form.name, quantity: Number(form.quantity), unit: form.unit, category: form.category })}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#1e3d2a] text-white">Save</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all
      ${item.recognised
        ? checked ? 'border-[#5cad76] bg-[#f4fbf6]' : 'border-[#cce4d6] bg-white'
        : 'border-amber-200 bg-amber-50'}`}>
      <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)}
        className="w-4 h-4 accent-[#5cad76] flex-shrink-0 cursor-pointer" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[#0c1f14] truncate">{item.name}</span>
          {!item.recognised && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Unrecognised</span>}
          {item.recognised && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>{cat.label}</span>}
        </div>
        <div className="text-xs text-[#5a7a68] mt-0.5">
          {item.recognised ? `${item.quantity} ${item.unit}` : 'Could not identify — tap Edit to add manually'}
        </div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button onClick={() => onEdit(item.id)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-[#cce4d6] text-[#5a7a68] hover:border-[#5cad76] transition-all">Edit</button>
        <button onClick={() => onRemove(item.id)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-[#cce4d6] text-[#5a7a68] hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all">x</button>
      </div>
    </div>
  )
}

export default function ScanResult({ items, checkedIds, editingItem, selectedCount, onToggle, onEdit, onSave, onRemove, onConfirm, onRescan }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-medium text-[#0c1f14]">Review imported items</div>
          <div className="text-xs text-[#5a7a68] mt-0.5">{items.length} items recognised · {selectedCount} selected</div>
        </div>
        <button onClick={onRescan}
          className="text-xs text-[#5a7a68] border border-[#cce4d6] rounded-lg px-3 py-1.5 hover:bg-[#f4fbf6] hover:border-[#5cad76] transition-all">
          Rescan
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map(item => (
          <ScanResultItem key={item.id} item={item} checked={checkedIds.has(item.id)}
            editing={editingItem === item.id} onToggle={onToggle} onEdit={onEdit} onSave={onSave} onRemove={onRemove} />
        ))}
      </div>
      <button onClick={onConfirm} disabled={selectedCount === 0}
        className={`w-full py-3.5 rounded-xl text-sm font-medium transition-all
          ${selectedCount > 0
            ? 'bg-[#1e3d2a] text-white hover:bg-[#2d5a3d] hover:-translate-y-px'
            : 'bg-[#cce4d6] text-[#5a7a68] cursor-not-allowed'}`}>
        {selectedCount > 0 ? `Add ${selectedCount} item${selectedCount > 1 ? 's' : ''} to fridge` : 'Select at least one item'}
      </button>
    </div>
  )
}