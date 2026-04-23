import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import SideNav from './SideNav'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import DevResetButton from './DevResetButton'
import Toast from './Toast'

export default function AppShell() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      <TopNav />
      <SideNav />
      <main className="lg:ml-64 pt-24 pb-20 flex-grow">
        <Outlet />
      </main>
      <div className="lg:ml-64">
        <Footer />
      </div>
      <MobileBottomNav />
      {import.meta.env.DEV && <DevResetButton />}
      <Toast />
    </div>
  )
}
