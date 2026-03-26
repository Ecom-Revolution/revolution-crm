// PATCH /api/leads/update — mise à jour lead par téléphone/nom (N8N → mockup URL)
import { getDb, cors, checkAuth } from '../_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })
  if (!checkAuth(req)) return res.status(401).json({ error: 'Clé API invalide' })

  const { phone, name, mockupUrl, stage } = req.body
  if (!mockupUrl) return res.status(400).json({ error: 'mockupUrl requis' })
  if (!phone && !name) return res.status(400).json({ error: 'phone ou name requis' })

  const sql = getDb()

  let existing
  if (phone) {
    [existing] = await sql`SELECT id, name FROM leads WHERE phone = ${phone} LIMIT 1`
  } else {
    [existing] = await sql`SELECT id, name FROM leads WHERE name ILIKE ${'%' + name + '%'} LIMIT 1`
  }

  if (!existing) return res.status(404).json({ error: 'Lead introuvable', phone, name })

  const [row] = await sql`
    UPDATE leads SET
      mockup_url = ${mockupUrl},
      stage = COALESCE(${stage || null}, stage),
      stage_updated_at = CASE WHEN ${stage || null} IS NOT NULL THEN now() ELSE stage_updated_at END,
      last_contact_at = now(),
      updated_at = now()
    WHERE id = ${existing.id}
    RETURNING id, name, stage, mockup_url
  `

  return res.status(200).json({ success: true, lead: row })
}
