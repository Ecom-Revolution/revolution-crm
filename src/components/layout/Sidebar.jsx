import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, GitBranch, Users, UserCheck, FileText, BarChart3, Settings, LogOut, Target, CalendarDays, Receipt } from 'lucide-react'
import { auth } from '../../lib/api'

const nav = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/pipeline', icon: <GitBranch size={18} />, label: 'Pipeline' },
  { to: '/leads', icon: <Target size={18} />, label: 'Leads' },
  { to: '/agenda', icon: <CalendarDays size={18} />, label: 'Agenda RDV' },
  { to: '/closers', icon: <Users size={18} />, label: 'Closers', adminOnly: true },
  { to: '/clients', icon: <UserCheck size={18} />, label: 'Clients Actifs' },
  { to: '/factures', icon: <Receipt size={18} />, label: 'Factures' },
  { to: '/templates', icon: <FileText size={18} />, label: 'Templates' },
  { to: '/reporting', icon: <BarChart3 size={18} />, label: 'Reporting', adminOnly: true },
  { to: '/settings', icon: <Settings size={18} />, label: 'Settings', adminOnly: true },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const user = auth.getSession()

  const handleLogout = () => {
    auth.logout()
    navigate('/login')
  }

  const visibleNav = nav.filter(item => !item.adminOnly || user?.role === 'admin')

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full"
      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
          style={{ background: 'linear-gradient(135deg, #22D3EE, #8B5CF6)', color: '#0B1020' }}>
          RE
        </div>
        <div>
          <div className="font-black text-sm leading-tight">Revolution</div>
          <div className="text-xs text-white/40 font-medium">Ecom CRM</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
        {visibleNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                isActive
                  ? 'text-white bg-white/8'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: 'linear-gradient(180deg, #22D3EE, #8B5CF6)' }} />
                )}
                <span className={isActive ? 'text-cyan-400' : ''}>{item.icon}</span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/7">
        <div className="flex items-center gap-2.5 p-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 flex items-center justify-center text-sm font-bold text-cyan-400 shrink-0">
            {user?.avatar || user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{user?.name || 'Utilisateur'}</div>
            <div className="text-xs text-white/35 capitalize">{user?.role || 'closer'}</div>
          </div>
          <button onClick={handleLogout} className="text-white/30 hover:text-red-400 transition-colors p-1" title="Déconnexion">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
