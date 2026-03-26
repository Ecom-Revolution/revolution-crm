// GET  /api/leads        — liste tous les leads
// GET  /api/leads?id=:id — récupère un lead par ID
// POST /api/leads        — crée un lead (N8N + CRM)
// PATCH /api/leads?id=:id — met à jour un lead
// DELETE /api/leads?id=:id — supprime un lead
import { getDb, cors, checkAuth } from '../_db.js'

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
    estimatedValue: Number(row.estimated_value) || 0,
    upsellPotential: Number(row.upsell_potential) || 0,
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

  const sql = getDb()

  const { id, search, limit = 500, offset = 0 } = req.query

  // ─── /api/leads?id=:id — opérations sur un lead unique ───────────────────
  if (id) {
    if (req.method === 'GET') {
      const [row] = await sql`SELECT * FROM leads WHERE id = ${id}`
      if (!row) return res.status(404).json({ error: 'Lead introuvable' })
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
          assigned_closer_id = COALESCE(${assignedCloserId || null}, assigned_closer_id),
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
      await sql`DELETE FROM leads WHERE id = ${id}`
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ─── GET — Liste des leads ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    let rows
    if (search) {
      const q = `%${search}%`
      rows = await sql`
        SELECT * FROM leads
        WHERE (name ILIKE ${q} OR company ILIKE ${q} OR email ILIKE ${q} OR phone ILIKE ${q} OR city ILIKE ${q})
        ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
      `
    } else {
      rows = await sql`
        SELECT * FROM leads
        ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
      `
    }

    return res.status(200).json({ data: rows.map(normalize) })
  }

  // ─── POST — Créer un lead ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      name, company, sector, email, phone, website, source,
      heatScore, stage, estimatedValue, assignedCloserId,
      aiScore, aiNeeds, aiHook,
      address, city, zip, dirigeant, rating, reviews, siren,
      siteStatus, rdvDate, rdvNote, notes, distanceKm,
    } = req.body

    if (!name) return res.status(400).json({ error: 'name requis' })

    if (phone) {
      const [dup] = await sql`SELECT id, name FROM leads WHERE phone = ${phone} LIMIT 1`
      if (dup) return res.status(200).json({ success: false, duplicate: true, message: `Déjà existant: ${dup.name}`, leadId: dup.id })
    }
    if (email && !phone) {
      const [dup] = await sql`SELECT id, name FROM leads WHERE email = ${email} LIMIT 1`
      if (dup) return res.status(200).json({ success: false, duplicate: true, message: `Déjà existant: ${dup.name}`, leadId: dup.id })
    }

    const [row] = await sql`
      INSERT INTO leads (
        name, company, sector, email, phone, website, source, heat_score, stage,
        estimated_value, assigned_closer_id, ai_score, ai_needs, ai_hook,
        address, city, zip, dirigeant, rating, reviews, siren,
        site_status, rdv_date, rdv_note, notes, distance_km
      ) VALUES (
        ${name?.trim()}, ${company?.trim() || null}, ${sector?.trim() || null},
        ${email?.trim() || null}, ${phone?.trim() || null}, ${website?.trim() || null},
        ${source || 'Google Maps'}, ${heatScore || 'Cold'}, ${stage || 'Prospect'},
        ${Number(estimatedValue) || 0}, ${assignedCloserId || null},
        ${aiScore != null ? Number(aiScore) : null}, ${aiNeeds || null}, ${aiHook || null},
        ${address || null}, ${city || null}, ${zip || null}, ${dirigeant || null},
        ${rating || null}, ${reviews || 0}, ${siren || null},
        ${siteStatus || 'none'}, ${rdvDate || null}, ${rdvNote || null},
        ${notes || null}, ${distanceKm || null}
      )
      RETURNING *
    `

    return res.status(201).json({ success: true, lead: normalize(row) })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
