import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './shared/NavBar'
import HomePage from './modules/home/HomePage'
import UploadReceiptPage from './modules/receipt/UploadReceiptPage'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload-receipt" element={<UploadReceiptPage />} />
      </Routes>
    </BrowserRouter>
  )
}