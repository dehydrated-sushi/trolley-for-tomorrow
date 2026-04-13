import { NUTRITION_CATEGORIES, getExpiryStatus } from './useFridge'
import ExpiryBadge from './ExpiryBadge'

export default function IngredientItem({ ingredient, onEdit, onDelete, onViewDetail }) {
  const { name, quantity, unit, category, expiryDate } = ingredient
  const cat    = NUTRITION_CATEGORIES[category] ?? NUTRITION_CATEGORIES.veg
  const status = getExpiryStatus(expiryDate)

  const cardBorder =
    status === 'expired' ? 'border-red-200 bg-red-50/30'  :
    status === 'soon'    ? 'border-amber-200 bg-amber-50/20' :
                           'border-[#cce4d6] bg-white'

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-150 hover:shadow-sm ${cardBorder}`}>

      {/* Left colour bar — nutrition category */}
      <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${cat.dot}`} />

      {/* Main info */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onViewDetail(ingredient)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[#0c1f14] truncate">{name}</span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>
            {cat.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-[#5a7a68]">{quantity} {unit}</span>
          <span className="text-[#cce4d6]">·</span>
          <ExpiryBadge expiryDate={expiryDate} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onEdit(ingredient)}
          className="text-xs text-[#5a7a68] border border-[#cce4d6] rounded-lg px-3 py-1.5 hover:bg-[#f4fbf6] hover:border-[#5cad76] transition-all"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(ingredient)}
          className="text-xs text-[#5a7a68] border border-[#cce4d6] rounded-lg px-2.5 py-1.5 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all"
        >
          ✕
        </button>
      </div>
    </div>
  )
}