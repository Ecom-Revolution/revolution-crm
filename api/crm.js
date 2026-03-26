// GET /api/crm — stats + liste leads (usage externe N8N)
// PATCH /api/crm — mise à jour rapide d'un lead (stage, heat, note)
import { getDb, cors, checkAuth } from './_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Clé API invalide' })

  const sql = getDb()

  if (req.method === 'GET') {
    const { limit = 50 } = req.query

    const rows = await sql`
      SELECT id, name, company, sector, email, phone, website, stage, heat_score,
             ai_score, ai_hook, source, estimated_value, last_contact_at, created_at,
             city, rating, reviews, siren, site_status
      FROM leads
      ORDER BY created_at DESC
      LIMIT ${Number(limit)}
    `

    const stats = {
      total: rows.length,
      byStage: rows.reduce((acc, l) => { acc[l.stage] = (acc[l.stage] || 0) + 1; return acc }, {}),
      totalValue: rows.reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0),
    }

    return res.status(200).json({ leads: rows, stats })
  }

  if (req.method === 'PATCH') {
    const { id, stage, note, heatScore } = req.body
    if (!id) return res.status(400).json({ error: 'id requis' })

    const [row] = await sql`
      UPDATE leads SET
        stage = COALESCE(${stage || null}, stage),
        heat_score = COALESCE(${heatScore || null}, heat_score),
        notes = CASE WHEN ${note || null} IS NOT NULL THEN
          CASE WHEN notes IS NULL THEN ${note || ''} ELSE notes || E'\n' || ${note || ''} END
          ELSE notes END,
        stage_updated_at = CASE WHEN ${stage || null} IS NOT NULL THEN now() ELSE stage_updated_at END,
        last_contact_at = now(),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return res.status(404).json({ error: 'Lead introuvable' })
    return res.status(200).json({ success: true, lead: row })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
