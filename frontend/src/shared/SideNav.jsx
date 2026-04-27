import { Link, useLocation } from 'react-router-dom'

const SIDE_LINKS = [
  { label: 'Dashboard',     icon: 'dashboard',       to: '/dashboard' },
  { label: 'Virtual Fridge', icon: 'kitchen',        to: '/fridge' },
  { label: 'Upload Receipt', icon: 'receipt_long',   to: '/upload-receipt' },
  { label: 'Meal Plans',    icon: 'restaurant_menu', to: '/meals' },
  { label: 'Waste Analytics', icon: 'monitoring',    to: '/waste-analytics' },
  { label: 'Shopping List', icon: 'shopping_basket', to: '/shopping' },
  { label: 'Profile',       icon: 'person',          to: '/profile' },
]

export default function SideNav() {
  const { pathname } = useLocation()

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 hidden lg:flex flex-col bg-emerald-50 border-r border-emerald-100/10 p-6 pt-24 gap-4 z-40">
      <nav className="flex flex-col gap-2">
        {SIDE_LINKS.map(({ label, icon, to }) => (
          <Link
            key={to}
            to={to}
            className={
              pathname === to
                ? 'flex items-center gap-3 p-3 bg-emerald-100 text-emerald-900 rounded-xl font-medium transition-all'
                : 'flex items-center gap-3 p-3 text-emerald-700/60 hover:translate-x-1 hover:bg-emerald-100/30 rounded-xl transition-all'
            }
          >
            <span
              className="material-symbols-outlined"
              style={pathname === to ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
            <span className="font-medium text-sm">{label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <Link
          to="/meals"
          className="block w-full text-center hero-gradient text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform"
        >
          Plan Weekly Meals
        </Link>
      </div>
    </aside>
  )
}
