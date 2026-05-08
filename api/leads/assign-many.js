// POST /api/leads/assign-many — assigne rapidement plusieurs leads à un membre
import { getDb, cors, checkAuth, getRequestUser } from '../_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!checkAuth(req)) return res.status(401).json({ error: 'Clé API invalide' })

  const actor = getRequestUser(req)
  if (actor && actor.role !== 'admin') return res.status(403).json({ error: 'Accès admin requis' })

  const { ids, assignedCloserId } = req.body
  if (!ids?.length) return res.status(400).json({ error: 'ids[] requis' })

  const sql = getDb()
  if (assignedCloserId) {
    const [member] = await sql`SELECT id, role FROM profiles WHERE id = ${assignedCloserId} LIMIT 1`
    if (!member) return res.status(404).json({ error: 'Membre introuvable' })
    if (!['setter', 'closer', 'admin'].includes(member.role)) {
      return res.status(400).json({ error: 'Ce profil ne peut pas recevoir de leads' })
    }
  }

  const rows = await sql`
    UPDATE leads
    SET assigned_closer_id = ${assignedCloserId || null}, updated_at = now()
    WHERE id = ANY(${ids}::uuid[])
    RETURNING id, assigned_closer_id
  `

  return res.status(200).json({ success: true, assigned: rows.length, data: rows })
}
