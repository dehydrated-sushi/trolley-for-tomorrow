import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import HeroDemo from './HeroDemo'
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

const drift = {
  animate: {
    y: [0, -14, 0],
    x: [0, 8, 0],
    scale: [1, 1.04, 1],
    transition: {
      duration: 9,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

const breathe = {
  animate: {
    scale: [1, 1.03, 1],
    opacity: [0.92, 1, 0.92],
    transition: {
      duration: 3.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Animated <Link> — lets each feature card be both clickable AND part of the
// stagger animation. framer-motion v12 uses motion.create(Component).
const MotionLink = motion.create(Link)
const MotionLoginLink = motion.create(Link)

// Gentle hover motion — more like a card being lifted by air than snapped.
const hoverLift = {
  y: -8,
  rotate: -0.6,
  transition: { type: 'spring', stiffness: 220, damping: 22 },
}

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
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="px-4 py-2 rounded-full bg-emerald-900 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors">
              Log in
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[870px] flex items-center overflow-hidden bg-[#0c1f14]">
          <motion.div
            variants={drift}
            animate="animate"
            className="absolute -left-20 top-28 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl"
          />
          <motion.div
            animate={{
              y: [0, 18, 0],
              x: [0, -16, 0],
              scale: [1, 1.08, 1],
              transition: { duration: 11, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="absolute right-8 top-24 h-80 w-80 rounded-full bg-lime-200/10 blur-3xl"
          />
          <motion.div
            animate={{
              y: [0, -10, 0],
              x: [0, 12, 0],
              transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
          />
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
                animate="animate"
                {...breathe}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-fixed border border-primary/30"
              >
                <span className="material-symbols-outlined text-sm">eco</span>
                <span className="text-xs font-medium uppercase tracking-widest">Beta · Sustainable living prototype</span>
              </motion.div>
              <motion.h1
                variants={riseIn}
                className="text-5xl md:text-7xl font-extrabold text-on-primary leading-[1.1] tracking-tight"
              >
                Use food wisely. <span className="text-primary-container">Waste less.</span>
              </motion.h1>
              <motion.p variants={riseIn} className="text-xl text-surface-variant max-w-lg leading-relaxed">
                Track what you buy, use what you already have, and reduce household food waste through more responsible everyday consumption.
              </motion.p>
              <motion.div variants={riseIn} className="flex flex-wrap gap-4">
                <MotionLoginLink
                  to="/login"
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  animate={{
                    boxShadow: [
                      '0 10px 28px -12px rgba(16,185,129,0.28)',
                      '0 16px 36px -14px rgba(16,185,129,0.4)',
                      '0 10px 28px -12px rgba(16,185,129,0.28)',
                    ],
                  }}
                  transition={{
                    boxShadow: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                    y: { type: 'spring', stiffness: 260, damping: 20 },
                    scale: { type: 'spring', stiffness: 260, damping: 20 },
                  }}
                  className="px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full font-bold text-lg shadow-xl shadow-primary/20 transition-all"
                >
                  Start My Larder
                </MotionLoginLink>
              </motion.div>
            </motion.div>
            {/* Hero Interactive Demo Card */}
            <motion.div
              className="hidden lg:block relative"
              initial={{ opacity: 0, x: 24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.75, delay: 0.18, ease: EASE }}
            >
              <div className="relative z-10">
                <HeroDemo />
              </div>
              {/* Decorative Background Blobs */}
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.24, 0.34, 0.24] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-0"
              />
              <motion.div
                animate={{ y: [0, -10, 0], x: [0, 8, 0], opacity: [0.26, 0.36, 0.26] }}
                transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary-container/30 rounded-full blur-3xl -z-0"
              />
            </motion.div>
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
            <h2 className="text-4xl font-extrabold text-emerald-900 mb-4 tracking-tight">Designed for More Responsible Consumption</h2>
            <p className="text-emerald-700/70 max-w-2xl text-lg">Practical tools that help households waste less food, buy more intentionally, and build healthier long-term habits for people and planet.</p>
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
              to="/login"
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
                  <p className="text-emerald-800/80 leading-relaxed">See what food is already at home, track what should be used first, and prevent edible ingredients from being forgotten or thrown away.</p>
                </div>
                <div className="mt-12 -mx-10 -mb-10">
                  <motion.img
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-full h-64 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    alt="modern minimalist kitchen interior with a organized refrigerator stocked with fresh vegetables and glass containers"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA73jFJbQQAXfc9BWa6Si2pE_Acmn3gXuA79Jh-WYuHzg-jGxfzItyjeic0thNsN89QkUxZ9_AcGfHN8o5R0FmpVHWAEFlCwbx-MxOMTw8uYG8naLOKGJl7wbQCGj4yA1_eQLcba9SGwIXDrloakx9cHVv0RNdN5vkTsEc7tJeMIhNxQtFYKu93YjHI8UgQh-lrPJP8RIbjgSwah-4oM8zh0j2mwzY3BMqUW-xPXT5C8G_h7SWe1LBHmE3m4s_PDIob5-rI6ju-Ayg"
                  />
                </div>
              </div>
            </MotionLink>
            {/* Tall Card */}
            <MotionLink
              to="/login"
              variants={riseIn}
              whileHover={hoverLift}
              className="bg-primary text-on-primary rounded-[2rem] p-10 flex flex-col justify-between block hover:shadow-2xl transition-shadow duration-300"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20">
                  <span className="material-symbols-outlined text-white">receipt_long</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Smart Receipt Parsing</h3>
                <p className="text-white/80 leading-relaxed">Turn shopping receipts into usable food records so the system can spot risk earlier and help households act before food becomes waste.</p>
              </div>
              <div className="mt-12 bg-white/10 p-6 rounded-2xl border border-white/20">
                <div className="flex justify-between text-sm mb-2">
                  <span>Waste reduction goal</span>
                  <span>75%</span>
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
                <p className="text-[10px] mt-4 opacity-60">TRACKING PROGRESS TOWARD LOWER WASTE</p>
              </div>
            </MotionLink>
            {/* Small Card 1 */}
            <MotionLink
              to="/login"
              variants={riseIn}
              whileHover={hoverLift}
              className="bg-surface-container-low rounded-[2rem] p-10 block hover:shadow-xl transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-tertiary">public</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3">Impact Insights</h3>
              <p className="text-emerald-800/70 text-sm leading-relaxed">Understand which habits create the most waste so you can make lower-impact choices next time.</p>
            </MotionLink>
            {/* Small Card 2 */}
            <MotionLink
              to="/login"
              variants={riseIn}
              whileHover={hoverLift}
              className="bg-surface-container-low rounded-[2rem] p-10 block hover:shadow-xl transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-primary">restaurant_menu</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3">Use-It-Up Meals</h3>
              <p className="text-emerald-800/70 text-sm leading-relaxed">Get meal ideas that help consume ingredients already at home before they expire.</p>
            </MotionLink>
            {/* Small Card 3 */}
            <MotionLink
              to="/login"
              variants={riseIn}
              whileHover={hoverLift}
              className="bg-surface-container-low rounded-[2rem] p-10 block hover:shadow-xl transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-primary">group</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3">Responsible Habits</h3>
              <p className="text-emerald-800/70 text-sm leading-relaxed">Build simple routines around storing, checking, and using food more responsibly each week.</p>
            </MotionLink>
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
