import { Link, useLocation } from 'react-router-dom'

const TABS = [
  { label: 'HOME', icon: 'dashboard', to: '/dashboard' },
  { label: 'FRIDGE', icon: 'kitchen', to: '/fridge' },
  { label: 'MEALS', icon: 'restaurant_menu', to: '/meals' },
  { label: 'COOKED', icon: 'room_service', to: '/cooked-meals' },
  { label: 'STATS', icon: 'query_stats', to: '/analytics' },
  { label: 'SHOP', icon: 'shopping_basket', to: '/shopping' },
  { label: 'PROFILE', icon: 'person', to: '/profile' },
]

export default function MobileBottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-xl border-t border-outline-variant/10 z-50 px-3 py-3">
      <div className="flex justify-between items-center gap-2 overflow-x-auto">
        {TABS.map(({ label, icon, to }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-1 ${
              pathname === to ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={pathname === to ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
            <span className="text-[10px] font-bold">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
