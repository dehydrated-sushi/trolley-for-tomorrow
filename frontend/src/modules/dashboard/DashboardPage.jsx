import { Link } from 'react-router-dom'
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

export default function DashboardPage() {
  return (
    <PageShell
      eyebrow="Overview"
      title="Dashboard"
      subtitle="Quick snapshot of your week. (MVP UI — will be wired to API later.)"
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
        <StatCard label="Expiring soon" value="3" hint="Use these first" />
        <StatCard label="Budget remaining" value="$42.10" hint="This week" />
        <StatCard label="Meals planned" value="0" hint="Generate a plan" />
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
              Set your weekly budget
            </Link>
          </div>
        </div>

        <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-5">
          <div className="text-xs font-medium tracking-[1px] uppercase text-[#5a7a68] mb-3">
            Activity
          </div>
          <div className="text-sm text-[#5a7a68] font-light">
            No activity yet. Add items to your fridge or generate meals to start seeing insights here.
          </div>
        </div>
      </div>
    </PageShell>
  )
}

