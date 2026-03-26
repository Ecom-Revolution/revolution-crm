// GET /api/clients
// POST /api/clients
// PATCH /api/clients?id=xxx
// DELETE /api/clients?id=xxx
import { getDb, cors, checkAuth } from './_db.js'

function normalize(r) {
  return {
    id: r.id,
    name: r.name,
    company: r.company,
    email: r.email,
    phone: r.phone,
    website: r.website,
    service: r.service,
    monthlyValue: r.monthly_value,
    status: r.status,
    startDate: r.start_date,
    notes: r.notes,
    nps: r.nps,
    upsellPotential: r.upsell_potential,
    createdAt: r.created_at,
  }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Clé API invalide' })

  const sql = getDb()
  const id = req.query.id

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM clients ORDER BY created_at DESC`
    return res.status(200).json({ data: rows.map(normalize) })
  }

  if (req.method === 'POST') {
    const { name, company, email, phone, website, service, monthlyValue, status, startDate, notes, nps, upsellPotential } = req.body
    if (!name) return res.status(400).json({ error: 'name requis' })
    const [row] = await sql`
      INSERT INTO clients (name, company, email, phone, website, service, monthly_value, status, start_date, notes, nps, upsell_potential)
      VALUES (${name}, ${company || null}, ${email || null}, ${phone || null}, ${website || null}, ${service || null},
              ${Number(monthlyValue) || 0}, ${status || 'Actif'}, ${startDate || null}, ${notes || null},
              ${nps != null ? nps : null}, ${upsellPotential || false})
      RETURNING *
    `
    return res.status(201).json({ data: normalize(row) })
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const { name, company, email, phone, website, service, monthlyValue, status, startDate, notes, nps, upsellPotential } = req.body
    const [row] = await sql`
      UPDATE clients SET
        name = COALESCE(${name || null}, name),
        company = COALESCE(${company || null}, company),
        email = COALESCE(${email || null}, email),
        phone = COALESCE(${phone || null}, phone),
        service = COALESCE(${service || null}, service),
        monthly_value = COALESCE(${monthlyValue != null ? Number(monthlyValue) : null}, monthly_value),
        status = COALESCE(${status || null}, status),
        notes = COALESCE(${notes || null}, notes),
        nps = COALESCE(${nps != null ? nps : null}, nps),
        upsell_potential = COALESCE(${upsellPotential != null ? upsellPotential : null}, upsell_potential)
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return res.status(404).json({ error: 'Client introuvable' })
    return res.status(200).json({ data: normalize(row) })
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM clients WHERE id = ${id}`
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
