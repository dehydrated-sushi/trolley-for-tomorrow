import { Link, useLocation } from 'react-router-dom'


const NAV_LINKS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Virtual Fridge', to: '/fridge' },
  { label: 'Meal Plans', to: '/meals' },
  { label: 'Shopping List', to: '/shopping' },
]

export default function TopNav() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav shadow-sm">
      <div className="flex justify-between items-center px-6 py-3 max-w-full mx-auto">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold text-emerald-900 tracking-tight font-headline">
            Trolley for Tomorrow
          </Link>
          <div className="hidden md:flex gap-6 items-center">
            {NAV_LINKS.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className={
                  pathname === to
                    ? 'text-emerald-700 border-b-2 border-emerald-600 font-semibold px-1 py-1 transition-all duration-300 text-sm'
                    : 'text-emerald-600/70 hover:text-emerald-800 transition-all duration-300 px-1 py-1 text-sm font-medium'
                }
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          
          <Link to="/profile" className="p-2 rounded-lg hover:bg-emerald-100/50 transition-all duration-300">
            <span className="material-symbols-outlined text-emerald-800">account_circle</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
