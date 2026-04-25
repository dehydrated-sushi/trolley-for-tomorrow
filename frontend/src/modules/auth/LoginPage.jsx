<<<<<<< HEAD
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if(!email.trim() || !password.trim()){
      setError('your email and password error, please check and try again')
      return
    }
    try {
      setLoading(true)
      const user = {
        name: email.split('@')[0],
        email: email.trim(),
      }
      
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('token', 'dev-token')
      localStorage.setItem('user_profile', Json.stringify(user))

      navigate('/dashboard')
    } catch (err) {
      setError('Failed to sign in. Please check your credentials and try again.')
=======
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
>>>>>>> fe668f77bd0b70f3c3f439c3929739e64c8c039c
    } finally {
      setLoading(false)
    }
  }
<<<<<<< HEAD
  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-stretch bg-surface-container rounded-[2rem] overflow-hidden shadow-sm">
          {/* Left Side: Visual/Branding */}
          <div className="hidden md:flex md:w-1/2 p-8 flex-col justify-between bg-primary relative overflow-hidden">
            <div className="z-10">
              <div className="flex items-center gap-2 text-on-primary mb-12">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
                <span className="font-headline font-extrabold text-2xl tracking-tighter">Trolley for Tomorrow</span>
              </div>
              <h1 className="font-headline text-5xl font-bold text-on-primary leading-tight mb-6">
                Sustain your home,<br />
                <span className="text-primary-fixed">nurture your budget.</span>
              </h1>
              <p className="text-on-primary/80 text-lg max-w-md">
                Join thousands of households managing their kitchen inventory with editorial precision and organic warmth.
              </p>
            </div>
            <div className="z-10 grid grid-cols-2 gap-4 mt-12">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl">
                <span className="material-symbols-outlined text-primary-fixed mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>energy_savings_leaf</span>
                <p className="text-on-primary text-sm font-medium">Reduce Waste</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl">
                <span className="material-symbols-outlined text-primary-fixed mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>savings</span>
                <p className="text-on-primary text-sm font-medium">Save $200+/mo</p>
              </div>
            </div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary-container rounded-full blur-[100px] opacity-40"></div>
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-secondary-container rounded-full blur-[100px] opacity-30"></div>
          </div>

          {/* Right Side: Login Form */}
          <div className="w-full md:w-1/2 bg-surface-container-lowest p-8 md:p-16 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">
              <header className="mb-10">
                <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">Welcome back</h2>
              </header>

              <form onSubmit={handleSubmit} className="space-y-6">
            
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-on-surface-variant ml-1" htmlFor="email">Email Address</label>
                  <div className="relative">
                    <input value ={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary text-on-surface placeholder-on-surface-variant/50 transition-all" id="email" name="email" placeholder="name@example.com" required type="email" />
                    <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-outline-variant/30"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-sm font-semibold text-on-surface-variant" htmlFor="password">Password</label>
                    <a className="text-xs font-medium text-primary hover:underline" href="#">Forgot?</a>
                  </div>

                  
                  <div className="relative">
                    <input value ={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary text-on-surface placeholder-on-surface-variant/50 transition-all" id="password" name="password" placeholder="••••••••" required type="password" />
                    <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-outline-variant/30"></div>
                  </div>
                </div>

                <div classname="flex items-center justify-center">
                  {error && (<p classname = "text-sm text-red-600" style={{backgroundColor:"red"}}>{error}</p>)}
                </div>


                <button className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group" type="submit">
                  <span>{loading ? 'Signing in ...':'Sign In to Your Larder'}</span>
                  <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </form>

        

            
              <p className="mt-10 text-center text-sm text-on-surface-variant">
                New to the community?{' '}
                <Link className="text-primary font-bold hover:underline" to="/signup">Create an account</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 px-6 mt-auto flex flex-col md:flex-row justify-between items-center bg-surface-container-low border-t border-outline-variant/10">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-4 md:mb-0">
          &copy; 2024 THE LIVING LARDER. NURTURING AUSTRALIAN KITCHENS.
        </p>
        <nav className="flex gap-6">
          <a className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <a className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold hover:text-primary transition-colors" href="#">Support</a>
          <a className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold hover:text-primary transition-colors" href="#">Feedback</a>
        </nav>
      </footer>
=======

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
>>>>>>> fe668f77bd0b70f3c3f439c3929739e64c8c039c
    </div>
  )
}