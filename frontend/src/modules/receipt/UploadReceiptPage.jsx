import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../../lib/api'

// Phases: 'idle' (no file picked), 'parsing' (OCR running), 'review'
// (editable draft shown), 'committing' (saving), 'done' (committed).
// There is also 'error' at any point.

function blankRow() {
  return { name: '', qty: '1', price: '', _local: Math.random().toString(36).slice(2) }
}

export default function UploadReceiptPage() {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [draft, setDraft] = useState([]) // editable item rows
  const [sourceFilename, setSourceFilename] = useState('')
  const [committedCount, setCommittedCount] = useState(0)

  const setMsg = (txt, err = false) => {
    setMessage(txt)
    setIsError(err)
  }

  // --- File selection ---
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null
    setFile(selected)
    setDraft([])
    setMsg('')
    setPhase(selected ? 'idle' : 'idle')
    setCommittedCount(0)
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
      setMsg(data.message || `Found ${items.length} item(s). Review and edit before confirming.`)
      setPhase('review')
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
    setCommittedCount(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
      setMsg(data.message || `Added ${data.count} item(s) to your fridge.`)
      setPhase('done')

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
    setMsg('Add items manually. Tap "+ Add item" for more rows.')
    setPhase('review')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="px-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">New Receipt.</h1>
          <p className="text-on-surface-variant mt-2 max-w-lg text-lg">
            Upload a receipt photo — we&apos;ll read it with OCR, then you review and confirm before anything hits your fridge.
          </p>
        </div>
        <div className="flex gap-3">
          {phase === 'done' ? (
            <Link to="/fridge" className="px-6 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold shadow-lg shadow-primary/20 inline-flex items-center gap-2">
              View fridge
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          ) : (
            <Link to="/fridge" className="px-6 py-2.5 rounded-full bg-surface-container-highest text-primary font-semibold hover:bg-surface-container-high transition-colors">
              Cancel
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
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer overflow-hidden rounded-[2.5rem] bg-surface-container-lowest border-2 border-dashed border-outline-variant hover:border-primary transition-colors h-[400px] flex flex-col items-center justify-center text-center p-8"
            >
              <div className="relative z-10">
                <div className="w-20 h-20 bg-primary-fixed rounded-3xl flex items-center justify-center mx-auto mb-6 transform group-hover:rotate-6 transition-transform">
                  <span className="material-symbols-outlined text-4xl text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_upload</span>
                </div>
                {file ? (
                  <>
                    <h3 className="text-2xl font-bold text-on-surface mb-2">{file.name}</h3>
                    <p className="text-on-surface-variant mb-6">
                      {(file.size / 1024).toFixed(1)} KB &middot; Click to change
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold text-on-surface mb-2">Drop your receipt here</h3>
                    <p className="text-on-surface-variant mb-6 max-w-xs mx-auto">
                      PNG, JPG, or PDF from any Australian retailer.
                    </p>
                  </>
                )}
                <span className="bg-surface-container-high px-8 py-3 rounded-full font-bold text-on-surface inline-block">
                  Browse Files
                </span>
              </div>
            </div>

            {/* Action buttons: Scan + Manual fallback */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleParse}
                disabled={!file || phase === 'parsing'}
                className="flex-grow px-6 py-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">
                  {phase === 'parsing' ? 'hourglass_top' : 'auto_awesome'}
                </span>
                {phase === 'parsing' ? 'Scanning receipt...' : 'Scan receipt'}
              </button>
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
              <h3 className="text-xl font-bold text-on-surface mb-4">How it works</h3>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <p className="text-sm text-on-surface-variant">Upload a photo of your grocery receipt.</p>
                </li>
                <li className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <p className="text-sm text-on-surface-variant">
                    OCR reads the items and shows them to you — nothing is saved yet.
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
                  <p className="text-sm font-bold text-on-tertiary-container mb-1">OCR isn&apos;t perfect</p>
                  <p className="text-xs text-on-tertiary-container/80">
                    Always review the detected items before confirming — you can fix any mistakes in the next step.
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
          <div className="space-y-2 mb-8">
            {draft.length === 0 && (
              <div className="text-center py-8 text-on-surface-variant text-sm">
                No items. Click &quot;+ Add item&quot; to start.
              </div>
            )}
            {draft.map((row) => {
              const blank = row.name.trim() === ''
              return (
                <div
                  key={row._local}
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
                </div>
              )
            })}
          </div>

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
