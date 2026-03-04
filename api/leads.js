// Vercel Serverless Function — POST /api/leads
// Reçoit les leads de N8N et les insère dans Supabase
// Headers requis : X-API-Key: <ta clé depuis Settings>

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY = process.env.CRM_API_KEY || 'revo_demo_key'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth
  const key = req.headers['x-api-key']
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Clé API invalide' })
  }

  const { name, company, sector, email, phone, website, source, heatScore, stage, estimatedValue, assignedCloserId } = req.body

  if (!name) return res.status(400).json({ error: 'Le champ "name" est requis' })

  const lead = {
    name: name?.trim(),
    company: company?.trim() || null,
    sector: sector?.trim() || null,
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    website: website?.trim() || null,
    source: source || 'Google Maps',
    heat_score: heatScore || 'Cold',
    stage: stage || 'Prospect',
    estimated_value: Number(estimatedValue) || 0,
    assigned_closer_id: assignedCloserId || null,
    last_contact_at: new Date().toISOString(),
    stage_updated_at: new Date().toISOString(),
  }

  // Si Supabase configuré → insérer en base
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Vérifier doublon sur email
    if (lead.email) {
      const { data: existing } = await supabase
        .from('leads')
        .select('id, name')
        .eq('email', lead.email)
        .single()

      if (existing) {
        return res.status(200).json({
          success: false,
          duplicate: true,
          message: `Lead déjà existant : ${existing.name}`,
          leadId: existing.id,
        })
      }
    }

    const { data, error } = await supabase.from('leads').insert([lead]).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ success: true, lead: data })
  }

  // Mode sans Supabase — retourne un succès pour tester le workflow N8N
  return res.status(201).json({
    success: true,
    message: 'Lead reçu (mode test — configurez Supabase pour persister les données)',
    lead: { id: `l_${Date.now()}`, ...lead },
  })
}
