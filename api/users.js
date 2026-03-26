// GET /api/users — liste les utilisateurs (profils)
// POST /api/users — créer un utilisateur (admin only via API key)
import bcrypt from 'bcryptjs'
import { getDb, cors, checkAuth } from './_db.js'

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

  if (req.method === 'GET') {
    const rows = await sql`SELECT id, email, full_name, role, avatar, phone, created_at FROM profiles ORDER BY created_at ASC`
    return res.status(200).json({ data: rows.map(normalize) })
  }

  if (req.method === 'POST') {
    const { email, password, fullName, role, avatar, phone } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email et password requis' })

    const hash = await bcrypt.hash(password, 10)
    const [row] = await sql`
      INSERT INTO profiles (email, password_hash, full_name, role, avatar, phone)
      VALUES (${email}, ${hash}, ${fullName || null}, ${role || 'closer'}, ${avatar || null}, ${phone || null})
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        role = COALESCE(EXCLUDED.role, profiles.role),
        avatar = COALESCE(EXCLUDED.avatar, profiles.avatar)
      RETURNING id, email, full_name, role, avatar, phone, created_at
    `
    return res.status(201).json({ data: normalize(row) })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
