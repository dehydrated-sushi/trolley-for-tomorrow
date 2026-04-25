<<<<<<< HEAD
import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function ProtectedRoute() {
  const location = useLocation()

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const token = localStorage.getItem('token')

  if (!isLoggedIn || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
=======
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
>>>>>>> fe668f77bd0b70f3c3f439c3929739e64c8c039c
}