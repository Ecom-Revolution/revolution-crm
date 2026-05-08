// GET /api/users — liste les utilisateurs (profils)
// POST /api/users — créer un utilisateur (admin only via API key)
import bcrypt from 'bcryptjs'
import { getDb, cors, checkAuth, getRequestUser } from './_db.js'

const VALID_ROLES = new Set(['admin', 'setter', 'closer'])

function normalize(r) {
  return {
    id: r.id,
    email: r.email,
    name: r.full_name,
    role: r.role,
    avatar: r.avatar,
    phone: r.phone,
    createdAt: r.created_at,
  }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Clé API invalide' })

  const sql = getDb()
  const actor = getRequestUser(req)
  const isAdmin = !actor || actor.role === 'admin'

  if (req.method === 'GET') {
    const rows = isAdmin
      ? await sql`SELECT id, email, full_name, role, avatar, phone, created_at FROM profiles ORDER BY created_at ASC`
      : await sql`SELECT id, email, full_name, role, avatar, phone, created_at FROM profiles WHERE id = ${actor.id} ORDER BY created_at ASC`
    return res.status(200).json({ data: rows.map(normalize) })
  }

  if (req.method === 'POST') {
    if (!isAdmin) return res.status(403).json({ error: 'Accès admin requis' })

    const { email, password, fullName, name, role, avatar, phone } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email et password requis' })
    const cleanRole = VALID_ROLES.has(role) ? role : 'closer'
    const cleanName = fullName || name || email.split('@')[0]

    const hash = await bcrypt.hash(password, 10)
    const [row] = await sql`
      INSERT INTO profiles (email, password_hash, full_name, role, avatar, phone)
      VALUES (${email}, ${hash}, ${cleanName}, ${cleanRole}, ${avatar || cleanName?.[0]?.toUpperCase() || null}, ${phone || null})
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        role = COALESCE(EXCLUDED.role, profiles.role),
        avatar = COALESCE(EXCLUDED.avatar, profiles.avatar),
        phone = COALESCE(EXCLUDED.phone, profiles.phone)
      RETURNING id, email, full_name, role, avatar, phone, created_at
    `
    return res.status(201).json({ data: normalize(row) })
  }

  if (req.method === 'DELETE') {
    if (!isAdmin) return res.status(403).json({ error: 'Accès admin requis' })
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id requis' })
    await sql`UPDATE leads SET assigned_closer_id = NULL WHERE assigned_closer_id = ${id}`
    await sql`DELETE FROM profiles WHERE id = ${id}`
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
