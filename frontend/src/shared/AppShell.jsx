import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import DevResetButton from './DevResetButton'
import Toast from './Toast'

export default function AppShell() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      <TopNav />
      <main className="pt-24 pb-20 flex-grow">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
      {import.meta.env.DEV && <DevResetButton />}
      <Toast />
    </div>
  )
}
