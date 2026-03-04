import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { auth } from '../../lib/api'

export default function Layout() {
  const user = auth.getSession()
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden relative">
      <div className="aurora" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
