import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './shared/AppShell'
import ProtectedRoute from './shared/ProtectedRoute'
import HomePage from './modules/home/HomePage'
import LoginPage from './modules/auth/LoginPage'
import DashboardPage from './modules/dashboard/DashboardPage'
import FridgeView from './modules/fridge/FridgeView'
import MealsPage from './modules/meals/MealsPage'
import CookedMealsPage from './modules/cooked/CookedMealsPage'
import AnalyticsPage from './modules/analytics/AnalyticsPage'
import ProfilePage from './modules/profile/ProfilePage'
import ShoppingListPage from './modules/shopping/ShoppingListPage'
import UploadReceiptPage from './modules/receipt/UploadReceiptPage'
import NotFoundPage from './modules/system/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone pages (own nav/footer) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* App pages (shared shell: TopNav + SideNav + Footer + MobileBottomNav) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/fridge" element={<FridgeView />} />
            <Route path="/meals" element={<MealsPage />} />
            <Route path="/cooked-meals" element={<CookedMealsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/shopping" element={<ShoppingListPage />} />
            <Route path="/upload-receipt" element={<UploadReceiptPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
