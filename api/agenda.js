// GET /api/agenda
// POST /api/agenda
// PATCH /api/agenda?id=xxx
// DELETE /api/agenda?id=xxx
import { getDb, cors, checkAuth } from './_db.js'

function normalize(r) {
  return {
    id: r.id,
    leadId: r.lead_id,
    leadName: r.lead_name,
    leadPhone: r.lead_phone,
    userId: r.user_id,
    date: r.date,
    duration: r.duration,
    type: r.type,
    note: r.note,
    status: r.status,
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
    const rows = await sql`
      SELECT ag.*, l.name as lead_name, l.phone as lead_phone
      FROM agenda ag
      LEFT JOIN leads l ON ag.lead_id = l.id
      ORDER BY ag.date ASC
    `
    return res.status(200).json({ data: rows.map(normalize) })
  }

  if (req.method === 'POST') {
    const { leadId, userId, date, duration, type, note, status } = req.body
    if (!date) return res.status(400).json({ error: 'date requis' })
    const [row] = await sql`
      INSERT INTO agenda (lead_id, user_id, date, duration, type, note, status)
      VALUES (${leadId || null}, ${userId || null}, ${date}, ${duration || 30}, ${type || 'appel'}, ${note || null}, ${status || 'planifie'})
      RETURNING *
    `
    return res.status(201).json({ data: normalize(row) })
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const { date, duration, type, note, status, leadId } = req.body
    const [row] = await sql`
      UPDATE agenda SET
        date = COALESCE(${date || null}, date),
        duration = COALESCE(${duration || null}, duration),
        type = COALESCE(${type || null}, type),
        note = COALESCE(${note || null}, note),
        status = COALESCE(${status || null}, status),
        lead_id = COALESCE(${leadId || null}, lead_id)
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return res.status(404).json({ error: 'RDV introuvable' })
    return res.status(200).json({ data: normalize(row) })
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM agenda WHERE id = ${id}`
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
