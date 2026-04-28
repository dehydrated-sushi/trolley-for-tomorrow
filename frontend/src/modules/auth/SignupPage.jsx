import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed]   = useState(false)

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())     e.name    = 'Name is required'
    if (!form.email.trim())    e.email   = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password)        e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (!form.confirm)         e.confirm  = 'Please confirm your password'
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match'
    if (!agreed)               e.agreed   = 'You must agree to the terms'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    // TODO: connect to auth API
    setTimeout(() => {
      setLoading(false)
      navigate('/dashboard')
    }, 1000)
  }

  const strengthLevel = (pw) => {
    if (!pw) return 0
    let score = 0
    if (pw.length >= 8)          score++
    if (/[A-Z]/.test(pw))        score++
    if (/[0-9]/.test(pw))        score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    return score
  }

  const strength = strengthLevel(form.password)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-[#5cad76]', 'bg-[#3e7a52]'][strength]

  return (
    <div className="min-h-screen bg-[#f4fbf6] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#cce4d6] rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="bg-[#0f2418] px-8 py-8 text-center">
          <Link to="/">
            <span className="font-serif text-2xl text-white tracking-tight">
              Trolley<span className="text-[#5cad76]"> for Tomorrow</span>
            </span>
          </Link>
          <p className="text-white/40 text-sm font-light mt-2">Create your free account</p>
        </div>

        {/* Form */}
        <div className="px-8 py-8 flex flex-col gap-4">

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-[#2d4a38] mb-1.5">Full name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Your name"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                ${errors.name ? 'border-red-400 bg-red-50' : 'border-[#cce4d6] focus:border-[#5cad76] bg-white'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-[#2d4a38] mb-1.5">Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                ${errors.email ? 'border-red-400 bg-red-50' : 'border-[#cce4d6] focus:border-[#5cad76] bg-white'}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-[#2d4a38] mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="At least 8 characters"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                ${errors.password ? 'border-red-400 bg-red-50' : 'border-[#cce4d6] focus:border-[#5cad76] bg-white'}`}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}

            {/* Password strength bar */}
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300
                        ${i <= strength ? strengthColor : 'bg-[#e8f5ed]'}`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium
                  ${strength <= 1 ? 'text-red-500' : strength === 2 ? 'text-amber-600' : 'text-[#3e7a52]'}`}>
                  {strengthLabel}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium text-[#2d4a38] mb-1.5">Confirm password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Re-enter your password"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                ${errors.confirm ? 'border-red-400 bg-red-50' : 'border-[#cce4d6] focus:border-[#5cad76] bg-white'}`}
            />
            {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
          </div>

          {/* Terms */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => { setAgreed(e.target.checked); setErrors(p => ({ ...p, agreed: '' })) }}
                className="mt-0.5 w-4 h-4 accent-[#5cad76] flex-shrink-0"
              />
              <span className="text-sm text-[#5a7a68] font-light leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="text-[#3e7a52] underline underline-offset-2">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-[#3e7a52] underline underline-offset-2">Privacy Policy</Link>
              </span>
            </label>
            {errors.agreed && <p className="text-xs text-red-500 mt-1">{errors.agreed}</p>}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 mt-1
              ${loading
                ? 'bg-[#cce4d6] text-[#5a7a68] cursor-not-allowed'
                : 'bg-[#1e3d2a] text-white hover:bg-[#2d5a3d] hover:-translate-y-px'
              }`}
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Creating account…' : 'Create free account'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e8f5ed]" />
            <span className="text-xs text-[#5a7a68]">or</span>
            <div className="flex-1 h-px bg-[#e8f5ed]" />
          </div>

          {/* Google SSO placeholder */}
          <button className="w-full py-3 rounded-xl border border-[#cce4d6] text-sm text-[#2d4a38] font-medium hover:bg-[#f4fbf6] hover:border-[#5cad76] transition-all flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 text-center">
          <p className="text-sm text-[#5a7a68]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#3e7a52] font-medium hover:text-[#2d5a3d] transition-colors">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}