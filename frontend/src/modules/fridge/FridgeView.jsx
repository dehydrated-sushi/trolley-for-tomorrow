import { useFridge, NUTRITION_CATEGORIES } from './useFridge'
import IngredientList from './IngredientList'
import CookingMethodPanel from './CookingMethodPanel'

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'expiring', label: '⚠ Expiring' },
  ...Object.entries(NUTRITION_CATEGORIES).map(([key, { label }]) => ({ key, label })),
]

const SORT_OPTIONS = [
  { key: 'expiry', label: 'Expiry date' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
]

export default function FridgeView() {
  const {
    ingredients,
    allIngredients,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    detailItem,
    setDetailItem,
    expiringCount,
  } = useFridge()

  return (
    <div className="min-h-screen bg-[#f4fbf6] pt-16">
      <div className="w-full px-4 md:px-8 lg:px-14 py-8">
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

          <button
            type="button"
            onClick={() => {}}
            className="inline-flex items-center gap-2 bg-[#cfe3d4] text-[#355341] text-sm font-medium px-5 py-2.5 rounded-full cursor-not-allowed"
          >
            <span className="text-lg leading-none">+</span>
            Receipt import only
          </button>
        </div>

        {expiringCount > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
            <span className="text-xl flex-shrink-0">⏰</span>
            <div>
              <div className="text-sm font-medium text-amber-800">
                {expiringCount} {expiringCount === 1 ? 'item' : 'items'} expiring within 3 days
              </div>
              <div className="text-xs text-amber-700 mt-0.5 font-light">
                Use these first — recipes will prioritise them automatically.
              </div>
            </div>
            <button
              onClick={() => setFilter('expiring')}
              className="ml-auto text-xs text-amber-700 font-medium underline underline-offset-2 flex-shrink-0 hover:text-amber-900 transition-colors"
            >
              View
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex gap-2 flex-wrap flex-1">
            {FILTER_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
                  filter === key
                    ? 'bg-[#1e3d2a] text-white border-transparent'
                    : 'bg-white text-[#5a7a68] border-[#cce4d6] hover:border-[#5cad76] hover:text-[#2d4a38]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-[#5a7a68]">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-[#cce4d6] rounded-lg px-2.5 py-1.5 bg-white text-[#2d4a38] outline-none focus:border-[#5cad76]"
            >
              {SORT_OPTIONS.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(NUTRITION_CATEGORIES).map(([, { label, bg, text }]) => (
            <span
              key={label}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${bg} ${text}`}
            >
              {label}
            </span>
          ))}
        </div>

        <IngredientList
          ingredients={ingredients}
          onEdit={() => {}}
          onDelete={() => {}}
          onViewDetail={(item) => setDetailItem(item)}
        />
      </div>

      {detailItem && (
        <CookingMethodPanel
          ingredient={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  )
}