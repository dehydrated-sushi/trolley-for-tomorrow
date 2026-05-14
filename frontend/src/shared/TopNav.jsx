import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getUserProfile, isAuthenticated } from '../lib/auth'

const NAV_LINKS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Virtual Fridge', to: '/fridge' },
  { label: 'Meal Plans', to: '/meals' },
  { label: 'Cooked Meals', to: '/cooked-meals' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'Food Waste', to: '/food-waste' },
  { label: 'Shopping List', to: '/shopping' },
  { label: 'Upload Receipt', to: '/upload-receipt' },
  { label: 'Profile', to: '/profile' },
]

export default function TopNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const loggedIn = isAuthenticated()
  const [avatar, setAvatar] = useState(() => localStorage.getItem('profile_avatar_data') || '')
  const [userName, setUserName] = useState(() => getUserProfile()?.name || 'Profile')
  const [menuOpen, setMenuOpen] = useState(false)

  if (!loggedIn) {
    return null
  }

  useEffect(() => {
    const syncProfile = () => {
      setAvatar(localStorage.getItem('profile_avatar_data') || '')
      setUserName(getUserProfile()?.name || 'Profile')
    }

    syncProfile()
    window.addEventListener('profile-updated', syncProfile)
    window.addEventListener('focus', syncProfile)

    return () => {
      window.removeEventListener('profile-updated', syncProfile)
      window.removeEventListener('focus', syncProfile)
    }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  function handleLogout() {
    clearSession()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav shadow-sm">
      <div className="px-4 md:px-6 py-3 max-w-full mx-auto">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 md:gap-8 min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 transition-colors"
              aria-expanded={menuOpen}
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined text-[18px]">
                {menuOpen ? 'close' : 'menu'}
              </span>
              <span className="hidden sm:inline">Menu</span>
            </button>

          <Link to="/" className="text-xl font-bold text-emerald-900 tracking-tight font-headline">
            Trolley for Tomorrow
          </Link>
        </div>
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <Link
            to="/profile"
            className="flex items-center gap-2 rounded-full pl-2 pr-2 md:pr-3 py-1.5 hover:bg-emerald-100/50 transition-all duration-300 min-w-0"
          >
            <span className="h-9 w-9 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center border border-emerald-200">
              {avatar ? (
                <img src={avatar} alt={userName} className="h-full w-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-emerald-800">account_circle</span>
              )}
            </span>
            <span className="hidden md:block text-sm font-semibold text-emerald-900 max-w-[7rem] truncate">
              {userName}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 md:px-4 py-2 rounded-full bg-emerald-900 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>

        {menuOpen && (
          <div className="mt-3">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white/95 backdrop-blur px-3 py-3 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                {NAV_LINKS.map(({ label, to }) => (
                  <Link
                    key={to}
                    to={to}
                    className={
                      pathname === to
                        ? 'rounded-2xl bg-emerald-100 text-emerald-900 font-semibold px-4 py-3 text-sm transition-colors'
                        : 'rounded-2xl bg-emerald-50/60 text-emerald-800/80 hover:bg-emerald-100 hover:text-emerald-900 px-4 py-3 text-sm font-medium transition-colors'
                    }
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
