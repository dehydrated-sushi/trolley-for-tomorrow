import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { API_BASE } from '../../lib/api'
import { findUncheckedMatches, markChecked } from '../../shared/shoppingList'
import { toast } from '../../shared/toastBus'

// Phases: 'idle' (no file picked), 'parsing' (OCR running), 'review'
// (editable draft shown), 'committing' (saving), 'done' (committed).
// There is also 'error' at any point.

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const EASE = [0.22, 1, 0.36, 1]

function blankRow() {
  return { name: '', qty: '1', price: '', _local: Math.random().toString(36).slice(2) }
}

export default function UploadReceiptPage() {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [draft, setDraft] = useState([]) // editable item rows
  const [sourceFilename, setSourceFilename] = useState('')
  const [sourceReceiptId, setSourceReceiptId] = useState(null)
  const [receiptScanStatus, setReceiptScanStatus] = useState('')
  const [receiptSessions, setReceiptSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedSessionItems, setSelectedSessionItems] = useState([])
  const [selectedSessionLoading, setSelectedSessionLoading] = useState(false)
  const [selectedSessionError, setSelectedSessionError] = useState('')
  const [committedCount, setCommittedCount] = useState(0)
  // Reconciliation panel state. `matches` is the list of
  // { item, matchedReceiptName } pairs computed right after a successful
  // commit. `selectedIds` tracks which of those the user wants to cross off
  // (default: all of them). `reconciled` flips to true after the user clicks
  // "Cross off", turning the panel into a small confirmation row.
  const [matches, setMatches] = useState([])
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [reconciled, setReconciled] = useState(false)
  const scanBtnControls = useAnimation()

  const setMsg = (txt, err = false) => {
    setMessage(txt)
    setIsError(err)
  }

  const loadReceiptSessions = async () => {
    setSessionsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/receipts/sessions?limit=50`)
      let data = {}
      try { data = await response.json() } catch { data = {} }
      if (response.ok) {
        const sessions = Array.isArray(data.sessions) ? data.sessions : []
        setReceiptSessions(sessions)
        if (selectedSession) {
          const updated = sessions.find((session) => session.id === selectedSession.id)
          if (updated) setSelectedSession(updated)
        }
      }
    } catch {
      // Keep the receipt workflow usable even if history cannot load.
    } finally {
      setSessionsLoading(false)
    }
  }

  const openReceiptSession = async (session) => {
    setSelectedSession(session)
    setSelectedSessionItems([])
    setSelectedSessionError('')
    setSelectedSessionLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/receipts/sessions/${session.id}`)
      let data = {}
      try { data = await response.json() } catch { data = {} }
      if (!response.ok) {
        setSelectedSessionError(data.error || `Could not load session #${session.id}.`)
        return
      }
      setSelectedSession(data.session || session)
      setSelectedSessionItems(Array.isArray(data.items) ? data.items : [])
    } catch (err) {
      setSelectedSessionError(`Could not load session #${session.id}: ${err.message}`)
    } finally {
      setSelectedSessionLoading(false)
    }
  }

  useEffect(() => {
    loadReceiptSessions()
  }, [])

  // Manage preview-image object URL lifecycle.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // --- File selection + validation ---
  const applyFile = (selected) => {
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      setMsg("That doesn't look like a photo. Upload a PNG or JPG.", true)
      return
    }
    if (selected.size > MAX_FILE_SIZE) {
      setMsg(
        `That file is ${(selected.size / 1024 / 1024).toFixed(1)} MB. Try a smaller photo (under 10 MB).`,
        true,
      )
      return
    }
    setFile(selected)
    setDraft([])
    setSourceReceiptId(null)
    setReceiptScanStatus('')
    setMsg('')
    setPhase('idle')
    setCommittedCount(0)
    // Scan button just went from disabled to enabled — pulse it so the user
    // notices. Real state change, not fake progress.
    scanBtnControls.start({
      scale: [1, 1.04, 1],
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    })
  }

  const handleFileChange = (e) => {
    applyFile(e.target.files?.[0] || null)
  }

  const handleRemoveFile = (e) => {
    e.stopPropagation()
    setFile(null)
    setDraft([])
    setSourceReceiptId(null)
    setReceiptScanStatus('')
    setMsg('')
    setPhase('idle')
    setCommittedCount(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- Drag and drop ---
  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (phase === 'parsing') return
    setIsDraggingOver(true)
  }
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }
  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    if (phase === 'parsing') return
    applyFile(e.dataTransfer.files?.[0] || null)
  }

  // --- Step 1: parse (OCR) ---
  const handleParse = async () => {
    if (!file) {
      setMsg('Please select a receipt image first.', true)
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    setPhase('parsing')
    setMsg('')
    try {
      const response = await fetch(`${API_BASE}/api/receipts/parse`, {
        method: 'POST',
        body: formData,
      })
      let data = {}
      try { data = await response.json() } catch { data = {} }
      if (!response.ok) {
        setMsg(data.error || `Parse failed. Status: ${response.status}`, true)
        setPhase('idle')
        return
      }

      const items = (data.items || []).map((it) => ({
        name: it.name || '',
        qty: it.qty == null ? '1' : String(it.qty),
        price: it.price == null ? '' : String(it.price),
        _local: Math.random().toString(36).slice(2),
      }))

      // If OCR didn't find anything, show one blank row to start manual entry
      setDraft(items.length ? items : [blankRow()])
      setSourceFilename(data.filename || file.name)
      setSourceReceiptId(data.receipt_id || null)
      setReceiptScanStatus(data.scan_status || 'parsed')
      setMsg(data.message || `Found ${items.length} item(s). Review and edit before confirming.`)
      setPhase('review')
      loadReceiptSessions()
    } catch (err) {
      setMsg(`Something went wrong: ${err.message}`, true)
      setPhase('idle')
    }
  }

  // --- Draft editing ---
  const updateRow = (localId, field, value) => {
    setDraft((rows) =>
      rows.map((r) => (r._local === localId ? { ...r, [field]: value } : r))
    )
  }

  const removeRow = (localId) => {
    setDraft((rows) => rows.filter((r) => r._local !== localId))
  }

  const addRow = () => {
    setDraft((rows) => [...rows, blankRow()])
  }

  const resetFlow = () => {
    setFile(null)
    setDraft([])
    setMsg('')
    setPhase('idle')
    setSourceFilename('')
    setSourceReceiptId(null)
    setReceiptScanStatus('')
    setCommittedCount(0)
    setMatches([])
    setSelectedIds(new Set())
    setReconciled(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- Reconciliation handlers ---
  const toggleMatchSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmReconciliation = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    markChecked(ids)
    setReconciled(true)
    toast.show({
      message: `Crossed ${ids.length} item${ids.length !== 1 ? 's' : ''} off your shopping list`,
      tone: 'default',
    })
  }

  const dismissReconciliation = () => {
    setMatches([])
    setSelectedIds(new Set())
    setReconciled(false)
  }

  // --- Step 2: commit (save to fridge) ---
  const validRows = draft.filter((r) => r.name.trim() !== '')
  const canCommit = validRows.length > 0 && phase === 'review'

  const handleCommit = async () => {
    if (!canCommit) return
    setPhase('committing')
    setMsg('')
    try {
      const payload = {
        filename: sourceFilename || 'manual_entry',
        receipt_id: sourceReceiptId,
        items: validRows.map((r) => ({
          name: r.name.trim(),
          qty: r.qty.trim() || 1,
          price: r.price.trim() === '' ? null : r.price,
        })),
      }
      const response = await fetch(`${API_BASE}/api/receipts/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      let data = {}
      try { data = await response.json() } catch { data = {} }
      if (!response.ok) {
        setMsg(data.error || `Could not save. Status: ${response.status}`, true)
        setPhase('review')
        return
      }
      setCommittedCount(data.count || 0)
      setSourceReceiptId(data.receipt_id || sourceReceiptId)
      setReceiptScanStatus(data.scan_status || 'saved')
      setMsg(data.message || `Added ${data.count} item(s) to your fridge.`)
      setPhase('done')
      loadReceiptSessions()

      // Reconcile against the shopping list. We match on the names the user
      // confirmed (validRows), not the raw OCR output, because the review
      // step is the source of truth.
      const hits = findUncheckedMatches(validRows)
      setMatches(hits)
      setSelectedIds(new Set(hits.map((h) => h.item.id)))
      setReconciled(false)

      // Prefetch budget-status so Dashboard shows updated spending immediately.
      // Fire-and-forget; we don't care about the result here.
      fetch(`${API_BASE}/api/profile/budget-status`).catch(() => {})
    } catch (err) {
      setMsg(`Something went wrong: ${err.message}`, true)
      setPhase('review')
    }
  }

  // --- Manual entry (no receipt) ---
  const startManualEntry = () => {
    setFile(null)
    setDraft([blankRow()])
    setSourceFilename('manual_entry')
    setSourceReceiptId(null)
    setReceiptScanStatus('')
    setMsg('Add items manually. Tap "+ Add item" for more rows.')
    setPhase('review')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="px-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">Upload a receipt</h1>
          <p className="text-on-surface-variant mt-2 max-w-lg text-lg">
            Drop in a photo of your grocery receipt and we&apos;ll pull out the items. You review and confirm before anything hits your fridge.
          </p>
        </div>
        <div className="flex gap-3">
          {phase === 'done' && (
            <Link to="/fridge" className="px-6 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold shadow-lg shadow-primary/20 inline-flex items-center gap-2">
              View fridge
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          )}
          {phase === 'review' && (
            <Link to="/fridge" className="px-6 py-2.5 rounded-full bg-surface-container-highest text-primary font-semibold hover:bg-error-container/40 hover:text-error transition-colors">
              Discard draft
            </Link>
          )}
        </div>
      </div>

      {/* Status banner */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-start gap-2 ${
            isError
              ? 'bg-error-container/30 text-error'
              : phase === 'done'
                ? 'bg-secondary-container/40 text-on-secondary-container'
                : 'bg-surface-container-low text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base flex-shrink-0 mt-px">
            {isError ? 'error' : phase === 'done' ? 'check_circle' : 'info'}
          </span>
          <span>{message}</span>
        </div>
      )}

      {/* PHASE: done */}
      {phase === 'done' && (
        <div className="bg-surface-container-lowest rounded-[2.5rem] p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-primary-fixed rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-on-primary-fixed">check_circle</span>
          </div>
          <h2 className="text-3xl font-bold text-on-surface mb-2">Added to your fridge</h2>
          <p className="text-on-surface-variant mb-8">
            {committedCount} item{committedCount !== 1 ? 's' : ''} saved. They&apos;re ready for meal suggestions.
          </p>
          {sourceReceiptId && (
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high text-on-surface-variant text-sm font-semibold">
              <span className="material-symbols-outlined text-base">receipt_long</span>
              Receipt session #{sourceReceiptId}
              {receiptScanStatus && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs uppercase tracking-widest">
                  {receiptScanStatus}
                </span>
              )}
            </div>
          )}

          {/* Shopping-list reconciliation panel. Only renders when the
              confirmed items intersect the user's unchecked shopping list.
              Post-confirm it collapses to a compact acknowledgement so the
              user has clear feedback without losing context. */}
          <AnimatePresence mode="wait">
            {matches.length > 0 && !reconciled && (
              <motion.div
                key="reconcile-panel"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="mb-8 text-left bg-primary-fixed/40 rounded-3xl p-6 md:p-8 border border-primary/20"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary">playlist_add_check</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-on-surface">
                      {matches.length === 1
                        ? '1 item from your shopping list was on this receipt'
                        : `${matches.length} items from your shopping list were on this receipt`}
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      Cross off what you actually picked up. Uncheck anything you didn&apos;t buy.
                    </p>
                  </div>
                </div>

                <motion.ul
                  className="space-y-2 mb-5"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                  }}
                >
                  {matches.map(({ item, matchedReceiptName }) => {
                    const selected = selectedIds.has(item.id)
                    return (
                      <motion.li
                        key={item.id}
                        variants={{
                          hidden: { opacity: 0, y: 8 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleMatchSelection(item.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors text-left ${
                            selected
                              ? 'bg-white shadow-sm'
                              : 'bg-white/40 hover:bg-white/70'
                          }`}
                        >
                          <motion.span
                            animate={{
                              scale: selected ? 1 : 0.9,
                              backgroundColor: selected ? 'rgb(16 185 129)' : 'rgb(255 255 255)',
                              borderColor: selected ? 'rgb(16 185 129)' : 'rgb(156 163 175)',
                            }}
                            transition={{ duration: 0.18, ease: EASE }}
                            className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                          >
                            <AnimatePresence>
                              {selected && (
                                <motion.span
                                  key="tick"
                                  initial={{ scale: 0, rotate: -45 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0 }}
                                  transition={{ duration: 0.18, ease: EASE }}
                                  className="material-symbols-outlined text-[14px] text-white font-bold"
                                  style={{ fontVariationSettings: "'wght' 800" }}
                                >
                                  check
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                              {item.name}
                            </p>
                            <p className="text-[11px] text-on-surface-variant/70 truncate">
                              matched to &ldquo;{matchedReceiptName}&rdquo; on your receipt
                            </p>
                          </div>
                        </button>
                      </motion.li>
                    )
                  })}
                </motion.ul>

                <div className="flex items-center justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={dismissReconciliation}
                    className="px-5 py-2 text-sm text-on-surface-variant font-semibold hover:bg-surface-container-high rounded-full transition-colors"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={confirmReconciliation}
                    disabled={selectedIds.size === 0}
                    className="px-5 py-2 text-sm rounded-full bg-primary text-on-primary font-bold shadow-md shadow-primary/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">check</span>
                    Cross off {selectedIds.size > 0 ? selectedIds.size : ''}
                  </button>
                </div>
              </motion.div>
            )}

            {reconciled && (
              <motion.div
                key="reconcile-done"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-container/60 text-on-secondary-container text-sm font-semibold"
              >
                <span className="material-symbols-outlined text-base">task_alt</span>
                Shopping list updated
                <Link
                  to="/shopping"
                  className="ml-2 text-primary hover:underline text-xs uppercase tracking-widest font-bold"
                >
                  View list
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/fridge" className="px-8 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-full shadow-md inline-flex items-center gap-2">
              Go to fridge
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link to="/meals" className="px-8 py-3 bg-surface-container-high text-on-surface font-bold rounded-full hover:bg-surface-container-highest transition-colors">
              See meal ideas
            </Link>
            <button
              type="button"
              onClick={resetFlow}
              className="px-8 py-3 text-on-surface-variant font-semibold hover:bg-surface-container-high rounded-full transition-colors"
            >
              Upload another
            </button>
          </div>
        </div>
      )}

      {/* PHASES: idle / parsing (pre-review) */}
      {(phase === 'idle' || phase === 'parsing') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <motion.div
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              animate={{ scale: isDraggingOver ? 1.01 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className={`relative group cursor-pointer overflow-hidden rounded-[2.5rem] border-2 transition-colors h-[400px] flex flex-col items-center justify-center text-center p-8 ${
                isDraggingOver
                  ? 'bg-primary/10 border-solid border-primary'
                  : file
                    ? 'bg-surface-container-lowest border-solid border-primary/40'
                    : 'bg-surface-container-lowest border-dashed border-outline-variant hover:border-primary'
              }`}
            >
              <AnimatePresence mode="wait">
                {isDraggingOver ? (
                  <motion.div
                    key="dragging"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="relative z-10"
                  >
                    <motion.div
                      className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30"
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <span className="material-symbols-outlined text-4xl text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                        download
                      </span>
                    </motion.div>
                    <h3 className="text-2xl font-extrabold text-primary mb-1">Drop it here</h3>
                    <p className="text-on-surface-variant text-sm">Release to upload</p>
                  </motion.div>
                ) : file && previewUrl ? (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <div className="relative w-40 h-40 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg bg-surface-container">
                      <motion.img
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        src={previewUrl}
                        alt="Receipt preview"
                        className="w-full h-full object-cover"
                      />
                      {/* Scanning-line overlay during OCR */}
                      {phase === 'parsing' && (
                        <>
                          <div className="absolute inset-0 bg-primary/10" />
                          <motion.div
                            className="absolute left-0 right-0 h-[3px] pointer-events-none"
                            style={{
                              background:
                                'linear-gradient(90deg, transparent, #10b981, transparent)',
                              boxShadow: '0 0 14px 2px rgba(16,185,129,0.7)',
                            }}
                            initial={{ top: 0 }}
                            animate={{ top: '100%' }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                          />
                        </>
                      )}
                      {phase !== 'parsing' && (
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          aria-label="Remove file"
                          className="group/remove absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/95 text-on-surface flex items-center justify-center shadow-md hover:bg-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover/remove:rotate-90">close</span>
                        </button>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-on-surface mb-1 max-w-full truncate px-4">{file.name}</h3>
                    <p className="text-on-surface-variant text-sm">
                      {(file.size / 1024).toFixed(1)} KB
                      {phase === 'parsing' ? ' · Reading items...' : ' · Click to change'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="relative z-10"
                  >
                    <div className="w-20 h-20 bg-primary-fixed rounded-3xl flex items-center justify-center mx-auto mb-6 transform group-hover:rotate-6 transition-transform">
                      <span className="material-symbols-outlined text-4xl text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>
                        cloud_upload
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-on-surface mb-2">Drop your receipt here</h3>
                    <p className="text-on-surface-variant mb-6 max-w-xs mx-auto">
                      PNG or JPG. A clear, well-lit photo works best.
                    </p>
                    <span className="bg-surface-container-high px-8 py-3 rounded-full font-bold text-on-surface inline-block">
                      Browse Files
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Action buttons: Scan + Manual fallback */}
            <div className="flex flex-wrap gap-3">
              <motion.button
                type="button"
                animate={scanBtnControls}
                onClick={handleParse}
                disabled={!file || phase === 'parsing'}
                className="flex-grow px-6 py-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">
                  {phase === 'parsing' ? 'hourglass_top' : 'auto_awesome'}
                </span>
                {phase === 'parsing'
                  ? 'Scanning receipt...'
                  : !file
                    ? 'Choose a file first'
                    : 'Scan receipt'}
              </motion.button>
              <button
                type="button"
                onClick={startManualEntry}
                disabled={phase === 'parsing'}
                className="px-6 py-3 rounded-full bg-surface-container-high text-on-surface font-bold hover:bg-surface-container-highest transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base align-middle mr-1">edit</span>
                Enter manually
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-on-surface">Receipt sessions</h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Latest scans saved in the database.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadReceiptSessions}
                  disabled={sessionsLoading}
                  className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
                  title="Refresh receipt sessions"
                  aria-label="Refresh receipt sessions"
                >
                  <span className="material-symbols-outlined text-base">
                    {sessionsLoading ? 'hourglass_top' : 'refresh'}
                  </span>
                </button>
              </div>

              {receiptSessions.length === 0 ? (
                <div className="py-6 text-sm text-on-surface-variant">
                  {sessionsLoading ? 'Loading sessions...' : 'No receipt sessions yet.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {receiptSessions.map((session) => {
                    const active = selectedSession?.id === session.id || (sourceReceiptId && session.id === sourceReceiptId)
                    return (
                      <button
                        type="button"
                        key={session.id}
                        onClick={() => openReceiptSession(session)}
                        className={`w-full p-3 rounded-2xl border text-left transition-colors ${
                          active
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-surface-container-low border-transparent hover:bg-surface-container-high'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-on-surface truncate">
                              Session #{session.id}
                            </p>
                            <p className="text-xs text-on-surface-variant truncate">
                              {session.original_filename || 'receipt'}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            session.scan_status === 'saved'
                              ? 'bg-primary/10 text-primary'
                              : session.scan_status === 'failed'
                                ? 'bg-error-container/40 text-error'
                                : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {session.scan_status || 'new'}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
                          <span>{session.item_count || 0} item{session.item_count === 1 ? '' : 's'}</span>
                          <span>
                            {session.total_amount != null
                              ? `$${Number(session.total_amount).toFixed(2)}`
                              : 'No total'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedSession && (
                <div className="mt-5 pt-5 border-t border-outline-variant/20">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-on-surface">
                        Bought in session #{selectedSession.id}
                      </h4>
                      <p className="text-xs text-on-surface-variant truncate">
                        {selectedSession.original_filename || 'receipt'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSession(null)
                        setSelectedSessionItems([])
                        setSelectedSessionError('')
                      }}
                      className="w-8 h-8 rounded-full hover:bg-surface-container-high text-on-surface-variant inline-flex items-center justify-center"
                      aria-label="Close receipt session details"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  {selectedSessionLoading ? (
                    <div className="py-5 text-sm text-on-surface-variant">Loading items...</div>
                  ) : selectedSessionError ? (
                    <div className="py-5 text-sm text-error">{selectedSessionError}</div>
                  ) : selectedSessionItems.length === 0 ? (
                    <div className="py-5 text-sm text-on-surface-variant">
                      No bought items saved for this session yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {selectedSessionItems.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[1fr_auto] gap-3 items-start p-3 rounded-2xl bg-white"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              Qty: {item.qty || '1'}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-primary">
                            {item.price != null ? `$${Number(item.price).toFixed(2)}` : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-on-surface mb-4">How it works</h3>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <p className="text-sm text-on-surface-variant">Upload a photo of your grocery receipt.</p>
                </li>
                <li className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <p className="text-sm text-on-surface-variant">
                    We read the items and show them to you. Nothing is saved yet.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <p className="text-sm text-on-surface-variant">Edit names, qty, and price. Add missing items or remove mistakes.</p>
                </li>
                <li className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                  <p className="text-sm text-on-surface-variant">Hit Confirm and they&apos;re added to your fridge.</p>
                </li>
              </ol>
            </div>
            <div className="bg-tertiary-container/20 rounded-2xl p-5 border-l-4 border-tertiary">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary flex-shrink-0">info</span>
                <div>
                  <p className="text-sm font-bold text-on-tertiary-container mb-1">You have the final say</p>
                  <p className="text-xs text-on-tertiary-container/80">
                    Once we scan it, you can fix names, quantities, and prices before anything saves.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE: review (editable draft) */}
      {phase === 'review' || phase === 'committing' ? (
        <div className="bg-surface-container-lowest rounded-[2.5rem] p-6 md:p-10 shadow-sm">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-on-surface">Review items</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                {validRows.length} item{validRows.length !== 1 ? 's' : ''} ready to save.
                {' '}Edit anything below before confirming.
                {sourceReceiptId ? ` Receipt session #${sourceReceiptId}.` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={addRow}
              disabled={phase === 'committing'}
              className="px-5 py-2 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-container-highest transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Add item
            </button>
          </div>

          {/* Column headers (desktop only) */}
          <div className="hidden md:grid grid-cols-[1fr_120px_120px_40px] gap-3 px-3 mb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            <span>Item name</span>
            <span>Qty / size</span>
            <span>Price ($)</span>
            <span></span>
          </div>

          {/* Editable rows */}
          <motion.div
            className="space-y-2 mb-8"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
            }}
          >
            {draft.length === 0 && (
              <div className="text-center py-8 text-on-surface-variant text-sm">
                No items. Click &quot;+ Add item&quot; to start.
              </div>
            )}
            {draft.map((row) => {
              const blank = row.name.trim() === ''
              return (
                <motion.div
                  key={row._local}
                  variants={{
                    hidden: { opacity: 0, y: 8, scale: 0.97 },
                    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE } },
                  }}
                  className={`grid grid-cols-[1fr_100px_100px_40px] md:grid-cols-[1fr_120px_120px_40px] gap-2 md:gap-3 items-center p-2 rounded-xl ${
                    blank ? 'bg-surface-container-low/40' : 'bg-surface-container-low'
                  }`}
                >
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(row._local, 'name', e.target.value)}
                    placeholder="e.g. chicken breast"
                    disabled={phase === 'committing'}
                    className="px-3 py-2 rounded-lg bg-white text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="text"
                    value={row.qty}
                    onChange={(e) => updateRow(row._local, 'qty', e.target.value)}
                    placeholder="1"
                    disabled={phase === 'committing'}
                    className="px-3 py-2 rounded-lg bg-white text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.price}
                    onChange={(e) => updateRow(row._local, 'price', e.target.value)}
                    placeholder="—"
                    disabled={phase === 'committing'}
                    className="px-3 py-2 rounded-lg bg-white text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row._local)}
                    disabled={phase === 'committing'}
                    className="text-on-surface-variant hover:text-error hover:bg-error-container/20 w-10 h-10 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                    title="Remove this item"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Commit / cancel buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-outline-variant/20 flex-wrap">
            <button
              type="button"
              onClick={resetFlow}
              disabled={phase === 'committing'}
              className="px-6 py-2.5 text-on-surface-variant font-semibold hover:bg-surface-container-high rounded-full transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={!canCommit || phase === 'committing'}
              className="px-8 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {phase === 'committing' ? (
                <>
                  <span className="material-symbols-outlined text-base">hourglass_top</span>
                  Saving...
                </>
              ) : (
                <>
                  Confirm &amp; add to fridge
                  <span className="material-symbols-outlined text-base">check</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
