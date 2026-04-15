import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './shared/NavBar'
import ProtectedRoute from './shared/ProtectedRoute'
import HomePage from './modules/home/HomePage'
import FridgeView from './modules/fridge/FridgeView'
import myProfile from './modules/dashboard/myProfile'
import DashboardPage from './modules/dashboard/DashboardPage'
import MealsPage from './modules/meals/MealsPage'
import ShoppingListPage from './modules/shopping/ShoppingListPage'
import LoginPage from './modules/auth/LoginPage'
import SignupPage from './modules/auth/SignupPage'
import NotFoundPage from './modules/system/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/dashboardPage" element={<DashboardPage />} />
        <Route path="/meals"     element={<MealsPage />} />
        <Route path="/shopping"  element={<ShoppingListPage />} />
        <Route path="/fridge"    element={<FridgeView />} />
        <Route path="/myProfile"   element={<myProfile />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/signup"    element={<SignupPage />} />
        <Route path="*"          element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}