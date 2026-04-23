import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

// localStorage persistence key. Once this is "true", the gate never shows
// again on the same device. Clear the key (or use incognito) to test the
// locked state.
const STORAGE_KEY = 'trolley_gate_unlocked_v1'

// SHA-256 hex of the gate password. Deliberately NOT the literal word, so a
// grep on the compiled JS bundle won't surface the password.
//
// This is *deterrence*, not security:
//   - anyone who opens DevTools can `localStorage.setItem(...)` and bypass
//   - the backend API is not protected by this gate
//   - the gated app renders behind the blur and is still in the DOM
// Adequate for "keep casual classmates from stumbling into the demo page";
// not a substitute for real auth (which is a separate iteration 2 item).
const EXPECTED_HASH = '5baba4fb94157978d3d26ed9bbf5c8a4754a27377352332a1865f1a98f5c9beb'

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return reduced
}

/**
 * Full-viewport password gate. Wraps the whole app; renders children
 * behind a blurred overlay until the user enters the correct password.
 *
 * The wrapped children are always rendered (so the backdrop-blur shows
 * the app translucently), but the wrapper has `inert` set while locked
 * so keyboard navigation cannot tab into inputs underneath the blur.
 */
export default function PasswordGate({ children }) {
  const reduced = usePrefersReducedMotion()

  const [unlocked, setUnlocked] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [value, setValue] = useState('')
  const [shaking, setShaking] = useState(false)
  const [errorVisible, setErrorVisible] = useState(false)
  const [borderFlash, setBorderFlash] = useState(false)
  const [flashSuccess, setFlashSuccess] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const inputRef = useRef(null)
  const wrapperRef = useRef(null)
  const errorTimerRef = useRef(null)

  // `inert` on the wrapped app while locked — prevents tab-navigation into
  // inputs under the blur. Boolean-attribute support for `inert` landed
  // fully in React 19; set via ref + setAttribute to stay compatible with
  // whatever React version this project happens to run on.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    if (unlocked) {
      el.removeAttribute('inert')
      el.removeAttribute('aria-hidden')
    } else {
      el.setAttribute('inert', '')
      el.setAttribute('aria-hidden', 'true')
    }
  }, [unlocked])

  // Autofocus the password input whenever the gate is visible.
  useEffect(() => {
    if (!unlocked && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), reduced ? 0 : 180)
      return () => clearTimeout(t)
    }
  }, [unlocked, reduced])

  // Cleanup
  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
  }, [])

  const handleWrong = useCallback(() => {
    setShaking(true)
    setErrorVisible(true)
    setBorderFlash(true)
    setValue('')
    setTimeout(() => setShaking(false), 420)
    setTimeout(() => setBorderFlash(false), 620)
    inputRef.current?.focus()
  }, [])

  const handleCorrect = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* private mode */ }
    setFlashSuccess(true)
    // Let the success flash render, then start the exit animation, then
    // remove the gate entirely.
    setTimeout(() => {
      setFlashSuccess(false)
      setExiting(true)
    }, reduced ? 0 : 220)
    setTimeout(() => {
      setUnlocked(true)
      setExiting(false)
    }, reduced ? 40 : 700)
  }, [reduced])

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const trimmed = (value || '').trim().toLowerCase()
    if (!trimmed || submitting || exiting) return
    setSubmitting(true)
    try {
      const hash = await sha256Hex(trimmed)
      if (hash === EXPECTED_HASH) {
        handleCorrect()
      } else {
        handleWrong()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const locked = !unlocked

  return (
    <>
      {/* App tree — always rendered so the blur can show it translucently.
          `inert` is applied via ref while locked to block tab focus. */}
      <div ref={wrapperRef}>
        {children}
      </div>

      <AnimatePresence>
        {locked && !exiting && (
          <motion.div
            key="gate-scrim"
            initial={reduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: EASE }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(5, 46, 22, 0.35) 0%, rgba(6, 78, 59, 0.55) 100%)',
            }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="gate-title"
          >
            <motion.form
              key="gate-card"
              onSubmit={handleSubmit}
              initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94, y: -12 }}
              animate={{
                opacity: 1,
                scale: shaking ? [1, 1.0, 1.0, 1.0, 1.0, 1.0] : 1,
                y: 0,
                x: shaking ? [0, -6, 6, -4, 4, 0] : 0,
                backgroundColor: flashSuccess
                  ? 'rgba(209, 250, 229, 0.95)' // emerald-100
                  : 'rgba(255, 255, 255, 0.92)',
              }}
              exit={reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, transition: { duration: 0.32, ease: EASE } }
              }
              transition={{
                opacity: { duration: 0.22, ease: EASE },
                scale:   shaking ? { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: 'easeOut' } : { type: 'spring', stiffness: 260, damping: 22 },
                y:       { type: 'spring', stiffness: 260, damping: 22 },
                x:       shaking ? { duration: 0.4, times: [0, 0.15, 0.35, 0.55, 0.8, 1], ease: 'easeOut' } : { duration: 0.2 },
                backgroundColor: { duration: 0.2 },
              }}
              className="relative w-full max-w-[400px] rounded-3xl shadow-2xl overflow-hidden"
              style={{
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                border: '1px solid rgba(255, 255, 255, 0.55)',
              }}
            >
              <div className="p-8 md:p-10 text-center">
                {/* Lock icon with slow pulse */}
                <motion.div
                  animate={reduced ? {} : { scale: [1, 1.05, 1], opacity: [0.88, 1, 0.88] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(6, 95, 70, 0.25) 100%)',
                    boxShadow: '0 4px 16px -4px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-[28px] text-emerald-700"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    lock
                  </span>
                </motion.div>

                <h1 id="gate-title" className="text-2xl font-extrabold font-headline tracking-tight text-emerald-900 mb-1">
                  Private preview
                </h1>
                <p className="text-sm text-emerald-800/70 mb-6">
                  Enter the password to continue.
                </p>

                {/* Input */}
                <div
                  className="relative flex items-center rounded-full transition-colors"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    border: `1.5px solid ${
                      borderFlash
                        ? 'rgb(239, 68, 68)'
                        : errorVisible
                          ? 'rgba(239, 68, 68, 0.35)'
                          : 'rgba(16, 185, 129, 0.25)'
                    }`,
                    boxShadow: borderFlash
                      ? '0 0 0 3px rgba(239, 68, 68, 0.18)'
                      : '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <input
                    ref={inputRef}
                    type="password"
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value)
                      if (errorVisible) setErrorVisible(false)
                    }}
                    placeholder="Password"
                    aria-label="Password"
                    autoComplete="off"
                    spellCheck="false"
                    className="flex-1 min-w-0 px-5 py-3 bg-transparent text-sm text-emerald-900 placeholder:text-emerald-900/40 outline-none"
                  />
                  <AnimatePresence>
                    {value.length > 0 && (
                      <motion.button
                        key="submit-arrow"
                        type="submit"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        disabled={submitting}
                        className="mr-1.5 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(5, 150, 105) 100%)',
                          color: 'white',
                          boxShadow: '0 4px 12px -2px rgba(16, 185, 129, 0.55)',
                        }}
                        aria-label="Submit password"
                      >
                        {submitting ? (
                          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {errorVisible && (
                    <motion.p
                      key="gate-error"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: EASE }}
                      className="mt-3 text-xs font-medium text-red-600"
                      aria-live="polite"
                    >
                      That&apos;s not the password.
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Footer */}
                <p className="mt-7 text-[11px] text-emerald-900/50">
                  Ask the team if you need access.
                </p>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
