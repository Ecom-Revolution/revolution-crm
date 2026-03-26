// GET /api/templates
// POST /api/templates
// DELETE /api/templates?id=xxx
import { getDb, cors, checkAuth } from './_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Clé API invalide' })

  const sql = getDb()
  const id = req.query.id

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM templates ORDER BY created_at DESC`
    return res.status(200).json({ data: rows.map(r => ({
      id: r.id, name: r.name, type: r.type, subject: r.subject,
      body: r.body, tags: r.tags, createdAt: r.created_at,
    }))})
  }

  if (req.method === 'POST') {
    const { name, type, subject, body, tags } = req.body
    if (!name || !body) return res.status(400).json({ error: 'name et body requis' })
    const [row] = await sql`
      INSERT INTO templates (name, type, subject, body, tags)
      VALUES (${name}, ${type || 'Email'}, ${subject || null}, ${body}, ${tags || null})
      RETURNING *
    `
    return res.status(201).json({ data: { id: row.id, name: row.name, type: row.type, subject: row.subject, body: row.body, tags: row.tags, createdAt: row.created_at } })
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM templates WHERE id = ${id}`
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
