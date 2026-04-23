import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Custom sort dropdown — replaces the native <select> with a themed
 * popover that matches the rest of the Meals page animation language.
 *
 * Behaviour:
 * - Click trigger to open/close
 * - Click outside or press Escape to close
 * - Arrow rotates 180° while open
 * - Options stagger in on open
 * - Selected option shows a ✓ mark
 */
const EASE = [0.22, 1, 0.36, 1]

export default function SortDropdown({ value, options, onChange, label = 'Sort' }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  const current = options.find((o) => o.key === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSelect = (key) => {
    onChange(key)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-semibold border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
          {label}
        </span>
        <span>{current.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="material-symbols-outlined text-base inline-flex"
        >
          expand_more
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full mt-2 z-30 w-64 bg-white border border-outline-variant/30 rounded-2xl shadow-xl py-2 overflow-hidden"
          >
            {options.map((opt, i) => {
              const selected = opt.key === value
              return (
                <motion.li
                  key={opt.key}
                  role="option"
                  aria-selected={selected}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.035, duration: 0.2, ease: EASE }}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.key)}
                    className={
                      selected
                        ? 'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-primary bg-primary/5'
                        : 'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container transition-colors'
                    }
                  >
                    <span>{opt.label}</span>
                    {selected && (
                      <span className="material-symbols-outlined text-base">check</span>
                    )}
                  </button>
                </motion.li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
