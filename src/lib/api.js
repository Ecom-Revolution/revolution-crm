// Data layer — appels REST vers /api/* (Neon Postgres via Vercel Serverless Functions)
// Fallback localStorage uniquement pour la session auth et mode démo (sans DATABASE_URL)
import { MOCK_LEADS, MOCK_USERS, MOCK_ACTIVITIES, MOCK_CLIENTS, MOCK_TEMPLATES, MOCK_AGENDA, MOCK_FACTURES } from './mock'

const API_KEY = 'revo_demo_key'

// ─── Fetch helper ─────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { error: json.error || `Erreur ${res.status}`, data: null }
  return { data: json.data ?? json, error: null }
}

// ─── localStorage helpers (session + mode démo) ───────────────────────────────
const LS = {
  get: (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
    catch { return fallback }
  },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} },
}

// Tente l'API et renvoie le résultat — si ça échoue (Vite sans vercel dev), renvoie null
// Pas de cache permanent : auto-correction si l'API revient après une erreur temporaire
async function tryApi(path, options = {}) {
  try {
    const result = await apiFetch(path, options)
    // Erreur 404/503 = API route absente (vite dev) → fallback mock
    if (result.error && (result.error.includes('404') || result.error.includes('503'))) return null
    return result
  } catch {
    return null
  }
}

const uid = () => Math.random().toString(36).slice(2, 10)

// ─── Mode mock (vite dev sans vercel dev) ─────────────────────────────────────
const initMock = () => {
  if (!LS.get('crm_leads', null)) LS.set('crm_leads', MOCK_LEADS)
  if (!LS.get('crm_users', null)) LS.set('crm_users', MOCK_USERS)
  if (!LS.get('crm_activities', null)) LS.set('crm_activities', MOCK_ACTIVITIES)
  if (!LS.get('crm_clients', null)) LS.set('crm_clients', MOCK_CLIENTS)
  if (!LS.get('crm_templates', null)) LS.set('crm_templates', MOCK_TEMPLATES)
  if (!LS.get('crm_agenda', null)) LS.set('crm_agenda', MOCK_AGENDA)
  if (!LS.get('crm_factures', null)) LS.set('crm_factures', MOCK_FACTURES)
}

// ==================== AUTH ====================
export const auth = {
  login: async (email, password) => {
    // Toujours essayer l'API d'abord
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        const { user } = await res.json()
        LS.set('crm_session', user)
        return { user }
      }
      if (res.status === 401) {
        const { error } = await res.json()
        return { error }
      }
    } catch {}

    // Fallback mock
    initMock()
    const users = LS.get('crm_users', MOCK_USERS)
    const user = users.find(u => u.email === email)
    if (!user) return { error: 'Email introuvable' }
    if (password !== 'demo1234') return { error: 'Mot de passe incorrect' }
    LS.set('crm_session', user)
    return { user }
  },

  logout: () => {
    LS.set('crm_session', null)
  },

  getSession: () => LS.get('crm_session', null),
}

// ==================== LEADS ====================
export const leads = {
  getAll: async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    const r = await tryApi(`/api/leads${qs ? '?' + qs : ''}`)
    if (r) return r
    initMock()
    return { data: LS.get('crm_leads', []) }
  },

  getById: async (id) => {
    const r = await tryApi(`/api/leads?id=${id}`)
    if (r) return r
    const all = LS.get('crm_leads', [])
    return { data: all.find(l => l.id === id) || null }
  },

  create: async (lead) => {
    const r = await tryApi('/api/leads', { method: 'POST', body: lead })
    if (r) return r
    initMock()
    const all = LS.get('crm_leads', [])
    const newLead = { id: `l${uid()}`, createdAt: new Date().toISOString(), stage: 'Prospect', heatScore: 'Cold', ...lead }
    LS.set('crm_leads', [...all, newLead])
    return { data: newLead }
  },

  update: async (id, updates) => {
    const r = await tryApi(`/api/leads?id=${id}`, { method: 'PATCH', body: updates })
    if (r) return r
    const all = LS.get('crm_leads', [])
    const updated = all.map(l => l.id === id ? { ...l, ...updates } : l)
    LS.set('crm_leads', updated)
    return { data: updated.find(l => l.id === id) }
  },

  delete: async (id) => {
    const r = await tryApi(`/api/leads?id=${id}`, { method: 'DELETE' })
    if (r) return r
    LS.set('crm_leads', LS.get('crm_leads', []).filter(l => l.id !== id))
    return { error: null }
  },

  deleteMany: async (ids) => {
    const r = await tryApi('/api/leads/delete-many', { method: 'POST', body: { ids } })
    if (r) return r
    LS.set('crm_leads', LS.get('crm_leads', []).filter(l => !ids.includes(l.id)))
    return { error: null }
  },
}

// ==================== ACTIVITIES ====================
export const activities = {
  getAll: async () => {
    const r = await tryApi('/api/activities')
    if (r) return r
    return { data: LS.get('crm_activities', []) }
  },

  getByLeadId: async (leadId) => {
    const r = await tryApi(`/api/activities?leadId=${leadId}`)
    if (r) return r
    const all = LS.get('crm_activities', [])
    return { data: all.filter(a => a.leadId === leadId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }
  },

  getRecent: async (limit = 10) => {
    const r = await tryApi(`/api/activities?limit=${limit}`)
    if (r) return r
    const all = LS.get('crm_activities', [])
    return { data: all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit) }
  },

  create: async (activity) => {
    const r = await tryApi('/api/activities', { method: 'POST', body: activity })
    if (r) return r
    initMock()
    const all = LS.get('crm_activities', [])
    const newA = { id: `a${uid()}`, createdAt: new Date().toISOString(), ...activity }
    LS.set('crm_activities', [...all, newA])
    return { data: newA }
  },
}

// ==================== USERS ====================
export const users = {
  getAll: async () => {
    const r = await tryApi('/api/users')
    if (r) return r
    return { data: LS.get('crm_users', MOCK_USERS) }
  },

  create: async (user) => {
    const r = await tryApi('/api/users', { method: 'POST', body: user })
    if (r) return r
    const all = LS.get('crm_users', MOCK_USERS)
    const newUser = { id: `u${uid()}`, avatar: user.fullName?.[0]?.toUpperCase() || 'U', name: user.fullName, ...user }
    LS.set('crm_users', [...all, newUser])
    return { data: newUser }
  },

  delete: async (id) => {
    const r = await tryApi(`/api/users?id=${id}`, { method: 'DELETE' })
    if (r) return r
    LS.set('crm_users', LS.get('crm_users', MOCK_USERS).filter(u => u.id !== id))
    return { error: null }
  },
}

// ==================== CLIENTS ====================
export const clients = {
  getAll: async () => {
    const r = await tryApi('/api/clients')
    if (r) return r
    return { data: LS.get('crm_clients', []) }
  },

  create: async (client) => {
    const r = await tryApi('/api/clients', { method: 'POST', body: client })
    if (r) return r
    initMock()
    const all = LS.get('crm_clients', [])
    const newC = { id: `c${uid()}`, createdAt: new Date().toISOString(), status: 'Actif', ...client }
    LS.set('crm_clients', [...all, newC])
    return { data: newC }
  },

  update: async (id, updates) => {
    const r = await tryApi(`/api/clients?id=${id}`, { method: 'PATCH', body: updates })
    if (r) return r
    const all = LS.get('crm_clients', [])
    const updated = all.map(c => c.id === id ? { ...c, ...updates } : c)
    LS.set('crm_clients', updated)
    return { data: updated.find(c => c.id === id) }
  },

  delete: async (id) => {
    const r = await tryApi(`/api/clients?id=${id}`, { method: 'DELETE' })
    if (r) return r
    LS.set('crm_clients', LS.get('crm_clients', []).filter(c => c.id !== id))
    return { error: null }
  },
}

// ==================== TEMPLATES ====================
export const templates = {
  getAll: async () => {
    const r = await tryApi('/api/templates')
    if (r) return r
    return { data: LS.get('crm_templates', []) }
  },

  create: async (tpl) => {
    const r = await tryApi('/api/templates', { method: 'POST', body: tpl })
    if (r) return r
    initMock()
    const all = LS.get('crm_templates', [])
    const newT = { id: `t${uid()}`, createdAt: new Date().toISOString(), ...tpl }
    LS.set('crm_templates', [...all, newT])
    return { data: newT }
  },

  update: async (id, updates) => {
    const r = await tryApi(`/api/templates?id=${id}`, { method: 'PATCH', body: updates })
    if (r) return r
    const all = LS.get('crm_templates', [])
    LS.set('crm_templates', all.map(t => t.id === id ? { ...t, ...updates } : t))
    return { error: null }
  },

  delete: async (id) => {
    const r = await tryApi(`/api/templates?id=${id}`, { method: 'DELETE' })
    if (r) return r
    LS.set('crm_templates', LS.get('crm_templates', []).filter(t => t.id !== id))
    return { error: null }
  },
}

// ==================== AGENDA ====================
export const agenda = {
  getAll: async () => {
    const r = await tryApi('/api/agenda')
    if (r) return r
    return { data: LS.get('crm_agenda', []) }
  },

  create: async (rdv) => {
    const r = await tryApi('/api/agenda', { method: 'POST', body: rdv })
    if (r) return r
    initMock()
    const all = LS.get('crm_agenda', [])
    const newR = { id: `rdv${uid()}`, createdAt: new Date().toISOString(), status: 'planifie', ...rdv }
    LS.set('crm_agenda', [...all, newR])
    return { data: newR }
  },

  update: async (id, updates) => {
    const r = await tryApi(`/api/agenda?id=${id}`, { method: 'PATCH', body: updates })
    if (r) return r
    const all = LS.get('crm_agenda', [])
    LS.set('crm_agenda', all.map(rv => rv.id === id ? { ...rv, ...updates } : rv))
    return { data: all.find(rv => rv.id === id) }
  },

  delete: async (id) => {
    const r = await tryApi(`/api/agenda?id=${id}`, { method: 'DELETE' })
    if (r) return r
    LS.set('crm_agenda', LS.get('crm_agenda', []).filter(rv => rv.id !== id))
    return { error: null }
  },
}

// ==================== FACTURES ====================
export const factures = {
  getAll: async () => {
    const r = await tryApi('/api/factures')
    if (r) return r
    return { data: LS.get('crm_factures', []) }
  },

  create: async (facture) => {
    const r = await tryApi('/api/factures', { method: 'POST', body: facture })
    if (r) return r
    initMock()
    const all = LS.get('crm_factures', [])
    const num = `FAC-${new Date().getFullYear()}-${String(all.length + 1).padStart(3, '0')}`
    const newF = { id: `f${uid()}`, numero: num, createdAt: new Date().toISOString(), status: 'brouillon', ...facture }
    LS.set('crm_factures', [...all, newF])
    return { data: newF }
  },

  update: async (id, updates) => {
    const r = await tryApi(`/api/factures?id=${id}`, { method: 'PATCH', body: updates })
    if (r) return r
    const all = LS.get('crm_factures', [])
    LS.set('crm_factures', all.map(f => f.id === id ? { ...f, ...updates } : f))
    return { data: all.find(f => f.id === id) }
  },

  delete: async (id) => {
    const r = await tryApi(`/api/factures?id=${id}`, { method: 'DELETE' })
    if (r) return r
    LS.set('crm_factures', LS.get('crm_factures', []).filter(f => f.id !== id))
    return { error: null }
  },
}
