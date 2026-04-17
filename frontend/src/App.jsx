import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './shared/AuthContext'
import { ProtectedRoute, GuestRoute } from './shared/ProtectedRoute'
import PasswordGate, { usePasswordGate } from './shared/PasswordGate'
import NavBar from './shared/NavBar'
import HomePage from './modules/home/HomePage'
import FridgeView from './modules/fridge/FridgeView'
import ProfileForm from './modules/profile/ProfileForm'
import YourMeals from './modules/meal_plan/YourMeals'
import ShoppingList from './modules/shopping_list/Shoppinglist'
import LoginPage from './modules/auth/LoginPage'
import SignupPage from './modules/auth/SignupPage'
import Dashboard from './modules/dashboard/dashboard'
import ReceiptScanner from './modules/receipt/ReceiptScanner'

function AppRoutes() {
  return (
    <>
      <NavBar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />

        {/* Guest only — redirect to dashboard if already logged in */}
        <Route path="/login"  element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />

        {/* Protected routes — redirect to login if not logged in */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/fridge"    element={<ProtectedRoute><FridgeView /></ProtectedRoute>} />
        <Route path="/meals"     element={<ProtectedRoute><YourMeals /></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><ProfileForm /></ProtectedRoute>} />
        <Route path="/shopping"  element={<ProtectedRoute><ShoppingList /></ProtectedRoute>} />
        <Route path="/scan"      element={<ProtectedRoute><ReceiptScanner /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

function PasswordProtected() {
  const { unlocked, unlock } = usePasswordGate()

  if (!unlocked) {
    return <PasswordGate onUnlock={unlock} />
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default function App() {
  return <PasswordProtected />
}