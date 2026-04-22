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
                Trolley for Tomorrow is a student project built at Monash University as part of FIT5120 Industry Experience Studio. This page explains what data the app collects, how we use it, and what we don&apos;t do with it.
              </p>

              <Section title="Who we are">
                <p>
                  Trolley for Tomorrow is a prototype built by a team of Monash University students. It is not a commercial product. It is not backed by a company. We built it to learn, and to explore whether a practical digital tool can help Australian households plan affordable meals under budget pressure.
                </p>
              </Section>

              <Section title="What we collect">
                <p>When you use the app, we store the following in our database:</p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li>
                    <strong className="text-slate-900">Grocery receipt data.</strong>{' '}
                    If you upload a photo of a grocery receipt, we save the image on our server and run it through text recognition software to extract item names, quantities, and prices. Both the image and the extracted text are stored against your account.
                  </li>
                  <li>
                    <strong className="text-slate-900">Items in your virtual fridge.</strong>{' '}
                    These come from your uploaded receipts, or from any items you add manually.
                  </li>
                  <li>
                    <strong className="text-slate-900">Your weekly food budget.</strong>{' '}
                    The number you enter on the profile page. Nothing more.
                  </li>
                  <li>
                    <strong className="text-slate-900">Your dietary preferences.</strong>{' '}
                    The toggles you set (vegetarian, gluten-free, and so on). Stored as true or false values.
                  </li>
                </ul>
                <p className="mt-4">
                  That is the full list. We do not collect your name, email, phone number, address, or payment details. The current version of the app does not have user accounts, so everything you enter is stored against a single shared test record.
                </p>
              </Section>

              <Section title="What we do not collect">
                <p>
                  We do not use cookies for tracking. We do not use Google Analytics or any similar analytics service. We do not have advertising. We do not sell or share any of your data, because we do not have any data worth selling.
                </p>
              </Section>

              <Section title="Where your data goes">
                <p>
                  Your data is stored in a PostgreSQL database hosted by Amazon Web Services, located in Australia. The app itself runs on Microsoft Azure. We do not send your data anywhere else. We do not share it with Coles, Woolworths, Foodbank, or any other organisation mentioned elsewhere in the app.
                </p>
              </Section>

              <Section title="How long we keep it">
                <p>
                  This is a student project in active development. The database may be cleared at any time, for any reason, without notice. If you rely on the data you have entered, keep your own copy.
                </p>
              </Section>

              <Section title="Your rights">
                <p>
                  Because we do not collect identifying information and the app runs as a single shared account, we cannot attach any individual piece of data to an individual person. If you want us to wipe the shared database, email the project team and we will do it.
                </p>
              </Section>

              <Section title="Changes to this policy">
                <p>
                  As the app develops, we may add features like user accounts, supermarket pricing data, or location-based suggestions. When any of those go live, this page will be updated to explain what new data is collected and why.
                </p>
              </Section>

              <Section title="Contact">
                <p>
                  This is a Monash University coursework project. If you have questions or concerns about your data, contact us through the feedback link in the footer, or through the FIT5120 course coordinator.
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
