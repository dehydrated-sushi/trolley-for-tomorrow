import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Dashboard',      to: '/dashboard' },
  { label: 'Your Meals',     to: '/meals'     },
  { label: 'Fridge',         to: '/fridge'    },
  { label: 'Shopping List',  to: '/shopping'  },
]

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0c1f14]/97 backdrop-blur-md border-b border-white/5">
      <div className="w-full px-4 md:px-8 lg:px-14">
        <div className="flex items-center h-16 gap-4">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <span className="font-serif text-[19px] text-white tracking-tight">
              Nutri<span className="text-[#5cad76]">Plan</span>
            </span>
          </Link>

          {/* Desktop nav links */}
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

          {/* Desktop right buttons */}
          <div className="hidden lg:flex items-center gap-2 ml-auto">
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
          </div>

          {/* Mobile hamburger */}
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

      {/* Mobile dropdown menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="px-4 pb-4 flex flex-col gap-1 border-t border-white/6">
          {NAV_LINKS.map(({ label, to }) => (
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

          {/* Mobile auth buttons */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/6">
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
          </div>
        </div>
      </div>
    </nav>
  )
}