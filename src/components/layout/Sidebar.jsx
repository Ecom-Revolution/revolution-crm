import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, GitBranch, Users, UserCheck, FileText, BarChart3, Settings, LogOut, Target, CalendarDays, Receipt, Sparkles } from 'lucide-react'
import { auth } from '../../lib/api'
import { isAdmin, roleLabel } from '../../lib/roles'

const nav = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/pipeline', icon: <GitBranch size={18} />, label: 'Pipeline' },
  { to: '/leads', icon: <Target size={18} />, label: 'Leads' },
  { to: '/agenda', icon: <CalendarDays size={18} />, label: 'Agenda RDV' },
  { to: '/closers', icon: <Users size={18} />, label: 'Équipe', adminOnly: true },
  { to: '/clients', icon: <UserCheck size={18} />, label: 'Clients Actifs' },
  { to: '/factures', icon: <Receipt size={18} />, label: 'Factures' },
  { to: '/templates', icon: <FileText size={18} />, label: 'Templates' },
  { to: '/reporting', icon: <BarChart3 size={18} />, label: 'Reporting', adminOnly: true },
  { to: '/settings', icon: <Settings size={18} />, label: 'Settings', adminOnly: true },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = auth.getSession()

  const handleLogout = () => {
    auth.logout()
    navigate('/login')
  }

  const visibleNav = isAdmin(user) ? nav : nav.filter(item => item.to === '/leads')
  const current = visibleNav.find(item => location.pathname.startsWith(item.to)) || visibleNav[0]

  return (
    <>
      <aside className="hidden md:flex w-60 shrink-0 flex-col h-full relative z-20"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.025))', borderRight: '1px solid rgba(255,255,255,0.08)', boxShadow: '18px 0 60px rgba(0,0,0,0.14)' }}>

        {/* Logo */}
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-cyan-500/10"
            style={{ background: 'linear-gradient(135deg, #22D3EE, #20D16B 52%, #8B5CF6)', color: '#07101C' }}>
            RE
          </div>
          <div>
            <div className="font-black text-sm leading-tight">Revolution</div>
            <div className="text-xs text-white/40 font-medium">Ecom CRM</div>
          </div>
        </div>

        <div className="mx-3 mb-2 rounded-2xl border border-white/8 bg-black/18 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
            <Sparkles size={14} />
            Cockpit commercial
          </div>
          <div className="mt-1 text-xs leading-relaxed text-white/38">Pipeline, RDV et priorités à portée de main.</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  isActive
                    ? 'text-white bg-white/10 shadow-lg shadow-cyan-500/5'
                    : 'text-white/52 hover:text-white/85 hover:bg-white/6'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
                      style={{ background: 'linear-gradient(180deg, #22D3EE, #20D16B)' }} />
                  )}
                  <span className={`transition-transform group-hover:scale-105 ${isActive ? 'text-cyan-300' : ''}`}>{item.icon}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/7">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 via-green-500/20 to-violet-500/30 flex items-center justify-center text-sm font-bold text-cyan-300 shrink-0">
              {user?.avatar || user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{user?.name || 'Utilisateur'}</div>
              <div className="text-xs text-white/35">{roleLabel(user?.role)}</div>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-red-400 transition-colors p-1" title="Déconnexion">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <header className="md:hidden fixed top-0 inset-x-0 z-40 border-b border-white/9 bg-[#050817]/84 backdrop-blur-xl">
        <div className="flex h-[64px] items-center justify-between px-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[13px] flex items-center justify-center font-black text-xs shrink-0"
              style={{ background: 'linear-gradient(135deg, #22D3EE, #20D16B 52%, #8B5CF6)', color: '#07101C' }}>
              RE
            </div>
            <div className="min-w-0">
              <div className="text-xs text-white/38">Revolution CRM</div>
              <div className="text-sm font-black truncate">{current?.label || 'Dashboard'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 text-white/45 flex items-center justify-center">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/9 bg-[#050817]/88 backdrop-blur-xl">
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-2 py-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `min-w-[76px] h-[58px] rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'bg-white/11 text-white'
                    : 'text-white/42 hover:text-white/75 hover:bg-white/6'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-cyan-300' : ''}>{item.icon}</span>
                  <span className="max-w-[68px] truncate">{item.label.replace(' Actifs', '').replace(' RDV', '')}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
