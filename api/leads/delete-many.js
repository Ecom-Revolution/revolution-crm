// POST /api/leads/delete-many — supprime plusieurs leads
import { getDb, cors, checkAuth, getRequestUser } from '../_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!checkAuth(req)) return res.status(401).json({ error: 'Clé API invalide' })
  const actor = getRequestUser(req)
  if (actor && actor.role !== 'admin') return res.status(403).json({ error: 'Accès admin requis' })

  const { ids } = req.body
  if (!ids?.length) return res.status(400).json({ error: 'ids[] requis' })

  const sql = getDb()
  await sql`DELETE FROM leads WHERE id = ANY(${ids}::uuid[])`
  return res.status(200).json({ success: true, deleted: ids.length })
}
