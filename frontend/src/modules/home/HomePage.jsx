import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import HeroDemo from './HeroDemo'
import HowItWorksModal from './HowItWorksModal'
import PrivacyPolicyModal from '../../shared/PrivacyPolicyModal'
import MadeByModal from '../../shared/MadeByModal'

// Shared easing for all entrance animations — matches HeroDemo.
const EASE = [0.22, 1, 0.36, 1]

// Parent container: staggers its direct children.
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

// Child item: fades up with a small y-translate.
const riseIn = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
}

// Animated <Link> — lets each feature card be both clickable AND part of the
// stagger animation. framer-motion v12 uses motion.create(Component).
const MotionLink = motion.create(Link)

// Snappy lift-on-hover used by every clickable card.
const hoverLift = { y: -6, transition: { type: 'spring', stiffness: 380, damping: 26 } }

export default function HomePage() {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [madeByOpen, setMadeByOpen] = useState(false)

  return (
    <>
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 glass-nav shadow-sm">
        <div className="flex justify-between items-center px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold text-emerald-900 tracking-tight">Trolley for Tomorrow</span>
            <div className="hidden md:flex gap-6 items-center">
              <Link className="text-emerald-700 border-b-2 border-emerald-600 font-semibold px-1 py-1 transition-all duration-300" to="/dashboard">Dashboard</Link>
              <Link className="text-emerald-600/70 hover:text-emerald-800 transition-all duration-300 px-1 py-1" to="/fridge">Virtual Fridge</Link>
              <Link className="text-emerald-600/70 hover:text-emerald-800 transition-all duration-300 px-1 py-1" to="/meals">Meal Plans</Link>
              <Link className="text-emerald-600/70 hover:text-emerald-800 transition-all duration-300 px-1 py-1" to="/shopping">Shopping List</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <input className="bg-surface-container-low border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-primary transition-all w-64" placeholder="Search recipes..." type="text" />
            </div>
            <Link to="/profile" className="material-symbols-outlined text-emerald-800 p-2 hover:bg-emerald-100/50 rounded-lg transition-all">account_circle</Link>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[870px] flex items-center overflow-hidden bg-[#0c1f14]">
          <div className="absolute inset-0 opacity-40 mix-blend-overlay">
            <img className="w-full h-full object-cover" alt="moody close-up of fresh organic leafy greens and herbs on a dark rustic kitchen counter with dramatic sunlight" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBWuaA-4fulG06Tz8q33VpG975SAaEy0vq2NT32ymngAwGpktDFNN9eYXmIGUwkYfKYkL-7RVUZADwVBxpxaABu8ACDJ_FqJIb_z2tZ5L8N3DbG3ceV7f5Ek4LDN35MI5uUCCjHTq4OEYF_Vz_5HUK_rf583XrJDZKxyi1TT7QaINAcxA3-YzGltvpjKGa2MHDh5l3oaRGYoP1jGvumGjblNDUQmtozZlDTMI956fopg4MJYcCke0UEXGzixc4i0og3FCcHYiyP7g" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              className="space-y-8"
              initial="hidden"
              animate="show"
              variants={stagger}
            >
              <motion.div
                variants={riseIn}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-fixed border border-primary/30"
              >
                <span className="material-symbols-outlined text-sm">eco</span>
                <span className="text-xs font-medium uppercase tracking-widest">Beta · Prototype in development</span>
              </motion.div>
              <motion.h1
                variants={riseIn}
                className="text-5xl md:text-7xl font-extrabold text-on-primary leading-[1.1] tracking-tight"
              >
                Eat well. Spend smart. <span className="text-primary-container">Waste nothing.</span>
              </motion.h1>
              <motion.p variants={riseIn} className="text-xl text-surface-variant max-w-lg leading-relaxed">
                Scan your grocery receipts, cook meals from what&apos;s already in your fridge, and keep your weekly budget in check.
              </motion.p>
              <motion.div variants={riseIn} className="flex flex-wrap gap-4">
                <Link to="/login" className="px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full font-bold text-lg shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  Start My Larder
                </Link>
                <button
                  type="button"
                  onClick={() => setHowItWorksOpen(true)}
                  className="px-8 py-4 bg-surface-container-highest/10 backdrop-blur-md border border-surface-variant/20 text-on-primary rounded-full font-bold text-lg hover:bg-surface-container-highest/20 transition-all"
                >
                  See How It Works
                </button>
              </motion.div>
            </motion.div>
            {/* Hero Interactive Demo Card */}
            <div className="hidden lg:block relative">
              <div className="relative z-10">
                <HeroDemo />
              </div>
              {/* Decorative Background Blobs */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-0"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary-container/30 rounded-full blur-3xl -z-0"></div>
            </div>
          </div>
        </section>

        {/* Feature Showcase Grid */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3, margin: '-80px' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <h2 className="text-4xl font-extrabold text-emerald-900 mb-4 tracking-tight">Designed for Modern Households</h2>
            <p className="text-emerald-700/70 max-w-2xl text-lg">Intelligent tools that adapt to your pantry, your budget, and your taste. No more spreadsheets, just soulful cooking.</p>
          </motion.div>
          {/* Bento Grid Layout */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15, margin: '-80px' }}
            variants={stagger}
          >
            {/* Large Card */}
            <MotionLink
              to="/fridge"
              variants={riseIn}
              whileHover={hoverLift}
              className="md:col-span-2 bg-surface-container rounded-[2rem] overflow-hidden group block hover:shadow-2xl transition-shadow duration-300"
            >
              <div className="p-10 flex flex-col h-full justify-between">
                <div className="max-w-md">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                    <span className="material-symbols-outlined text-primary">kitchen</span>
                  </div>
                  <h3 className="text-3xl font-bold text-emerald-950 mb-4 leading-tight">The Virtual Fridge</h3>
                  <p className="text-emerald-800/80 leading-relaxed">Stop double-buying. Scan your receipts and our AI instantly categorizes your perishables, tracking expiry dates and suggesting meals before ingredients go to waste.</p>
                </div>
                <div className="mt-12 -mx-10 -mb-10">
                  <img className="w-full h-64 object-cover object-center group-hover:scale-105 transition-transform duration-500" alt="modern minimalist kitchen interior with a organized refrigerator stocked with fresh vegetables and glass containers" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA73jFJbQQAXfc9BWa6Si2pE_Acmn3gXuA79Jh-WYuHzg-jGxfzItyjeic0thNsN89QkUxZ9_AcGfHN8o5R0FmpVHWAEFlCwbx-MxOMTw8uYG8naLOKGJl7wbQCGj4yA1_eQLcba9SGwIXDrloakx9cHVv0RNdN5vkTsEc7tJeMIhNxQtFYKu93YjHI8UgQh-lrPJP8RIbjgSwah-4oM8zh0j2mwzY3BMqUW-xPXT5C8G_h7SWe1LBHmE3m4s_PDIob5-rI6ju-Ayg" />
                </div>
              </div>
            </MotionLink>
            {/* Tall Card */}
            <MotionLink
              to="/upload-receipt"
              variants={riseIn}
              whileHover={hoverLift}
              className="bg-primary text-on-primary rounded-[2rem] p-10 flex flex-col justify-between block hover:shadow-2xl transition-shadow duration-300"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20">
                  <span className="material-symbols-outlined text-white">receipt_long</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Smart Receipt Parsing</h3>
                <p className="text-white/80 leading-relaxed">Automatically extract item prices and quantities from any Australian supermarket receipt. Watch your savings grow in real-time.</p>
              </div>
              <div className="mt-12 bg-white/10 p-6 rounded-2xl border border-white/20">
                <div className="flex justify-between text-sm mb-2">
                  <span>Weekly Target</span>
                  <span>$120.00</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-primary-container h-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '75%' }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
                  />
                </div>
                <p className="text-[10px] mt-4 opacity-60">75% OF BUDGET USED</p>
              </div>
            </MotionLink>
            {/* Small Card 1 */}
            <MotionLink
              to="/profile"
              variants={riseIn}
              whileHover={hoverLift}
              className="bg-surface-container-low rounded-[2rem] p-10 block hover:shadow-xl transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-tertiary">savings</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3">Budget Benchmarks</h3>
              <p className="text-emerald-800/70 text-sm leading-relaxed">Compare your grocery spend against similar Australian households to find hidden savings.</p>
            </MotionLink>
            {/* Small Card 2 */}
            <MotionLink
              to="/meals"
              variants={riseIn}
              whileHover={hoverLift}
              className="bg-surface-container-low rounded-[2rem] p-10 block hover:shadow-xl transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-primary">restaurant_menu</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3">Meal Planning</h3>
              <p className="text-emerald-800/70 text-sm leading-relaxed">Generate 7-day meal plans based strictly on what's already in your pantry and fridge.</p>
            </MotionLink>
            {/* Small Card 3 */}
            <MotionLink
              to="/shopping"
              variants={riseIn}
              whileHover={hoverLift}
              className="bg-surface-container-low rounded-[2rem] p-10 block hover:shadow-xl transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-primary">group</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3">Community Insights</h3>
              <p className="text-emerald-800/70 text-sm leading-relaxed">Share tips on local specials and bulk-buy opportunities with your neighborhood.</p>
            </MotionLink>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6">
          <motion.div
            className="max-w-7xl mx-auto bg-[#0c1f14] rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2, margin: '-80px' }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">Turn your next receipt into dinner.</h2>
              <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
                Snap a grocery receipt, let us build your virtual fridge, and get recipes from what you already have. Free while we&apos;re in beta.
              </p>
              <Link to="/upload-receipt" className="inline-block px-10 py-5 bg-primary-container text-on-primary-container rounded-full font-black text-xl hover:scale-105 active:scale-95 transition-all">
                Scan my first receipt
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-emerald-900 w-full py-12 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-emerald-800/30 pt-8">
          <div className="mb-6 md:mb-0">
            <span className="font-black text-emerald-100 text-xl tracking-tighter">Trolley for Tomorrow</span>
            <p className="text-xs uppercase tracking-widest text-emerald-400 mt-2">&copy; 2026 Trolley for Tomorrow · Monash FIT5120 student project</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="text-xs uppercase tracking-widest text-emerald-400 hover:text-emerald-100 transition-opacity cursor-pointer bg-transparent border-0 p-0"
            >
              Privacy Policy
            </button>
            <a
              className="text-xs uppercase tracking-widest text-emerald-400 hover:text-emerald-100 transition-opacity"
              href="https://forms.gle/gBfeEqRoa2Qx9X69A"
              target="_blank"
              rel="noopener noreferrer"
            >
              Feedback
            </a>
            <button
              type="button"
              onClick={() => setMadeByOpen(true)}
              className="text-xs uppercase tracking-widest text-emerald-400 hover:text-emerald-100 transition-opacity cursor-pointer bg-transparent border-0 p-0"
            >
              Made by
            </button>
          </div>
        </div>
      </footer>

      <HowItWorksModal
        open={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />
      <PrivacyPolicyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />
      <MadeByModal
        open={madeByOpen}
        onClose={() => setMadeByOpen(false)}
      />
    </>
  )
}
