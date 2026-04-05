export default function FrozenCard({ icon, title, desc, preview, cracks }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-transform duration-200 hover:-translate-y-1"
      onClick={() => document.getElementById('unlockCta')?.scrollIntoView({ behavior: 'smooth' })}
    >
      {/* Card content — clearly visible underneath */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[148px]">
        <span className="text-xl block mb-2">{icon}</span>
        <div className="text-[13px] font-medium text-white/80 mb-1.5 leading-snug">{title}</div>
        <div className="text-[12px] text-white/42 leading-relaxed font-light">{desc}</div>
        {preview && <div className="mt-3">{preview}</div>}
      </div>

      {/* Ice overlay — very light frost, content still readable */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none">
        {/* Subtle glass */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#daf0f7]/8 via-[#a8d8ea]/5 to-[#5ba4bf]/7 backdrop-blur-[0.5px] group-hover:opacity-60 transition-opacity duration-200" />

        {/* Ice crack SVG */}
        {cracks && (
          <svg className="absolute inset-0 w-full h-full opacity-[0.13]" viewBox="0 0 200 148" fill="none">
            {cracks}
          </svg>
        )}

        {/* Corner frost crystals */}
        <div className="absolute top-2 left-3 w-2.5 h-2.5 rounded-full bg-white/40 blur-[1px] opacity-35" />
        <div className="absolute top-5 right-4 w-1.5 h-1.5 rounded-full bg-white/50 opacity-30" />
        <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-white/40 blur-[1px] opacity-32" />

        {/* Ice border */}
        <div className="absolute inset-0 rounded-2xl border border-[#a8d8ea]/25" />

        {/* Lock badge — top right */}
        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#daf0f7]/18 border border-[#a8d8ea]/35 flex items-center justify-center">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="rgba(218,240,247,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
      </div>
    </div>
  )
}