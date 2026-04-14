import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Fridge', to: '/fridge' },
  { label: 'Your Meals', to: '/meals' },
  { label: 'Shopping List', to: '/shopping' },
]

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('My Profile')

  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    const savedLogin = localStorage.getItem('isLoggedIn') === 'true'
    const token = localStorage.getItem('token')
    const savedProfile = localStorage.getItem('user_profile')

    setIsLoggedIn(savedLogin && !!token)

    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile)
        setUserName(profile.fullName || 'My Profile')
      } catch {
        setUserName('My Profile')
      }
    } else {
      setUserName('My Profile')
    }
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('token')
    localStorage.removeItem('user_profile')
    localStorage.removeItem('dashboard_budget')
    localStorage.removeItem('dashboard_expiringSoon')
    localStorage.removeItem('dashboard_mealsPlanned')
    localStorage.removeItem('dashboard_activity')

    setIsLoggedIn(false)
    setUserName('My Profile')
    setMenuOpen(false)
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0c1f14]/97 backdrop-blur-md border-b border-white/5">
      <div className="w-full px-4 md:px-8 lg:px-14">
        <div className="flex items-center h-16 gap-4">
          <Link to="/" className="flex-shrink-0">
            <span className="font-serif text-[19px] text-white tracking-tight">
              trolly-for-tomorrow<span className="text-[#5cad76]">Plan</span>
            </span>
          </Link>

          {isLoggedIn && (
            <div className="hidden lg:flex items-center gap-1 ml-8">
              {NAV_LINKS.map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm transition-all duration-150
                    ${isActive(to)
                      ? 'text-white bg-white/10'
                      : 'text-white/45 hover:text-white hover:bg-white/6'
                    }
                  `}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}

          <div className="hidden lg:flex items-center gap-2 ml-auto">
            {isLoggedIn ? (
              <>
                <Link
                  to="/profile"
                  className="text-sm text-white/85 px-4 py-2 rounded-lg border border-white/14 hover:bg-white/7 hover:text-white transition-all duration-150"
                >
                  {userName}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-[#0c1f14] bg-[#5cad76] px-5 py-2 rounded-full hover:bg-[#8dcca0] transition-all duration-150 hover:-translate-y-px"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-white/65 px-4 py-2 rounded-lg border border-white/14 hover:bg-white/7 hover:text-white transition-all duration-150"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-medium text-[#0c1f14] bg-[#5cad76] px-5 py-2 rounded-full hover:bg-[#8dcca0] transition-all duration-150 hover:-translate-y-px"
                >
                  Sign up free
                </Link>
              </>
            )}
          </div>

          <button
            className="lg:hidden ml-auto flex flex-col gap-[5px] p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block w-[22px] h-[2px] bg-white/65 rounded transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-[22px] h-[2px] bg-white/65 rounded transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-[22px] h-[2px] bg-white/65 rounded transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </div>

      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="px-4 pb-4 flex flex-col gap-1 border-t border-white/6">
          {isLoggedIn && NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`
                px-4 py-3 rounded-lg text-sm transition-all duration-150
                ${isActive(to)
                  ? 'text-white bg-white/10'
                  : 'text-white/55 hover:text-white hover:bg-white/6'
                }
              `}
            >
              {label}
            </Link>
          ))}

          <div className="flex gap-2 mt-3 pt-3 border-t border-white/6">
            {isLoggedIn ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center text-sm text-white/85 px-4 py-2.5 rounded-lg border border-white/14 hover:bg-white/7 hover:text-white transition-all"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex-1 text-center text-sm font-medium text-[#0c1f14] bg-[#5cad76] px-4 py-2.5 rounded-full hover:bg-[#8dcca0] transition-all"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center text-sm text-white/65 px-4 py-2.5 rounded-lg border border-white/14 hover:bg-white/7 hover:text-white transition-all"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center text-sm font-medium text-[#0c1f14] bg-[#5cad76] px-4 py-2.5 rounded-full hover:bg-[#8dcca0] transition-all"
                >
                  Sign up free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}