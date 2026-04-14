import { useBudget } from './useBudget'
import BudgetInput from './BudgetInput'

// Mock user info — replace with auth context later
const USER = {
  name: 'user',
  email: 'user@example.com',
  location: 'Melbourne, VIC',
  initials: 'U',
}

export default function ProfileForm() {
  const {
    budget,
    spent,
    remaining,
    spentPct,
    isOver,
    saved,
    error,
    handleChange,
    handleSave,
  } = useBudget()

  return (
    <div className="min-h-screen bg-[#f4fbf6] pt-16">
      <div className="w-full px-4 md:px-8 lg:px-14 py-8 max-w-2xl">
        {/* ── Page header ── */}
        <div className="mb-8">
          <div className="text-xs font-medium tracking-[1.2px] uppercase text-[#5a7a68] mb-1">
            Account
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#0c1f14] tracking-tight">
            My Profile
          </h1>
        </div>

        {/* ── User info card ── */}
        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#5cad76] to-[#3e7a52] flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
            {USER.initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-[#0c1f14]">{USER.name}</div>
            <div className="text-sm text-[#5a7a68] mt-0.5">{USER.email}</div>
            <div className="text-xs text-[#5a7a68] mt-0.5">{USER.location}</div>
          </div>

          <button className="text-xs text-[#5a7a68] border border-[#cce4d6] rounded-lg px-3 py-1.5 hover:bg-[#f4fbf6] hover:border-[#5cad76] transition-all flex-shrink-0">
            Edit
          </button>
        </div>

        {/* ── Budget section ── */}
        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5 mb-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-4">
            Weekly Budget
          </div>

          <BudgetInput
            value={budget}
            error={error}
            saved={saved}
            onChange={handleChange}
            onSave={handleSave}
          />

          {/* Budget summary — only shown when budget is set */}
          {budget && Number(budget) > 0 && (
            <div className="mt-5 pt-5 border-t border-[#e0ede4]">
              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#f4fbf6] rounded-xl px-4 py-3">
                  <div className="text-xs text-[#5a7a68] mb-1">Weekly budget</div>
                  <div className="font-serif text-2xl font-bold text-[#0c1f14]">
                    ${Number(budget).toFixed(2)}
                  </div>
                </div>

                <div className="bg-[#f4fbf6] rounded-xl px-4 py-3">
                  <div className="text-xs text-[#5a7a68] mb-1">Remaining</div>
                  <div
                    className={`font-serif text-2xl font-bold ${
                      isOver ? 'text-red-500' : 'text-[#3e7a52]'
                    }`}
                  >
                    {isOver ? '-' : ''}${remaining}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-[#5a7a68] mb-1.5">
                  <span>Spent ${spent.toFixed(2)}</span>
                  <span>Budget ${Number(budget).toFixed(2)}</span>
                </div>

                <div className="h-2 bg-[#e8f5ed] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver
                        ? 'bg-red-400'
                        : 'bg-gradient-to-r from-[#3e7a52] to-[#5cad76]'
                    }`}
                    style={{ width: `${spentPct}%` }}
                  />
                </div>

                {isOver && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">
                    ⚠ You've exceeded your weekly budget
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Preferences section (placeholder) ── */}
        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5 mb-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-4">
            Dietary Preferences
          </div>

          <div className="flex flex-wrap gap-2">
            {['Vegetarian', 'Vegan', 'Gluten free', 'Dairy free', 'Nut free', 'Halal'].map((pref) => (
              <button
                key={pref}
                className="text-xs px-3.5 py-1.5 rounded-full border border-[#cce4d6] text-[#5a7a68] hover:border-[#5cad76] hover:text-[#2d4a38] hover:bg-[#f4fbf6] transition-all"
              >
                {pref}
              </button>
            ))}
          </div>

          <p className="text-xs text-[#5a7a68] font-light mt-3">
            Coming soon — dietary preferences will filter your meal recommendations.
          </p>
        </div>

        {/* ── Danger zone ── */}
        <div className="bg-white border border-red-100 rounded-2xl px-6 py-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-red-400 mb-4">
            Account
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[#0c1f14]">Sign out</div>
              <div className="text-xs text-[#5a7a68] font-light mt-0.5">
                Sign out of your trolley for tomorrow account
              </div>
            </div>

            <button className="text-xs text-red-500 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}