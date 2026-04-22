import { useState } from 'react'
import { API_BASE } from '../lib/api'

/**
 * Floating "Reset test data" button.
 * Wipes receipt_items, user_budget, user_preferences via POST /api/dev/reset.
 * Meant for demo/testing only — remove the render call in AppShell before prod.
 */
export default function DevResetButton() {
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null) // {ok: bool, msg: string}

  const handleClick = async () => {
    const confirmed = window.confirm(
      'Reset all test data?\n\n' +
      'This will clear:\n' +
      '  • Fridge items (every scanned/manual receipt)\n' +
      '  • Weekly budget\n' +
      '  • Dietary preferences\n\n' +
      'Recipes and ingredient categories stay. This cannot be undone.'
    )
    if (!confirmed) return

    setBusy(true)
    setFlash(null)
    try {
      const res = await fetch(`${API_BASE}/api/dev/reset`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFlash({ ok: false, msg: data.error || `Reset failed (${res.status})` })
        return
      }
      setFlash({ ok: true, msg: data.message || 'Reset complete.' })
      // Give user a beat to see the message, then reload so all pages pick up
      // the empty state cleanly.
      setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      setFlash({ ok: false, msg: `Reset failed: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {flash && (
        <div
          className={`pointer-events-auto px-4 py-2 rounded-xl shadow-lg text-sm font-semibold ${
            flash.ok ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-error'
          }`}
        >
          <span className="material-symbols-outlined text-base align-middle mr-1">
            {flash.ok ? 'check_circle' : 'error'}
          </span>
          {flash.msg}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title="Dev tool: wipe fridge, budget, and dietary preferences"
        className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-on-surface/80 text-white text-xs font-bold shadow-lg hover:bg-on-surface transition-colors disabled:opacity-50 backdrop-blur-sm"
      >
        <span className="material-symbols-outlined text-base">
          {busy ? 'hourglass_top' : 'restart_alt'}
        </span>
        {busy ? 'Resetting…' : 'Reset test data'}
      </button>
    </div>
  )
}
