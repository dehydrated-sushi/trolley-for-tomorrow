import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from './toastBus'

/**
 * Single-slot toast viewport. Mount once at the app shell. Subscribes to the
 * `toast` event bus and displays whichever message arrived most recently,
 * fading out after the configured duration.
 *
 * A fresh `toast.show()` while one is visible cancels the pending dismiss
 * timer and replaces the content — latest action wins.
 */
export default function Toast() {
  const [active, setActive] = useState(null)

  useEffect(() => {
    let timer = null
    const unsub = toast.subscribe((payload) => {
      // Replace whatever's on screen; cancel its auto-dismiss.
      if (timer) clearTimeout(timer)
      setActive(payload)
      timer = setTimeout(() => setActive(null), payload.duration)
    })
    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[60] pointer-events-none flex flex-col items-end"
    >
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto inline-flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl max-w-md text-sm font-semibold ${
              active.tone === 'error'
                ? 'bg-error-container text-on-error-container'
                : active.tone === 'muted'
                  ? 'bg-surface-container-high text-on-surface'
                  : 'bg-emerald-900 text-emerald-50'
            }`}
          >
            <span className="flex-1">{active.message}</span>
            {active.action && (
              <button
                type="button"
                onClick={() => {
                  active.action.onClick?.()
                  setActive(null)
                }}
                className="text-emerald-300 hover:text-emerald-100 text-xs uppercase tracking-widest font-bold px-2"
              >
                {active.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
