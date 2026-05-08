// GET /api/leads/[id]
// PATCH /api/leads/[id]
// DELETE /api/leads/[id]
import { getDb, cors, checkAuth, getRequestUser } from '../_db.js'

function normalize(row) {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    sector: row.sector,
    email: row.email,
    phone: row.phone,
    website: row.website,
    mockupUrl: row.mockup_url,
    source: row.source,
    stage: row.stage,
    heatScore: row.heat_score,
    estimatedValue: row.estimated_value,
    upsellPotential: row.upsell_potential,
    lossReason: row.loss_reason,
    assignedCloserId: row.assigned_closer_id,
    lastContactAt: row.last_contact_at,
    stageUpdatedAt: row.stage_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    aiScore: row.ai_score,
    aiNeeds: row.ai_needs,
    aiHook: row.ai_hook,
    address: row.address,
    city: row.city,
    zip: row.zip,
    dirigeant: row.dirigeant,
    rating: row.rating,
    reviews: row.reviews,
    siren: row.siren,
    siteStatus: row.site_status,
    rdvDate: row.rdv_date,
    rdvNote: row.rdv_note,
    notes: row.notes,
    distanceKm: row.distance_km,
  }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Clé API invalide' })

  const { id } = req.query
  const sql = getDb()
  const actor = getRequestUser(req)
  const isMember = actor?.role === 'setter' || actor?.role === 'closer'
  const isAdmin = !actor || actor.role === 'admin'

  if (req.method === 'GET') {
    const [row] = await sql`SELECT * FROM leads WHERE id = ${id}`
    if (!row) return res.status(404).json({ error: 'Lead introuvable' })
    if (isMember && row.assigned_closer_id !== actor.id) {
      return res.status(403).json({ error: 'Lead non assigné à ce membre' })
    }
    return res.status(200).json({ data: normalize(row) })
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const {
      name, company, sector, email, phone, website, source,
      heatScore, stage, estimatedValue, assignedCloserId, upsellPotential, lossReason,
      aiScore, aiNeeds, aiHook, mockupUrl,
      address, city, zip, dirigeant, rating, reviews, siren,
      siteStatus, rdvDate, rdvNote, notes, distanceKm,
    } = req.body
    const canChangeAssignment = isAdmin && Object.prototype.hasOwnProperty.call(req.body, 'assignedCloserId')

    if (isMember) {
      const [existing] = await sql`SELECT id, assigned_closer_id FROM leads WHERE id = ${id} LIMIT 1`
      if (!existing) return res.status(404).json({ error: 'Lead introuvable' })
      if (existing.assigned_closer_id !== actor.id) {
        return res.status(403).json({ error: 'Lead non assigné à ce membre' })
      }
    }

    const [row] = await sql`
      UPDATE leads SET
        name = COALESCE(${name || null}, name),
        company = COALESCE(${company || null}, company),
        sector = COALESCE(${sector || null}, sector),
        email = COALESCE(${email || null}, email),
        phone = COALESCE(${phone || null}, phone),
        website = COALESCE(${website || null}, website),
        source = COALESCE(${source || null}, source),
        heat_score = COALESCE(${heatScore || null}, heat_score),
        stage = COALESCE(${stage || null}, stage),
        estimated_value = COALESCE(${estimatedValue != null ? Number(estimatedValue) : null}, estimated_value),
        assigned_closer_id = CASE WHEN ${canChangeAssignment} THEN ${assignedCloserId || null} ELSE assigned_closer_id END,
        upsell_potential = COALESCE(${upsellPotential != null ? upsellPotential : null}, upsell_potential),
        loss_reason = COALESCE(${lossReason || null}, loss_reason),
        ai_score = COALESCE(${aiScore != null ? Number(aiScore) : null}, ai_score),
        ai_needs = COALESCE(${aiNeeds || null}, ai_needs),
        ai_hook = COALESCE(${aiHook || null}, ai_hook),
        mockup_url = COALESCE(${mockupUrl || null}, mockup_url),
        address = COALESCE(${address || null}, address),
        city = COALESCE(${city || null}, city),
        zip = COALESCE(${zip || null}, zip),
        dirigeant = COALESCE(${dirigeant || null}, dirigeant),
        rating = COALESCE(${rating || null}, rating),
        reviews = COALESCE(${reviews != null ? reviews : null}, reviews),
        siren = COALESCE(${siren || null}, siren),
        site_status = COALESCE(${siteStatus || null}, site_status),
        rdv_date = COALESCE(${rdvDate || null}, rdv_date),
        rdv_note = COALESCE(${rdvNote || null}, rdv_note),
        notes = COALESCE(${notes || null}, notes),
        distance_km = COALESCE(${distanceKm || null}, distance_km),
        stage_updated_at = CASE WHEN ${stage || null} IS NOT NULL THEN now() ELSE stage_updated_at END,
        last_contact_at = now(),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return res.status(404).json({ error: 'Lead introuvable' })
    return res.status(200).json({ data: normalize(row) })
  }

  if (req.method === 'DELETE') {
    if (!isAdmin) return res.status(403).json({ error: 'Accès admin requis' })
    await sql`DELETE FROM leads WHERE id = ${id}`
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
