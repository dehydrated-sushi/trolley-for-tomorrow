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
    } finally {
      setLoading(false)
    }
  }
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
    </div>
  )
}
