export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-[#f4fbf6] pt-16">
      <div className="w-full px-4 md:px-8 lg:px-14 py-10">
        <div className="max-w-md mx-auto">
          <div className="bg-white border border-[#cce4d6] rounded-2xl px-6 py-6 shadow-sm">
            <div className="mb-5">
              <h1 className="font-serif text-3xl font-bold text-[#0c1f14] tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-[#5a7a68] font-light mt-1.5">
                  {subtitle}
                </p>
              )}
            </div>
            {children}
          </div>
          {footer && <div className="mt-4 text-center">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

