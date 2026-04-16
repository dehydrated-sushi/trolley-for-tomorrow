import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

// Redirects to /login if not logged in, preserves intended destination
export function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

// Redirects logged-in users away from login/signup to dashboard
export function GuestRoute({ children }) {
  const { isLoggedIn } = useAuth()

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}