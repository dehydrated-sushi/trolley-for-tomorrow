import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)

    // Mock login
    if (form.email === 'jasmine@gmail.com' && form.password === '123456') {
      login('mock-token-jasmine')
      navigate('/dashboard')
      setLoading(false)
      return
    }

    // Real API — connect when backend is ready
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrors({ password: data.message || 'Invalid email or password' })
        return
      }
      login(data.token)
      navigate('/dashboard')
    } catch {
      setErrors({ password: 'Server error, please try again' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4fbf6] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Test credentials hint */}
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-amber-800">Test credentials</span>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Demo only</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-700 font-medium">Email</span>
              <button
                onClick={() => set('email', 'jasmine@gmail.com')}
                className="font-mono bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-amber-800 hover:bg-amber-50 transition-colors"
              >
                jasmine@gmail.com
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-700 font-medium">Password</span>
              <button
                onClick={() => set('password', '123456')}
                className="font-mono bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-amber-800 hover:bg-amber-50 transition-colors"
              >
                123456
              </button>
            </div>
          </div>
          <p className="text-[11px] text-amber-600 mt-2.5 font-light">
            Click the values above to auto-fill, then press Sign in.
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white border border-[#cce4d6] rounded-2xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="bg-[#0f2418] px-8 py-8 text-center">
            <Link to="/">
              <span className="font-serif text-2xl text-white tracking-tight">
                Trolley<span className="text-[#5cad76]"> for Tomorrow</span>
              </span>
            </Link>
            <p className="text-white/40 text-sm font-light mt-2">Welcome back</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8 flex flex-col gap-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#2d4a38] mb-1.5">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="you@example.com"
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                  ${errors.email ? 'border-red-400 bg-red-50' : 'border-[#cce4d6] focus:border-[#5cad76] bg-white'}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#2d4a38]">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#5cad76] hover:text-[#3e7a52] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your password"
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                  ${errors.password ? 'border-red-400 bg-red-50' : 'border-[#cce4d6] focus:border-[#5cad76] bg-white'}`}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
                ${loading
                  ? 'bg-[#cce4d6] text-[#5a7a68] cursor-not-allowed'
                  : 'bg-[#1e3d2a] text-white hover:bg-[#2d5a3d] hover:-translate-y-px'
                }`}
            >
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

          </div>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-sm text-[#5a7a68]">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#3e7a52] font-medium hover:text-[#2d5a3d] transition-colors">
                Sign up free
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}