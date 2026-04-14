import { Link } from 'react-router-dom'
import { useState } from 'react'
import AuthCard from './AuthCard'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Signup failed')
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
      }

      setSuccess(data.message || 'Account created successfully')
      setName('')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Sign up"
      subtitle="Create your trolley for tomorrow account."
      footer={
        <p className="text-sm text-[#5a7a68]">
          Already have an account?{' '}
          <Link
            className="text-[#1e3d2a] font-medium underline underline-offset-2"
            to="/login"
          >
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-xs font-medium text-[#2d4a38]">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mt-1 w-full text-sm border border-[#cce4d6] rounded-xl px-4 py-3 bg-white outline-none focus:border-[#5cad76]"
          />
        </label>

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
            placeholder="Create a password"
            className="mt-1 w-full text-sm border border-[#cce4d6] rounded-xl px-4 py-3 bg-white outline-none focus:border-[#5cad76]"
            minLength={8}
            required
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full py-3 rounded-xl text-sm font-medium bg-[#5cad76] text-[#0c1f14] hover:bg-[#8dcca0] hover:-translate-y-px transition-all duration-150 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  )
}