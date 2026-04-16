import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PageShell from '../../shared/PageShell'
import { apiFetch } from '../../lib/api'

function StatCard({ label, value, hint }) {
  return (
    <div className="bg-white border border-[#cce4d6] rounded-2xl px-5 py-4">
      <div className="text-xs text-[#5a7a68] mb-1">{label}</div>
      <div className="font-serif text-2xl font-bold text-[#0c1f14]">{value}</div>
      {hint && <div className="text-xs text-[#5a7a68] font-light mt-1">{hint}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const [budget, setBudget] = useState(0)
  const [expiringSoon, setExpiringSoon] = useState(0)
  const [mealsPlanned, setMealsPlanned] = useState(0)

  useEffect(() => {
    const savedBudget = Number(localStorage.getItem('dashboard_budget') || 0)
    const savedMealsPlanned = Number(localStorage.getItem('dashboard_mealsPlanned') || 0)

    setBudget(savedBudget)
    setMealsPlanned(savedMealsPlanned)

    async function loadFridge() {
      try {
        const data = await apiFetch('/api/fridge/items')
        const items = data.items || []
        setExpiringSoon(items.length)
      } catch {
        setExpiringSoon(0)
      }
    }

    loadFridge()
  }, [])

  return (
    <PageShell
      eyebrow="Overview"
      title="Dashboard"
      subtitle="Quick snapshot of your week."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Fridge items" value={expiringSoon} hint="Imported from receipts" />
        <StatCard label="Budget remaining" value={`$${budget.toFixed(2)}`} hint="This week" />
        <StatCard label="Meals planned" value={mealsPlanned} hint="Generated meals" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-3">
            Next best actions
          </div>
          <div className="flex flex-col gap-2">
            <Link
              to="/upload-receipt"
              className="px-4 py-3 rounded-xl border border-[#cce4d6] hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all text-sm text-[#2d4a38]"
            >
              Upload a new receipt
            </Link>
            <Link
              to="/fridge"
              className="px-4 py-3 rounded-xl border border-[#cce4d6] hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all text-sm text-[#2d4a38]"
            >
              View fridge items
            </Link>
            <Link
              to="/meals"
              className="px-4 py-3 rounded-xl border border-[#cce4d6] hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all text-sm text-[#2d4a38]"
            >
              Generate meal recommendations
            </Link>
            <Link
              to="/profile"
              className="px-4 py-3 rounded-xl border border-[#cce4d6] hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all text-sm text-[#2d4a38]"
            >
              My Profile
            </Link>
          </div>
        </div>

        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-3">
            Activity
          </div>
          <div className="text-sm text-[#5a7a68] font-light">
            Upload receipts to populate your fridge, then use those items to get meal recommendations.
          </div>
        </div>
      </div>
    </PageShell>
  )
}