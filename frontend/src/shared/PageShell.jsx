export default function PageShell({ eyebrow, title, subtitle, right, children, maxWidth = 'max-w-6xl' }) {
  return (
    <div className="min-h-screen bg-[#f4fbf6] pt-16">
      <div className={`w-full px-4 md:px-8 lg:px-14 py-8 ${maxWidth}`}>
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            {eyebrow && (
              <div className="text-xs font-medium tracking-[1.2px] uppercase text-[#5a7a68] mb-1">
                {eyebrow}
              </div>
            )}
            {title && (
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#0c1f14] tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-[#5a7a68] mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {right && <div className="flex-shrink-0">{right}</div>}
        </div>

        {children}
      </div>
    </div>
  )
}

