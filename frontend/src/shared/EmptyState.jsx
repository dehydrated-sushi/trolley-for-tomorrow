import { Link } from 'react-router-dom'

export default function EmptyState({ icon, title, description, primaryAction }) {
  return (
    <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-10 text-center">
      {icon && <div className="text-4xl mb-3 opacity-50">{icon}</div>}
      <div className="text-base font-medium text-[#0c1f14]">{title}</div>
      {description && (
        <p className="text-sm text-[#5a7a68] font-light leading-relaxed mt-2 max-w-md mx-auto">
          {description}
        </p>
      )}

      {primaryAction && (
        <div className="mt-5">
          {primaryAction.to ? (
            <Link
              to={primaryAction.to}
              className="inline-flex items-center justify-center bg-[#1e3d2a] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#2d5a3d] hover:-translate-y-px transition-all duration-150"
            >
              {primaryAction.label}
            </Link>
          ) : (
            <button
              onClick={primaryAction.onClick}
              className="inline-flex items-center justify-center bg-[#1e3d2a] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#2d5a3d] hover:-translate-y-px transition-all duration-150"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

