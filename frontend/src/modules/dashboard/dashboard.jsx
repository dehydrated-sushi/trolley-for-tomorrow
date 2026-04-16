import { Link } from 'react-router-dom'
import { NUTRITION_CATEGORIES } from '../fridge/useFridge'

// Mock data — replace with real state/API later
const BUDGET = { total: 100, spent: 84.60 }
const WASTE_SAVED = 2.4
const ECO_SCORE = 88
const EXPIRING = [
  { name: 'Whole Milk',     days: 1, unit: '2 L'   },
  { name: 'Spinach',        days: 2, unit: '200 g'  },
  { name: 'Chicken Breast', days: 3, unit: '500 g'  },
]
const TODAY_MEALS = [
  { name: 'Oatmeal with Banana',     type: 'Breakfast', price: 0.80, time: 5,  tags: ['grains','fruit'],           expiring: false },
  { name: 'Leftover Stir-fry',       type: 'Lunch',     price: 0,    time: 10, tags: ['veg','protein'],            expiring: true  },
  { name: 'Garlic Chicken & Rice',   type: 'Dinner',    price: 3.10, time: 30, tags: ['protein','grains'],         expiring: true  },
]

const TYPE_COLORS = {
  Breakfast: { bg: 'bg-amber-100',  text: 'text-amber-800'  },
  Lunch:     { bg: 'bg-green-100',  text: 'text-green-800'  },
  Dinner:    { bg: 'bg-indigo-100', text: 'text-indigo-800' },
}

function ExpiryBadge({ days }) {
  if (days <= 1) return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">{days === 0 ? 'Today' : '1 day left'}</span>
  if (days <= 3) return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{days} days left</span>
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">{days} days left</span>
}

export default function Dashboard() {
  const remaining = BUDGET.total - BUDGET.spent
  const spentPct  = Math.min(100, (BUDGET.spent / BUDGET.total) * 100)
  const circumference = 2 * Math.PI * 38
  const ecoPct = (ECO_SCORE / 100) * circumference

  return (
    <div className="min-h-screen bg-[#f4fbf6] pt-16">
      <div className="w-full px-4 md:px-8 lg:px-14 py-8">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="text-xs font-medium tracking-[1.2px] uppercase text-[#5a7a68] mb-1">
              Welcome back
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#0c1f14] tracking-tight">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-[#e8f5ed] border border-[#c4e8ce] rounded-full px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-[#5cad76]" />
            <span className="text-sm font-medium text-[#2d5a3d]">{WASTE_SAVED}kg waste saved</span>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Budget card */}
          <div className="bg-white border border-[#cce4d6] rounded-2xl p-6">
            <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-3">
              Weekly Budget Balance
            </div>
            <div className="font-serif text-4xl font-bold text-[#0c1f14] leading-none mb-1">
              ${remaining.toFixed(2)}
            </div>
            <div className="text-sm text-[#5a7a68] font-light mb-4">remaining this week</div>
            <div className="h-2 bg-[#e8f5ed] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-[#3e7a52] to-[#5cad76] rounded-full transition-all duration-500"
                style={{ width: `${spentPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[#5a7a68]">
              <span>Spent ${BUDGET.spent.toFixed(2)}</span>
              <span>Limit ${BUDGET.total.toFixed(2)}</span>
            </div>
            {/* Nutrition legend */}
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-[#e8f5ed]">
              {Object.entries(NUTRITION_CATEGORIES).map(([, { label, bg, text }]) => (
                <span key={label} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${bg} ${text}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Scan CTA card */}
          <div className="relative bg-[#1a3a2a] rounded-2xl overflow-hidden cursor-pointer group min-h-[200px] flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-300"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1543168256-418811576931?w=600&q=80')" }}
            />
            <div className="relative p-6">
              <h2 className="font-serif text-xl text-white leading-snug mb-2">
                What's in my fridge?
              </h2>
              <p className="text-sm text-white/55 font-light mb-4 leading-relaxed">
                Scan your receipt and let NutriPlan generate zero-waste meal plans instantly.
              </p>
              <Link
                to="/scan"
                className="inline-flex items-center gap-2 bg-[#5cad76] text-[#0c1f14] text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#8dcca0] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
                Start Scanning
              </Link>
            </div>
          </div>

          {/* Expiry sidebar */}
          <div className="bg-white border border-[#cce4d6] rounded-2xl p-6 md:row-span-2 lg:row-span-1">
            <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-4">
              Fridge — Expiring Soon
            </div>
            <div className="flex flex-col divide-y divide-[#e8f5ed]">
              {EXPIRING.map(({ name, days, unit }) => (
                <div key={name} className="flex items-center gap-3 py-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${days <= 1 ? 'bg-red-50' : 'bg-amber-50'}`}>
                    {days <= 1 ? '⚠️' : '🕐'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#0c1f14] truncate">{name}</div>
                    <div className="text-xs text-[#5a7a68]">{unit}</div>
                  </div>
                  <ExpiryBadge days={days} />
                </div>
              ))}
            </div>
            <Link
              to="/fridge"
              className="block mt-3 text-sm font-medium text-[#3e7a52] hover:text-[#2d5a3d] transition-colors"
            >
              Check full inventory →
            </Link>
          </div>

          {/* Today's meals */}
          <div className="bg-white border border-[#cce4d6] rounded-2xl overflow-hidden md:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#e8f5ed]">
              <h3 className="font-serif text-lg font-semibold text-[#0c1f14]">Today's Curated Journey</h3>
              <Link to="/meals" className="text-sm font-medium text-[#3e7a52] hover:text-[#2d5a3d] transition-colors">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#e8f5ed]">
              {TODAY_MEALS.map(meal => (
                <Link key={meal.name} to="/meals" className="p-5 hover:bg-[#f4fbf6] transition-colors block">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md ${TYPE_COLORS[meal.type].bg} ${TYPE_COLORS[meal.type].text}`}>
                      {meal.type}
                    </span>
                    <span className={`text-sm font-semibold ${meal.price === 0 ? 'text-[#5cad76]' : 'text-[#0c1f14]'}`}>
                      {meal.price === 0 ? 'FREE' : `$${meal.price.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-[#0c1f14] leading-snug mb-2">{meal.name}</div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {meal.tags.map(tag => {
                      const cat = NUTRITION_CATEGORIES[tag]
                      return (
                        <span key={tag} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>
                          {cat.label}
                        </span>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#5a7a68]">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                      </svg>
                      {meal.time} mins
                    </span>
                    {meal.expiring && (
                      <span className="text-amber-600 font-medium">⏰ expiring</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Eco impact card */}
          <div className="bg-[#1a3a2a] rounded-2xl p-6 md:col-span-2 lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#5cad76]/8 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#5cad76]/5 translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="relative flex items-center justify-between gap-6 flex-wrap">
              <div className="flex-1">
                <h3 className="font-serif text-xl text-white mb-2 leading-snug">
                  Regenerative Eating Impact
                </h3>
                <p className="text-sm text-white/45 font-light leading-relaxed max-w-xs">
                  This week, your choices have diverted substantial food waste. You're in the top 15% locally.
                </p>
                <div className="flex gap-6 mt-4">
                  <div>
                    <div className="font-serif text-2xl font-bold text-white">{WASTE_SAVED}<span className="text-sm text-[#5cad76] ml-0.5">kg</span></div>
                    <div className="text-xs text-white/35 uppercase tracking-wide mt-1">Waste saved</div>
                  </div>
                  <div>
                    <div className="font-serif text-2xl font-bold text-white">12.5<span className="text-sm text-[#5cad76] ml-0.5">L</span></div>
                    <div className="text-xs text-white/35 uppercase tracking-wide mt-1">Water preserved</div>
                  </div>
                </div>
              </div>

              {/* Eco Score ring */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="-rotate-90 w-24 h-24" viewBox="0 0 90 90">
                  <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                  <circle
                    cx="45" cy="45" r="38"
                    fill="none" stroke="#5cad76" strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - ecoPct}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="font-serif text-2xl font-bold text-white leading-none">{ECO_SCORE}</div>
                  <div className="text-[9px] text-white/35 uppercase tracking-wide mt-0.5">Eco Score</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}