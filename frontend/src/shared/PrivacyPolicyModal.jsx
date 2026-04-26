import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

/**
 * Privacy Policy modal — opened from the "Privacy Policy" link in the footer.
 * Scrollable legal-style document with fixed header and footer.
 *
 * Closes on: close button (top + bottom), backdrop click, Escape key.
 * Locks body scroll while open.
 */
export default function PrivacyPolicyModal({ open, onClose }) {
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
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.35, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed header */}
            <header className="px-8 md:px-12 pt-8 pb-5 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="privacy-title"
                  className="text-2xl md:text-3xl font-bold text-slate-900 font-headline tracking-tight"
                >
                  Privacy Policy
                </h2>
                <p className="text-sm text-slate-500 mt-1 italic">Last updated: April 2026</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex-shrink-0 p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </header>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-8 md:px-12 py-7 text-slate-700 leading-relaxed space-y-5 text-[15px]">
              <p>
                Trolley for Tomorrow is a student project built at Monash University as part of FIT5120 Industry Experience Studio. This page explains what data this prototype may store, why it is used, and how that supports our goal of helping households reduce food waste and make more responsible consumption choices.
              </p>

              <Section title="Who we are">
                <p>
                  Trolley for Tomorrow is a prototype built by a team of Monash University students. It is not a commercial product and it is not operated by a company. We built it to explore whether a practical digital tool can help households track food at home, use ingredients before they are wasted, and build more sustainable kitchen habits.
                </p>
              </Section>

              <Section title="What we collect">
                <p>Depending on which parts of the prototype you use, the app may store the following information:</p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li>
                    <strong className="text-slate-900">Receipt and food logging data.</strong>{' '}
                    If you upload a receipt or manually add food items, the app may store item names, quantities, categories, and related metadata so it can help track what food has come into the home.
                  </li>
                  <li>
                    <strong className="text-slate-900">Virtual fridge data.</strong>{' '}
                    This includes the items you keep in your in-app fridge, along with details that help the system surface what should be used first.
                  </li>
                  <li>
                    <strong className="text-slate-900">Preference data.</strong>{' '}
                    This can include household settings, dietary preferences, reminder choices, and other low-waste planning preferences you choose to save.
                  </li>
                  <li>
                    <strong className="text-slate-900">Local profile details stored in your browser.</strong>{' '}
                    Some prototype features, such as your display name, uploaded avatar, and local sign-in state, are currently stored in browser storage on the device you are using.
                  </li>
                </ul>
                <p className="mt-4">
                  We do not intentionally collect payment details, government identifiers, or precise location data. Because this is a prototype, some experiences may rely on local browser storage or shared demo records rather than full production-style user accounts.
                </p>
              </Section>

              <Section title="What we do not collect">
                <p>
                  We do not use this project to advertise to you. We do not sell personal data. We do not use the app to build marketing profiles about users. We also do not intentionally collect more information than is needed to demonstrate the prototype&apos;s food-waste-reduction features.
                </p>
              </Section>

              <Section title="How we use the data">
                <p>
                  The data in this prototype is used to power features such as receipt parsing, fridge tracking, meal suggestions, shopping guidance, and low-waste habit support. In other words, the data is used to help the app show what food is already available, what should be used soon, and what actions may reduce unnecessary waste.
                </p>
              </Section>

              <Section title="Where data may be stored">
                <p>
                  Because this project is still in development, data may be stored in browser storage on your device, in local development databases, or in cloud services configured by the team for testing. Storage arrangements may change as the prototype evolves.
                </p>
              </Section>

              <Section title="How long we keep it">
                <p>
                  This is a student prototype in active development. Demo data, uploaded content, and testing records may be deleted, reset, or replaced at any time. If something matters to you, do not rely on the app as the only place where that information exists.
                </p>
              </Section>

              <Section title="Your choices">
                <p>
                  You can choose not to upload receipts, not to add a profile photo, and not to save optional profile information. You can also clear locally stored prototype data from your browser by signing out or clearing browser storage on the device you use.
                </p>
              </Section>

              <Section title="Limits of the prototype">
                <p>
                  Trolley for Tomorrow is an educational prototype, not a production-ready service. Some features may use simplified data models, shared demo records, or browser-only storage. As a result, privacy, deletion, and account-management behaviour may not yet match the standards of a full consumer product.
                </p>
              </Section>

              <Section title="Changes to this policy">
                <p>
                  As the prototype develops, we may change what features exist and what data they need. If those changes affect privacy in a meaningful way, this page should be updated to reflect the new behaviour.
                </p>
              </Section>

              <Section title="Contact">
                <p>
                  This is a Monash University coursework project. If you have questions or concerns, contact the team through the feedback link in the footer or through the course context in which the project is being developed.
                </p>
              </Section>
            </div>

            {/* Fixed footer */}
            <footer className="px-8 md:px-12 py-4 border-t border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50 rounded-b-2xl">
              <p className="text-xs text-slate-500">
                Monash FIT5120 · Student project · Not a commercial product
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }) {
  return (
    <section className="pt-3">
      <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">{title}</h3>
      {children}
    </section>
  )
}
