export const ADMIN_ROLE = 'admin'
export const MEMBER_ROLES = ['setter', 'closer']
export const TEAM_ROLES = [ADMIN_ROLE, ...MEMBER_ROLES]

export const ROLE_LABELS = {
  admin: 'Admin',
  setter: 'Setter',
  closer: 'Closer',
}

export function isAdmin(user) {
  return user?.role === ADMIN_ROLE
}

export function isTeamMember(user) {
  return MEMBER_ROLES.includes(user?.role)
}

export function canAccessRoute(user, pathname) {
  if (!user) return false
  if (isAdmin(user)) return true
  return pathname === '/leads' || pathname.startsWith('/leads/')
}

export function canReceiveLeads(user) {
  return MEMBER_ROLES.includes(user?.role)
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || 'Membre'
}
