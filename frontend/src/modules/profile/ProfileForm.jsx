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

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [budgetInput, setBudgetInput] = useState('42.10')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    const savedProfile = localStorage.getItem('user_profile')
    const savedBudget = localStorage.getItem('dashboard_budget')

    if (savedProfile) {
      const profile = JSON.parse(savedProfile)
      setFullName(profile.fullName ?? '')
      setEmail(profile.email ?? '')
    } else {
      setFullName('Karl Wang')
      setEmail('karl@example.com')
    }

    if (savedBudget) {
      setBudgetInput(Number(savedBudget).toFixed(2))
    }
  }, [])

  const handleSaveProfile = (e) => {
    e.preventDefault()

    const nextBudget = Number(budgetInput)

    if (!fullName.trim() || !email.trim()) {
      setSaveMessage('Please complete your name and email.')
      return
    }

    if (Number.isNaN(nextBudget) || nextBudget < 0) {
      setSaveMessage('Please enter a valid budget.')
      return
    }

    const profile = {
      fullName: fullName.trim(),
      email: email.trim(),
    }

    localStorage.setItem('user_profile', JSON.stringify(profile))
    localStorage.setItem('dashboard_budget', JSON.stringify(nextBudget))
    localStorage.setItem('isLoggedIn', JSON.stringify(true))

    addActivity('Updated profile information')
    setSaveMessage('Profile updated successfully.')

    setTimeout(() => {
      navigate('/dashboard')
    }, 700)
  }

  const handleSignOut = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('user_profile')
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
        <form
          onSubmit={handleSaveProfile}
          className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5"
        >
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-4">
            Profile details
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-[#2d4a38] mb-2">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-[#cce4d6] px-3 py-2.5 text-sm outline-none focus:border-[#5cad76]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#2d4a38] mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-[#cce4d6] px-3 py-2.5 text-sm outline-none focus:border-[#5cad76]"
              />
            </div>

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
                placeholder="Enter weekly budget"
                className="w-full rounded-xl border border-[#cce4d6] px-3 py-2.5 text-sm outline-none focus:border-[#5cad76]"
              />
            </div>

            {saveMessage && (
              <div className="text-sm text-[#3e7a52] bg-[#eef8f1] border border-[#cce4d6] rounded-xl px-3 py-2">
                {saveMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#1e3d2a] text-white text-sm font-medium hover:bg-[#2d5a3d] transition-colors"
            >
              Save changes
            </button>
          </div>
        </form>

        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-4">
            Account actions
          </div>

          <div className="text-sm text-[#5a7a68] font-light mb-4">
            Use this button to sign out of your account and return to the login page.
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </PageShell>
  )
}