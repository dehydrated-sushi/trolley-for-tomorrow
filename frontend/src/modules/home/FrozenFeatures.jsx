import { Link } from 'react-router-dom'
import FrozenCard from './FrozenCard'

const FEATURES = [
  {
    icon: '📅',
    title: 'Weekly Meal Planner',
    desc: '7-day plan around your fridge, budget, and what expires soonest.',
    preview: (
      <div className="flex flex-col gap-1">
        <div className="h-[3px] rounded-full bg-white/15 w-[90%]" />
        <div className="h-[3px] rounded-full bg-white/15 w-[70%]" />
        <div className="h-[3px] rounded-full bg-white/15 w-[50%]" />
      </div>
    ),
    cracks: (
      <>
        <path d="M20 15 L55 48 L42 68 L78 100 L68 130" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <path d="M55 48 L90 42 L112 60" stroke="white" strokeWidth=".7" strokeLinecap="round" />
        <path d="M150 8 L168 38 L154 62 L178 90" stroke="white" strokeWidth=".8" strokeLinecap="round" />
      </>
    ),
  },
  {
    icon: '📷',
    title: 'Receipt Scanning',
    desc: 'Scan any grocery receipt QR or barcode — whole shop imported instantly.',
    preview: (
      <div className="flex flex-wrap gap-1">
        {['Chicken 500g', 'Rice 1kg', '+ 8 more'].map(t => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/45">{t}</span>
        ))}
      </div>
    ),
    cracks: (
      <>
        <path d="M100 4 L80 44 L95 60 L72 105 L88 138" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <path d="M80 44 L52 38 L36 60" stroke="white" strokeWidth=".7" strokeLinecap="round" />
        <path d="M95 60 L124 55 L140 74 L130 105" stroke="white" strokeWidth=".65" strokeLinecap="round" />
      </>
    ),
  },
  {
    icon: '⏰',
    title: 'Expiry Alerts',
    desc: 'Get notified before items expire. Recipes prioritise them automatically.',
    preview: (
      <div className="flex flex-wrap gap-1">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-300/80">Milk — 1 day</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-300/80">Spinach — 2 days</span>
      </div>
    ),
    cracks: (
      <>
        <path d="M178 22 L146 52 L160 74 L124 112 L140 138" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <path d="M146 52 L118 46 L104 68" stroke="white" strokeWidth=".7" strokeLinecap="round" />
        <path d="M28 12 L50 42 L38 68 L58 96" stroke="white" strokeWidth=".8" strokeLinecap="round" />
      </>
    ),
  },
  {
    icon: '🛒',
    title: 'Smart Shopping List',
    desc: 'Buy only what\'s missing. Auto-generated from your meal plan.',
    preview: (
      <div className="flex flex-col gap-1">
        <div className="h-[3px] rounded-full bg-white/15 w-full" />
        <div className="h-[3px] rounded-full bg-white/15 w-[78%]" />
        <div className="h-[3px] rounded-full bg-white/15 w-[58%]" />
      </div>
    ),
    cracks: (
      <>
        <path d="M44 8 L66 44 L50 66 L80 104" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <path d="M66 44 L96 38 L114 56" stroke="white" strokeWidth=".7" strokeLinecap="round" />
        <path d="M152 14 L172 48 L158 70 L182 104 L170 130" stroke="white" strokeWidth=".85" strokeLinecap="round" />
      </>
    ),
  },
  {
    icon: '🌱',
    title: 'Eco Impact Score',
    desc: 'Track waste diverted, water saved, and your community eco ranking.',
    preview: (
      <div className="flex items-center gap-2">
        <span className="font-serif text-2xl font-bold text-white/55 leading-none">88</span>
        <div className="flex-1">
          <div className="h-[3px] rounded-full bg-white/15 w-full mb-1" />
          <div className="text-[10px] text-white/35">Top 15% locally</div>
        </div>
      </div>
    ),
    cracks: (
      <>
        <path d="M96 4 L116 38 L100 58 L128 92 L112 124 L128 138" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <path d="M116 38 L142 32 L156 50 L146 74" stroke="white" strokeWidth=".7" strokeLinecap="round" />
        <path d="M22 30 L44 60 L30 82" stroke="white" strokeWidth=".75" strokeLinecap="round" />
      </>
    ),
  },
  {
    icon: '👨‍🍳',
    title: 'Cooking Guides',
    desc: 'Cooking methods and prep times for every ingredient, right in the app.',
    preview: (
      <div className="flex flex-wrap gap-1">
        {['Pan-fry 10m', 'Bake 28m', 'Steam 20m'].map(t => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/45">{t}</span>
        ))}
      </div>
    ),
    cracks: (
      <>
        <path d="M14 44 L40 74 L26 96 L48 122" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <path d="M40 74 L70 66 L88 84 L76 110" stroke="white" strokeWidth=".72" strokeLinecap="round" />
        <path d="M148 10 L166 44 L150 70 L174 100 L188 128" stroke="white" strokeWidth=".85" strokeLinecap="round" />
      </>
    ),
  },
]

const UNLOCK_LIST = [
  'Weekly meal planner',
  'Receipt scanning',
  'Expiry alerts',
  'Smart shopping list',
  'Eco impact score',
  'Cooking guides',
]

export default function FrozenFeatures() {
  return (
    <section id="frozen" className="py-20 md:py-28 bg-[#152b1e] relative overflow-hidden">
      {/* Subtle frost bg */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-[20%] w-[400px] h-[400px] rounded-full bg-[#a8d8ea]/5 blur-[80px]" />
        <div className="absolute bottom-0 right-[15%] w-[300px] h-[300px] rounded-full bg-[#a8d8ea]/4 blur-[80px]" />
      </div>

      <div className="w-full px-4 md:px-8 lg:px-14 relative z-10">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-xs font-medium tracking-[1.5px] uppercase text-[#a8d8ea] mb-2.5">
            More features
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight">
            There's so much more<br />waiting for you
          </h2>
          <p className="text-white/35 text-base font-light leading-relaxed mt-3 max-w-md mx-auto">
            These powerful features are ready — just sign up to unlock them.
          </p>
        </div>

        {/* 4-column frozen grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto mb-16">
          {FEATURES.map(f => (
            <FrozenCard key={f.title} {...f} />
          ))}
        </div>

        {/* ── Central unlock CTA ── */}
        <div id="unlockCta" className="text-center max-w-lg mx-auto">

          {/* Big lock visual */}
          <div className="inline-flex flex-col items-center mb-8 relative">
            {/* Pulse rings */}
            <div className="absolute inset-[-16px] rounded-3xl border border-[#a8d8ea]/20 animate-ping opacity-30" style={{ animationDuration: '2.5s' }} />
            <div className="absolute inset-[-28px] rounded-[36px] border border-[#a8d8ea]/10 animate-ping opacity-20" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />

            {/* Shackle */}
            <div className="w-12 h-8 border-[5px] border-[#a8d8ea]/35 border-b-0 rounded-t-3xl mb-[-1px]" />

            {/* Lock body */}
            <div className="w-20 h-[72px] rounded-2xl bg-gradient-to-br from-[#daf0f7]/20 to-[#5ba4bf]/15 border border-[#a8d8ea]/40 flex items-center justify-center relative shadow-[0_0_0_8px_rgba(168,216,234,0.05),0_0_0_16px_rgba(168,216,234,0.03)]">
              {/* Ice drips */}
              <div className="absolute bottom-[-10px] left-4 w-1.5 h-3 bg-gradient-to-b from-[#a8d8ea]/50 to-transparent rounded-b-full" />
              <div className="absolute bottom-[-7px] left-8 w-1 h-2 bg-gradient-to-b from-[#a8d8ea]/40 to-transparent rounded-b-full" />
              <div className="absolute bottom-[-12px] left-12 w-1.5 h-3.5 bg-gradient-to-b from-[#a8d8ea]/50 to-transparent rounded-b-full" />

              {/* Temperature badge */}
              <div className="absolute -top-3 -right-10 flex items-center gap-1 bg-[#a8d8ea]/15 border border-[#a8d8ea]/30 rounded-full px-2 py-0.5">
                <span className="text-[11px] font-medium text-[#a8d8ea]">−18°C</span>
              </div>

              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="rgba(218,240,247,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
          </div>

          <h3 className="font-serif text-3xl md:text-4xl text-white mb-3 leading-tight mt-4">
            These features are<br />
            <em className="not-italic text-[#a8d8ea]">frozen</em> — for now
          </h3>
          <p className="text-white/35 text-base font-light leading-relaxed mb-8 max-w-sm mx-auto">
            Create your free account to unlock all 6 features instantly. No credit card, no catch.
          </p>

          {/* Unlock button */}
          <Link
            to="/signup"
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#5cad76] to-[#3e7a52] text-white font-medium text-base px-9 py-4 rounded-full hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(92,173,118,0.35)] transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Unlock everything — it's free
          </Link>

          <div className="text-white/20 text-xs mt-3 mb-8">
            No credit card · Free forever for basics
          </div>

          {/* Feature checklist */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {UNLOCK_LIST.map(item => (
              <div key={item} className="flex items-center gap-1.5 text-white/40 text-sm">
                <svg className="w-3.5 h-3.5 text-[#5cad76] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
                {item}
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}