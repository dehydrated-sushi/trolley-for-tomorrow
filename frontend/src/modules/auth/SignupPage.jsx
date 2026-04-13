import { Link } from 'react-router-dom'
import { useState } from 'react'
import AuthCard from './AuthCard'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <AuthCard
      title="Sign up"
      subtitle="Create your NutriPlan account. This is UI-only for now."
      footer={(
        <p className="text-sm text-[#5a7a68]">
          Already have an account?{' '}
          <Link className="text-[#1e3d2a] font-medium underline underline-offset-2" to="/login">
            Log in
          </Link>
        </p>
      )}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          alert(`Signed up: ${name || 'user'} / ${email} (mock)`)
        }}
        className="flex flex-col gap-3"
      >
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

        <button
          type="submit"
          className="mt-2 w-full py-3 rounded-xl text-sm font-medium bg-[#5cad76] text-[#0c1f14] hover:bg-[#8dcca0] hover:-translate-y-px transition-all duration-150"
        >
          Create account
        </button>

        <div className="text-xs text-[#5a7a68] font-light pt-2 border-t border-[#e0ede4]">
          之後接上後端時，這裡會改成註冊 API + 表單驗證 + 錯誤提示。
        </div>
      </form>
    </AuthCard>
  )
}

