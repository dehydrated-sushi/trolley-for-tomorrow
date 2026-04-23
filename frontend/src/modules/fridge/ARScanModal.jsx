import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

const CYAN = 'rgb(34, 211, 238)'
const CYAN_FILL = 'rgb(0, 240, 255)'
const EMERALD = 'rgb(52, 211, 153)'

// Each detection carries:
// - `emoji`  — rendered inside the card so the product is identifiable
//              regardless of whether any backdrop photo loads
// - `box`    — the bounding rectangle on the backdrop (percentages)
// - `card`   — tooltip anchor (percentages); positions are chosen so the
//              three cards never clip each other or the top ribbon
// - `type`   — 'new' (cyan, + to add) or 'existing' (emerald, saved)
const DETECTIONS = [
  {
    id: 1,
    name: 'Granny Smith Apple',
    emoji: '🍏',
    category: 'Fruit',
    conf: 88.3,
    type: 'new',
    box:  { left: 16, top: 58, w: 14, h: 22 },
    card: { left: 4,  top: 30 },
  },
  {
    id: 2,
    name: 'Whole Milk',
    emoji: '🥛',
    category: 'Dairy',
    conf: 94.1,
    type: 'new',
    box:  { left: 44, top: 30, w: 12, h: 34 },
    card: { left: 38, top: 10 },
  },
  {
    id: 3,
    name: 'Chicken Breast',
    emoji: '🍗',
    category: 'Protein',
    conf: 91.6,
    type: 'existing',
    box:  { left: 66, top: 56, w: 22, h: 24 },
    card: { left: 66, top: 28 },
  },
]

const BOOT_TEXT = 'AR_SYSTEM_BOOTING...'
const ACTIVE_TEXT = 'AR_SYSTEM_ACTIVE'

// ---------------------------------------------------------------------------
// Hooks

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

function useTypewriter(target, stepMs = 55, active = true) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (!active) { setText(target); return }
    setText('')
    let i = 0
    const t = setInterval(() => {
      i += 1
      setText(target.slice(0, i))
      if (i >= target.length) clearInterval(t)
    }, stepMs)
    return () => clearInterval(t)
  }, [target, stepMs, active])
  return text
}

// ---------------------------------------------------------------------------
// Backdrop — stylized SVG "fridge interior" rendered inline. Guaranteed to
// render (no network), visually dense enough that the bounding boxes feel
// anchored to real things, and tuned to match the DETECTIONS box coords.

function FridgeBackdrop() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1000 560"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* Fridge cavity — soft radial gradient for the interior light */}
      <defs>
        <radialGradient id="fridgeLight" cx="50%" cy="35%" r="75%">
          <stop offset="0%"  stopColor="#1e3a4d" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#0f1c2a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#040810" stopOpacity="1" />
        </radialGradient>
        <linearGradient id="shelfGlint" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(255,231,194,0)" />
          <stop offset="50%"  stopColor="rgba(255,231,194,0.35)" />
          <stop offset="100%" stopColor="rgba(255,231,194,0)" />
        </linearGradient>
        <linearGradient id="milkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#f1f5f9" stopOpacity="0.55" />
          <stop offset="65%"  stopColor="#cbd5e1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="appleGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%"  stopColor="#86efac" stopOpacity="0.72" />
          <stop offset="55%" stopColor="#22c55e" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#14532d" stopOpacity="0.7" />
        </radialGradient>
        <linearGradient id="chickenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fecdd3" stopOpacity="0.6" />
          <stop offset="55%"  stopColor="#fb7185" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#881337" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="butterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#fde68a" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="jamGrad" cx="45%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#fca5a5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.55" />
        </radialGradient>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <rect width="1000" height="560" fill="url(#fridgeLight)" />

      {/* Left wall / right wall shadows — depth cue */}
      <rect x="0"    y="0" width="60"  height="560" fill="#000" opacity="0.35" />
      <rect x="940"  y="0" width="60"  height="560" fill="#000" opacity="0.35" />

      {/* Shelves — three glint lines at 18 / 52 / 82 % (matches ceiling of
          the three detection boxes above) */}
      {[100, 290, 460].map((y, i) => (
        <g key={i}>
          <rect x="40" y={y} width="920" height="2" fill="url(#shelfGlint)" />
          <rect x="40" y={y + 2} width="920" height="6" fill="#000" opacity="0.35" />
        </g>
      ))}

      {/* Top shelf: butter, jam jar */}
      <g filter="url(#softBlur)">
        <rect x="200" y="50"  width="70"  height="45" rx="6" fill="url(#butterGrad)" />
        <ellipse cx="330" cy="70" rx="28" ry="22" fill="url(#jamGrad)" />
        <rect x="306" y="52"  width="48"  height="8"  rx="3" fill="#fecaca" opacity="0.5" />
      </g>

      {/* Milk — centre shelf, matches box at 44/30 w12/h34 → in vb coords
          left=440, top=168, w=120, h=190 */}
      <g filter="url(#softBlur)">
        <rect x="440" y="168" width="120" height="190" rx="10" fill="url(#milkGrad)" />
        <rect x="460" y="158" width="80"  height="14" rx="3" fill="#e2e8f0" opacity="0.6" />
        {/* cap */}
        <rect x="480" y="152" width="40"  height="10" rx="2" fill="#64748b" opacity="0.55" />
      </g>

      {/* Apple — bottom shelf, box at 16/58 w14/h22 → left=160, top=325, w=140, h=123 */}
      <g filter="url(#softBlur)">
        <ellipse cx="230" cy="395" rx="70" ry="60" fill="url(#appleGrad)" />
        {/* stem */}
        <path d="M230,335 Q232,320 238,316" stroke="#065f46" strokeWidth="3" fill="none" opacity="0.75" />
        {/* highlight */}
        <ellipse cx="210" cy="372" rx="14" ry="10" fill="#f0fdf4" opacity="0.35" />
      </g>

      {/* Chicken pack — bottom shelf right, box at 66/56 w22/h24 → left=660, top=314, w=220, h=134 */}
      <g filter="url(#softBlur)">
        <rect x="670" y="325" width="210" height="120" rx="12" fill="url(#chickenGrad)" />
        <rect x="690" y="345" width="170" height="82"  rx="6"  fill="#fef2f2" opacity="0.22" />
        {/* label */}
        <rect x="700" y="353" width="80"  height="14" rx="2" fill="#fff" opacity="0.7" />
      </g>

      {/* Top-shelf other cartons (ambient density) */}
      <g filter="url(#softBlur)" opacity="0.85">
        <rect x="680" y="50" width="80" height="48" rx="4" fill="#f59e0b" opacity="0.35" />
        <rect x="780" y="40" width="90" height="58" rx="6" fill="#60a5fa" opacity="0.3" />
      </g>

      {/* Vignette */}
      <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
        <stop offset="50%"  stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
      </radialGradient>
      <rect width="1000" height="560" fill="url(#vignette)" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Bounding box

function BoundingBox({ box, color, visible, delay, category }) {
  const corners = ['top-0 left-0', 'top-0 right-0', 'bottom-0 right-0', 'bottom-0 left-0']
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE, delay }}
          className="absolute pointer-events-none z-10 rounded-[6px]"
          style={{
            left:   `${box.left}%`,
            top:    `${box.top}%`,
            width:  `${box.w}%`,
            height: `${box.h}%`,
            border: `1px solid ${color}75`,
            boxShadow: `inset 0 0 24px ${color}22, 0 0 18px -4px ${color}66`,
          }}
        >
          {corners.map((pos, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.12 + i * 0.05, duration: 0.2 }}
              className={`absolute w-3.5 h-3.5 ${pos}`}
              style={{
                borderTop:    pos.includes('top-0')    ? `2px solid ${color}` : 'none',
                borderBottom: pos.includes('bottom-0') ? `2px solid ${color}` : 'none',
                borderLeft:   pos.includes('left-0')   ? `2px solid ${color}` : 'none',
                borderRight:  pos.includes('right-0')  ? `2px solid ${color}` : 'none',
                filter: `drop-shadow(0 0 4px ${color})`,
              }}
            />
          ))}
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.35, duration: 0.22 }}
            className="absolute -top-0 -translate-y-full left-0 mt-[-6px] px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest font-bold whitespace-nowrap"
            style={{ background: `${color}22`, color, border: `1px solid ${color}66`, backdropFilter: 'blur(6px)' }}
          >
            {category}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Detection card with product thumbnail

function DetectionCard({ det, visible, delay, onAttemptAdd }) {
  const isNew = det.type === 'new'
  const accent = isNew ? CYAN : EMERALD

  // Elbow polyline from the card's bottom-centre to the box's top-centre.
  // Coordinates live in a 100×100 viewBox (nonuniform-scale OK because we
  // use vectorEffect="non-scaling-stroke").
  const lineStartX = det.card.left + 11   // approx centre of 240px card at 1000px width
  const lineStartY = det.card.top + 16    // approx card bottom
  const lineEndX   = det.box.left + det.box.w / 2
  const lineEndY   = det.box.top

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.svg
            key={`anchor-${det.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: delay + 0.2 }}
            className="absolute inset-0 w-full h-full pointer-events-none z-[9] overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`grad-${det.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"  stopColor={accent} stopOpacity="1" />
                <stop offset="70%" stopColor={accent} stopOpacity="0.7" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <motion.path
              d={`M ${lineStartX} ${lineStartY} L ${lineStartX} ${(lineStartY + lineEndY) / 2} L ${lineEndX} ${(lineStartY + lineEndY) / 2} L ${lineEndX} ${lineEndY}`}
              fill="none"
              stroke={`url(#grad-${det.id})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              strokeWidth="1.5"
              style={{ filter: `drop-shadow(0 0 3px ${accent})` }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: delay + 0.2 }}
            />
          </motion.svg>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visible && (
          <motion.div
            key={`card-${det.id}`}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.32, ease: EASE, delay }}
            className="absolute z-20 w-[min(248px,32vw)] rounded-xl p-3 pointer-events-auto"
            style={{
              left: `${det.card.left}%`,
              top:  `${det.card.top}%`,
              background: 'rgba(11, 19, 38, 0.75)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: `1px solid ${accent}60`,
              boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 0 32px -6px ${accent}55`,
            }}
          >
            <div className="flex items-center gap-3">
              {/* Product thumbnail */}
              <div
                className="flex items-center justify-center w-11 h-11 rounded-lg flex-shrink-0 text-[22px]"
                style={{
                  background: `${accent}16`,
                  border: `1px solid ${accent}33`,
                  boxShadow: `inset 0 0 12px ${accent}22`,
                }}
                aria-hidden="true"
              >
                {det.emoji}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-80"
                  style={{ color: accent }}
                >
                  {isNew ? 'Object detected' : 'Existing item'}
                </span>
                <span className="font-bold text-white text-[14px] leading-tight mt-0.5 truncate">
                  {det.name}
                </span>
              </div>

              {isNew ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08, boxShadow: `0 0 22px ${accent}` }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onAttemptAdd(det)}
                  className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
                  style={{
                    background: CYAN_FILL,
                    color: '#003036',
                    boxShadow: `0 0 12px ${accent}aa`,
                  }}
                  aria-label={`Add ${det.name} to inventory`}
                >
                  <span className="material-symbols-outlined text-[20px] font-bold">add</span>
                </motion.button>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest flex-shrink-0"
                  style={{ background: `${accent}22`, color: accent }}
                >
                  <span className="material-symbols-outlined text-[12px]">check</span>
                  Saved
                </span>
              )}
            </div>

            <div
              className="mt-2 pt-2 flex items-center gap-2"
              style={{ borderTop: '1px solid rgba(148,163,184,0.2)' }}
            >
              <motion.span
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
              />
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-300">
                Confidence {det.conf.toFixed(1)}%
              </span>
              {isNew && (
                <span
                  className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest"
                  style={{ background: `${accent}18`, color: accent }}
                >
                  + Add
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ---------------------------------------------------------------------------
// Modal

export default function ARScanModal({ open, onClose }) {
  const reduced = usePrefersReducedMotion()
  const [stage, setStage] = useState('booting')
  const [attemptedAdd, setAttemptedAdd] = useState(null)
  const bootText = useTypewriter(BOOT_TEXT, 50, open && stage === 'booting' && !reduced)
  const bannerTimerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setStage('booting')
    setAttemptedAdd(null)
    if (reduced) { setStage('detected'); return }
    const t1 = setTimeout(() => setStage('scanning'), 900)
    const t2 = setTimeout(() => setStage('detected'), 2300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [open, reduced])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const handleAttemptAdd = (det) => {
    setAttemptedAdd(det)
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    bannerTimerRef.current = setTimeout(() => setAttemptedAdd(null), 3000)
  }

  const cardsVisible    = stage === 'detected'
  const bootVisible     = stage === 'booting' && !reduced
  const scanLineVisible = stage === 'scanning' && !reduced

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ar-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="AR fridge scan preview"
        >
          <motion.div
            key="ar-modal"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scaleY: 0.02 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scaleY: 0.02 }}
            transition={{ duration: reduced ? 0.15 : 0.4, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            style={{ transformOrigin: 'center' }}
            className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden"
          >
            <FridgeBackdrop />

            {/* HUD: status top-left */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="absolute top-4 left-4 z-30"
            >
              <div
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-full backdrop-blur-md"
                style={{ background: 'rgba(11,19,38,0.6)', border: `1px solid ${CYAN}4d`, boxShadow: `0 0 18px -4px ${CYAN}40` }}
              >
                <motion.span
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: CYAN, boxShadow: `0 0 8px ${CYAN}` }}
                />
                <span className="font-mono text-[11px] tracking-[0.22em] uppercase" style={{ color: '#a5f3fc' }}>
                  {bootVisible ? bootText : ACTIVE_TEXT}
                </span>
              </div>
            </motion.div>

            {/* Preview ribbon */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-30"
            >
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-[0.22em] uppercase font-bold backdrop-blur-md"
                style={{ background: `linear-gradient(90deg, ${CYAN}20, transparent)`, border: `1px solid ${CYAN}55`, color: '#a5f3fc' }}
              >
                <span className="material-symbols-outlined text-[12px]" style={{ color: CYAN }}>bolt</span>
                Preview · Shipping in iteration 2
              </span>
            </motion.div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-40 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-colors"
              style={{ background: 'rgba(11,19,38,0.65)', border: `1px solid ${CYAN}4d`, color: '#cffafe' }}
              aria-label="Close AR scan preview"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            {/* Scan line sweep */}
            <AnimatePresence>
              {scanLineVisible && (
                <motion.div
                  key="scanline"
                  initial={{ top: '-2%', opacity: 0 }}
                  animate={{ top: '102%', opacity: [0, 1, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.4, ease: 'linear', opacity: { times: [0, 0.15, 0.85, 1], duration: 1.4 } }}
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{
                    height: 2,
                    background: `linear-gradient(90deg, transparent, ${CYAN}, transparent)`,
                    boxShadow: `0 0 22px 4px ${CYAN}aa`,
                  }}
                />
              )}
            </AnimatePresence>

            {/* Detections */}
            {DETECTIONS.map((det, i) => {
              const color = det.type === 'new' ? CYAN : EMERALD
              const delay = i * 0.22
              return (
                <div key={det.id}>
                  <BoundingBox box={det.box} color={color} visible={cardsVisible} delay={delay} category={det.category} />
                  <DetectionCard det={det} visible={cardsVisible} delay={delay} onAttemptAdd={handleAttemptAdd} />
                </div>
              )
            })}

            {/* Iteration-2 banner */}
            <AnimatePresence>
              {attemptedAdd && (
                <motion.div
                  key="it2-banner"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="absolute left-1/2 bottom-6 -translate-x-1/2 z-40 w-[min(92%,460px)] px-4 py-3 rounded-xl backdrop-blur-md"
                  style={{
                    background: 'rgba(11,19,38,0.86)',
                    border: `1px solid ${CYAN}80`,
                    boxShadow: `0 0 36px -6px ${CYAN}66`,
                  }}
                >
                  <p className="font-mono text-[10px] tracking-[0.22em] uppercase mb-1" style={{ color: '#a5f3fc' }}>
                    Iteration 2 feature
                  </p>
                  <p className="text-white text-sm leading-snug">
                    Real-time fridge scanning ships in our next release. For now, add{' '}
                    <span className="font-bold" style={{ color: CYAN }}>{attemptedAdd.name}</span>{' '}
                    manually via the <span className="font-bold text-white">+</span> button on the fridge page.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
