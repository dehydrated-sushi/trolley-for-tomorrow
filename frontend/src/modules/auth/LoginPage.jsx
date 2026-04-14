import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AuthCard from './AuthCard'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Login failed')
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
      }

      localStorage.setItem('isLoggedIn', 'true')

      localStorage.setItem(
        'user_profile',
        JSON.stringify({
          fullName: data.user?.name || data.user?.fullName || '',
          email: data.user?.email || email,
        })
      )

      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back."
      footer={
        <p className="text-sm text-[#5a7a68]">
          No account?{' '}
          <Link
            className="text-[#1e3d2a] font-medium underline underline-offset-2"
            to="/signup"
          >
            Sign up
          </Link>
        </p>
      }
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

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full py-3 rounded-xl text-sm font-medium bg-[#1e3d2a] text-white hover:bg-[#2d5a3d] hover:-translate-y-px transition-all duration-150 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </AuthCard>
  )
}