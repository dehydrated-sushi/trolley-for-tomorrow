import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './shared/NavBar'
import ProtectedRoute from './shared/ProtectedRoute'
import HomePage from './modules/home/HomePage'
import FridgeView from './modules/fridge/FridgeView'
import ProfileForm from './modules/profile/ProfileForm'
import DashboardPage from './modules/dashboard/DashboardPage'
import MealsPage from './modules/meals/MealsPage'
import ShoppingListPage from './modules/shopping/ShoppingListPage'
import LoginPage from './modules/auth/LoginPage'
import SignupPage from './modules/auth/SignupPage'
import NotFoundPage from './modules/system/NotFoundPage'
<<<<<<< HEAD
import UploadReceiptPage from './modules/receipt/UploadReceiptPage'
=======
>>>>>>> karl

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
<<<<<<< HEAD
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/meals" element={<MealsPage />} />
          <Route path="/shopping" element={<ShoppingListPage />} />
          <Route path="/fridge" element={<FridgeView />} />
          <Route path="/upload-receipt" element={<UploadReceiptPage />} />
          <Route path="/profile" element={<ProfileForm />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
=======
        <Route path="/"          element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/meals"     element={<MealsPage />} />
        <Route path="/shopping"  element={<ShoppingListPage />} />
        <Route path="/fridge"    element={<FridgeView />} />
        <Route path="/profile"   element={<ProfileForm />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/signup"    element={<SignupPage />} />
        <Route path="*"          element={<NotFoundPage />} />
>>>>>>> karl
      </Routes>
    </BrowserRouter>
  )
}