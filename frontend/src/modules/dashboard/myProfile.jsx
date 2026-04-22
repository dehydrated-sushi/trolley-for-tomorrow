import { useState, useEffect } from 'react'
import { apiFetch, API_BASE } from '../../lib/api'

const PRESETS = [150, 250, 400]

export default function ProfilePage() {
  // Budget state
  const [budgetInput, setBudgetInput] = useState('')
  const [savedBudget, setSavedBudget] = useState(null)
  const [budgetStatus, setBudgetStatus] = useState(null) // {budget, spent_this_week, remaining}
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetError, setBudgetError] = useState('')
  const [budgetSuccess, setBudgetSuccess] = useState('')

  // Preferences state
  const [prefs, setPrefs] = useState({})
  const [prefLabels, setPrefLabels] = useState({})
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsError, setPrefsError] = useState('')
  const [prefsSuccess, setPrefsSuccess] = useState('')

  const [loading, setLoading] = useState(true)

  async function refreshBudgetStatus() {
    try {
      const status = await apiFetch('/api/profile/budget-status')
      setBudgetStatus(status)
      if (status?.budget != null) {
        setSavedBudget(status.budget)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [status, prefData] = await Promise.all([
          apiFetch('/api/profile/budget-status').catch(() => null),
          apiFetch('/api/profile/preferences').catch(() => null),
        ])
        if (status) {
          setBudgetStatus(status)
          if (status.budget != null) {
            setSavedBudget(status.budget)
            setBudgetInput(String(status.budget))
          }
        }
        if (prefData) {
          setPrefs(prefData.preferences || {})
          setPrefLabels(prefData.labels || {})
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // --- Budget handlers ---
  const handleBudgetChange = (e) => {
    setBudgetInput(e.target.value)
    setBudgetError('')
    setBudgetSuccess('')
  }

  const handlePreset = (amount) => {
    setBudgetInput(String(amount))
    setBudgetError('')
    setBudgetSuccess('')
  }

  const handleSaveBudget = async () => {
    setBudgetError('')
    setBudgetSuccess('')
    const trimmed = budgetInput.trim()
    if (trimmed === '') {
      setBudgetError('Please enter a budget amount.')
      return
    }
    const n = Number(trimmed)
    if (!Number.isFinite(n) || n <= 0) {
      setBudgetError('Budget must be a positive number.')
      return
    }
    try {
      setBudgetSaving(true)
      const response = await fetch(`${API_BASE}/api/profile/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: n }),
      })
      const data = await response.json()
      if (!response.ok) {
        setBudgetError(data.error || 'Failed to save budget.')
        return
      }
      setSavedBudget(data.budget)
      setBudgetSuccess(`Budget saved: $${data.budget.toFixed(2)} per week.`)
      // Refresh status so the spending card below reflects the new budget
      await refreshBudgetStatus()
    } catch (e) {
      setBudgetError(`Could not save: ${e.message}`)
    } finally {
      setBudgetSaving(false)
    }
  }

  const handleDiscardBudget = () => {
    setBudgetInput(savedBudget != null ? String(savedBudget) : '')
    setBudgetError('')
    setBudgetSuccess('')
  }

  const isPreset = (amount) => Number(budgetInput) === amount

  // --- Preferences handlers ---
  const togglePref = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
    setPrefsError('')
    setPrefsSuccess('')
  }

  const handleSavePrefs = async () => {
    setPrefsError('')
    setPrefsSuccess('')
    try {
      setPrefsSaving(true)
      const response = await fetch(`${API_BASE}/api/profile/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      })
      const data = await response.json()
      if (!response.ok) {
        setPrefsError(data.error || 'Failed to save preferences.')
        return
      }
      const active = Object.entries(data.preferences)
        .filter(([, v]) => v)
        .map(([k]) => data.labels[k] || k)
      setPrefsSuccess(
        active.length
          ? `Preferences saved: ${active.join(', ')}.`
          : 'Preferences saved (no restrictions).'
      )
    } catch (e) {
      setPrefsError(`Could not save: ${e.message}`)
    } finally {
      setPrefsSaving(false)
    }
  }

  const activePrefsCount = Object.values(prefs).filter(Boolean).length

  return (
    <div className="px-6 max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2">Account Settings</h1>
        <p className="text-on-surface-variant text-lg">Customize your kitchen experience and dietary goals.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-2">
          <a href="#budget-section" className="block w-full text-left px-4 py-3 rounded-xl bg-surface-container-lowest shadow-sm border-l-4 border-primary text-primary font-semibold flex items-center gap-3">
            <span className="material-symbols-outlined">payments</span>
            Budget
          </a>
          <a href="#diet-section" className="block w-full text-left px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center gap-3">
            <span className="material-symbols-outlined">restaurant</span>
            Dietary Preferences
            {activePrefsCount > 0 && (
              <span className="ml-auto text-xs bg-primary text-on-primary rounded-full px-2 py-0.5 font-bold">
                {activePrefsCount}
              </span>
            )}
          </a>
        </div>

        <div className="md:col-span-2 space-y-8">
          {/* Budget Section */}
          <section id="budget-section" className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-outlined">savings</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-on-surface">Weekly Spending Goal</h2>
                <p className="text-sm text-on-surface-variant">
                  {savedBudget != null
                    ? `Currently set to $${savedBudget.toFixed(2)} per week.`
                    : 'No budget set yet — set one below to start tracking receipt spending.'}
                </p>
              </div>
            </div>

            {/* This week spending summary */}
            {(() => {
              const b = budgetStatus?.budget
              const spent = budgetStatus?.spent_this_week ?? 0
              const remaining = budgetStatus?.remaining
              const hasBudget = b != null
              const overBudget = hasBudget && remaining != null && remaining < 0
              const pctUsed = hasBudget && b > 0 ? Math.min(100, Math.max(0, (spent / b) * 100)) : 0

              if (!hasBudget && spent === 0) return null

              return (
                <div className={`mb-6 p-5 rounded-2xl ${
                  overBudget
                    ? 'bg-error-container/20 border border-error/30'
                    : 'bg-surface-container-low'
                }`}>
                  {overBudget && (
                    <div className="flex items-start gap-2 mb-4">
                      <span className="material-symbols-outlined text-error flex-shrink-0 mt-px">warning</span>
                      <p className="text-sm text-error font-semibold">
                        You&apos;re ${Math.abs(remaining).toFixed(2)} over this week&apos;s budget.
                      </p>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Rolling last 7 days
                    </span>
                    {hasBudget && (
                      <span className="text-xs font-semibold text-on-surface-variant">
                        {Math.round(pctUsed)}% of budget used
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <span className="text-2xl font-black text-on-surface">
                        ${spent.toFixed(2)}
                      </span>
                      {hasBudget && (
                        <span className="text-on-surface-variant text-sm ml-1">
                          / ${b.toFixed(2)}
                        </span>
                      )}
                      <span className="block text-xs text-on-surface-variant mt-0.5">spent on receipts</span>
                    </div>
                    {hasBudget && (
                      <div className="text-right">
                        <span className={`text-xl font-bold ${
                          overBudget ? 'text-error' : pctUsed >= 80 ? 'text-amber-600' : 'text-primary'
                        }`}>
                          {overBudget ? '-' : ''}${Math.abs(remaining).toFixed(2)}
                        </span>
                        <span className="block text-xs text-on-surface-variant">
                          {overBudget ? 'over budget' : 'remaining'}
                        </span>
                      </div>
                    )}
                  </div>

                  {hasBudget && (
                    <div className="h-2 w-full rounded-full bg-on-surface/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, pctUsed)}%`,
                          backgroundColor: overBudget
                            ? '#dc2626'
                            : pctUsed >= 80
                              ? '#f59e0b'
                              : '#14b8a6',
                        }}
                      />
                    </div>
                  )}

                  <p className="text-xs text-on-surface-variant mt-3">
                    Calculated from prices on receipts you&apos;ve committed in the last 7 days.
                  </p>
                </div>
              )
            })()}

            <div className="space-y-6">
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2 ml-1" htmlFor="budget-input">
                  Weekly Budget (AUD)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-on-surface-variant font-medium">$</span>
                  <input
                    id="budget-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="250.00"
                    value={budgetInput}
                    onChange={handleBudgetChange}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-4 bg-surface-container-low border-none border-b-2 border-outline-variant focus:ring-0 focus:border-primary rounded-xl transition-all text-lg font-medium text-on-surface disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handlePreset(amt)}
                    className={
                      isPreset(amt)
                        ? 'px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-medium'
                        : 'px-4 py-2 rounded-full bg-surface-container-high text-primary text-sm font-medium hover:bg-primary hover:text-on-primary transition-all'
                    }
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              {budgetError && (
                <div className="p-4 rounded-xl bg-error-container/30 text-error text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {budgetError}
                </div>
              )}
              {budgetSuccess && (
                <div className="p-4 rounded-xl bg-secondary-container/40 text-on-secondary-container text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  {budgetSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDiscardBudget}
                  disabled={budgetSaving}
                  className="px-6 py-2 text-on-surface-variant font-semibold hover:bg-surface-container-high rounded-full transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  disabled={budgetSaving || loading}
                  className="px-8 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {budgetSaving ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </div>
          </section>

          {/* Dietary Preferences Section */}
          <section id="diet-section" className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-tertiary-container/20 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined">restaurant</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-on-surface">Dietary Preferences</h2>
                <p className="text-sm text-on-surface-variant">
                  Recipes containing restricted ingredients will be hidden from your recommendations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {Object.entries(prefLabels).map(([key, label]) => {
                const active = !!prefs[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePref(key)}
                    disabled={loading}
                    className={
                      active
                        ? 'flex items-center gap-3 p-4 rounded-xl bg-primary text-on-primary font-semibold transition-all'
                        : 'flex items-center gap-3 p-4 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-all'
                    }
                  >
                    <span
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        active ? 'bg-on-primary/20 border-on-primary' : 'bg-transparent border-outline-variant'
                      }`}
                    >
                      {active && <span className="material-symbols-outlined text-base">check</span>}
                    </span>
                    <span className="text-sm">{label}</span>
                  </button>
                )
              })}
            </div>

            {prefsError && (
              <div className="p-4 rounded-xl bg-error-container/30 text-error text-sm font-medium flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-base">error</span>
                {prefsError}
              </div>
            )}
            {prefsSuccess && (
              <div className="p-4 rounded-xl bg-secondary-container/40 text-on-secondary-container text-sm font-medium flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-base">check_circle</span>
                {prefsSuccess}
              </div>
            )}

            <p className="text-xs text-on-surface-variant mb-4">
              Note: filtering is based on ingredient names. Always double-check labels for allergens and exact dietary compliance.
            </p>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleSavePrefs}
                disabled={prefsSaving || loading}
                className="px-8 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {prefsSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
