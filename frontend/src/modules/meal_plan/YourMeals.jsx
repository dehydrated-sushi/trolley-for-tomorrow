import { useState } from 'react'
import { Link } from 'react-router-dom'
import { NUTRITION_CATEGORIES } from '../fridge/useFridge'

const MEAL_TABS = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack']

const MEALS = [
  {
    id: 1,
    name: 'Oatmeal with Banana',
    type: 'Breakfast',
    price: 0.80,
    time: 5,
    servings: 1,
    tags: ['grains', 'fruit'],
    fromFridge: false,
    expiring: false,
    desc: 'Warm oats topped with sliced banana and a drizzle of honey. Ready in minutes.',
  },
  {
    id: 2,
    name: 'Leftover Stir-fry',
    type: 'Lunch',
    price: 0,
    time: 10,
    servings: 2,
    tags: ['veg', 'protein'],
    fromFridge: true,
    expiring: true,
    desc: 'Uses up your spinach and chicken breast before they expire. Quick and nutritious.',
  },
  {
    id: 3,
    name: 'Budget Beef Mince & Veggie Pasta',
    type: 'Dinner',
    price: 3.20,
    time: 25,
    servings: 2,
    tags: ['protein', 'grains', 'veg'],
    fromFridge: false,
    expiring: false,
    desc: 'Hearty pasta with beef mince and seasonal vegetables. Great for meal prepping.',
  },
  {
    id: 4,
    name: 'Spinach & Egg Scramble',
    type: 'Breakfast',
    price: 0.90,
    time: 8,
    servings: 1,
    tags: ['protein', 'veg'],
    fromFridge: true,
    expiring: true,
    desc: 'Fluffy scrambled eggs with wilted spinach. Uses your expiring spinach.',
  },
  {
    id: 5,
    name: 'Avocado & Egg Toast',
    type: 'Lunch',
    price: 1.80,
    time: 10,
    servings: 1,
    tags: ['fats', 'protein', 'grains'],
    fromFridge: false,
    expiring: false,
    desc: 'Smashed avocado on wholegrain toast topped with a poached egg.',
  },
  {
    id: 6,
    name: 'Garlic Chicken & Rice',
    type: 'Dinner',
    price: 3.10,
    time: 30,
    servings: 2,
    tags: ['protein', 'grains'],
    fromFridge: true,
    expiring: true,
    desc: 'Pan-fried chicken breast with garlic and steamed brown rice.',
  },
  {
    id: 7,
    name: 'Banana Oat Porridge',
    type: 'Snack',
    price: 0.60,
    time: 5,
    servings: 1,
    tags: ['grains', 'fruit'],
    fromFridge: false,
    expiring: false,
    desc: 'Creamy oat porridge with banana. A simple and filling afternoon snack.',
  },
]

const TYPE_COLORS = {
  Breakfast: { bg: 'bg-amber-100',  text: 'text-amber-800'  },
  Lunch:     { bg: 'bg-green-100',  text: 'text-green-800'  },
  Dinner:    { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  Snack:     { bg: 'bg-pink-100',   text: 'text-pink-800'   },
}

function MealCard({ meal }) {
  const [expanded, setExpanded] = useState(false)
  const typeColor = TYPE_COLORS[meal.type]

  return (
    <div
      className="bg-white border border-[#cce4d6] rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => setExpanded(p => !p)}
    >
      {/* Card top */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md ${typeColor.bg} ${typeColor.text}`}>
              {meal.type}
            </span>
            {meal.expiring && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                ⏰ Uses expiring
              </span>
            )}
            {meal.fromFridge && !meal.expiring && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#e8f5ed] text-[#3e7a52]">
                From fridge
              </span>
            )}
          </div>
          <div className={`text-sm font-semibold flex-shrink-0 ${meal.price === 0 ? 'text-[#5cad76]' : 'text-[#0c1f14]'}`}>
            {meal.price === 0 ? 'FREE' : `$${meal.price.toFixed(2)}`}
          </div>
        </div>

        <div className="text-base font-medium text-[#0c1f14] mb-2 leading-snug">{meal.name}</div>

        {/* Nutrition tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {meal.tags.map(tag => {
            const cat = NUTRITION_CATEGORIES[tag]
            return (
              <span key={tag} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>
                {cat.label}
              </span>
            )
          })}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-[#5a7a68]">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
            </svg>
            {meal.time} mins
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Serves {meal.servings}
          </div>
        </div>

        {/* Expandable description */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#e8f5ed] text-sm text-[#5a7a68] font-light leading-relaxed">
            {meal.desc}
          </div>
        )}
      </div>
    </div>
  )
}

export default function YourMeals() {
  const [activeTab, setActiveTab] = useState('All')

  const filtered = activeTab === 'All'
    ? MEALS
    : MEALS.filter(m => m.type === activeTab)

  const totalCost = filtered.reduce((sum, m) => sum + m.price, 0)
  const expiringCount = filtered.filter(m => m.expiring).length

  return (
    <div className="min-h-screen bg-[#f4fbf6] pt-16">
      <div className="w-full px-4 md:px-8 lg:px-14 py-8">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="text-xs font-medium tracking-[1.2px] uppercase text-[#5a7a68] mb-1">
              Meal Planning
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#0c1f14] tracking-tight">
              Your Meals
            </h1>
            <p className="text-sm text-[#5a7a68] mt-1">
              Today's recommendations based on your fridge
              {expiringCount > 0 && (
                <span className="ml-1 text-amber-600 font-medium">
                  · {expiringCount} use expiring items
                </span>
              )}
            </p>
          </div>
          {/* Total cost badge */}
          <div className="bg-white border border-[#cce4d6] rounded-2xl px-5 py-3 text-center">
            <div className="text-xs text-[#5a7a68] mb-0.5">Today's total</div>
            <div className="font-serif text-2xl font-bold text-[#0c1f14]">
              ${totalCost.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {MEAL_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-medium px-4 py-2 rounded-full border transition-all duration-150
                ${activeTab === tab
                  ? 'bg-[#1e3d2a] text-white border-transparent'
                  : 'bg-white text-[#5a7a68] border-[#cce4d6] hover:border-[#5cad76] hover:text-[#2d4a38]'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Meals grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4 opacity-30">🍽</div>
            <div className="text-base font-medium text-[#2d4a38]">No meals for this category</div>
            <div className="text-sm text-[#5a7a68] font-light mt-1">Try a different filter above</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(meal => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        )}

        {/* Bottom nudge */}
        <div className="mt-8 bg-white border border-[#cce4d6] rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-medium text-[#0c1f14]">Missing ingredients?</div>
            <div className="text-xs text-[#5a7a68] font-light mt-0.5">
              Generate a shopping list for what you need
            </div>
          </div>
          <Link
            to="/shopping"
            className="text-sm font-medium text-[#3e7a52] border border-[#cce4d6] px-4 py-2 rounded-xl hover:bg-[#f4fbf6] hover:border-[#5cad76] transition-all flex-shrink-0"
          >
            View shopping list →
          </Link>
        </div>

      </div>
    </div>
  )
}