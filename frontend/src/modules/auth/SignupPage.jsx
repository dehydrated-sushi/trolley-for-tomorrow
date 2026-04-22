import { Link } from 'react-router-dom'

export default function SignupPage() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      <header className="fixed top-0 w-full z-50 glass-nav">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            <Link to="/" className="font-headline font-extrabold text-2xl tracking-tight text-on-surface">Trolley for Tomorrow</Link>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-on-surface-variant">
            <span>Already have an account?</span>
            <Link className="font-semibold text-primary hover:underline" to="/login">Log in</Link>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-6">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">
          {/* Left Side: Editorial Content */}
          <div className="hidden md:block space-y-8">
            <div className="space-y-4">
              <h2 className="font-headline text-5xl font-extrabold leading-tight text-on-surface">
                Nurture your home, <br />
                <span className="text-primary">sustainably.</span>
              </h2>
              <p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
                Join Trolley for Tomorrow and transform your grocery shopping into a mindful journey for your budget and the planet.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-6 rounded-xl space-y-3">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>kitchen</span>
                <h3 className="font-headline font-bold text-on-surface">Virtual Fridge</h3>
                <p className="text-xs text-on-surface-variant">Track inventory effortlessly and reduce food waste by 30%.</p>
              </div>
              <div className="bg-surface-container p-6 rounded-xl space-y-3">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                <h3 className="font-headline font-bold text-on-surface">Smart Receipts</h3>
                <p className="text-xs text-on-surface-variant">Auto-scan your Australian grocery receipts for instant tracking.</p>
              </div>
            </div>
            <div className="relative h-64 w-full rounded-xl overflow-hidden shadow-sm">
              <img className="w-full h-full object-cover" alt="vibrant organic pantry with glass jars of grains and fresh herbs in soft sunlight" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6Y3XY-K-EU_6jLaew4OVRCObBuW-e9qm3Z3rfiGO0255fZVgUaAb4AuQ7Ttho3kfClLjszWmXogsDDCTY8zeeMiNPT-Et4rOwcUyHLbxXw9_4vSqaNfS5yAYkGKvLr08v-wcRSqsUGJFeEGn3itMp7KkmQSN78R9jRAHKM3znYchZGzqlgHh6efxAQf4ZoP6yj1tpFpw5JomrZnp6k4Kqoydsoy7Oapis_BKg_qBNYktjyJ5C_lIfpZwA3W3PbJLP9bzuG6HQKUE" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                <p className="text-white font-medium italic">&ldquo;Trolley for Tomorrow turned my kitchen into a sanctuary of organization.&rdquo;</p>
                <p className="text-white/80 text-xs mt-1">&mdash; Sarah, Melbourne</p>
              </div>
            </div>
          </div>

          {/* Right Side: Registration Form */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-surface-container-lowest p-8 md:p-10 rounded-[2rem] shadow-sm">
              <div className="mb-8 text-center md:text-left">
                <h3 className="font-headline text-2xl font-bold text-on-surface">Create your account</h3>
                <p className="text-on-surface-variant text-sm mt-2">Start your 14-day premium trial today.</p>
              </div>
              <form className="space-y-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-on-surface-variant ml-1" htmlFor="name">FULL NAME</label>
                  <div className="relative group">
                    <input className="w-full bg-surface-container-low border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-on-surface transition-all rounded-t-lg" id="name" placeholder="John Citizen" type="text" />
                    <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-focus-within:w-full"></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-on-surface-variant ml-1" htmlFor="signup-email">EMAIL ADDRESS</label>
                  <div className="relative group">
                    <input className="w-full bg-surface-container-low border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-on-surface transition-all rounded-t-lg" id="signup-email" placeholder="hello@larder.au" type="email" />
                    <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-focus-within:w-full"></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="block text-xs font-semibold text-on-surface-variant" htmlFor="signup-password">PASSWORD</label>
                    <span className="text-[10px] text-tertiary font-medium">8+ characters required</span>
                  </div>
                  <div className="relative group">
                    <input className="w-full bg-surface-container-low border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-on-surface transition-all rounded-t-lg" id="signup-password" placeholder="••••••••" type="password" />
                    <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-focus-within:w-full"></div>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="material-symbols-outlined text-outline cursor-pointer text-sm">visibility</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-1">
                  <input className="mt-1 rounded-sm border-outline-variant text-primary focus:ring-primary h-4 w-4" id="terms" type="checkbox" />
                  <label className="text-xs text-on-surface-variant leading-relaxed" htmlFor="terms">
                    I agree to the <a className="text-primary underline" href="#">Terms of Service</a> and acknowledge the <a className="text-primary underline" href="#">Privacy Policy</a>.
                  </label>
                </div>
                <button className="w-full primary-gradient text-on-primary font-bold py-4 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2" type="submit">
                  <span>Register for Trolley for Tomorrow</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-container-high"></div></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-surface-container-lowest px-4 text-on-surface-variant font-medium">OR REGISTER WITH</span></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex items-center justify-center gap-2 bg-surface-container-low py-3 rounded-xl hover:bg-surface-container-high transition-colors text-sm font-medium" type="button">
                    <img alt="Google" className="w-4 h-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnud-EtSuL_GgFsCrZvJhPx4jS7PAzGCVKjbJT0aTAfumVEaYZBd2SQdeRUMacPRlSjXNMb22xQS3IfSDby-in1a2UFD4J725eMpgJbSnOn4CX29FZQeIFE_1mjmMHLvkNCkwA6UYeG8NE01hP6GJ5Y0pG0cEBrzd-zTfQVHvME3P2zP97hG16jOojh3bJU1ehw2DD55nsLptSIy4V_BTvIo_5y01CZGbWhmLYmwXCb3i4dSVQswFQvnLyuT5g9g-LVIq6sduXJPU" />
                    <span>Google</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-surface-container-low py-3 rounded-xl hover:bg-surface-container-high transition-colors text-sm font-medium" type="button">
                    <img alt="Apple" className="w-4 h-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDp5vXehjbmbb0KISxnMhXpMXFWuLpuoyw8EGj9viHO2MEis7RlGNCeHVULAMV9l7bWA9M4XkUXYHn0RZYTJlbjSlRobehkNQwSbo4mcFdsPLOQnlVuc6w60vHL86gSZtZD2jeYahfcDlvDU8Ntj1G9ln7PY-l68UWRtcn-aauVnBQCqdeXza4NKbtcBdQV-JLa5ZCCynet11LbZixdst7JIr1Ppo5ge6B2-J0f378DeP1goYTTV1Ub6O-Wj1k7KevxQFNHU8wGIEg" />
                    <span>Apple</span>
                  </button>
                </div>
              </form>
              <div className="mt-8 text-center md:hidden">
                <p className="text-sm text-on-surface-variant">
                  Already have an account? <Link className="text-primary font-bold" to="/login">Log in</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-12 px-6 mt-auto bg-emerald-900 text-emerald-50 text-xs uppercase tracking-widest border-t border-emerald-800/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <span className="font-black text-emerald-100">Trolley for Tomorrow</span>
            <span className="hidden md:inline opacity-30">|</span>
            <p className="normal-case tracking-normal opacity-80">&copy; 2024 Trolley for Tomorrow. Nurturing Australian Kitchens.</p>
          </div>
          <div className="flex gap-6">
            <a className="text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Privacy Policy</a>
            <a className="text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Support</a>
            <a className="text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Feedback</a>
            <a className="text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Community Guidelines</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
