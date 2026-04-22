import { getCategoryInfo } from './nutrition'

/**
 * Inline colour-coded category tag.
 * Props:
 *   - category: one of 'protein'|'grains'|'vegetables'|'fats'|'fruits'|'other'
 *   - legend: optional object from GET /api/ingredients/categories
 *   - size: 'sm' (default) or 'xs'
 *   - showIcon: show Material Symbol (default true)
 *   - showLabel: show the category label text (default true)
 */
export default function CategoryTag({
  category,
  legend = null,
  size = 'sm',
  showIcon = true,
  showLabel = true,
}) {
  const info = getCategoryInfo(category, legend)

  const paddingClass = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  const iconClass = size === 'xs' ? 'text-[12px]' : 'text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${paddingClass}`}
      style={{ backgroundColor: info.bg, color: info.colour }}
      title={`${info.label} — ${info.description}`}
    >
      {showIcon && (
        <span className={`material-symbols-outlined ${iconClass}`}>
          {info.icon}
        </span>
      )}
      {showLabel && <span>{info.label}</span>}
    </span>
  )
}
