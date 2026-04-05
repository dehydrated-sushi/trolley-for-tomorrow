import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './shared/NavBar'
import HomePage from './modules/home/HomePage'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}