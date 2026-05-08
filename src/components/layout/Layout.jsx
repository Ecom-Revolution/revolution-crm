import { Outlet, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { auth } from '../../lib/api'
import ErrorBoundary from '../ErrorBoundary'
import { canAccessRoute } from '../../lib/roles'

export default function Layout() {
  const user = auth.getSession()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace />
  if (!canAccessRoute(user, location.pathname)) return <Navigate to="/leads" replace />

  return (
    <div className="app-frame min-h-dvh md:h-dvh md:overflow-hidden relative md:flex">
      <div className="aurora" />
      <Sidebar />
      <main className="relative z-10 min-h-dvh w-full pt-[72px] md:pt-0 md:flex-1 md:overflow-y-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
