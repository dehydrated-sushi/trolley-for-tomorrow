import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import CategoryTag from '../../shared/CategoryTag'
import NutritionLegend from '../../shared/NutritionLegend'
import { CATEGORY_FALLBACK } from '../../shared/nutrition'

export default function ShoppingListPage() {
  const [items, setItems] = useState([])
  const [basedOn, setBasedOn] = useState([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checked, setChecked] = useState(() => new Set())

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/api/shopping/list?top_recipes=5')
        setItems(data.items || [])
        setBasedOn(data.based_on_recipes || [])
        setNote(data.note || '')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggle = (name) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const groups = useMemo(() => {
    const byCat = {}
    for (const item of items) {
      const cat = item.category || 'other'
      if (!byCat[cat]) byCat[cat] = []
      byCat[cat].push(item)
    }
    return byCat
  }, [items])

  const categoryOrder = ['protein', 'vegetables', 'fruits', 'grains', 'fats', 'beverages', 'other']

  return (
    <div className="px-6 lg:px-12 max-w-7xl mx-auto">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-4xl lg:text-5xl font-extrabold font-headline text-on-surface tracking-tight mb-4">Shopping List</h1>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            {basedOn.length > 0
              ? <>Auto-built from <span className="text-primary font-semibold">{basedOn.length} top-matching recipes</span>, organised by nutritional category.</>
              : 'Upload a receipt and generate meal recommendations to populate your list.'}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <NutritionLegend />
          <Link to="/meals" className="bg-surface-container-high text-primary px-6 py-3 rounded-full font-semibold transition-all hover:bg-surface-container-highest flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">restaurant_menu</span>
            View Meals
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-error-container/30 text-error text-sm font-medium">
          Could not load shopping list: {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-48">
          <p className="text-on-surface-variant animate-pulse">Building your shopping list...</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-6">shopping_basket</span>
          <h3 className="text-xl font-bold text-on-surface mb-2">Nothing to shop for yet</h3>
          <p className="text-on-surface-variant mb-6 max-w-md">
            {note || "We'll build your list once there are recipes matching your fridge items."}
          </p>
          <Link to="/upload-receipt" className="px-8 py-3 primary-gradient text-on-primary rounded-xl font-bold">
            Upload Receipt
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <section className="md:col-span-8 space-y-6">
            {categoryOrder
              .filter((cat) => (groups[cat] || []).length > 0)
              .map((cat) => {
                const info = CATEGORY_FALLBACK[cat]
                const group = groups[cat]
                return (
                  <div key={cat} className="bg-surface-container-low rounded-3xl p-6 lg:p-8">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <span
                          className="p-2 rounded-xl material-symbols-outlined"
                          style={{ backgroundColor: info.bg, color: info.colour }}
                        >
                          {info.icon}
                        </span>
                        <h3 className="text-xl font-bold font-headline" style={{ color: info.colour }}>
                          {info.label}
                        </h3>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
                        {group.length} item{group.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {group.map((item) => {
                        const isChecked = checked.has(item.name)
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => toggle(item.name)}
                            className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl hover:bg-surface-container-lowest transition-all text-left"
                          >
                            <div className="flex items-center gap-4 flex-grow min-w-0">
                              <div
                                className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                style={{
                                  borderColor: isChecked ? info.colour : 'rgba(20,108,60,0.3)',
                                  backgroundColor: isChecked ? info.colour : 'transparent',
                                }}
                              >
                                {isChecked && (
                                  <span className="material-symbols-outlined text-sm text-white">check</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={`font-semibold ${isChecked ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                                  {item.name}
                                </p>
                                <p className="text-xs text-on-surface-variant truncate">
                                  Needed for {item.needed_for.length} recipe{item.needed_for.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <CategoryTag category={item.category} size="xs" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </section>

          <aside className="md:col-span-4 space-y-6">
            <div className="bg-inverse-surface rounded-3xl p-6 text-inverse-on-surface shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <h4 className="font-headline font-bold text-lg mb-6">Shopping Stats</h4>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="opacity-70">Total items</span>
                  <span className="font-bold">{items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-70">Checked off</span>
                  <span className="font-bold text-primary-fixed">{checked.size}</span>
                </div>
                <div className="h-px bg-on-surface/10 my-4"></div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-on-surface/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-fixed rounded-full transition-all"
                      style={{ width: `${(checked.size / Math.max(1, items.length)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold">
                    {Math.round((checked.size / Math.max(1, items.length)) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {basedOn.length > 0 && (
              <div className="bg-surface-container-lowest rounded-3xl p-6 border-b-4 border-primary/10">
                <h4 className="font-headline font-bold mb-3">Based on recipes</h4>
                <ul className="space-y-2 text-sm">
                  {basedOn.map((r) => (
                    <li key={r.id} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-primary text-base mt-0.5">check_circle</span>
                      <span className="text-on-surface-variant">{r.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Category distribution */}
            <div className="bg-surface-container-lowest rounded-3xl p-6">
              <h4 className="font-headline font-bold mb-4">By category</h4>
              <div className="space-y-2">
                {categoryOrder
                  .filter((cat) => (groups[cat] || []).length > 0)
                  .map((cat) => {
                    return (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <CategoryTag category={cat} size="xs" />
                        <span className="font-bold text-on-surface">{groups[cat].length}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
