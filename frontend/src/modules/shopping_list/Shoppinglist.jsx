import { useState } from 'react'
import { useShoppingList } from './useShoppingList'

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'cups', 'tbsp', 'tsp']

function RecipeCard({ recipe, selected, onToggle }) {
  return (
    <button
      onClick={() => onToggle(recipe.id)}
      className={`text-left w-full px-4 py-3.5 rounded-xl border transition-all duration-150
        ${selected
          ? 'bg-[#e8f5ed] border-[#5cad76] ring-1 ring-[#5cad76]/30'
          : 'bg-white border-[#cce4d6] hover:border-[#5cad76] hover:bg-[#f4fbf6]'
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-sm font-medium text-[#0c1f14] leading-snug">{recipe.name}</div>
          <div className="text-xs text-[#5a7a68] mt-1">{recipe.ingredients.length} ingredients</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-medium text-[#3e7a52]">${recipe.price.toFixed(2)}</span>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
            ${selected ? 'bg-[#5cad76] border-[#5cad76]' : 'border-[#cce4d6]'}`}>
            {selected && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
              </svg>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function ShoppingItem({ item, checked, editing, onToggle, onEdit, onSave, onRemove, isManual }) {
  const [form, setForm] = useState({ name: item.name, quantity: item.quantity, unit: item.unit })

  if (editing) {
    return (
      <div className="px-4 py-3 border border-[#5cad76] bg-[#f4fbf6] rounded-xl">
        <div className="flex flex-col gap-2">
          <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-[#cce4d6] rounded-lg outline-none focus:border-[#5cad76]" placeholder="Item name" />
          <div className="flex gap-2">
            <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
              className="w-24 px-3 py-2 text-sm border border-[#cce4d6] rounded-lg outline-none focus:border-[#5cad76]" min="0" />
            <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
              className="flex-1 px-3 py-2 text-sm border border-[#cce4d6] rounded-lg outline-none focus:border-[#5cad76] bg-white">
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => onEdit(null)} className="text-xs px-3 py-1.5 rounded-lg border border-[#cce4d6] text-[#5a7a68]">Cancel</button>
            <button onClick={() => onSave(item.id, { name: form.name, quantity: Number(form.quantity), unit: form.unit })}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#1e3d2a] text-white">Save</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
      ${checked ? 'border-[#cce4d6] bg-[#f4fbf6] opacity-60' : 'border-[#cce4d6] bg-white hover:border-[#5cad76]'}`}>
      <button onClick={() => onToggle(item.id)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
          ${checked ? 'bg-[#5cad76] border-[#5cad76]' : 'border-[#cce4d6] hover:border-[#5cad76]'}`}>
        {checked && <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${checked ? 'line-through text-[#5a7a68]' : 'text-[#0c1f14]'}`}>{item.name}</span>
        <span className="text-xs text-[#5a7a68] ml-2">{item.quantity} {item.unit}</span>
        {item.manual && <span className="ml-2 text-[10px] bg-[#e8f5ed] text-[#3e7a52] px-1.5 py-0.5 rounded-full font-medium">Added manually</span>}
      </div>
      {isManual && (
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => onEdit(item.id)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[#cce4d6] text-[#5a7a68] hover:border-[#5cad76] transition-all">Edit</button>
          <button onClick={() => onRemove(item.id)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[#cce4d6] text-[#5a7a68] hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all">x</button>
        </div>
      )}
    </div>
  )
}

function ManualAddForm({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '', unit: 'g' })
  const [error, setError] = useState('')

  const handleAdd = () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.quantity || form.quantity <= 0) { setError('Enter a positive quantity'); return }
    onAdd({ name: form.name, quantity: Number(form.quantity), unit: form.unit })
    setForm({ name: '', quantity: '', unit: 'g' })
    setError('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-xl border border-dashed border-[#cce4d6] text-sm text-[#5a7a68] hover:border-[#5cad76] hover:text-[#2d4a38] hover:bg-[#f4fbf6] transition-all flex items-center justify-center gap-2">
        <span className="text-base leading-none">+</span> Add item manually
      </button>
    )
  }

  return (
    <div className="border border-[#5cad76] bg-[#f4fbf6] rounded-xl px-4 py-4 flex flex-col gap-3">
      <div className="text-sm font-medium text-[#0c1f14]">Add item manually</div>
      <input type="text" value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setError('') }}
        placeholder="Item name" autoFocus
        className="w-full px-3 py-2 text-sm border border-[#cce4d6] rounded-lg outline-none focus:border-[#5cad76] bg-white" />
      <div className="flex gap-2">
        <input type="number" value={form.quantity} onChange={e => { setForm(p => ({ ...p, quantity: e.target.value })); setError('') }}
          placeholder="Qty" min="0"
          className="w-24 px-3 py-2 text-sm border border-[#cce4d6] rounded-lg outline-none focus:border-[#5cad76] bg-white" />
        <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
          className="flex-1 px-3 py-2 text-sm border border-[#cce4d6] rounded-lg outline-none focus:border-[#5cad76] bg-white">
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => { setOpen(false); setError('') }} className="flex-1 py-2 rounded-lg border border-[#cce4d6] text-sm text-[#5a7a68]">Cancel</button>
        <button onClick={handleAdd} className="flex-1 py-2 rounded-lg bg-[#1e3d2a] text-white text-sm font-medium">Add</button>
      </div>
    </div>
  )
}

export default function ShoppingList() {
  const { recipes, selectedRecipeIds, selectedRecipes, allItems, generatedItems, manualItems,
    checkedIds, editingId, budget, totalCost, isOverBudget, purchasedCount,
    toggleRecipe, toggleCheck, addManualItem, updateItem, removeItem, setEditingId, confirmPurchased } = useShoppingList()

  const [confirmed, setConfirmed] = useState(false)

  const handleConfirmPurchased = () => {
    const items = confirmPurchased()
    console.log('Adding to fridge:', items)
    setConfirmed(true)
    setTimeout(() => setConfirmed(false), 3000)
  }

  return (
    <div className="min-h-screen bg-[#f4fbf6] pt-16">
      <div className="w-full px-4 md:px-8 lg:px-14 py-8">
        <div className="mb-8">
          <div className="text-xs font-medium tracking-[1.2px] uppercase text-[#5a7a68] mb-1">Planning</div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#0c1f14] tracking-tight">Shopping List</h1>
          <p className="text-sm text-[#5a7a68] font-light mt-1.5">Select recipes for the week and we'll generate your shopping list automatically.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-[#cce4d6] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e0ede4]">
                <div className="text-sm font-medium text-[#0c1f14]">Select recipes for this week</div>
                <div className="text-xs text-[#5a7a68] mt-0.5">Ingredients already in your fridge are excluded automatically</div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recipes.map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} selected={selectedRecipeIds.includes(recipe.id)} onToggle={toggleRecipe} />
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#cce4d6] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0ede4]">
                <div>
                  <div className="text-sm font-medium text-[#0c1f14]">Items to buy</div>
                  <div className="text-xs text-[#5a7a68] mt-0.5">{allItems.length} items · {checkedIds.size} ticked off</div>
                </div>
                {purchasedCount > 0 && (
                  <button onClick={handleConfirmPurchased}
                    className="text-xs font-medium text-white bg-[#5cad76] px-3.5 py-2 rounded-lg hover:bg-[#3e7a52] transition-colors flex items-center gap-1.5">
                    Add {purchasedCount} to fridge
                  </button>
                )}
              </div>
              <div className="p-4 flex flex-col gap-2.5">
                {allItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="text-4xl mb-3 opacity-30">🛒</div>
                    <div className="text-sm text-[#5a7a68] font-light">Select recipes above to generate your shopping list</div>
                  </div>
                ) : (
                  <>
                    {generatedItems.length > 0 && (
                      <div className="mb-1">
                        <div className="text-[11px] font-medium text-[#5a7a68] uppercase tracking-wide mb-2">From recipes</div>
                        <div className="flex flex-col gap-2">
                          {generatedItems.map(item => (
                            <ShoppingItem key={item.id} item={item} checked={checkedIds.has(item.id)} editing={editingId === item.id}
                              onToggle={toggleCheck} onEdit={setEditingId} onSave={updateItem} onRemove={removeItem} isManual={false} />
                          ))}
                        </div>
                      </div>
                    )}
                    {manualItems.length > 0 && (
                      <div className="mb-1">
                        <div className="text-[11px] font-medium text-[#5a7a68] uppercase tracking-wide mb-2">Added manually</div>
                        <div className="flex flex-col gap-2">
                          {manualItems.map(item => (
                            <ShoppingItem key={item.id} item={item} checked={checkedIds.has(item.id)} editing={editingId === item.id}
                              onToggle={toggleCheck} onEdit={setEditingId} onSave={updateItem} onRemove={removeItem} isManual={true} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <ManualAddForm onAdd={addManualItem} />
              </div>
              {confirmed && (
                <div className="mx-4 mb-4 px-4 py-3 bg-[#e8f5ed] border border-[#c4e8ce] rounded-xl text-sm text-[#1e3d2a] font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#5cad76]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                  Items added to your fridge!
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white border border-[#cce4d6] rounded-2xl p-5">
              <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-4">Budget check</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#f4fbf6] rounded-xl px-4 py-3">
                  <div className="text-xs text-[#5a7a68] mb-1">Weekly budget</div>
                  <div className="font-serif text-xl font-bold text-[#0c1f14]">${budget.toFixed(2)}</div>
                </div>
                <div className="bg-[#f4fbf6] rounded-xl px-4 py-3">
                  <div className="text-xs text-[#5a7a68] mb-1">Est. cost</div>
                  <div className={`font-serif text-xl font-bold ${isOverBudget ? 'text-red-500' : 'text-[#3e7a52]'}`}>${totalCost.toFixed(2)}</div>
                </div>
              </div>
              <div className="h-2 bg-[#e8f5ed] rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-400' : 'bg-[#5cad76]'}`}
                  style={{ width: `${Math.min(100, (totalCost / budget) * 100)}%` }} />
              </div>
              {isOverBudget
                ? <p className="text-xs text-red-500 font-medium">Exceeds budget by ${(totalCost - budget).toFixed(2)}</p>
                : <p className="text-xs text-[#5a7a68]">${(budget - totalCost).toFixed(2)} remaining after these recipes</p>
              }
            </div>

            {selectedRecipes.length > 0 && (
              <div className="bg-white border border-[#cce4d6] rounded-2xl p-5">
                <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-3">Selected recipes ({selectedRecipes.length})</div>
                <div className="flex flex-col gap-2">
                  {selectedRecipes.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-[#0c1f14] truncate pr-2">{r.name}</span>
                      <span className="text-[#5a7a68] flex-shrink-0">${r.price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#e0ede4] pt-2 mt-1 flex items-center justify-between text-sm font-medium">
                    <span className="text-[#0c1f14]">Total</span>
                    <span className={isOverBudget ? 'text-red-500' : 'text-[#3e7a52]'}>${totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#e8f5ed] border border-[#c4e8ce] rounded-2xl p-4">
              <div className="text-xs font-medium text-[#1e3d2a] mb-1">Already in your fridge</div>
              <div className="text-xs text-[#3e7a52] font-light leading-relaxed">Items you already have are automatically excluded from the shopping list.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}