import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageShell from '../../shared/PageShell'

function addActivity(message) {
  const saved = localStorage.getItem('dashboard_activity')
  const current = saved ? JSON.parse(saved) : []

  const next = [
    {
      id: `${Date.now()}-${Math.random()}`,
      message,
      createdAt: new Date().toISOString(),
    },
    ...current,
  ].slice(0, 8)

  localStorage.setItem('dashboard_activity', JSON.stringify(next))
}

export default function ProfileForm() {
  const navigate = useNavigate()

  const [budgetInput, setBudgetInput] = useState('42.10')
  const [expiringSoon, setExpiringSoon] = useState(3)
  const [mealsPlanned, setMealsPlanned] = useState(0)

  useEffect(() => {
    const savedBudget = localStorage.getItem('dashboard_budget')
    const savedExpiringSoon = localStorage.getItem('dashboard_expiringSoon')
    const savedMealsPlanned = localStorage.getItem('dashboard_mealsPlanned')

    if (savedBudget) setBudgetInput(Number(savedBudget).toFixed(2))
    if (savedExpiringSoon) setExpiringSoon(Number(savedExpiringSoon))
    if (savedMealsPlanned) setMealsPlanned(Number(savedMealsPlanned))
  }, [])

  const handleSaveProfile = () => {
    const nextBudget = Number(budgetInput)

    if (Number.isNaN(nextBudget) || nextBudget < 0) return

    localStorage.setItem('dashboard_budget', JSON.stringify(nextBudget))
    localStorage.setItem('dashboard_expiringSoon', JSON.stringify(Math.max(0, expiringSoon)))
    localStorage.setItem('dashboard_mealsPlanned', JSON.stringify(Math.max(0, mealsPlanned)))

    addActivity('Updated profile settings')
    navigate('/dashboard')
  }

  const handleSignOut = () => {
    localStorage.removeItem('dashboard_budget')
    localStorage.removeItem('dashboard_expiringSoon')
    localStorage.removeItem('dashboard_mealsPlanned')
    localStorage.removeItem('dashboard_activity')
    navigate('/login')
  }

  return (
    <PageShell
      eyebrow="Account"
      title="My Profile"
      right={(
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 bg-[#1e3d2a] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#2d5a3d] hover:-translate-y-px transition-all duration-150"
        >
          Back to dashboard →
        </Link>
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-4">
            Profile settings
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-[#2d4a38] mb-2">
                Weekly budget
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full rounded-xl border border-[#cce4d6] px-3 py-2.5 text-sm outline-none focus:border-[#5cad76]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#2d4a38] mb-2">
                Expiring soon count
              </label>
              <input
                type="number"
                min="0"
                value={expiringSoon}
                onChange={(e) => setExpiringSoon(Number(e.target.value))}
                className="w-full rounded-xl border border-[#cce4d6] px-3 py-2.5 text-sm outline-none focus:border-[#5cad76]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#2d4a38] mb-2">
                Meals planned
              </label>
              <input
                type="number"
                min="0"
                value={mealsPlanned}
                onChange={(e) => setMealsPlanned(Number(e.target.value))}
                className="w-full rounded-xl border border-[#cce4d6] px-3 py-2.5 text-sm outline-none focus:border-[#5cad76]"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-3 rounded-xl bg-[#1e3d2a] text-white text-sm font-medium hover:bg-[#2d5a3d] transition-colors"
            >
              Save changes
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-4">
            Account actions
          </div>

          <div className="text-sm text-[#5a7a68] font-light mb-4">
            Sign out here. This will clear the temporary dashboard data stored in this demo.
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </PageShell>
  )
}