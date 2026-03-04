// Data layer — fonctionne avec localStorage (mock) par défaut
// Remplacer par Supabase en configurant .env
import { MOCK_LEADS, MOCK_USERS, MOCK_ACTIVITIES, MOCK_CLIENTS, MOCK_TEMPLATES } from './mock'

const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL

// --- LocalStorage helpers ---
const LS = {
  get: (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
    catch { return fallback }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
}

const init = () => {
  if (!LS.get('crm_leads', null)) LS.set('crm_leads', MOCK_LEADS)
  if (!LS.get('crm_users', null)) LS.set('crm_users', MOCK_USERS)
  if (!LS.get('crm_activities', null)) LS.set('crm_activities', MOCK_ACTIVITIES)
  if (!LS.get('crm_clients', null)) LS.set('crm_clients', MOCK_CLIENTS)
  if (!LS.get('crm_templates', null)) LS.set('crm_templates', MOCK_TEMPLATES)
}
if (USE_MOCK) init()

const uid = () => Math.random().toString(36).slice(2, 10)

// ==================== AUTH ====================
export const auth = {
  login: async (email, password) => {
    if (USE_MOCK) {
      const users = LS.get('crm_users', MOCK_USERS)
      const user = users.find(u => u.email === email)
      if (!user) return { error: 'Email introuvable' }
      if (password !== 'demo1234') return { error: 'Mot de passe incorrect' }
      LS.set('crm_session', user)
      return { user }
    }
  },
  logout: () => { LS.set('crm_session', null) },
  getSession: () => LS.get('crm_session', null),
}

// ==================== LEADS ====================
export const leads = {
  getAll: async () => {
    if (USE_MOCK) return { data: LS.get('crm_leads', []) }
  },
  getById: async (id) => {
    if (USE_MOCK) {
      const all = LS.get('crm_leads', [])
      return { data: all.find(l => l.id === id) || null }
    }
  },
  create: async (lead) => {
    if (USE_MOCK) {
      const all = LS.get('crm_leads', [])
      const newLead = { id: `l${uid()}`, createdAt: new Date().toISOString(), stageUpdatedAt: new Date().toISOString(), lastContactAt: new Date().toISOString(), lossReason: null, upsellPotential: false, stage: 'Prospect', heatScore: 'Cold', ...lead }
      LS.set('crm_leads', [...all, newLead])
      return { data: newLead }
    }
  },
  update: async (id, updates) => {
    if (USE_MOCK) {
      const all = LS.get('crm_leads', [])
      const updated = all.map(l => l.id === id ? { ...l, ...updates, lastContactAt: new Date().toISOString() } : l)
      LS.set('crm_leads', updated)
      return { data: updated.find(l => l.id === id) }
    }
  },
  delete: async (id) => {
    if (USE_MOCK) {
      LS.set('crm_leads', LS.get('crm_leads', []).filter(l => l.id !== id))
      return { error: null }
    }
  },
  deleteMany: async (ids) => {
    if (USE_MOCK) {
      LS.set('crm_leads', LS.get('crm_leads', []).filter(l => !ids.includes(l.id)))
      return { error: null }
    }
  },
}

// ==================== ACTIVITIES ====================
export const activities = {
  getAll: async () => {
    if (USE_MOCK) return { data: LS.get('crm_activities', []) }
  },
  getByLeadId: async (leadId) => {
    if (USE_MOCK) {
      const all = LS.get('crm_activities', [])
      return { data: all.filter(a => a.leadId === leadId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }
    }
  },
  getRecent: async (limit = 10) => {
    if (USE_MOCK) {
      const all = LS.get('crm_activities', [])
      const allLeads = LS.get('crm_leads', [])
      const allUsers = LS.get('crm_users', MOCK_USERS)
      return {
        data: all
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, limit)
          .map(a => ({
            ...a,
            lead: allLeads.find(l => l.id === a.leadId),
            user: allUsers.find(u => u.id === a.userId),
          }))
      }
    }
  },
  create: async (activity) => {
    if (USE_MOCK) {
      const all = LS.get('crm_activities', [])
      const newActivity = { id: `a${uid()}`, createdAt: new Date().toISOString(), ...activity }
      LS.set('crm_activities', [...all, newActivity])
      return { data: newActivity }
    }
  },
}

// ==================== USERS (closers) ====================
export const users = {
  getAll: async () => {
    if (USE_MOCK) return { data: LS.get('crm_users', MOCK_USERS) }
  },
  getClosers: async () => {
    if (USE_MOCK) {
      const all = LS.get('crm_users', MOCK_USERS)
      return { data: all.filter(u => u.role === 'closer' || u.role === 'admin') }
    }
  },
  create: async (user) => {
    if (USE_MOCK) {
      const all = LS.get('crm_users', MOCK_USERS)
      const newUser = { id: `u${uid()}`, avatar: user.name?.[0]?.toUpperCase() || 'U', ...user }
      LS.set('crm_users', [...all, newUser])
      return { data: newUser }
    }
  },
  delete: async (id) => {
    if (USE_MOCK) {
      LS.set('crm_users', LS.get('crm_users', MOCK_USERS).filter(u => u.id !== id))
      return { error: null }
    }
  },
}

// ==================== CLIENTS ====================
export const clients = {
  getAll: async () => {
    if (USE_MOCK) return { data: LS.get('crm_clients', []) }
  },
  create: async (client) => {
    if (USE_MOCK) {
      const all = LS.get('crm_clients', [])
      const newClient = { id: `c${uid()}`, createdAt: new Date().toISOString(), nps: null, upsellPotential: false, notes: '', status: 'Active', ...client }
      LS.set('crm_clients', [...all, newClient])
      return { data: newClient }
    }
  },
  update: async (id, updates) => {
    if (USE_MOCK) {
      const all = LS.get('crm_clients', [])
      const updated = all.map(c => c.id === id ? { ...c, ...updates } : c)
      LS.set('crm_clients', updated)
      return { data: updated.find(c => c.id === id) }
    }
  },
  delete: async (id) => {
    if (USE_MOCK) {
      LS.set('crm_clients', LS.get('crm_clients', []).filter(c => c.id !== id))
      return { error: null }
    }
  },
}

// ==================== TEMPLATES ====================
export const templates = {
  getAll: async () => {
    if (USE_MOCK) return { data: LS.get('crm_templates', []) }
  },
  create: async (tpl) => {
    if (USE_MOCK) {
      const all = LS.get('crm_templates', [])
      const newTpl = { id: `t${uid()}`, createdAt: new Date().toISOString(), ...tpl }
      LS.set('crm_templates', [...all, newTpl])
      return { data: newTpl }
    }
  },
  update: async (id, updates) => {
    if (USE_MOCK) {
      const all = LS.get('crm_templates', [])
      LS.set('crm_templates', all.map(t => t.id === id ? { ...t, ...updates } : t))
      return { error: null }
    }
  },
  delete: async (id) => {
    if (USE_MOCK) {
      LS.set('crm_templates', LS.get('crm_templates', []).filter(t => t.id !== id))
      return { error: null }
    }
  },
}
