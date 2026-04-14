import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PageShell from '../../shared/PageShell'

function StatCard({ label, value, hint }) {
  return (
    <div className="bg-white border border-[#cce4d6] rounded-2xl px-5 py-4">
      <div className="text-xs text-[#5a7a68] mb-1">{label}</div>
      <div className="font-serif text-2xl font-bold text-[#0c1f14]">{value}</div>
      {hint && <div className="text-xs text-[#5a7a68] font-light mt-1">{hint}</div>}
    </div>
  )
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DashboardPage() {
  const [expiringSoon, setExpiringSoon] = useState(3)
  const [budget, setBudget] = useState(42.1)
  const [mealsPlanned, setMealsPlanned] = useState(0)
  const [activity, setActivity] = useState([])

  useEffect(() => {
    const savedBudget = localStorage.getItem('dashboard_budget')
    const savedExpiringSoon = localStorage.getItem('dashboard_expiringSoon')
    const savedMealsPlanned = localStorage.getItem('dashboard_mealsPlanned')
    const savedActivity = localStorage.getItem('dashboard_activity')

    if (savedBudget) setBudget(Number(savedBudget))
    if (savedExpiringSoon) setExpiringSoon(Number(savedExpiringSoon))
    if (savedMealsPlanned) setMealsPlanned(Number(savedMealsPlanned))
    if (savedActivity) setActivity(JSON.parse(savedActivity))
  }, [])

  return (
    <PageShell
      eyebrow="Overview"
      title="Dashboard"
      right={(
        <Link
          to="/fridge"
          className="inline-flex items-center gap-2 bg-[#1e3d2a] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#2d5a3d] hover:-translate-y-px transition-all duration-150"
        >
          Open fridge →
        </Link>
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Expiring soon"
          value={expiringSoon}
          hint="From your saved data"
        />
        <StatCard
          label="Budget remaining"
          value={`$${budget.toFixed(2)}`}
          hint="Managed in My Profile"
        />
        <StatCard
          label="Meals planned"
          value={mealsPlanned}
          hint="From your saved data"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-3">
            Next best actions
          </div>

          <div className="flex flex-col gap-2">
            <Link
              to="/meals"
              className="px-4 py-3 rounded-xl border border-[#cce4d6] hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all text-sm text-[#2d4a38]"
            >
              Generate a meal plan for this week
            </Link>

            <Link
              to="/shopping"
              className="px-4 py-3 rounded-xl border border-[#cce4d6] hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all text-sm text-[#2d4a38]"
            >
              Review your shopping list
            </Link>

            <Link
              to="/profile"
              className="px-4 py-3 rounded-xl border border-[#cce4d6] hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all text-sm text-[#2d4a38]"
            >
              My profile
            </Link>
          </div>
        </div>

        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-3">
            Activity
          </div>

          {activity.length === 0 ? (
            <div className="text-sm text-[#5a7a68] font-light">
              No activity yet. Update your profile to see activity here.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activity.slice(0, 5).map(item => (
                <div
                  key={item.id}
                  className="px-4 py-3 rounded-xl border border-[#cce4d6] bg-[#fcfefd]"
                >
                  <div className="text-sm text-[#2d4a38]">{item.message}</div>
                  <div className="text-xs text-[#5a7a68] mt-1">
                    {formatTime(item.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}