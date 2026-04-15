import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AuthCard from './AuthCard'

const MOCK_EMAIL = 'demo@test.com'
const MOCK_PASSWORD = '123456'

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (email === MOCK_EMAIL && password === MOCK_PASSWORD) {
      localStorage.setItem('token', 'mock-token-123')
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem(
        'user_profile',
        JSON.stringify({
          fullName: 'Demo User',
          email: MOCK_EMAIL,
        })
      )

      navigate('/dashboard')
      return
    }

    setError('Invalid mock account. Try demo accounr')
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back. This is UI-only for now."
      footer={(
        <p className="text-sm text-[#5a7a68]">
          No account?{' '}
          <Link
            className="text-[#1e3d2a] font-medium underline underline-offset-2"
            to="/signup"
          >
            Sign up
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-xs font-medium text-[#2d4a38]">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full text-sm border border-[#cce4d6] rounded-xl px-4 py-3 bg-white outline-none focus:border-[#5cad76]"
            required
          />
        </label>

        <label className="text-xs font-medium text-[#2d4a38]">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full text-sm border border-[#cce4d6] rounded-xl px-4 py-3 bg-white outline-none focus:border-[#5cad76]"
            required
          />
        </label>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          className="mt-2 w-full py-3 rounded-xl text-sm font-medium bg-[#1e3d2a] text-white hover:bg-[#2d5a3d] hover:-translate-y-px transition-all duration-150"
        >
          Log in
        </button>

        <div className="text-xs text-[#5a7a68] font-light pt-2 border-t border-[#e0ede4]">
          Demo account: demo@test.com / 123456
        </div>
      </form>
    </AuthCard>
  )
}