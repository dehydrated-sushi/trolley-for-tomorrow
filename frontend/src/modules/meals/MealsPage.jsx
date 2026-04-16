import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../../shared/PageShell'
import { apiFetch } from '../../lib/api'

export default function MealsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [availableItems, setAvailableItems] = useState([])
  const [recommendations, setRecommendations] = useState([])

  useEffect(() => {
    async function loadMeals() {
      try {
        setLoading(true)
        const data = await apiFetch('/api/meals/recommendations')
        setAvailableItems(data.available_items || [])
        setRecommendations(data.recommendations || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadMeals()
  }, [])

  return (
    <PageShell
      eyebrow="Planning"
      title="Your Meals"
      right={(
        <Link
          to="/fridge"
          className="text-sm text-[#0c1f14] bg-[#5cad76] px-5 py-2.5 rounded-full hover:bg-[#8dcca0] transition-all duration-150 hover:-translate-y-px font-medium"
        >
          Use fridge items →
        </Link>
      )}
    >
      {loading && <p className="text-sm text-[#5a7a68]">Loading meal recommendations...</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5 mb-5">
            <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-3">
              Available fridge items
            </div>
            <div className="flex flex-wrap gap-2">
              {availableItems.length > 0 ? (
                availableItems.map((item) => (
                  <span
                    key={item}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#f4fbf6] text-[#2d4a38] border border-[#cce4d6]"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <p className="text-sm text-[#5a7a68]">No fridge items found. Upload a receipt first.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recommendations.length > 0 ? (
              recommendations.map((meal) => (
                <div key={meal.id} className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5">
                  <h3 className="font-serif text-xl font-bold text-[#0c1f14] mb-2">{meal.name}</h3>
                  <p className="text-sm text-[#5a7a68] mb-2">
                    Match score: {meal.match_score} · Matched {meal.match_count}/{meal.total_ingredients}
                  </p>
                  <p className="text-sm text-[#2d4a38] mb-3">
                    Calories: {meal.calories ?? 'N/A'}
                  </p>

                  <div className="mb-3">
                    <div className="text-xs font-medium uppercase text-[#5a7a68] mb-1">Matched ingredients</div>
                    <div className="flex flex-wrap gap-2">
                      {meal.matched_ingredients.map((item) => (
                        <span
                          key={item}
                          className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-800"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase text-[#5a7a68] mb-1">Steps</div>
                    <ol className="list-decimal pl-5 text-sm text-[#2d4a38] space-y-1">
                      {(meal.steps || []).slice(0, 5).map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#5a7a68]">
                No meal recommendations yet. Upload a receipt so the backend has ingredients to match.
              </p>
            )}
          </div>
        </>
      )}
    </PageShell>
  )
}