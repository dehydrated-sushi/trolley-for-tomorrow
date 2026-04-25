import { BrowserRouter, Routes, Route } from 'react-router-dom'
<<<<<<< HEAD
import AppShell from './shared/AppShell'
import PasswordGate from './shared/PasswordGate'
=======
import { AuthProvider } from './shared/AuthContext'
import { ProtectedRoute, GuestRoute } from './shared/ProtectedRoute'
import PasswordGate, { usePasswordGate } from './shared/PasswordGate'
import NavBar from './shared/NavBar'
>>>>>>> fe668f77bd0b70f3c3f439c3929739e64c8c039c
import HomePage from './modules/home/HomePage'
import LoginPage from './modules/auth/LoginPage'

import DashboardPage from './modules/dashboard/DashboardPage'
import FridgeView from './modules/fridge/FridgeView'
<<<<<<< HEAD
import MealsPage from './modules/meals/MealsPage'
import ShoppingListPage from './modules/shopping/ShoppingListPage'
import UploadReceiptPage from './modules/receipt/UploadReceiptPage'



import NotFoundPage from './modules/system/NotFoundPage'
=======
import ProfileForm from './modules/profile/ProfileForm'
import YourMeals from './modules/meal_plan/YourMeals'
import ShoppingList from './modules/shopping_list/Shoppinglist'
import LoginPage from './modules/auth/LoginPage'
import SignupPage from './modules/auth/SignupPage'
import Dashboard from './modules/dashboard/dashboard'
import ReceiptScanner from './modules/receipt/ReceiptScanner'
>>>>>>> fe668f77bd0b70f3c3f439c3929739e64c8c039c

function AppRoutes() {
  return (
<<<<<<< HEAD
    <PasswordGate>
      <BrowserRouter>
        <Routes>
        {/* Standalone pages (own nav/footer) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* App pages (shared shell: TopNav + SideNav + Footer + MobileBottomNav) */}
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/fridge" element={<FridgeView />} />
          <Route path="/meals" element={<MealsPage />} />
          <Route path="/shopping" element={<ShoppingListPage />} />
          <Route path="/upload-receipt" element={<UploadReceiptPage />} />
          
          
        </Route>

        <Route path="*" element={<NotFoundPage />} />
=======
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
>>>>>>> fe668f77bd0b70f3c3f439c3929739e64c8c039c
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
    </PasswordGate>
  )
}
<<<<<<< HEAD
=======

export default function App() {
  return <PasswordProtected />
}
>>>>>>> fe668f77bd0b70f3c3f439c3929739e64c8c039c
