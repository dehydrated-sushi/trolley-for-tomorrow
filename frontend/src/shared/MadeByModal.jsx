import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Deliberately NOT the app's emerald palette. This modal has its own
// cinematic dark-cosmic theme so the credits page feels like a moment.
const EASE = [0.22, 1, 0.36, 1]

const TEAM = [
  { num: '01', name: 'Saubhagya Das',       linkedin: 'https://au.linkedin.com/in/saubhagyadas' },
  { num: '02', name: 'Arshdeep Sokhall' },
  { num: '03', name: 'Xueer Yao (Jasmine)' },
  { num: '04', name: 'Shimin Cai' },
  { num: '05', name: 'Zedong Wang (Karl)' },
]

const DATA_SOURCES = [
  'Australian Food Composition Database (AFCD), Food Standards Australia New Zealand',
  'AUSNUT 2023, Food Standards Australia New Zealand',
  'Australian Dietary Guidelines, National Health and Medical Research Council',
  'Australian Bureau of Statistics CPI, food and non-alcoholic beverages',
  'TheMealDB recipe catalogue',
  'Open Food Facts',
]

const TECH_STACK = [
  { label: 'Frontend',       items: ['React', 'Vite', 'Tailwind CSS', 'React Router', 'Framer Motion', 'Material Symbols'] },
  { label: 'Backend',        items: ['Flask', 'SQLAlchemy', 'PostgreSQL', 'psycopg', 'Tesseract OCR', 'Pillow', 'Gunicorn'] },
  { label: 'Infrastructure', items: ['Microsoft Azure', 'Amazon Web Services', 'Docker'] },
]

export default function MadeByModal({ open, onClose }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="madeby-title"
            className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-[0_30px_90px_-15px_rgba(0,0,0,0.8)]"
            style={{
              background:
                'linear-gradient(135deg, #0a0e27 0%, #1a1144 45%, #2d1b4e 100%)',
            }}
            initial={{ opacity: 0, y: 80, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.96 }}
            transition={{ duration: 0.55, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatedOrbs />

            {/* Fixed close button (no visible header — title lives in scroll area) */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-5 right-5 z-20 p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {/* Scrollable body — acts as viewport root for inner animations. */}
            <div
              ref={scrollRef}
              className="relative z-10 overflow-y-auto flex-1 px-6 md:px-14 py-12 md:py-16 text-white/85 space-y-14 custom-scrollbar"
            >
              {/* ── Title block ── */}
              <motion.header
                initial={{ opacity: 0, filter: 'blur(12px)', y: 20 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
              >
                <span className="inline-block text-[11px] font-bold uppercase tracking-[0.4em] text-amber-300/80 mb-5">
                  Credits & Colophon
                </span>
                <h2
                  id="madeby-title"
                  className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95] text-white mb-6"
                >
                  Made by{' '}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        'linear-gradient(135deg, #fbbf24 0%, #f472b6 50%, #06b6d4 100%)',
                    }}
                  >
                    five students
                  </span>
                </h2>
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.75 }}
                  className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed"
                >
                  Trolley for Tomorrow is a student project built at Monash University as part of FIT5120 Industry Experience Studio, Semester 1 2026.
                </motion.p>
              </motion.header>

              {/* ── Team ── */}
              <Section
                kicker="The team"
                scrollRoot={scrollRef}
              >
                <p className="text-white/70 mb-8 text-base md:text-lg">
                  A cross-disciplinary team of Monash students.
                </p>
                <motion.ul
                  className="space-y-1"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ root: scrollRef, once: true, amount: 0.1 }}
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
                  }}
                >
                  {TEAM.map((member) => {
                    const nameClass = 'text-2xl md:text-4xl font-extrabold tracking-tight text-white group-hover:text-amber-200 transition-colors inline-flex items-center gap-3'
                    const arrow = (
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-[20px] md:text-[24px] text-amber-300/60 group-hover:text-amber-200 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
                      >
                        north_east
                      </span>
                    )
                    return (
                      <motion.li
                        key={member.name}
                        variants={{
                          hidden: { opacity: 0, x: -40, filter: 'blur(6px)' },
                          show: {
                            opacity: 1,
                            x: 0,
                            filter: 'blur(0px)',
                            transition: { type: 'spring', stiffness: 260, damping: 24 },
                          },
                        }}
                        className="group flex items-baseline gap-5 md:gap-7 py-3 border-b border-white/10 hover:border-amber-300/40 transition-colors"
                      >
                        <span className="font-mono text-xs md:text-sm text-amber-300/60 w-8 flex-shrink-0 tabular-nums">
                          {member.num}
                        </span>
                        {member.linkedin ? (
                          <a
                            href={member.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${member.name} on LinkedIn (opens in new tab)`}
                            className={nameClass}
                          >
                            {member.name}
                            {arrow}
                          </a>
                        ) : (
                          <span className={nameClass}>{member.name}</span>
                        )}
                      </motion.li>
                    )
                  })}
                </motion.ul>
              </Section>

              {/* ── Mentors ── */}
              <Section kicker="With thanks to" scrollRoot={scrollRef}>
                <p className="text-white/75 leading-relaxed text-base md:text-lg max-w-3xl">
                  Our FIT5120 academic mentors and studio supervisors at Monash University for their feedback through each iteration.
                </p>
              </Section>

              {/* ── Data sources ── */}
              <Section kicker="Built on open data" scrollRoot={scrollRef}>
                <p className="text-white/70 mb-6 max-w-3xl">
                  Recipe matching, nutrition categories, and dietary filters are built on publicly available Australian datasets.
                </p>
                <motion.ol
                  className="space-y-3 max-w-3xl"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ root: scrollRef, once: true, amount: 0.15 }}
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.08 } },
                  }}
                >
                  {DATA_SOURCES.map((src, i) => (
                    <motion.li
                      key={src}
                      variants={{
                        hidden: { opacity: 0, y: 16 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                      }}
                      className="flex gap-4 items-start text-white/85"
                    >
                      <span className="font-mono text-xs text-cyan-300/70 mt-1.5 tabular-nums flex-shrink-0">
                        [{String(i + 1).padStart(2, '0')}]
                      </span>
                      <span>{src}</span>
                    </motion.li>
                  ))}
                </motion.ol>
              </Section>

              {/* ── Tech stack ── */}
              <Section kicker="Built with open source" scrollRoot={scrollRef}>
                <div className="space-y-7 max-w-3xl">
                  {TECH_STACK.map((group) => (
                    <div key={group.label}>
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300/70 mb-3">
                        {group.label}
                      </h4>
                      <motion.div
                        className="flex flex-wrap gap-2"
                        initial="hidden"
                        whileInView="show"
                        viewport={{ root: scrollRef, once: true, amount: 0.3 }}
                        variants={{
                          hidden: {},
                          show: { transition: { staggerChildren: 0.05 } },
                        }}
                      >
                        {group.items.map((item) => (
                          <motion.span
                            key={item}
                            variants={{
                              hidden: { opacity: 0, scale: 0.8 },
                              show: {
                                opacity: 1,
                                scale: 1,
                                transition: { type: 'spring', stiffness: 320, damping: 22 },
                              },
                            }}
                            className="inline-flex items-center px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/90 text-sm font-medium"
                          >
                            {item}
                          </motion.span>
                        ))}
                      </motion.div>
                    </div>
                  ))}
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ root: scrollRef, once: true, amount: 0.5 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="mt-8 text-white/60 italic max-w-3xl"
                >
                  Without these tools and datasets, this project would not exist.
                </motion.p>
              </Section>

              {/* ── Closing note ── */}
              <Section kicker="A note on the project" scrollRoot={scrollRef}>
                <p className="text-white/75 leading-relaxed text-base md:text-lg max-w-3xl">
                  This is a prototype in active development, not a finished product. The opinions and design decisions expressed in the app are those of the student team and do not represent Monash University or any of the organisations mentioned within it.
                </p>
              </Section>

              {/* ── Sign-off ── */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ root: scrollRef, once: true, amount: 0.5 }}
                transition={{ duration: 0.8, ease: EASE }}
                className="pt-8 border-t border-white/10 text-center"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
                  · FIT5120 · Semester 1 2026 ·
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Scoped scrollbar styling for this modal */}
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 8px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.1);
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Section with a scroll-triggered kicker + animated children container. */
function Section({ kicker, children, scrollRoot }) {
  return (
    <section>
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ root: scrollRoot, once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mb-5"
      >
        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.4em] text-amber-300/70">
          {kicker}
        </span>
        <div
          className="mt-2 h-px w-16"
          style={{
            background:
              'linear-gradient(90deg, rgba(251,191,36,0.6), rgba(6,182,212,0.1))',
          }}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ root: scrollRoot, once: true, amount: 0.2 }}
        transition={{ duration: 0.65, ease: EASE, delay: 0.08 }}
      >
        {children}
      </motion.div>
    </section>
  )
}

/** Animated blurred gradient orbs drifting in the background. */
function AnimatedOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, #fbbf24 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
        initial={{ x: -200, y: -100 }}
        animate={{
          x: [-200, -100, -250, -200],
          y: [-100, 50, 100, -100],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-0 bottom-0 w-[500px] h-[500px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, #06b6d4 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
        initial={{ x: 150, y: 100 }}
        animate={{
          x: [150, 50, 200, 150],
          y: [100, -50, 50, 100],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #f472b6 0%, transparent 60%)',
          filter: 'blur(70px)',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
