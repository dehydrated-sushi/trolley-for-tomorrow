/**
 * Tiny event-bus for firing toasts from anywhere in the app.
 *
 * Usage:
 *   import { toast } from '../../shared/toastBus'
 *   toast.show({ message: 'Added milk to your shopping list' })
 *   toast.show({ message: 'Already in list', tone: 'muted' })
 *   toast.show({ message: 'Added', action: { label: 'Undo', onClick: undoFn } })
 *
 * Only one toast renders at a time — a new `show()` replaces whatever is
 * visible. This is deliberate; queueing toasts is almost always worse UX
 * than showing the latest action.
 */

const listeners = new Set()
let nextId = 1

export const toast = {
  /**
   * Fire a toast.
   * @param {object} opts
   * @param {string} opts.message - required
   * @param {'default'|'muted'|'error'} [opts.tone] - visual tone
   * @param {number} [opts.duration] - ms before auto-dismiss, default 3000
   * @param {{label: string, onClick: () => void}} [opts.action] - optional button
   */
  show({ message, tone = 'default', duration = 3000, action } = {}) {
    if (!message) return
    const payload = { id: nextId++, message, tone, duration, action }
    listeners.forEach((fn) => fn(payload))
  },

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
