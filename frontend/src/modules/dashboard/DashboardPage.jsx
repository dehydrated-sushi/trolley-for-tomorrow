import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api'

export default function DashboardPage() {
  const [fridgeCount, setFridgeCount] = useState(0)
  const [loadingFridge, setLoadingFridge] = useState(true)
  const [budgetStatus, setBudgetStatus] = useState(null)
  const [loadingBudget, setLoadingBudget] = useState(true)

  useEffect(() => {
    async function loadAll() {
      try {
        const [fridge, budget] = await Promise.all([
          apiFetch('/api/fridge/items').catch(() => ({ items: [] })),
          apiFetch('/api/profile/budget-status').catch(() => null),
        ])
        setFridgeCount((fridge.items || []).length)
        setBudgetStatus(budget)
      } finally {
        setLoadingFridge(false)
        setLoadingBudget(false)
      }
    }
    loadAll()
  }, [])

  const budget = budgetStatus?.budget
  const spent = budgetStatus?.spent_this_week ?? 0
  const remaining = budgetStatus?.remaining
  const hasBudget = budget != null
  const overBudget = hasBudget && remaining != null && remaining < 0
  const pctUsed =
    hasBudget && budget > 0 ? Math.min(100, Math.max(0, (spent / budget) * 100)) : 0

  return (
    <div className="px-6 md:px-10 max-w-7xl mx-auto">
      {/* Hero */}
      <header className="mb-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-emerald-900 p-8 md:p-12 text-white shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <span className="text-emerald-300 font-headline font-bold uppercase tracking-widest text-xs mb-4 block">
              Your Kitchen Dashboard
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold font-headline mb-6 leading-tight">
              Welcome Back
            </h1>
            <p className="text-emerald-100/80 text-lg">
              {loadingFridge
                ? 'Loading your kitchen data...'
                : fridgeCount > 0
                  ? `You have ${fridgeCount} items in your fridge. Let's make something delicious!`
                  : 'Your fridge is empty. Upload a receipt to get started!'}
            </p>
          </div>
        </div>
      </header>

      {/* Over-budget warning */}
      {overBudget && (
        <div className="mb-6 p-5 rounded-2xl bg-error-container/30 border-l-4 border-error flex items-start gap-4">
          <span className="material-symbols-outlined text-error text-2xl flex-shrink-0">warning</span>
          <div className="flex-grow">
            <h4 className="font-bold text-error mb-1">You&apos;re over budget this week</h4>
            <p className="text-sm text-on-surface-variant">
              You&apos;ve spent <span className="font-semibold text-error">${spent.toFixed(2)}</span>,
              which is <span className="font-semibold text-error">${Math.abs(remaining).toFixed(2)}</span> over
              your <span className="font-semibold">${budget.toFixed(2)}</span> weekly budget.
            </p>
          </div>
          <Link
            to="/profile"
            className="flex-shrink-0 px-5 py-2 rounded-full bg-surface-container-high text-primary text-sm font-semibold hover:bg-surface-container-highest transition-colors"
          >
            Adjust budget
          </Link>
        </div>
      )}

      {/* Bento Grid: fridge, meals, receipt, budget */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Link to="/fridge" className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-secondary-container rounded-2xl">
              <span className="material-symbols-outlined text-on-secondary-container">kitchen</span>
            </div>
          </div>
          <h3 className="text-on-surface-variant font-headline font-semibold mb-1 text-sm">Fridge Items</h3>
          <p className="text-3xl font-extrabold text-on-surface font-headline">
            {loadingFridge ? '...' : fridgeCount}
          </p>
          <span className="mt-3 text-primary font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
            View fridge <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </Link>

        <Link to="/meals" className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-tertiary-container/20 rounded-2xl">
              <span className="material-symbols-outlined text-tertiary">restaurant_menu</span>
            </div>
          </div>
          <h3 className="text-on-surface-variant font-headline font-semibold mb-1 text-sm">Meal Suggestions</h3>
          <p className="text-3xl font-extrabold text-on-surface font-headline">
            {fridgeCount > 0 ? 'Ready' : '--'}
          </p>
          <span className="mt-3 text-primary font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
            View meals <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </Link>

        <Link to="/upload-receipt" className="bg-surface-container-low p-6 rounded-[2rem] border border-outline-variant/15 flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div>
            <div className="p-3 bg-primary/10 rounded-2xl inline-block mb-4">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
            </div>
            <h3 className="text-on-surface-variant font-headline font-semibold mb-1 text-sm">Upload Receipt</h3>
            <p className="text-on-surface-variant/70 text-xs">Scan a receipt to add items.</p>
          </div>
          <span className="mt-4 text-primary font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
            Upload now <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </Link>

        {/* Budget widget */}
        <Link
          to="/profile"
          className={`p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group ${
            overBudget
              ? 'bg-error-container/20 border border-error/20'
              : 'bg-surface-container-lowest'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${overBudget ? 'bg-error/10' : 'bg-primary/10'}`}>
              <span className={`material-symbols-outlined ${overBudget ? 'text-error' : 'text-primary'}`}>
                savings
              </span>
            </div>
            {hasBudget && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                overBudget
                  ? 'bg-error/20 text-error'
                  : pctUsed >= 80
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-primary/10 text-primary'
              }`}>
                {Math.round(pctUsed)}%
              </span>
            )}
          </div>
          <h3 className="text-on-surface-variant font-headline font-semibold mb-1 text-sm">
            {hasBudget ? 'This Week' : 'Weekly Budget'}
          </h3>

          {loadingBudget ? (
            <p className="text-3xl font-extrabold text-on-surface font-headline">...</p>
          ) : hasBudget ? (
            <>
              <p className={`text-3xl font-extrabold font-headline ${
                overBudget ? 'text-error' : 'text-on-surface'
              }`}>
                ${remaining.toFixed(2)}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                {overBudget
                  ? `over · spent $${spent.toFixed(2)} of $${budget.toFixed(2)}`
                  : `remaining · $${spent.toFixed(2)} of $${budget.toFixed(2)} spent`}
              </p>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full rounded-full bg-on-surface/10 overflow-hidden">
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
            </>
          ) : (
            <>
              <p className="text-2xl font-extrabold text-on-surface font-headline">Not set</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Set a weekly budget to track receipt spending.
              </p>
            </>
          )}

          <span className="mt-3 text-primary font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
            {hasBudget ? 'Edit budget' : 'Set budget'}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </Link>
      </div>

      {/* Quick Actions + Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <h2 className="text-2xl font-bold font-headline text-emerald-900 px-2">Quick Actions</h2>
          <div className="bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-sm">
            <div className="divide-y divide-transparent">
              <Link to="/upload-receipt" className="p-6 flex items-center gap-6 hover:bg-surface-container-low transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-emerald-700">add_shopping_cart</span>
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-on-surface">Upload a Receipt</h4>
                  <p className="text-sm text-on-surface-variant">Scan and add grocery items to your virtual fridge</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </Link>
              <Link to="/fridge" className="p-6 flex items-center gap-6 hover:bg-surface-container-low transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-secondary">kitchen</span>
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-on-surface">View Your Fridge</h4>
                  <p className="text-sm text-on-surface-variant">See all items currently in your inventory</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </Link>
              <Link to="/meals" className="p-6 flex items-center gap-6 hover:bg-surface-container-low transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-tertiary-container/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-tertiary">restaurant_menu</span>
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-on-surface">Get Meal Recommendations</h4>
                  <p className="text-sm text-on-surface-variant">AI-powered recipes based on your fridge contents</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold font-headline text-emerald-900 px-2">Trolley Tips</h2>
          <div className="bg-emerald-900 rounded-[2rem] p-6 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <span className="material-symbols-outlined text-emerald-300 mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
              <h4 className="text-xl font-bold font-headline mb-2 leading-tight">Revive Your Greens</h4>
              <p className="text-emerald-100/70 text-sm mb-4">Limp celery or carrots? Soak them in ice water for 30 minutes to bring back the crunch.</p>
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <span className="material-symbols-outlined text-9xl">eco</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-[2rem] p-6 shadow-sm border border-primary/10">
            <h4 className="font-bold text-on-surface mb-3">How it works</h4>
            <div className="space-y-3 text-sm text-on-surface-variant">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <p>Upload your grocery receipt</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <p>OCR scans and adds items to your fridge</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <p>Receipt prices deduct from your weekly budget automatically</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
