// GET /api/activities?leadId=xxx
// POST /api/activities
import { getDb, cors, checkAuth } from './_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Clé API invalide' })

  const sql = getDb()

  if (req.method === 'GET') {
    const { leadId } = req.query
    const rows = leadId
      ? await sql`SELECT a.*, p.full_name as user_name FROM activities a LEFT JOIN profiles p ON a.user_id = p.id WHERE a.lead_id = ${leadId} ORDER BY a.created_at DESC`
      : await sql`SELECT a.*, p.full_name as user_name FROM activities a LEFT JOIN profiles p ON a.user_id = p.id ORDER BY a.created_at DESC LIMIT 100`

    return res.status(200).json({ data: rows.map(r => ({
      id: r.id,
      leadId: r.lead_id,
      userId: r.user_id,
      userName: r.user_name,
      type: r.type,
      content: r.content,
      createdAt: r.created_at,
    }))})
  }

  if (req.method === 'POST') {
    const { leadId, userId, type, content } = req.body
    if (!leadId || !type) return res.status(400).json({ error: 'leadId et type requis' })

    const [row] = await sql`
      INSERT INTO activities (lead_id, user_id, type, content)
      VALUES (${leadId}, ${userId || null}, ${type}, ${content || null})
      RETURNING *
    `
    return res.status(201).json({ data: { id: row.id, leadId: row.lead_id, type: row.type, content: row.content, createdAt: row.created_at } })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
