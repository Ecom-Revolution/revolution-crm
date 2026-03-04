// Data layer — localStorage (mock) si pas de Supabase configuré
import { MOCK_LEADS, MOCK_USERS, MOCK_ACTIVITIES, MOCK_CLIENTS, MOCK_TEMPLATES } from './mock'
import { supabase, USE_SUPABASE } from './supabase'

const USE_MOCK = !USE_SUPABASE

// --- LocalStorage helpers ---
const LS = {
  get: (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
    catch { return fallback }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
}

const DATA_VERSION = '2' // incrémenter pour forcer un reset complet

const init = () => {
  if (LS.get('crm_version', null) !== DATA_VERSION) {
    // Reset complet — nouvelle version des données
    localStorage.removeItem('crm_leads')
    localStorage.removeItem('crm_users')
    localStorage.removeItem('crm_activities')
    localStorage.removeItem('crm_clients')
    localStorage.removeItem('crm_templates')
    localStorage.removeItem('crm_session')
    LS.set('crm_version', DATA_VERSION)
  }
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
    if (USE_SUPABASE) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      return { user: profile }
    }
    // Mock
    const users = LS.get('crm_users', MOCK_USERS)
    const user = users.find(u => u.email === email)
    if (!user) return { error: 'Email introuvable' }
    if (password !== 'demo1234') return { error: 'Mot de passe incorrect' }
    LS.set('crm_session', user)
    return { user }
  },

  logout: async () => {
    if (USE_SUPABASE) await supabase.auth.signOut()
    LS.set('crm_session', null)
  },

  getSession: () => {
    if (USE_SUPABASE) {
      // Pour Supabase on retourne depuis localStorage (set au login)
      return LS.get('crm_session', null)
    }
    return LS.get('crm_session', null)
  },
}

// ==================== LEADS ====================
export const leads = {
  getAll: async () => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('leads')
        .select('*, profiles!leads_assigned_closer_id_fkey(id,name,email,avatar)')
        .order('created_at', { ascending: false })
      return { data: data?.map(normalizeLeadFromDB) || [], error }
    }
    return { data: LS.get('crm_leads', []) }
  },

  getById: async (id) => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('leads').select('*').eq('id', id).single()
      return { data: data ? normalizeLeadFromDB(data) : null, error }
    }
    const all = LS.get('crm_leads', [])
    return { data: all.find(l => l.id === id) || null }
  },

  create: async (lead) => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('leads').insert([leadToDB(lead)]).select().single()
      return { data: data ? normalizeLeadFromDB(data) : null, error }
    }
    const all = LS.get('crm_leads', [])
    const newLead = {
      id: `l${uid()}`, createdAt: new Date().toISOString(),
      stageUpdatedAt: new Date().toISOString(), lastContactAt: new Date().toISOString(),
      lossReason: null, upsellPotential: false, stage: 'Prospect', heatScore: 'Cold',
      ...lead
    }
    LS.set('crm_leads', [...all, newLead])
    return { data: newLead }
  },

  update: async (id, updates) => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('leads').update({ ...leadToDB(updates), updated_at: new Date().toISOString(), last_contact_at: new Date().toISOString() }).eq('id', id).select().single()
      return { data: data ? normalizeLeadFromDB(data) : null, error }
    }
    const all = LS.get('crm_leads', [])
    const updated = all.map(l => l.id === id ? { ...l, ...updates, lastContactAt: new Date().toISOString() } : l)
    LS.set('crm_leads', updated)
    return { data: updated.find(l => l.id === id) }
  },

  delete: async (id) => {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      return { error }
    }
    LS.set('crm_leads', LS.get('crm_leads', []).filter(l => l.id !== id))
    return { error: null }
  },

  deleteMany: async (ids) => {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('leads').delete().in('id', ids)
      return { error }
    }
    LS.set('crm_leads', LS.get('crm_leads', []).filter(l => !ids.includes(l.id)))
    return { error: null }
  },
}

// ==================== ACTIVITIES ====================
export const activities = {
  getAll: async () => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('activities').select('*').order('created_at', { ascending: false })
      return { data: data?.map(normalizeActivityFromDB) || [], error }
    }
    return { data: LS.get('crm_activities', []) }
  },

  getByLeadId: async (leadId) => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('activities').select('*, profiles(id,name,avatar)').eq('lead_id', leadId).order('created_at', { ascending: false })
      return { data: data?.map(normalizeActivityFromDB) || [], error }
    }
    const all = LS.get('crm_activities', [])
    return { data: all.filter(a => a.leadId === leadId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }
  },

  getRecent: async (limit = 10) => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('activities').select('*, leads(id,name), profiles(id,name,avatar)').order('created_at', { ascending: false }).limit(limit)
      return {
        data: data?.map(a => ({
          ...normalizeActivityFromDB(a),
          lead: a.leads,
          user: a.profiles,
        })) || [],
        error
      }
    }
    const all = LS.get('crm_activities', [])
    const allLeads = LS.get('crm_leads', [])
    const allUsers = LS.get('crm_users', MOCK_USERS)
    return {
      data: all
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit)
        .map(a => ({ ...a, lead: allLeads.find(l => l.id === a.leadId), user: allUsers.find(u => u.id === a.userId) }))
    }
  },

  create: async (activity) => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('activities').insert([activityToDB(activity)]).select().single()
      return { data: data ? normalizeActivityFromDB(data) : null, error }
    }
    const all = LS.get('crm_activities', [])
    const newActivity = { id: `a${uid()}`, createdAt: new Date().toISOString(), ...activity }
    LS.set('crm_activities', [...all, newActivity])
    return { data: newActivity }
  },
}

// ==================== USERS ====================
export const users = {
  getAll: async () => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('profiles').select('*').order('name')
      return { data: data?.map(normalizeUserFromDB) || [], error }
    }
    return { data: LS.get('crm_users', MOCK_USERS) }
  },

  create: async (user) => {
    if (USE_SUPABASE) {
      // Créer via Supabase Admin ou invitation email — non géré ici sans service_role key
      return { error: 'Utilisez le dashboard Supabase pour créer des utilisateurs.' }
    }
    const all = LS.get('crm_users', MOCK_USERS)
    const newUser = { id: `u${uid()}`, avatar: user.name?.[0]?.toUpperCase() || 'U', ...user }
    LS.set('crm_users', [...all, newUser])
    return { data: newUser }
  },

  delete: async (id) => {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      return { error }
    }
    LS.set('crm_users', LS.get('crm_users', MOCK_USERS).filter(u => u.id !== id))
    return { error: null }
  },
}

// ==================== CLIENTS ====================
export const clients = {
  getAll: async () => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
      return { data: data?.map(normalizeClientFromDB) || [], error }
    }
    return { data: LS.get('crm_clients', []) }
  },

  create: async (client) => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('clients').insert([clientToDB(client)]).select().single()
      return { data: data ? normalizeClientFromDB(data) : null, error }
    }
    const all = LS.get('crm_clients', [])
    const newClient = { id: `c${uid()}`, createdAt: new Date().toISOString(), status: 'Actif', ...client }
    LS.set('crm_clients', [...all, newClient])
    return { data: newClient }
  },

  update: async (id, updates) => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('clients').update(clientToDB(updates)).eq('id', id).select().single()
      return { data: data ? normalizeClientFromDB(data) : null, error }
    }
    const all = LS.get('crm_clients', [])
    const updated = all.map(c => c.id === id ? { ...c, ...updates } : c)
    LS.set('crm_clients', updated)
    return { data: updated.find(c => c.id === id) }
  },

  delete: async (id) => {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      return { error }
    }
    LS.set('crm_clients', LS.get('crm_clients', []).filter(c => c.id !== id))
    return { error: null }
  },
}

// ==================== TEMPLATES ====================
export const templates = {
  getAll: async () => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('templates').select('*').order('created_at', { ascending: false })
      return { data: data || [], error }
    }
    return { data: LS.get('crm_templates', []) }
  },

  create: async (tpl) => {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('templates').insert([tpl]).select().single()
      return { data, error }
    }
    const all = LS.get('crm_templates', [])
    const newTpl = { id: `t${uid()}`, createdAt: new Date().toISOString(), ...tpl }
    LS.set('crm_templates', [...all, newTpl])
    return { data: newTpl }
  },

  update: async (id, updates) => {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('templates').update(updates).eq('id', id)
      return { error }
    }
    const all = LS.get('crm_templates', [])
    LS.set('crm_templates', all.map(t => t.id === id ? { ...t, ...updates } : t))
    return { error: null }
  },

  delete: async (id) => {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('templates').delete().eq('id', id)
      return { error }
    }
    LS.set('crm_templates', LS.get('crm_templates', []).filter(t => t.id !== id))
    return { error: null }
  },
}

// ==================== FIELD NORMALIZERS ====================
// DB snake_case → App camelCase

const normalizeLeadFromDB = (l) => ({
  id: l.id,
  name: l.name,
  company: l.company,
  sector: l.sector,
  email: l.email,
  phone: l.phone,
  website: l.website,
  source: l.source,
  stage: l.stage,
  heatScore: l.heat_score,
  estimatedValue: l.estimated_value,
  upsellPotential: l.upsell_potential,
  lossReason: l.loss_reason,
  assignedCloserId: l.assigned_closer_id,
  lastContactAt: l.last_contact_at,
  stageUpdatedAt: l.stage_updated_at,
  createdAt: l.created_at,
})

const leadToDB = (l) => ({
  ...(l.name !== undefined && { name: l.name }),
  ...(l.company !== undefined && { company: l.company }),
  ...(l.sector !== undefined && { sector: l.sector }),
  ...(l.email !== undefined && { email: l.email }),
  ...(l.phone !== undefined && { phone: l.phone }),
  ...(l.website !== undefined && { website: l.website }),
  ...(l.source !== undefined && { source: l.source }),
  ...(l.stage !== undefined && { stage: l.stage, stage_updated_at: new Date().toISOString() }),
  ...(l.heatScore !== undefined && { heat_score: l.heatScore }),
  ...(l.estimatedValue !== undefined && { estimated_value: l.estimatedValue }),
  ...(l.upsellPotential !== undefined && { upsell_potential: l.upsellPotential }),
  ...(l.lossReason !== undefined && { loss_reason: l.lossReason }),
  ...(l.assignedCloserId !== undefined && { assigned_closer_id: l.assignedCloserId || null }),
})

const normalizeActivityFromDB = (a) => ({
  id: a.id,
  leadId: a.lead_id,
  userId: a.user_id,
  type: a.type,
  content: a.content,
  createdAt: a.created_at,
})

const activityToDB = (a) => ({
  lead_id: a.leadId,
  user_id: a.userId,
  type: a.type,
  content: a.content,
})

const normalizeUserFromDB = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  avatar: u.avatar,
  createdAt: u.created_at,
})

const normalizeClientFromDB = (c) => ({
  id: c.id,
  name: c.name,
  company: c.company,
  email: c.email,
  phone: c.phone,
  website: c.website,
  service: c.service,
  monthlyValue: c.monthly_value,
  status: c.status,
  startDate: c.start_date,
  notes: c.notes,
  nps: c.nps,
  upsellPotential: c.upsell_potential,
  createdAt: c.created_at,
})

const clientToDB = (c) => ({
  ...(c.name !== undefined && { name: c.name }),
  ...(c.company !== undefined && { company: c.company }),
  ...(c.email !== undefined && { email: c.email }),
  ...(c.phone !== undefined && { phone: c.phone }),
  ...(c.website !== undefined && { website: c.website }),
  ...(c.service !== undefined && { service: c.service }),
  ...(c.monthlyValue !== undefined && { monthly_value: c.monthlyValue }),
  ...(c.status !== undefined && { status: c.status }),
  ...(c.startDate !== undefined && { start_date: c.startDate }),
  ...(c.notes !== undefined && { notes: c.notes }),
  ...(c.nps !== undefined && { nps: c.nps }),
  ...(c.upsellPotential !== undefined && { upsell_potential: c.upsellPotential }),
})
