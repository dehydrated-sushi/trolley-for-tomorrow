import { Link, useLocation } from 'react-router-dom'
import PageShell from '../../shared/PageShell'

export default function NotFoundPage() {
  const location = useLocation()

  return (
    <PageShell
      eyebrow="System"
      title="Page not found"
      subtitle={`No route matches "${location.pathname}".`}
      maxWidth="max-w-4xl"
    >
      <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-6">
        <div className="text-sm text-[#5a7a68] font-light">
          你可以回到首頁，或用上方導覽列前往其他功能頁。
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-[#1e3d2a] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#2d5a3d] hover:-translate-y-px transition-all duration-150"
          >
            Go home →
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center border border-[#cce4d6] text-[#2d4a38] text-sm font-medium px-5 py-2.5 rounded-full hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all duration-150"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

