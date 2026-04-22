import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import CategoryTag from '../../shared/CategoryTag'
import NutritionLegend from '../../shared/NutritionLegend'
import { CATEGORY_FALLBACK, getCategoryInfo } from '../../shared/nutrition'

export default function FridgeView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/api/fridge/items')
        setItems(data.items || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const categoryCounts = useMemo(() => {
    const c = {}
    for (const i of items) {
      const k = i.category || 'other'
      c[k] = (c[k] || 0) + 1
    }
    return c
  }, [items])

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => (i.category || 'other') === filter)),
    [items, filter]
  )

  return (
    <div className="px-6 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-2">Your Virtual Fridge</h1>
          <p className="text-on-surface-variant max-w-lg leading-relaxed">
            {loading ? 'Loading your inventory...' : `Tracking ${items.length} items, tagged by nutritional category.`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <NutritionLegend />
          <Link to="/upload-receipt" className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/10 transition-transform active:scale-95 text-sm">
            + Upload Receipt
          </Link>
        </div>
      </header>

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

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-6">kitchen</span>
          <h3 className="text-xl font-bold text-on-surface mb-2">Your fridge is empty</h3>
          <p className="text-on-surface-variant mb-6">Upload a receipt to start tracking your ingredients.</p>
          <Link to="/upload-receipt" className="px-8 py-3 primary-gradient text-on-primary rounded-xl font-bold">
            Upload Receipt
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
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
                All · {items.length}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visible.map((item) => {
              const info = getCategoryInfo(item.category)
              return (
              <div key={item.id} className="group bg-surface-container-lowest rounded-3xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-on-surface/5 flex flex-col">
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
              </div>
              )
            })}
          </div>

          <section className="mt-20 flex flex-col md:flex-row items-center gap-12 p-12 bg-surface-container rounded-[3rem] relative overflow-hidden">
            <div className="relative z-10 flex-1">
              <h2 className="text-3xl font-extrabold font-headline mb-4">Larder Overview</h2>
              <p className="text-on-surface-variant mb-8 max-w-md leading-relaxed">
                You have <span className="text-primary font-bold">{items.length} items</span> in your virtual fridge, spread across {Object.keys(categoryCounts).length} nutritional categories.
              </p>
              <Link to="/meals" className="inline-flex items-center gap-2 primary-gradient text-on-primary px-8 py-3 rounded-xl font-bold shadow-lg">
                Get Meal Suggestions <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
            <div className="relative w-full md:w-1/3 aspect-square bg-white/40 rounded-[2rem] flex items-center justify-center border border-white/20 backdrop-blur-sm">
              <div className="text-center">
                <span className="text-6xl font-black text-primary font-headline block">{items.length}</span>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Active Items</span>
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-tertiary-container rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-tertiary-container">eco</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
