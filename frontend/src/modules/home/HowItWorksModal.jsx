import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

/**
 * "See How It Works" button → this modal.
 * Placeholder until the full interactive walkthrough lands in a later iteration.
 *
 * Closes on: close button, backdrop click, Escape key.
 * Locks body scroll while open.
 */
export default function HowItWorksModal({ open, onClose }) {
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-sm" />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-it-works-title"
            className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.35, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full text-emerald-900/40 hover:text-emerald-900 hover:bg-emerald-50 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-5">
              <span className="material-symbols-outlined text-3xl text-emerald-700">construction</span>
            </div>

            <h3 id="how-it-works-title" className="text-2xl font-extrabold text-emerald-950 mb-3">
              Full walkthrough coming soon
            </h3>

            <p className="text-emerald-800/80 leading-relaxed mb-4">
              We&apos;re still building the step-by-step interactive walkthrough — it&apos;ll ship once the Iteration 2 feature set is complete.
            </p>
            <p className="text-emerald-800/70 text-sm leading-relaxed mb-7">
              For now, the animated preview next to the headline walks through the whole flow: receipt → fridge → budget → recipe → shopping.
            </p>

            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold shadow-md hover:shadow-lg transition-shadow active:scale-[0.97]"
            >
              Got it
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
