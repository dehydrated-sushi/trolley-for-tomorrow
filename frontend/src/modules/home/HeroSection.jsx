import { Link } from 'react-router-dom'

const FRIDGE_PREVIEW = [
  {
    icon: '🧊',
    title: 'Virtual Fridge',
    content: (
      <div className="flex flex-col gap-2 mt-2">
        {[
          { name: 'Whole Milk',   days: '1 day',  color: 'bg-red-900/40 text-red-300'   },
          { name: 'Spinach',      days: '2 days', color: 'bg-amber-900/40 text-amber-300'},
          { name: 'Brown Rice',   days: '7 days', color: 'bg-green-900/40 text-green-300'},
        ].map(({ name, days, color }) => (
          <div key={name} className="flex items-center justify-between">
            <span className="text-white/55 text-xs">{name}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color}`}>{days}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: '💰',
    title: 'Budget tracker',
    content: (
      <div className="mt-2">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-[82%] bg-gradient-to-r from-[#3e7a52] to-[#5cad76] rounded-full" />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-white/30 text-[10px]">Spent $84.60</span>
          <span className="text-white/30 text-[10px]">$100 limit</span>
        </div>
      </div>
    ),
  },
]

const NUTRITION_CHIPS = [
  { label: 'Protein',      bg: 'bg-teal-900/50',   text: 'text-teal-300'   },
  { label: 'Grains',       bg: 'bg-amber-900/50',  text: 'text-amber-300'  },
  { label: 'Vegetables',   bg: 'bg-purple-900/50', text: 'text-purple-300' },
  { label: 'Healthy Fats', bg: 'bg-blue-900/50',   text: 'text-blue-300'   },
  { label: 'Fruits',       bg: 'bg-pink-900/50',   text: 'text-pink-300'   },
]


export default function HeroSection() {
  return (
    <section className="min-h-screen bg-[#0c1f14] flex items-center relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#5cad76]/10 blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-[#5cad76]/6 blur-[90px] pointer-events-none" />

      <div className="w-full px-4 md:px-8 lg:px-14 py-24 lg:py-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── LEFT: copy ── */}
          <div>
            {/* Kicker badge */}
            <div className="inline-flex items-center gap-2 bg-[#5cad76]/14 border border-[#5cad76]/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5cad76] animate-pulse" />
              <span className="text-[#8dcca0] text-xs font-medium tracking-wide">
                Free for Australian households
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white leading-[1.07] tracking-tight mb-5">
              Your fridge,<br />
              <em className="not-italic text-[#5cad76]">zero waste.</em><br />
              Every week.
            </h1>

            {/* Subtext */}
            <p className="text-white/45 text-base md:text-lg leading-relaxed font-light max-w-md mb-8">
              Tell us what you have. We'll plan your meals, track your budget,
              and make sure nothing goes to waste.
            </p>

            {/* CTA buttons */}
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                to="#demo"
                className="inline-flex items-center gap-2 bg-[#5cad76] text-[#0c1f14] font-medium text-[15px] px-7 py-3.5 rounded-full hover:bg-[#8dcca0] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(92,173,118,0.28)] transition-all duration-200"
              >
                Try it now — free
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-3.293-3.293a1 1 0 011.414-1.414l4 4z" />
                </svg>
              </Link>
              <button
                onClick={() => document.getElementById('frozen')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 text-white/40 text-sm hover:text-white/75 transition-colors duration-150 bg-transparent border-none cursor-pointer"
              >
                See all features
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </button>
            </div>

            
          </div>

          {/* ── RIGHT: fridge preview cards ── */}
          <div className="hidden lg:grid grid-cols-2 gap-3">

            {/* Card 1 & 2 */}
            {FRIDGE_PREVIEW.map(({ icon, title, content }) => (
              <div
                key={title}
                className="bg-white/4 border border-white/8 rounded-2xl p-4 hover:bg-white/7 hover:border-[#5cad76]/25 transition-all duration-200"
              >
                <div className="text-xl mb-2">{icon}</div>
                <div className="text-white/75 text-sm font-medium mb-1">{title}</div>
                {content}
              </div>
            ))}

            {/* Nutrition chip card — spans full width */}
            <div className="col-span-2 bg-white/4 border border-white/8 rounded-2xl p-4 hover:bg-white/7 hover:border-[#5cad76]/25 transition-all duration-200">
              <div className="text-xl mb-2">🎨</div>
              <div className="text-white/75 text-sm font-medium mb-3">Nutrition colour coding</div>
              <div className="flex flex-wrap gap-1.5">
                {NUTRITION_CHIPS.map(({ label, bg, text }) => (
                  <span key={label} className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${bg} ${text}`}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}