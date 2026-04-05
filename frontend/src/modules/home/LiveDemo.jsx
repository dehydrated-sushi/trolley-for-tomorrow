import { Link } from 'react-router-dom'
import { useDemo, INGREDIENTS, TAG_LABELS } from './useDemo'

function IngredientChip({ ingredient, selected, onToggle }) {
  return (
    <button
      onClick={() => onToggle(ingredient.id)}
      className={`
        inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm
        transition-all duration-150 cursor-pointer font-sans
        ${selected
          ? 'bg-[#e8f5ed] border-[#5cad76] text-[#1e3d2a] font-medium'
          : 'bg-white border-[#cce4d6] text-[#2d4a38] hover:border-[#5cad76] hover:bg-[#f4fbf6]'
        }
      `}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: ingredient.dot }}
      />
      {ingredient.label}
      {ingredient.expiring && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
          expiring
        </span>
      )}
      {selected && (
        <span className="w-3.5 h-3.5 rounded-full bg-[#5cad76]/20 text-[#1e3d2a] text-[9px] flex items-center justify-center flex-shrink-0">
          ✕
        </span>
      )}
    </button>
  )
}

function RecipeCard({ recipe, index }) {
  const accentColor = index === 0 ? 'bg-[#5cad76]' : 'bg-[#e8a04a]'

  return (
    <div className="relative border border-[#cce4d6] rounded-xl overflow-hidden hover:border-[#5cad76] hover:translate-x-0.5 hover:shadow-md transition-all duration-200 cursor-pointer">
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentColor}`} />

      <div className="pl-5 pr-4 py-3.5">
        {/* Name + price */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-sm font-medium text-[#0c1f14] leading-snug">{recipe.name}</div>
          <div className={`text-sm font-medium flex-shrink-0 ${recipe.price === 'FREE' ? 'text-[#5cad76]' : 'text-[#3e7a52]'}`}>
            {recipe.price}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {recipe.tags.map(tag => {
            const { label, bg, text } = TAG_LABELS[tag]
            return (
              <span key={tag} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${bg} ${text}`}>
                {label}
              </span>
            )
          })}
          {recipe.expiring && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              ⏰ Expiring first
            </span>
          )}
        </div>

        {/* Match bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-[3px] bg-[#e8f5ed] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5cad76] rounded-full transition-all duration-700"
              style={{ width: `${recipe.match}%` }}
            />
          </div>
          <span className="text-[11px] text-[#5a7a68] whitespace-nowrap">{recipe.match}% match</span>
        </div>
      </div>
    </div>
  )
}

export default function LiveDemo() {
  const {
    selected,
    recipes,
    loading,
    hasGenerated,
    canGenerate,
    selectedCount,
    toggleIngredient,
    generate,
  } = useDemo()

  return (
    <section id="demo" className="py-20 md:py-28 bg-[#f4fbf6] relative overflow-hidden">
      {/* Subtle top gradient */}
      <div className="absolute inset-0 bg-radial-[ellipse_at_50%_0%] from-[#5cad76]/7 to-transparent pointer-events-none" />

      <div className="w-full px-4 md:px-8 lg:px-14 relative">

        {/* Section header */}
        <div className="text-center mb-12">
          <div className="text-xs font-medium tracking-[1.5px] uppercase text-[#3e7a52] mb-2.5">
            No account needed
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#0c1f14] leading-tight tracking-tight">
            See it work right now
          </h2>
          <p className="text-[#5a7a68] text-base font-light leading-relaxed mt-3 max-w-md mx-auto">
            Pick what's in your fridge. We'll suggest meals that use them — expiring items first.
          </p>
        </div>

        {/* Demo layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 max-w-5xl mx-auto">

          {/* ── LEFT: ingredient picker ── */}
          <div className="bg-white border border-[#cce4d6] rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#cce4d6]">
              <div>
                <div className="text-[15px] font-medium text-[#0c1f14]">What's in your fridge?</div>
                <div className="text-xs text-[#5a7a68] mt-0.5">Pick 2+ ingredients to get started</div>
              </div>
              <span className="text-xs bg-[#e8f5ed] text-[#3e7a52] border border-[#c4e8ce] rounded-full px-3 py-1 font-medium">
                {selectedCount} selected
              </span>
            </div>

            {/* Chips */}
            <div className="px-6 py-5">
              <div className="text-[11px] font-medium tracking-[1px] uppercase text-[#5a7a68] mb-3">
                Available ingredients
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {INGREDIENTS.map(ing => (
                  <IngredientChip
                    key={ing.id}
                    ingredient={ing}
                    selected={selected.has(ing.id)}
                    onToggle={toggleIngredient}
                  />
                ))}
              </div>

              {/* Generate button */}
              <button
                onClick={generate}
                disabled={!canGenerate || loading}
                className={`
                  w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2
                  transition-all duration-200
                  ${canGenerate && !loading
                    ? 'bg-[#1e3d2a] text-white hover:bg-[#2d5a3d] hover:-translate-y-px cursor-pointer'
                    : 'bg-[#cce4d6] text-[#5a7a68] cursor-not-allowed'
                  }
                `}
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {loading
                  ? 'Finding meals…'
                  : canGenerate
                    ? `Find meals using my ${selectedCount} ingredients →`
                    : 'Select 2+ ingredients'
                }
              </button>
            </div>
          </div>

          {/* ── RIGHT: recipe results ── */}
          <div className="bg-white border border-[#cce4d6] rounded-2xl overflow-hidden shadow-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-5 border-b border-[#cce4d6]">
              <div className="text-[15px] font-medium text-[#0c1f14] flex-1">Meal suggestions</div>
              {hasGenerated && (
                <div className="text-xs text-[#5a7a68]">{recipes.length} ideas</div>
              )}
            </div>

            <div className="flex-1 p-4 flex flex-col">
              {/* Empty state */}
              {!hasGenerated && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl mb-3 opacity-40">🍽</div>
                  <div className="text-sm text-[#5a7a68] font-light leading-relaxed max-w-[200px]">
                    Your personalised meal ideas will appear here.
                  </div>
                </div>
              )}

              {/* Loading state */}
              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-[#cce4d6] border-t-[#5cad76] rounded-full animate-spin mb-3" />
                  <div className="text-sm text-[#5a7a68]">Finding your meals…</div>
                </div>
              )}

              {/* Results */}
              {hasGenerated && !loading && (
                <div className="flex flex-col gap-2.5">
                  {recipes.map((recipe, i) => (
                    <RecipeCard key={recipe.name} recipe={recipe} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Sign up nudge — shown after results */}
            {hasGenerated && (
              <div className="mx-4 mb-4 p-3.5 bg-[#e8f5ed] border border-[#c4e8ce] rounded-xl text-center">
                <p className="text-[13px] text-[#1e3d2a] leading-snug mb-2.5">
                  ✨ <strong>Like these ideas?</strong> Sign up to unlock full weekly
                  meal plans, expiry alerts, and shopping lists.
                </p>
                <Link
                  to="/signup"
                  className="inline-block bg-[#5cad76] text-[#0c1f14] text-[13px] font-medium px-5 py-2 rounded-full hover:bg-[#8dcca0] hover:-translate-y-px transition-all duration-150"
                >
                  Create free account →
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  )
}