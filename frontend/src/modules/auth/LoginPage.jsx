import { Link } from 'react-router-dom'
import { useState } from 'react'
import AuthCard from './AuthCard'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back. This is UI-only for now."
      footer={(
        <p className="text-sm text-[#5a7a68]">
          No account?{' '}
          <Link className="text-[#1e3d2a] font-medium underline underline-offset-2" to="/signup">
            Sign up
          </Link>
        </p>
      )}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          // MVP: placeholder until backend auth is connected
          alert(`Logged in as ${email} (mock)`)
        }}
        className="flex flex-col gap-3"
      >
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

        <button
          type="submit"
          className="mt-2 w-full py-3 rounded-xl text-sm font-medium bg-[#1e3d2a] text-white hover:bg-[#2d5a3d] hover:-translate-y-px transition-all duration-150"
        >
          Log in
        </button>

        <div className="text-xs text-[#5a7a68] font-light pt-2 border-t border-[#e0ede4]">
          之後接上後端時，我會把這裡改成呼叫 `/auth/login`（或你們的實際 endpoint），並把 token/Session 存到 app state。
        </div>
      </form>
    </AuthCard>
  )
}

