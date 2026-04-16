import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './shared/NavBar'
import HomePage from './modules/home/HomePage'
import FridgeView from './modules/fridge/FridgeView'
import ProfileForm from './modules/profile/ProfileForm'
import YourMeals from './modules/meal_plan/YourMeals'
import LoginPage from './modules/auth/LoginPage'
import SignupPage from './modules/auth/SignupPage'
import PasswordGate, { usePasswordGate } from './shared/PasswordGate'
// import Dashboard from './modules/dashboard/Dashboard'
import ShoppingList from './modules/shopping_list/Shoppinglist'

export default function App() {
  const { unlocked, unlock } = usePasswordGate()

  if (!unlocked) {
    return <PasswordGate onUnlock={unlock} />
  }

  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/"        element={<HomePage />} />
        <Route path="/fridge"  element={<FridgeView />} />
        <Route path="/profile" element={<ProfileForm />} />
        <Route path="/meals"   element={<YourMeals />} />
        <Route path="/login"   element={<LoginPage />} />
        <Route path="/signup"  element={<SignupPage />} />
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        <Route path="/shopping"  element={<ShoppingList />} /> 
      </Routes>
    </BrowserRouter>
  )
}