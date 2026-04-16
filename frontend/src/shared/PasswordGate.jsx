import { useState } from 'react'

const SITE_PASSWORD = 'TA23-2026'
const SESSION_KEY   = 'trolley_for_tomorrow_access'

export function usePasswordGate() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true'
  )

  const unlock = (password) => {
    if (password === SITE_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setUnlocked(true)
      return true
    }
    return false
  }

  return { unlocked, unlock }
}

export default function PasswordGate({ onUnlock }) {
  const [input, setInput]   = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = () => {
  if (!input.trim()) { setError('Please enter the access password'); return }
  setLoading(true)
  setTimeout(() => {
    const success = onUnlock(input)  // ← 把 input 传给 onUnlock
    if (!success) {
      setError('Incorrect password. Please try again.')
      setInput('')
    }
    setLoading(false)
  }, 600)
}

  return (
    <div className="min-h-screen bg-[#0f2418] flex items-center justify-center px-4">

      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#5cad76]/8 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#5cad76]/5 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-serif text-3xl text-white tracking-tight mb-2">
            Trolley<span className="text-[#5cad76]"> for Tomorrow</span>
          </div>
          <p className="text-white/35 text-sm font-light">
            This site is password protected
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-7 py-8">
          <div className="text-white/60 text-sm font-light mb-5 text-center leading-relaxed">
            Enter the access password to continue
          </div>

          {/* Input */}
          <div className="mb-4">
            <input
              type="password"
              value={input}
              onChange={e => { setInput(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Access password"
              autoFocus
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors bg-white/8 text-white placeholder-white/25
                ${error
                  ? 'border-red-400/60'
                  : 'border-white/15 focus:border-[#5cad76]/60'
                }`}
            />
            {error && (
              <p className="text-xs text-red-400 mt-2 text-center">{error}</p>
            )}
          </div>

          {/* Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
              ${loading
                ? 'bg-[#5cad76]/40 text-white/50 cursor-not-allowed'
                : 'bg-[#5cad76] text-[#0f2418] hover:bg-[#8dcca0] hover:-translate-y-px'
              }`}
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-[#0f2418]/30 border-t-[#0f2418] rounded-full animate-spin" />
            )}
            {loading ? 'Verifying...' : 'Enter site'}
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-white/20 text-xs mt-6">
          FIT5120 Industry Experience Studio — Monash University 2026
        </p>

      </div>
    </div>
  )
}