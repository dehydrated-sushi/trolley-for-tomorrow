import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './shared/NavBar'
import HomePage from './modules/home/HomePage'
import FridgeView from './modules/fridge/FridgeView'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/"       element={<HomePage />} />
        <Route path="/fridge" element={<FridgeView />} />
      </Routes>
    </BrowserRouter>
  )
}