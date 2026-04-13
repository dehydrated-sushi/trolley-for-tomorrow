// Mock cooking data — replace with API call later
const COOKING_DATA = {
  'chicken breast': [
    { method: 'Pan-fry',  time: '8 – 12 mins', icon: '🍳' },
    { method: 'Bake',     time: '25 – 30 mins', icon: '🌡' },
    { method: 'Steam',    time: '20 – 25 mins', icon: '💨' },
    { method: 'Boil',     time: '15 – 20 mins', icon: '🥘' },
    { method: 'Grill',    time: '10 – 14 mins', icon: '🔥' },
  ],
  'spinach': [
    { method: 'Sauté',  time: '2 – 3 mins',  icon: '🍳' },
    { method: 'Steam',  time: '3 – 5 mins',  icon: '💨' },
    { method: 'Blanch', time: '1 – 2 mins',  icon: '🥘' },
  ],
  'brown rice': [
    { method: 'Boil',       time: '25 – 30 mins', icon: '🥘' },
    { method: 'Rice cooker', time: '30 – 35 mins', icon: '🍚' },
  ],
  'avocado': [
    { method: 'Raw (no cooking)', time: 'Ready to eat', icon: '🥑' },
    { method: 'Grill',            time: '4 – 6 mins',  icon: '🔥' },
  ],
  'whole milk': [
    { method: 'Heat on stove', time: '3 – 5 mins', icon: '🥘' },
    { method: 'Microwave',     time: '1 – 2 mins', icon: '📡' },
  ],
  'banana': [
    { method: 'Raw (no cooking)', time: 'Ready to eat', icon: '🍌' },
    { method: 'Pan-fry',         time: '3 – 4 mins',  icon: '🍳' },
    { method: 'Bake',            time: '15 – 20 mins', icon: '🌡' },
  ],
  'oats': [
    { method: 'Stovetop porridge', time: '5 – 7 mins',  icon: '🥘' },
    { method: 'Microwave',         time: '2 – 3 mins',  icon: '📡' },
    { method: 'Overnight (cold)',   time: '8 hrs (fridge)', icon: '❄️' },
  ],
  'eggs': [
    { method: 'Boil (soft)',   time: '6 – 7 mins',  icon: '🥘' },
    { method: 'Boil (hard)',   time: '10 – 12 mins', icon: '🥘' },
    { method: 'Scramble',      time: '3 – 5 mins',  icon: '🍳' },
    { method: 'Poach',         time: '3 – 4 mins',  icon: '💧' },
    { method: 'Fry (sunny)',   time: '3 – 4 mins',  icon: '🍳' },
  ],
}

function getCookingMethods(name) {
  const key = name?.toLowerCase().trim()
  return COOKING_DATA[key] ?? null
}

export default function CookingMethodPanel({ ingredient, onClose }) {
  if (!ingredient) return null

  const methods = getCookingMethods(ingredient.name)

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-xl overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#cce4d6]" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#e0ede4]">
          <div className="w-11 h-11 rounded-xl bg-[#e8f5ed] flex items-center justify-center text-xl flex-shrink-0">
            🥗
          </div>
          <div className="flex-1">
            <div className="text-base font-medium text-[#0c1f14]">{ingredient.name}</div>
            <div className="text-xs text-[#5a7a68] mt-0.5">
              {ingredient.quantity} {ingredient.unit}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5a7a68] hover:text-[#0c1f14] transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Cooking methods */}
        <div className="px-6 py-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-3">
            Cooking methods
          </div>

          {methods ? (
            <div className="flex flex-col gap-2">
              {methods.map(({ method, time, icon }) => (
                <div
                  key={method}
                  className="flex items-center justify-between bg-[#f4fbf6] rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{icon}</span>
                    <span className="text-sm text-[#0c1f14]">{method}</span>
                  </div>
                  <span className="text-xs text-[#5a7a68] font-medium">{time}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#5a7a68] text-sm font-light">
              No cooking data available for this ingredient yet.
            </div>
          )}
        </div>

        {/* Edit button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[#1e3d2a] text-white text-sm font-medium hover:bg-[#2d5a3d] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}