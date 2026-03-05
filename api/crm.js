// Vercel Serverless Function — GET/PATCH /api/crm
// Lecture et mise à jour des leads Revolution CRM
// Headers requis : X-API-Key: revo_demo_key

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY = process.env.CRM_API_KEY || 'revo_demo_key'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // Auth
  const key = req.headers['x-api-key']
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Clé API invalide' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'Supabase non configuré' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // ─── GET /api/crm — Lire les leads ──────────────────────────────────────────
  if (req.method === 'GET') {
    const { stage, sector, limit = 50, order = 'created_at', search } = req.query

    let query = supabase
      .from('leads')
      .select('id, name, company, sector, email, phone, website, stage, heat_score, ai_score, ai_hook, source, estimated_value, last_contact_at, created_at')
      .order(order, { ascending: false })
      .limit(Number(limit))

    if (stage) query = query.eq('stage', stage)
    if (sector) query = query.ilike('sector', `%${sector}%`)
    if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,phone.ilike.%${search}%`)

    const { data, error, count } = await query
    if (error) return res.status(500).json({ error: error.message })

    // Stats rapides
    const stats = {
      total: data.length,
      byStage: data.reduce((acc, l) => {
        acc[l.stage] = (acc[l.stage] || 0) + 1
        return acc
      }, {}),
      totalValue: data.reduce((sum, l) => sum + (l.estimated_value || 0), 0),
    }

    return res.status(200).json({ leads: data, stats })
  }

  // ─── PATCH /api/crm — Mettre à jour un lead ─────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, stage, note, heatScore } = req.body

    if (!id) return res.status(400).json({ error: 'id requis' })

    const updates = { updated_at: new Date().toISOString() }
    if (stage) {
      updates.stage = stage
      updates.stage_updated_at = new Date().toISOString()
    }
    if (heatScore) updates.heat_score = heatScore
    if (note) updates.notes = note

    const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true, lead: data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
