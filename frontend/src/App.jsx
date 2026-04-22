import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './shared/AppShell'
import HomePage from './modules/home/HomePage'
import LoginPage from './modules/auth/LoginPage'
import SignupPage from './modules/auth/SignupPage'
import DashboardPage from './modules/dashboard/DashboardPage'
import FridgeView from './modules/fridge/FridgeView'
import MealsPage from './modules/meals/MealsPage'
import ShoppingListPage from './modules/shopping/ShoppingListPage'
import UploadReceiptPage from './modules/receipt/UploadReceiptPage'
import ProfilePage from './modules/dashboard/myProfile'
import NotFoundPage from './modules/system/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone pages (own nav/footer) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* App pages (shared shell: TopNav + SideNav + Footer + MobileBottomNav) */}
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/fridge" element={<FridgeView />} />
          <Route path="/meals" element={<MealsPage />} />
          <Route path="/shopping" element={<ShoppingListPage />} />
          <Route path="/upload-receipt" element={<UploadReceiptPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
